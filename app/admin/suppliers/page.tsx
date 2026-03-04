import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import DbSetupMessage from "@/src/components/db-setup-message";
import { getPrismaSetupErrorMessage } from "@/src/lib/prisma-guard";
import { prisma } from "@/src/lib/prisma";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default async function SuppliersAdminPage() {
  async function createSupplier(formData: FormData) {
    "use server";

    const name = String(formData.get("name") ?? "").trim();
    const sourceUrlValue = String(formData.get("sourceUrl") ?? "").trim();

    if (!name) {
      redirect("/admin/suppliers");
    }

    const baseSlug = slugify(name) || "supplier";
    let slug = baseSlug;
    let suffix = 1;

    while (await prisma.supplier.findUnique({ where: { slug }, select: { id: true } })) {
      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    await prisma.supplier.create({
      data: {
        name,
        slug,
        sourceUrl: sourceUrlValue || null,
      },
    });

    revalidatePath("/admin");
    revalidatePath("/admin/suppliers");
    revalidatePath("/admin/products/new");
    redirect("/admin/suppliers");
  }

  const loaded = await (async () => {
    try {
      const suppliers = await prisma.supplier.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          slug: true,
          sourceUrl: true,
          createdAt: true,
        },
      });

      return { ok: true as const, suppliers };
    } catch (error) {
      const setupErrorMessage = getPrismaSetupErrorMessage(error);
      if (setupErrorMessage) {
        return { ok: false as const, setupErrorMessage };
      }

      throw error;
    }
  })();

  if (!loaded.ok) {
    return <DbSetupMessage title="Suppliers Not Ready Yet" errorMessage={loaded.setupErrorMessage} />;
  }

  const { suppliers } = loaded;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-6 py-10 sm:px-10">
      <header className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-900">Suppliers</h1>
          <Link href="/admin" className="text-sm font-medium text-slate-600 hover:text-slate-900">
            Back to admin
          </Link>
        </div>
        <p className="mt-2 text-sm text-slate-600">Create suppliers and review existing records.</p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Create supplier</h2>
        <form action={createSupplier} className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm sm:col-span-1">
            <span className="mb-1 block font-medium text-slate-700">Name</span>
            <input
              name="name"
              required
              placeholder="North Harbor Components"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
            />
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="mb-1 block font-medium text-slate-700">Source URL (optional)</span>
            <input
              name="sourceUrl"
              type="url"
              placeholder="https://example.com/supplier"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
            />
          </label>
          <div className="sm:col-span-3">
            <button
              type="submit"
              className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              Create supplier
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Existing suppliers</h2>
          <p className="text-sm text-slate-500">{suppliers.length} records</p>
        </div>
        {suppliers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-slate-500">
                <tr>
                  <th className="pb-2 pr-4 font-medium">Name</th>
                  <th className="pb-2 pr-4 font-medium">Slug</th>
                  <th className="pb-2 pr-4 font-medium">Source</th>
                  <th className="pb-2 font-medium">Created</th>
                </tr>
              </thead>
              <tbody className="text-slate-700">
                {suppliers.map((supplier: any) => (
                  <tr key={supplier.id} className="border-t border-slate-100">
                    <td className="py-2 pr-4">{supplier.name}</td>
                    <td className="py-2 pr-4">{supplier.slug}</td>
                    <td className="py-2 pr-4">
                      {supplier.sourceUrl ? (
                        <a
                          href={supplier.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-slate-900 underline"
                        >
                          Link
                        </a>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-2">{supplier.createdAt.toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-slate-600">No suppliers yet.</p>
        )}
      </section>
    </main>
  );
}
