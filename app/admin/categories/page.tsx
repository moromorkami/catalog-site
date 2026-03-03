import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import DbSetupMessage from "@/src/components/db-setup-message";
import { getPrismaSetupErrorMessage } from "@/src/lib/prisma-guard";
import { prisma } from "@/src/lib/prisma";

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  createdAt: Date;
  _count: {
    children: number;
    productCategories: number;
  };
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildCategoryPaths(categories: CategoryRow[]) {
  const byId = new Map(categories.map((category) => [category.id, category]));

  return categories
    .map((category) => {
      const nameSegments: string[] = [];
      const slugSegments: string[] = [];
      const seen = new Set<string>();
      let cursor: CategoryRow | undefined = category;

      while (cursor) {
        if (seen.has(cursor.id)) {
          break;
        }
        seen.add(cursor.id);
        nameSegments.unshift(cursor.name);
        slugSegments.unshift(cursor.slug);
        cursor = cursor.parentId ? byId.get(cursor.parentId) : undefined;
      }

      return {
        ...category,
        pathLabel: nameSegments.join(" / "),
        pathSlugs: slugSegments,
      };
    })
    .sort((a, b) => a.pathLabel.localeCompare(b.pathLabel));
}

export default async function CategoriesAdminPage() {
  async function createCategory(formData: FormData) {
    "use server";

    const name = String(formData.get("name") ?? "").trim();
    const parentIdRaw = String(formData.get("parentId") ?? "").trim();
    const parentId = parentIdRaw || null;

    if (!name) {
      redirect("/admin/categories");
    }

    if (parentId) {
      const parentExists = await prisma.category.findUnique({
        where: { id: parentId },
        select: { id: true },
      });
      if (!parentExists) {
        redirect("/admin/categories");
      }
    }

    const baseSlug = slugify(name) || "category";
    let slug = baseSlug;
    let suffix = 1;

    while (
      await prisma.category.findFirst({
        where: { parentId, slug },
        select: { id: true },
      })
    ) {
      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    await prisma.category.create({
      data: {
        name,
        slug,
        parentId,
      },
    });

    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath("/admin/categories");
    revalidatePath("/admin/products/new");
    redirect("/admin/categories");
  }

  const loaded = await (async () => {
    try {
      const categories = await prisma.category.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          slug: true,
          parentId: true,
          createdAt: true,
          _count: {
            select: {
              children: true,
              productCategories: true,
            },
          },
        },
      });

      return { ok: true as const, categoryPaths: buildCategoryPaths(categories) };
    } catch (error) {
      const setupErrorMessage = getPrismaSetupErrorMessage(error);
      if (setupErrorMessage) {
        return { ok: false as const, setupErrorMessage };
      }

      throw error;
    }
  })();

  if (!loaded.ok) {
    return <DbSetupMessage title="Categories Not Ready Yet" errorMessage={loaded.setupErrorMessage} />;
  }

  const { categoryPaths } = loaded;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-6 py-10 sm:px-10">
      <header className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-900">Categories</h1>
          <Link href="/admin" className="text-sm font-medium text-slate-600 hover:text-slate-900">
            Back to admin
          </Link>
        </div>
        <p className="mt-2 text-sm text-slate-600">Create category tree with optional parent links.</p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Create category</h2>
        <form action={createCategory} className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">Name</span>
            <input
              name="name"
              required
              placeholder="Connectors"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">Parent category</span>
            <select
              name="parentId"
              defaultValue=""
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            >
              <option value="">None (top-level)</option>
              {categoryPaths.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.pathLabel}
                </option>
              ))}
            </select>
          </label>
          <div className="sm:self-end">
            <button
              type="submit"
              className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              Create category
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Existing categories</h2>
          <p className="text-sm text-slate-500">{categoryPaths.length} records</p>
        </div>
        {categoryPaths.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-slate-500">
                <tr>
                  <th className="pb-2 pr-4 font-medium">Category path</th>
                  <th className="pb-2 pr-4 font-medium">Slug path</th>
                  <th className="pb-2 pr-4 font-medium">Products</th>
                  <th className="pb-2 pr-4 font-medium">Children</th>
                  <th className="pb-2 font-medium">Created</th>
                </tr>
              </thead>
              <tbody className="text-slate-700">
                {categoryPaths.map((category) => (
                  <tr key={category.id} className="border-t border-slate-100">
                    <td className="py-2 pr-4">
                      <Link
                        href={`/c/${category.pathSlugs.join("/")}`}
                        className="text-slate-900 underline"
                      >
                        {category.pathLabel}
                      </Link>
                    </td>
                    <td className="py-2 pr-4 text-xs text-slate-500">{category.pathSlugs.join("/")}</td>
                    <td className="py-2 pr-4">{category._count.productCategories}</td>
                    <td className="py-2 pr-4">{category._count.children}</td>
                    <td className="py-2">{category.createdAt.toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-slate-600">No categories yet.</p>
        )}
      </section>
    </main>
  );
}
