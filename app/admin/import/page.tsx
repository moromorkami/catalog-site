import Link from "next/link";
import DbSetupMessage from "@/src/components/db-setup-message";
import { getPrismaSetupErrorMessage } from "@/src/lib/prisma-guard";
import { prisma } from "@/src/lib/prisma";
import ImportForm from "./import-form";

export default async function ImportAdminPage() {
  const loaded = await (async () => {
    try {
      const [supplierCount, brandCount, categoryCount, productCount] = await Promise.all([
        prisma.supplier.count(),
        prisma.brand.count(),
        prisma.category.count(),
        prisma.product.count(),
      ]);

      return {
        ok: true as const,
        supplierCount,
        brandCount,
        categoryCount,
        productCount,
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
    return <DbSetupMessage title="CSV Import Not Ready Yet" errorMessage={loaded.setupErrorMessage} />;
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-6 py-10 sm:px-10">
      <header className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-900">CSV Import</h1>
          <Link href="/admin" className="text-sm font-medium text-slate-600 hover:text-slate-900">
            Back to admin
          </Link>
        </div>
        <p className="mt-2 text-sm text-slate-600">
          Bulk import products with automatic supplier, brand, and category creation.
        </p>
        <div className="mt-4 grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
          <p>Suppliers: {loaded.supplierCount}</p>
          <p>Brands: {loaded.brandCount}</p>
          <p>Categories: {loaded.categoryCount}</p>
          <p>Products: {loaded.productCount}</p>
        </div>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Required CSV columns</h2>
        <p className="mt-2 text-sm text-slate-600">
          Use this exact header order or any order with the same column names.
        </p>
        <code className="mt-3 block overflow-x-auto rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
          supplier_name,brand,category_path,title,description,source_url,image_urls
        </code>
        <p className="mt-3 text-xs text-slate-500">
          category_path uses <span className="font-mono">&gt;</span> separators (example:{" "}
          <span className="font-mono">Accessories&gt;Bag&gt;Gucci</span>). image_urls use semicolon separators.
        </p>
      </section>

      <ImportForm />
    </main>
  );
}
