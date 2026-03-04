import Link from "next/link";
import { notFound } from "next/navigation";
import DbSetupMessage from "@/src/components/db-setup-message";
import { getPrismaSetupErrorMessage } from "@/src/lib/prisma-guard";
import { prisma } from "@/src/lib/prisma";
import {
  deleteProductImageAction,
  reorderQcSetImagesAction,
  reorderSupplierImagesAction,
  updateQcSetAction,
} from "./actions";
import SortableImageList from "./sortable-image-list";

const IMAGE_TYPE_SUPPLIER = "SUPPLIER" as const;
const IMAGE_TYPE_QC = "QC" as const;

type ProductEditPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string; message?: string }>;
};

export default async function ProductEditAdminPage({ params, searchParams }: ProductEditPageProps) {
  const { id } = await params;
  const query = await searchParams;

  const loaded = await (async () => {
    try {
      const product = await prisma.product.findUnique({
        where: { id },
        include: {
          supplier: {
            select: {
              id: true,
              name: true,
            },
          },
          brand: {
            select: {
              id: true,
              name: true,
            },
          },
          images: {
            where: {
              type: IMAGE_TYPE_SUPPLIER,
            },
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
            select: {
              id: true,
              url: true,
              sortOrder: true,
            },
          },
          qcSets: {
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              title: true,
              warehouse: true,
              notes: true,
              images: {
                where: {
                  type: IMAGE_TYPE_QC,
                },
                orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
                select: {
                  id: true,
                  url: true,
                  sortOrder: true,
                },
              },
            },
          },
        },
      });

      if (!product) {
        notFound();
      }

      return { ok: true as const, product };
    } catch (error) {
      const setupErrorMessage = getPrismaSetupErrorMessage(error);
      if (setupErrorMessage) {
        return { ok: false as const, setupErrorMessage };
      }

      throw error;
    }
  })();

  if (!loaded.ok) {
    return <DbSetupMessage title="Product Media Not Ready Yet" errorMessage={loaded.setupErrorMessage} />;
  }

  const { product } = loaded;
  const status = query.status === "error" ? "error" : "";
  const message = typeof query.message === "string" ? query.message : "";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-6 py-10 sm:px-10">
      <header className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Edit Product Media</h1>
            <p className="mt-2 text-sm text-slate-600">{product.title}</p>
            <p className="mt-1 text-xs text-slate-500">
              Supplier: {product.supplier.name}
              {product.brand ? ` | Brand: ${product.brand.name}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin/products/new"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Back to products
            </Link>
            <Link
              href={`/p/${product.id}`}
              className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              View product page
            </Link>
          </div>
        </div>
      </header>

      {status === "error" && message ? (
        <section className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {message}
        </section>
      ) : null}

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Supplier Images</h2>
        <p className="mt-2 text-sm text-slate-600">Drag and drop images to reorder them, then click Save order.</p>
        <div className="mt-4">
          <SortableImageList
            productId={product.id}
            images={product.images}
            reorderAction={reorderSupplierImagesAction}
            deleteAction={deleteProductImageAction}
            emptyMessage="No supplier images uploaded yet."
            groupLabel="Supplier image"
          />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">QC Sets</h2>
        <p className="mt-2 text-sm text-slate-600">Edit QC set fields and manage image order per set.</p>

        <div className="mt-4 grid gap-4">
          {product.qcSets.length > 0 ? (
            product.qcSets.map((qcSet, index) => (
              <article key={qcSet.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-base font-semibold text-slate-900">QC Set #{index + 1}</h3>

                <form action={updateQcSetAction} className="mt-3 grid gap-3 sm:grid-cols-2">
                  <input type="hidden" name="productId" value={product.id} />
                  <input type="hidden" name="qcSetId" value={qcSet.id} />
                  <label className="text-sm">
                    <span className="mb-1 block font-medium text-slate-700">Title</span>
                    <input
                      name="title"
                      defaultValue={qcSet.title ?? ""}
                      placeholder="Initial QC Set"
                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                    />
                  </label>
                  <label className="text-sm">
                    <span className="mb-1 block font-medium text-slate-700">Warehouse</span>
                    <input
                      name="warehouse"
                      defaultValue={qcSet.warehouse ?? ""}
                      placeholder="Warehouse A"
                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                    />
                  </label>
                  <label className="text-sm sm:col-span-2">
                    <span className="mb-1 block font-medium text-slate-700">Notes</span>
                    <textarea
                      name="notes"
                      rows={2}
                      defaultValue={qcSet.notes ?? ""}
                      placeholder="Optional notes for this QC set"
                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                    />
                  </label>
                  <div className="sm:col-span-2">
                    <button
                      type="submit"
                      className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                    >
                      Save QC set
                    </button>
                  </div>
                </form>

                <div className="mt-4">
                  <SortableImageList
                    productId={product.id}
                    qcSetId={qcSet.id}
                    images={qcSet.images}
                    reorderAction={reorderQcSetImagesAction}
                    deleteAction={deleteProductImageAction}
                    emptyMessage="No QC images in this set."
                    groupLabel="QC image"
                  />
                </div>
              </article>
            ))
          ) : (
            <p className="text-sm text-slate-600">No QC sets yet.</p>
          )}
        </div>
      </section>
    </main>
  );
}