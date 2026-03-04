import Link from "next/link";
import DbSetupMessage from "@/src/components/db-setup-message";
import { getPrismaSetupErrorMessage } from "@/src/lib/prisma-guard";
import { prisma } from "@/src/lib/prisma";

export default async function AdminPage() {
  const loaded = await (async () => {
    try {
      const [supplierCount, brandCount, categoryCount, productCount, orderCount] = await Promise.all([
        prisma.supplier.count(),
        prisma.brand.count(),
        prisma.category.count(),
        prisma.product.count(),
        prisma.order.count(),
      ]);

      return {
        ok: true as const,
        links: [
          {
            href: "/admin/suppliers",
            title: "Suppliers",
            description: "Create suppliers and view existing records.",
            count: supplierCount,
          },
          {
            href: "/admin/brands",
            title: "Brands",
            description: "Create brands used for product filters.",
            count: brandCount,
          },
          {
            href: "/admin/categories",
            title: "Categories",
            description: "Build category tree with optional parent category.",
            count: categoryCount,
          },
          {
            href: "/admin/products/new",
            title: "New Product",
            description: "Create product and assign categories.",
            count: productCount,
          },
          {
            href: "/admin/import",
            title: "CSV Import",
            description: "Bulk import products, categories, suppliers, and images.",
            count: productCount,
          },
          {
            href: "/admin/orders",
            title: "Order Requests",
            description: "View customer order requests from checkout.",
            count: orderCount,
          },
        ],
      };
    } catch (error) {
      const setupErrorMessage = getPrismaSetupErrorMessage(error);
      if (setupErrorMessage) {
        return { ok: false as const, setupErrorMessage };
      }

      throw error;
    }
  })();

  if (!loaded.ok) {
    return <DbSetupMessage title="Admin Not Ready Yet" errorMessage={loaded.setupErrorMessage} />;
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-6 py-10 sm:px-10">
      <header className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Admin</h1>
        <p className="mt-2 text-sm text-slate-600">
          Minimal admin routes for suppliers, brands, categories, and products.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2">
        {loaded.links.map((link: any) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:bg-slate-50"
          >
            <p className="text-lg font-semibold text-slate-900">{link.title}</p>
            <p className="mt-1 text-sm text-slate-600">{link.description}</p>
            <p className="mt-3 text-xs font-medium text-slate-500">Records: {link.count}</p>
          </Link>
        ))}
      </section>
    </main>
  );
}
