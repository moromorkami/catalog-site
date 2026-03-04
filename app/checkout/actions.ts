"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/src/lib/prisma";
import { getPrismaSetupErrorMessage } from "@/src/lib/prisma-guard";
import { sendTelegramOrderNotification } from "@/src/lib/telegram";

export type CheckoutActionState = {
  status: "idle" | "success" | "error";
  message: string;
  orderId: string | null;
};

export const initialCheckoutState: CheckoutActionState = {
  status: "idle",
  message: "",
  orderId: null,
};

function toMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Could not submit order request.";
}

export async function submitOrderRequestAction(
  _prevState: CheckoutActionState,
  formData: FormData,
): Promise<CheckoutActionState> {
  const productId = String(formData.get("productId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const contact = String(formData.get("contact") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const qtyValue = String(formData.get("qty") ?? "").trim();
  const qty = Number.parseInt(qtyValue, 10);

  if (!productId) {
    return {
      status: "error",
      message: "Missing product ID.",
      orderId: null,
    };
  }

  if (!name || !contact) {
    return {
      status: "error",
      message: "Name and Phone/Telegram are required.",
      orderId: null,
    };
  }

  if (!Number.isFinite(qty) || qty < 1 || qty > 1000) {
    return {
      status: "error",
      message: "Qty must be a whole number between 1 and 1000.",
      orderId: null,
    };
  }

  try {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, title: true },
    });

    if (!product) {
      return {
        status: "error",
        message: "Product not found.",
        orderId: null,
      };
    }

    const order = await prisma.$transaction(async (tx: any) => {
      const createdOrder = await tx.order.create({
        data: {
          name,
          phone: contact,
          note: note || null,
          items: {
            create: {
              productId: product.id,
              qty,
            },
          },
        },
      });

      return createdOrder;
    });

    try {
      await sendTelegramOrderNotification({
        orderId: order.id,
        productId: product.id,
        productTitle: product.title,
        qty,
        customerName: name,
        contact,
        note: note || null,
        createdAtIso: order.createdAt.toISOString(),
      });
    } catch (telegramError) {
      console.error(telegramError);
    }

    revalidatePath("/admin");
    revalidatePath("/admin/orders");

    return {
      status: "success",
      message: "Order request submitted. We will contact you soon.",
      orderId: order.id,
    };
  } catch (error) {
    const setupErrorMessage = getPrismaSetupErrorMessage(error);
    if (setupErrorMessage) {
      return {
        status: "error",
        message: setupErrorMessage,
        orderId: null,
      };
    }

    return {
      status: "error",
      message: toMessage(error),
      orderId: null,
    };
  }
}
