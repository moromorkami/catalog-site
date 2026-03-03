import Link from "next/link";
import { ImageType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import DbSetupMessage from "@/src/components/db-setup-message";
import { getPrismaSetupErrorMessage } from "@/src/lib/prisma-guard";
import { prisma } from "@/src/lib/prisma";
import UploadFields from "./upload-fields";

type CategoryNode = {
  id: string;
  name: string;
  slug: string;
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
        ...category,
        pathLabel: names.join(" / "),
      };
    })
    .sort((a, b) => a.pathLabel.localeCompare(b.pathLabel));
}

export default async function NewProductAdminPage() {
  async function createProduct(formData: FormData) {
    "use server";

    const uploadsReady = String(formData.get("uploadsReady") ?? "1") === "1";
    const title = String(formData.get("title") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const sourceUrl = String(formData.get("sourceUrl") ?? "").trim();
    const yupooUrl = String(formData.get("yupooUrl") ?? "").trim();
    const qcSetTitle = String(formData.get("qcSetTitle") ?? "").trim();
    const qcWarehouse = String(formData.get("qcWarehouse") ?? "").trim();
    const qcNotes = String(formData.get("qcNotes") ?? "").trim();
    const supplierPhotoUrls = formData
      .getAll("supplierPhotoUrls")
      .map(String)
      .map((url) => url.trim())
      .filter(Boolean);
    const qcPhotoUrls = formData
      .getAll("qcPhotoUrls")
      .map(String)
      .map((url) => url.trim())
      .filter(Boolean);
    const supplierId = String(formData.get("supplierId") ?? "").trim();
    const brandIdRaw = String(formData.get("brandId") ?? "").trim();
    const brandId = brandIdRaw || null;
    const selectedCategoryIds = [...new Set(formData.getAll("categoryIds").map(String).filter(Boolean))];

    if (!title || !supplierId || !uploadsReady) {
      redirect("/admin/products/new");
    }

    const product = await prisma.product.create({
      data: {
        title,
        description: description || null,
        sourceUrl: sourceUrl || null,
        yupooUrl: yupooUrl || null,
        supplier: {
          connect: { id: supplierId },
        },
        ...(brandId
          ? {
              brand: {
                connect: { id: brandId },
              },
            }
          : {}),
        ...(selectedCategoryIds.length > 0
          ? {
              categories: {
                create: selectedCategoryIds.map((categoryId) => ({
                  category: {
                    connect: { id: categoryId },
                  },
                })),
              },
            }
          : {}),
      },
    });

    if (supplierPhotoUrls.length > 0) {
      await prisma.productImage.createMany({
        data: supplierPhotoUrls.map((url, index) => ({
          productId: product.id,
          type: ImageType.SUPPLIER,
          url,
          sortOrder: index + 1,
        })),
      });
    }

    if (qcPhotoUrls.length > 0) {
      const qcSet = await prisma.qcSet.create({
        data: {
          productId: product.id,
          title: qcSetTitle || "Initial QC Set",
          warehouse: qcWarehouse || null,
          notes: qcNotes || null,
        },
      });

      await prisma.productImage.createMany({
        data: qcPhotoUrls.map((url, index) => ({
          productId: product.id,
          type: ImageType.QC,
          qcSetId: qcSet.id,
          url,
          sortOrder: index + 1,
        })),
      });
    }

    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath("/admin/products/new");
    revalidatePath(`/p/${product.id}`);
    redirect(`/p/${product.id}`);
  }

  const loaded = await (async () => {
    try {
      const [suppliers, brands, categories, recentProducts] = await Promise.all([
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
            slug: true,
            parentId: true,
          },
        }),
        prisma.product.findMany({
          orderBy: { createdAt: "desc" },
          take: 12,
          include: {
            supplier: {
              select: { name: true },
            },
            brand: {
              select: { name: true },
            },
          },
        }),
      ]);

      return {
        ok: true as const,
        suppliers,
        brands,
        categoryPaths: buildCategoryPaths(categories),
        recentProducts,
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
    return <DbSetupMessage title="Products Not Ready Yet" errorMessage={loaded.setupErrorMessage} />;
  }

  const { suppliers, brands, categoryPaths, recentProducts } = loaded;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-6 py-10 sm:px-10">
      <header className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-900">Create Product</h1>
          <Link href="/admin" className="text-sm font-medium text-slate-600 hover:text-slate-900">
            Back to admin
          </Link>
        </div>
        <p className="mt-2 text-sm text-slate-600">
          Minimal product creation form with supplier, brand, and category assignment.
        </p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <form action={createProduct} className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block font-medium text-slate-700">Title</span>
              <input
                name="title"
                required
                placeholder="USB-C Shielded Connector Kit"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium text-slate-700">Supplier</span>
              <select
                name="supplierId"
                required
                defaultValue=""
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
              >
                <option value="" disabled>
                  Select supplier
                </option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium text-slate-700">Brand (optional)</span>
              <select
                name="brandId"
                defaultValue=""
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
              >
                <option value="">No brand</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium text-slate-700">Source URL (optional)</span>
              <input
                name="sourceUrl"
                type="url"
                placeholder="https://example.com/product"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
              />
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="mb-1 block font-medium text-slate-700">Yupoo URL (optional)</span>
              <input
                name="yupooUrl"
                type="url"
                placeholder="https://example.yupoo.com/albums/123"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
              />
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="mb-1 block font-medium text-slate-700">Description (optional)</span>
              <textarea
                name="description"
                rows={3}
                placeholder="Short product description"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
              />
            </label>
          </div>

          <UploadFields />

          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">Assign categories</p>
            <div className="max-h-56 overflow-y-auto rounded-md border border-slate-300 p-3">
              {categoryPaths.length > 0 ? (
                <div className="grid gap-2">
                  {categoryPaths.map((category) => (
                    <label key={category.id} className="flex items-center gap-2 text-sm text-slate-700">
                      <input type="checkbox" name="categoryIds" value={category.id} className="h-4 w-4" />
                      {category.pathLabel}
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No categories yet.</p>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={suppliers.length === 0}
              className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              Create product
            </button>
            {suppliers.length === 0 ? (
              <p className="mt-2 text-xs text-slate-500">
                Create at least one supplier before adding products.
              </p>
            ) : null}
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Recent products</h2>
          <p className="text-sm text-slate-500">{recentProducts.length} records</p>
        </div>
        {recentProducts.length > 0 ? (
          <div className="grid gap-3">
            {recentProducts.map((product) => (
              <article key={product.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{product.title}</p>
                    <p className="text-xs text-slate-600">
                      Supplier: {product.supplier.name}
                      {product.brand ? ` | Brand: ${product.brand.name}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/products/${product.id}`}
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                    >
                      Edit media
                    </Link>
                    <Link
                      href={`/p/${product.id}`}
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                    >
                      Open
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-600">No products yet.</p>
        )}
      </section>
    </main>
  );
}
