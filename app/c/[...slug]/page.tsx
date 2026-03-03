import { ImageType } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";
import DbSetupMessage from "@/src/components/db-setup-message";
import { getPrismaSetupErrorMessage } from "@/src/lib/prisma-guard";
import { prisma } from "@/src/lib/prisma";

type CategoryPageProps = {
  params: Promise<{ slug: string[] }>;
  searchParams: Promise<{
    brand?: string | string[];
    supplier?: string | string[];
    hasQC?: string | string[];
  }>;
};

type Breadcrumb = {
  id: string;
  name: string;
  path: string[];
};

const toSingleValue = (value?: string | string[]) =>
  Array.isArray(value) ? value[0] : value;

async function resolveCategoryPath(slugs: string[]) {
  let parentId: string | null = null;
  const breadcrumbs: Breadcrumb[] = [];

  for (const segment of slugs) {
    const foundCategory: { id: string; name: string; slug: string } | null =
      await prisma.category.findFirst({
        where: {
          slug: segment,
          parentId,
        },
        select: {
          id: true,
          name: true,
          slug: true,
        },
      });

    if (!foundCategory) {
      return null;
    }

    const lastPath = breadcrumbs[breadcrumbs.length - 1]?.path ?? [];
    breadcrumbs.push({
      id: foundCategory.id,
      name: foundCategory.name,
      path: [...lastPath, foundCategory.slug],
    });
    parentId = foundCategory.id;
  }

  const resolvedCategory = breadcrumbs[breadcrumbs.length - 1];
  if (!resolvedCategory) {
    return null;
  }

  return { category: resolvedCategory, breadcrumbs };
}

export default async function CategoryPage({
  params,
  searchParams,
}: CategoryPageProps) {
  const loaded = await (async () => {
    try {
      const [{ slug }, filters] = await Promise.all([params, searchParams]);
      const resolvedPath = await resolveCategoryPath(slug);

      if (!resolvedPath) {
        notFound();
      }

      const brandFilter = toSingleValue(filters.brand) ?? "";
      const supplierFilter = toSingleValue(filters.supplier) ?? "";
      const hasQcFilter = toSingleValue(filters.hasQC) === "1";

      const productWhere: Prisma.ProductWhereInput = {
        categories: {
          some: {
            categoryId: resolvedPath.category.id,
          },
        },
      };

      if (brandFilter) {
        productWhere.brand = { slug: brandFilter };
      }

      if (supplierFilter) {
        productWhere.supplier = { slug: supplierFilter };
      }

      if (hasQcFilter) {
        productWhere.OR = [
          { qcSets: { some: {} } },
          { images: { some: { type: ImageType.QC } } },
        ];
      }

      const [products, brands, suppliers] = await Promise.all([
        prisma.product.findMany({
          where: productWhere,
          orderBy: { createdAt: "desc" },
          include: {
            supplier: {
              select: { name: true, slug: true },
            },
            brand: {
              select: { name: true, slug: true },
            },
            _count: {
              select: { qcSets: true },
            },
            images: {
              where: { type: ImageType.QC },
              select: { id: true },
              take: 1,
            },
          },
        }),
        prisma.brand.findMany({
          where: {
            products: {
              some: {
                categories: {
                  some: {
                    categoryId: resolvedPath.category.id,
                  },
                },
              },
            },
          },
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            slug: true,
          },
        }),
        prisma.supplier.findMany({
          where: {
            products: {
              some: {
                categories: {
                  some: {
                    categoryId: resolvedPath.category.id,
                  },
                },
              },
            },
          },
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            slug: true,
          },
        }),
      ]);

      return {
        ok: true as const,
        resolvedPath,
        brandFilter,
        supplierFilter,
        hasQcFilter,
        products,
        brands,
        suppliers,
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
    return <DbSetupMessage title="Category Not Ready Yet" errorMessage={loaded.setupErrorMessage} />;
  }

  const {
    resolvedPath,
    brandFilter,
    supplierFilter,
    hasQcFilter,
    products,
    brands,
    suppliers,
  } = loaded;
  const categoryHref = `/c/${resolvedPath.category.path.join("/")}`;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-6 py-10 sm:px-10">
      <header className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-slate-600">
          <Link href="/" className="hover:text-slate-900">
            Home
          </Link>
          {resolvedPath.breadcrumbs.map((crumb) => (
            <div key={crumb.id} className="flex items-center gap-2">
              <span>/</span>
              <Link href={`/c/${crumb.path.join("/")}`} className="hover:text-slate-900">
                {crumb.name}
              </Link>
            </div>
          ))}
        </div>
        <h1 className="text-2xl font-semibold text-slate-900">{resolvedPath.category.name}</h1>
        <p className="mt-2 text-sm text-slate-600">
          Filter by brand or supplier, and limit to products with QC photos.
        </p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <form className="grid gap-3 sm:grid-cols-4 sm:items-end">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">Brand</span>
            <select
              name="brand"
              defaultValue={brandFilter}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            >
              <option value="">All brands</option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.slug}>
                  {brand.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">Supplier</span>
            <select
              name="supplier"
              defaultValue={supplierFilter}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            >
              <option value="">All suppliers</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.slug}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700">
            <input
              type="checkbox"
              name="hasQC"
              value="1"
              defaultChecked={hasQcFilter}
              className="h-4 w-4 rounded border-slate-300"
            />
            Has QC photos
          </label>
          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              Apply filters
            </button>
            <Link
              href={categoryHref}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Reset
            </Link>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-slate-900">Products</h2>
          <p className="text-sm text-slate-500">{products.length} results</p>
        </div>
        {products.length > 0 ? (
          <div className="grid gap-4">
            {products.map((product) => {
              const hasQc = product._count.qcSets > 0 || product.images.length > 0;

              return (
                <article
                  key={product.id}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">{product.title}</h3>
                      <p className="mt-1 text-sm text-slate-600">
                        Supplier: {product.supplier.name}
                        {product.brand ? ` | Brand: ${product.brand.name}` : ""}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        QC: {hasQc ? "available" : "not uploaded"}
                      </p>
                    </div>
                    <Link
                      href={`/p/${product.id}`}
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                    >
                      Open product
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-slate-600">No products match the current filters.</p>
        )}
      </section>
    </main>
  );
}
