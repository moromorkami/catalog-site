"use server";

import { ImageType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabaseStoragePathFromUrl } from "@/src/lib/supabase-storage-path";
import { getSupabaseStorageBucket, getSupabaseStorageClient } from "@/src/lib/supabase-server";
import { prisma } from "@/src/lib/prisma";

function toMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Action failed due to an unknown error.";
}

function redirectWithError(productId: string, error: unknown) {
  const params = new URLSearchParams({
    status: "error",
    message: toMessage(error),
  });
  redirect(`/admin/products/${productId}?${params.toString()}`);
}

function parseProductId(formData: FormData) {
  return String(formData.get("productId") ?? "").trim();
}

function parseOrderedIds(formData: FormData) {
  const raw = String(formData.get("orderedIds") ?? "");
  const ids = raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (ids.length === 0) {
    throw new Error("Image order payload is empty.");
  }

  if (new Set(ids).size !== ids.length) {
    throw new Error("Image order contains duplicate entries.");
  }

  return ids;
}

async function refreshProductPaths(productId: string) {
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath(`/p/${productId}`);
}

export async function reorderSupplierImagesAction(formData: FormData) {
  const productId = parseProductId(formData);
  if (!productId) {
    return;
  }

  try {
    const orderedIds = parseOrderedIds(formData);

    await prisma.$transaction(async (tx) => {
      const existingImages = await tx.productImage.findMany({
        where: {
          productId,
          type: ImageType.SUPPLIER,
        },
        select: { id: true },
      });

      if (existingImages.length !== orderedIds.length) {
        throw new Error("Supplier image order is out of sync. Reload and try again.");
      }

      const existingIds = new Set(existingImages.map((image) => image.id));
      for (const id of orderedIds) {
        if (!existingIds.has(id)) {
          throw new Error("Supplier image order contains invalid image IDs.");
        }
      }

      for (let index = 0; index < orderedIds.length; index += 1) {
        await tx.productImage.update({
          where: { id: orderedIds[index] },
          data: { sortOrder: index + 1 },
        });
      }
    });

    await refreshProductPaths(productId);
  } catch (error) {
    redirectWithError(productId, error);
  }
}

export async function reorderQcSetImagesAction(formData: FormData) {
  const productId = parseProductId(formData);
  const qcSetId = String(formData.get("qcSetId") ?? "").trim();

  if (!productId || !qcSetId) {
    return;
  }

  try {
    const orderedIds = parseOrderedIds(formData);

    await prisma.$transaction(async (tx) => {
      const qcSet = await tx.qcSet.findUnique({
        where: { id: qcSetId },
        select: { id: true, productId: true },
      });

      if (!qcSet || qcSet.productId !== productId) {
        throw new Error("QC set not found for this product.");
      }

      const existingImages = await tx.productImage.findMany({
        where: {
          productId,
          type: ImageType.QC,
          qcSetId,
        },
        select: { id: true },
      });

      if (existingImages.length !== orderedIds.length) {
        throw new Error("QC image order is out of sync. Reload and try again.");
      }

      const existingIds = new Set(existingImages.map((image) => image.id));
      for (const id of orderedIds) {
        if (!existingIds.has(id)) {
          throw new Error("QC image order contains invalid image IDs.");
        }
      }

      for (let index = 0; index < orderedIds.length; index += 1) {
        await tx.productImage.update({
          where: { id: orderedIds[index] },
          data: { sortOrder: index + 1 },
        });
      }
    });

    await refreshProductPaths(productId);
  } catch (error) {
    redirectWithError(productId, error);
  }
}

export async function updateQcSetAction(formData: FormData) {
  const productId = parseProductId(formData);
  const qcSetId = String(formData.get("qcSetId") ?? "").trim();

  if (!productId || !qcSetId) {
    return;
  }

  const title = String(formData.get("title") ?? "").trim();
  const warehouse = String(formData.get("warehouse") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  try {
    const qcSet = await prisma.qcSet.findUnique({
      where: { id: qcSetId },
      select: { id: true, productId: true },
    });

    if (!qcSet || qcSet.productId !== productId) {
      throw new Error("QC set not found for this product.");
    }

    await prisma.qcSet.update({
      where: { id: qcSetId },
      data: {
        title: title || null,
        warehouse: warehouse || null,
        notes: notes || null,
      },
    });

    await refreshProductPaths(productId);
  } catch (error) {
    redirectWithError(productId, error);
  }
}

export async function deleteProductImageAction(formData: FormData) {
  const productId = parseProductId(formData);
  const imageId = String(formData.get("imageId") ?? "").trim();

  if (!productId || !imageId) {
    return;
  }

  try {
    const image = await prisma.productImage.findFirst({
      where: {
        id: imageId,
        productId,
      },
      select: {
        id: true,
        url: true,
      },
    });

    if (!image) {
      throw new Error("Image not found for this product.");
    }

    const bucket = getSupabaseStorageBucket();
    const objectPath = getSupabaseStoragePathFromUrl(image.url, bucket);
    const looksLikeSupabaseStorageUrl = image.url.includes("/storage/v1/object/");

    if (objectPath) {
      const supabase = getSupabaseStorageClient();
      const { error } = await supabase.storage.from(bucket).remove([objectPath]);

      if (error) {
        throw new Error(`Failed to delete image from Supabase Storage: ${error.message}`);
      }
    } else if (looksLikeSupabaseStorageUrl) {
      throw new Error("Could not parse Supabase Storage object path from image URL.");
    }

    await prisma.productImage.delete({
      where: {
        id: image.id,
      },
    });

    await refreshProductPaths(productId);
  } catch (error) {
    redirectWithError(productId, error);
  }
}
