import Link from "next/link";
import DbSetupMessage from "@/src/components/db-setup-message";
import { getPrismaSetupErrorMessage } from "@/src/lib/prisma-guard";
import { prisma } from "@/src/lib/prisma";
import { importYupooAlbumAction } from "./actions";
import ImportYupooForm from "./import-yupoo-form";
import { initialImportYupooState } from "./state";

type CategoryNode = {
  id: string;
  name: string;
  parentId: string | null;
};

function buildCategoryPaths(categories: CategoryNode[]) {
  const byId = new Map(categories.map((category) => [category.id, category]));

  return categories
    .map((category) => {
      const names: string[] = [];
      const seen = new Set<string>();
      let cursor: CategoryNode | undefined = category;

      while (cursor) {
        if (seen.has(cursor.id)) {
          break;
        }

        seen.add(cursor.id);
        names.unshift(cursor.name);
        cursor = cursor.parentId ? byId.get(cursor.parentId) : undefined;
      }

      return {
        id: category.id,
        pathLabel: names.join(" / "),
      };
    })
    .sort((a, b) => a.pathLabel.localeCompare(b.pathLabel));
}

export default async function ImportYupooPage() {
  const loaded = await (async () => {
    try {
      const [suppliers, brands, categories, productCount] = await Promise.all([
        prisma.supplier.findMany({
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
          },
        }),
        prisma.brand.findMany({
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
          },
        }),
        prisma.category.findMany({
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            parentId: true,
          },
        }),
        prisma.product.count(),
      ]);

      return {
        ok: true as const,
        suppliers,
        brands,
        categories: buildCategoryPaths(categories),
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
    return <DbSetupMessage title="Yupoo Import Not Ready Yet" errorMessage={loaded.setupErrorMessage} />;
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-6 py-10 sm:px-10">
      <header className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-900">Yupoo Import</h1>
          <Link href="/admin" className="text-sm font-medium text-slate-600 hover:text-slate-900">
            Back to admin
          </Link>
        </div>
        <p className="mt-2 text-sm text-slate-600">
          Import a Yupoo album into one product with supplier photos and the original Yupoo URL.
        </p>
        <div className="mt-4 grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
          <p>Suppliers: {loaded.suppliers.length}</p>
          <p>Brands: {loaded.brands.length}</p>
          <p>Categories: {loaded.categories.length}</p>
          <p>Products: {loaded.productCount}</p>
        </div>
      </header>

      <ImportYupooForm
        action={importYupooAlbumAction}
        initialState={initialImportYupooState}
        suppliers={loaded.suppliers}
        brands={loaded.brands}
        categories={loaded.categories}
      />
    </main>
  );
}
