import Link from "next/link";
import DbSetupMessage from "@/src/components/db-setup-message";
import { getPrismaSetupErrorMessage } from "@/src/lib/prisma-guard";
import { prisma } from "@/src/lib/prisma";

type OrderStatus = "NEW" | "IN_PROGRESS" | "PAID" | "SHIPPED" | "CANCELLED";

const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  NEW: "New",
  IN_PROGRESS: "In progress",
  PAID: "Paid",
  SHIPPED: "Shipped",
  CANCELLED: "Cancelled",
};

export default async function OrdersAdminPage() {
  const loaded = await (async () => {
    try {
      const orders = await prisma.order.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
          },
        },
      });

      return { ok: true as const, orders };
    } catch (error) {
      const setupErrorMessage = getPrismaSetupErrorMessage(error);
      if (setupErrorMessage) {
        return { ok: false as const, setupErrorMessage };
      }

      throw error;
    }
  })();

  if (!loaded.ok) {
    return <DbSetupMessage title="Orders Not Ready Yet" errorMessage={loaded.setupErrorMessage} />;
  }

  const { orders } = loaded;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-6 py-10 sm:px-10">
      <header className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-900">Order Requests</h1>
          <Link href="/admin" className="text-sm font-medium text-slate-600 hover:text-slate-900">
            Back to admin
          </Link>
        </div>
        <p className="mt-2 text-sm text-slate-600">Customer requests submitted from product checkout.</p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Requests</h2>
          <p className="text-sm text-slate-500">{orders.length} records</p>
        </div>

        {orders.length > 0 ? (
          <div className="grid gap-4">
            {orders.map((order) => {
              const status = order.status as OrderStatus;

              return (
                <article key={order.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Order {order.id}</p>
                      <p className="text-xs text-slate-600">
                        {order.createdAt.toLocaleString()} | Status: {ORDER_STATUS_LABELS[status] ?? String(order.status)}
                      </p>
                    </div>
                    <div className="text-right text-xs text-slate-600">
                      <p>Name: {order.name || "-"}</p>
                      <p>Phone/Telegram: {order.phone || "-"}</p>
                      <p>Email: {order.email || "-"}</p>
                    </div>
                  </div>

                  {order.note ? (
                    <p className="mt-3 rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-700">
                      Note: {order.note}
                    </p>
                  ) : null}

                  <div className="mt-3 overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="text-slate-500">
                        <tr>
                          <th className="pb-2 pr-4 font-medium">Product</th>
                          <th className="pb-2 pr-4 font-medium">Qty</th>
                          <th className="pb-2 pr-4 font-medium">Variant</th>
                          <th className="pb-2 font-medium">Item note</th>
                        </tr>
                      </thead>
                      <tbody className="text-slate-700">
                        {order.items.map((item) => (
                          <tr key={item.id} className="border-t border-slate-100">
                            <td className="py-2 pr-4">
                              <Link href={`/p/${item.product.id}`} className="text-slate-900 underline">
                                {item.product.title}
                              </Link>
                            </td>
                            <td className="py-2 pr-4">{item.qty}</td>
                            <td className="py-2 pr-4">{item.variant || "-"}</td>
                            <td className="py-2">{item.note || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-slate-600">No order requests yet.</p>
        )}
      </section>
    </main>
  );
}