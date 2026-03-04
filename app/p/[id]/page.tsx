import Link from "next/link";
import { notFound } from "next/navigation";
import DbSetupMessage from "@/src/components/db-setup-message";
import { getPrismaSetupErrorMessage } from "@/src/lib/prisma-guard";
import { prisma } from "@/src/lib/prisma";
import PhotoTabs from "./photo-tabs";

const IMAGE_TYPE_SUPPLIER = "SUPPLIER" as const;
const IMAGE_TYPE_QC = "QC" as const;

type ProductPageProps = {
  params: Promise<{ id: string }>;
};

type CategoryNode = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
};

function buildCategoryPath(
  categoryId: string,
  categoryById: Map<string, CategoryNode>,
) {
  const segments: CategoryNode[] = [];
  let currentId: string | null = categoryId;

  while (currentId) {
    const current = categoryById.get(currentId);
    if (!current) {
      break;
    }

    segments.unshift(current);
    currentId = current.parentId;
  }

  return {
    label: segments.map((segment) => segment.name).join(" / "),
    href: `/c/${segments.map((segment) => segment.slug).join("/")}`,
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const loaded = await (async () => {
    try {
      const { id } = await params;

      const product = await prisma.product.findUnique({
        where: { id },
        include: {
          supplier: {
            select: {
              name: true,
              slug: true,
              sourceUrl: true,
            },
          },
          brand: {
            select: {
              name: true,
              slug: true,
            },
          },
          categories: {
            include: {
              category: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  parentId: true,
                },
              },
            },
          },
          images: {
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          },
          qcSets: {
            orderBy: { createdAt: "desc" },
            include: {
              images: {
                orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
              },
            },
          },
        },
      });

      if (!product) {
        notFound();
      }

      const allCategories = await prisma.category.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
          parentId: true,
        },
      });

      const categoryById: Map<string, CategoryNode> = new Map(
  (allCategories as any[]).map(
    (category) => [String(category.id), category as CategoryNode] as [string, CategoryNode],
  ),
);

const categoryPaths = (product.categories as any[]).map((item) =>
  buildCategoryPath(String(item.category.id), categoryById),
);

      const supplierPhotos = (product.images as any[])
  .filter((image: any) => image.type === IMAGE_TYPE_SUPPLIER)
  .map((image: any, index: number) => ({
          id: image.id,
          url: image.url,
          label: `Supplier photo ${index + 1}`,
        }));

      const unassignedQcPhotos = product.images
        .filter((image: any) => image.type === IMAGE_TYPE_QC && !image.qcSetId)
        .map((image, index) => ({
          id: image.id,
          url: image.url,
          label: `QC photo ${index + 1}`,
        }));

      const qcSets = product.qcSets.map((set, index) => ({
        id: set.id,
        title: set.title || `QC set ${index + 1}`,
        warehouse: set.warehouse,
        notes: set.notes,
        photos: set.images.map((image, imageIndex) => ({
          id: image.id,
          url: image.url,
          label: `QC photo ${imageIndex + 1}`,
        })),
      }));

      return {
        ok: true as const,
        product,
        categoryPaths,
        supplierPhotos,
        unassignedQcPhotos,
        qcSets,
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
    return <DbSetupMessage title="Product Not Ready Yet" errorMessage={loaded.setupErrorMessage} />;
  }

  const { product, categoryPaths, supplierPhotos, unassignedQcPhotos, qcSets } = loaded;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-6 py-10 sm:px-10">
      <header className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-slate-600">
          <Link href="/" className="hover:text-slate-900">
            Home
          </Link>
          <span>/</span>
          <span className="text-slate-500">Product</span>
        </div>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">{product.title}</h1>
            <p className="mt-2 text-sm text-slate-600">
              Supplier:{" "}
              <Link href="/admin/suppliers" className="font-medium hover:text-slate-900">
                {product.supplier.name}
              </Link>
              {product.brand ? ` | Brand: ${product.brand.name}` : ""}
            </p>
            {product.description ? (
              <p className="mt-2 text-sm text-slate-600">{product.description}</p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              {categoryPaths.length > 0 ? (
                categoryPaths.map((category: any) => (
                  <Link
                    key={category.href}
                    href={category.href}
                    className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
                  >
                    {category.label}
                  </Link>
                ))
              ) : (
                <span className="text-xs text-slate-500">No categories assigned.</span>
              )}
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <p>Product ID: {product.id}</p>
            <p className="mt-3">
              <Link
                href={`/checkout?productId=${product.id}`}
                className="inline-flex rounded-md bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-700"
              >
                Order via us
              </Link>
            </p>
            {product.sourceUrl ? (
              <p className="mt-1">
                <a
                  href={product.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-slate-900 underline"
                >
                  Source URL
                </a>
              </p>
            ) : null}
            {product.yupooUrl ? (
              <p className="mt-1">
                <a
                  href={product.yupooUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-slate-900 underline"
                >
                  Yupoo URL
                </a>
              </p>
            ) : null}
            {product.supplier.sourceUrl ? (
              <p className="mt-1">
                <a
                  href={product.supplier.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-slate-900 underline"
                >
                  Supplier source
                </a>
              </p>
            ) : null}
          </div>
        </div>
      </header>

      <PhotoTabs
        productName={product.title}
        supplierPhotos={supplierPhotos}
        qcPhotos={unassignedQcPhotos}
        qcSets={qcSets}
      />
    </main>
  );
}
