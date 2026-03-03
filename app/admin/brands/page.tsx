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

export default async function BrandsAdminPage() {
  async function createBrand(formData: FormData) {
    "use server";

    const name = String(formData.get("name") ?? "").trim();
    if (!name) {
      redirect("/admin/brands");
    }

    const baseSlug = slugify(name) || "brand";
    let slug = baseSlug;
    let suffix = 1;

    while (await prisma.brand.findUnique({ where: { slug }, select: { id: true } })) {
      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    await prisma.brand.create({
      data: {
        name,
        slug,
      },
    });

    revalidatePath("/admin");
    revalidatePath("/admin/brands");
    revalidatePath("/admin/products/new");
    redirect("/admin/brands");
  }

  const loaded = await (async () => {
    try {
      const brands = await prisma.brand.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          slug: true,
          createdAt: true,
        },
      });

      return { ok: true as const, brands };
    } catch (error) {
      const setupErrorMessage = getPrismaSetupErrorMessage(error);
      if (setupErrorMessage) {
        return { ok: false as const, setupErrorMessage };
      }

      throw error;
    }
  })();

  if (!loaded.ok) {
    return <DbSetupMessage title="Brands Not Ready Yet" errorMessage={loaded.setupErrorMessage} />;
  }

  const { brands } = loaded;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-6 py-10 sm:px-10">
      <header className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-900">Brands</h1>
          <Link href="/admin" className="text-sm font-medium text-slate-600 hover:text-slate-900">
            Back to admin
          </Link>
        </div>
        <p className="mt-2 text-sm text-slate-600">Create brands used by catalog products.</p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Create brand</h2>
        <form action={createBrand} className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">Name</span>
            <input
              name="name"
              required
              placeholder="Acme"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
            />
          </label>
          <div className="sm:self-end">
            <button
              type="submit"
              className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              Create brand
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Existing brands</h2>
          <p className="text-sm text-slate-500">{brands.length} records</p>
        </div>
        {brands.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-slate-500">
                <tr>
                  <th className="pb-2 pr-4 font-medium">Name</th>
                  <th className="pb-2 pr-4 font-medium">Slug</th>
                  <th className="pb-2 font-medium">Created</th>
                </tr>
              </thead>
              <tbody className="text-slate-700">
                {brands.map((brand) => (
                  <tr key={brand.id} className="border-t border-slate-100">
                    <td className="py-2 pr-4">{brand.name}</td>
                    <td className="py-2 pr-4">{brand.slug}</td>
                    <td className="py-2">{brand.createdAt.toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-slate-600">No brands yet.</p>
        )}
      </section>
    </main>
  );
}
