import Link from "next/link";
import DbSetupMessage from "@/src/components/db-setup-message";
import { getPrismaSetupErrorMessage } from "@/src/lib/prisma-guard";
import { prisma } from "@/src/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type TopCategoryRow = {
  id: string;
  slug: string;
  name: string;
  _count: {
    productCategories: number;
    children: number;
  };
};

type RecentProductRow = {
  id: string;
  title: string;
  supplier: { name: string };
  brand: { name: string } | null;
  categories: Array<{ category: { name: string } }>;
};

export default async function Home() {
  const loaded = await (async () => {
    try {
      const [topCategories, recentProducts] = await Promise.all([
        prisma.category.findMany({
          where: { parentId: null },
          orderBy: { name: "asc" },
          take: 8,
          include: {
            _count: {
              select: {
                productCategories: true,
                children: true,
              },
            },
          },
        }),
        prisma.product.findMany({
          orderBy: { createdAt: "desc" },
          take: 8,
          include: {
            supplier: {
              select: { name: true },
            },
            brand: {
              select: { name: true },
            },
            categories: {
              take: 2,
              include: {
                category: {
                  select: { name: true },
                },
              },
            },
          },
        }),
      ]);

      return { ok: true as const, topCategories, recentProducts };
    } catch (error) {
      const setupErrorMessage = getPrismaSetupErrorMessage(error);
      if (setupErrorMessage) {
        return { ok: false as const, setupErrorMessage };
      }

      throw error;
    }
  })();

  if (!loaded.ok) {
    return <DbSetupMessage title="Catalog Not Ready Yet" errorMessage={loaded.setupErrorMessage} />;
  }

  const { topCategories, recentProducts } = loaded;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 px-6 py-10 sm:px-10">
      <header className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Catalog MVP
          </h1>
          <Link
            href="/admin"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Admin
          </Link>
        </div>
        <p className="mb-5 text-sm text-slate-600">
          Browse categories and product mock pages. Search is UI-only for now.
        </p>
        <label className="block text-sm font-medium text-slate-700" htmlFor="search">
          Search catalog
        </label>
        <input
          id="search"
          type="search"
          placeholder="Try: connector, bolt, carton..."
          className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-0 transition focus:border-slate-500"
        />
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-slate-900">Top Categories</h2>
          <p className="text-sm text-slate-500">{topCategories.length} shown</p>
        </div>
        {topCategories.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {topCategories.map((category: TopCategoryRow) => (
              <Link
                key={category.id}
                href={`/c/${category.slug}`}
                className="rounded-lg border border-slate-200 bg-slate-50 p-4 hover:bg-slate-100"
              >
                <p className="text-sm font-semibold text-slate-900">{category.name}</p>
                <p className="mt-1 text-sm text-slate-600">
                  {category._count.productCategories} products
                  {category._count.children > 0 ? ` | ${category._count.children} subcategories` : ""}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-600">No categories yet. Create one in the admin area.</p>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-slate-900">Recent Products</h2>
          <p className="text-sm text-slate-500">{recentProducts.length} shown</p>
        </div>
        {recentProducts.length > 0 ? (
          <div className="grid gap-3">
            {recentProducts.map((product: RecentProductRow) => (
              <article key={product.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">{product.title}</h3>
                    <p className="mt-1 text-sm text-slate-600">
                      Supplier: {product.supplier.name}
                      {product.brand ? ` | Brand: ${product.brand.name}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {product.categories
                        .map((item: { category: { name: string } }) => item.category.name)
                        .join(", ") || "No categories assigned"}
                    </p>
                  </div>
                  <Link
                    href={`/p/${product.id}`}
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                  >
                    View
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-600">No products yet. Add one under Admin.</p>
        )}
      </section>
    </main>
  );
}
