"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { ImportYupooActionState, ImportYupooFormAction } from "./state";

type SimpleOption = {
  id: string;
  name: string;
};

type CategoryOption = {
  id: string;
  pathLabel: string;
};

type ImportYupooFormProps = {
  action: ImportYupooFormAction;
  initialState: ImportYupooActionState;
  suppliers: SimpleOption[];
  brands: SimpleOption[];
  categories: CategoryOption[];
};

export default function ImportYupooForm({
  action,
  initialState,
  suppliers,
  brands,
  categories,
}: ImportYupooFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Import from Yupoo album</h2>
      <p className="mt-2 text-sm text-slate-600">
        Paste a Yupoo album URL and create one product with imported supplier images.
      </p>

      <form action={formAction} className="mt-4 grid gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm sm:col-span-2">
            <span className="mb-1 block font-medium text-slate-700">Yupoo album URL</span>
            <input
              name="yupooUrl"
              type="url"
              required
              disabled={isPending}
              placeholder="https://example.x.yupoo.com/albums/12345"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 disabled:cursor-not-allowed"
            />
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">Supplier</span>
            <select
              name="supplierId"
              required
              defaultValue=""
              disabled={isPending}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 disabled:cursor-not-allowed"
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
              disabled={isPending}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 disabled:cursor-not-allowed"
            >
              <option value="">No brand</option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">Categories (optional)</p>
          <div className="max-h-56 overflow-y-auto rounded-md border border-slate-300 p-3">
            {categories.length > 0 ? (
              <div className="grid gap-2">
                {categories.map((category) => (
                  <label key={category.id} className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      name="categoryIds"
                      value={category.id}
                      disabled={isPending}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    {category.pathLabel}
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No categories yet.</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={isPending || suppliers.length === 0}
            className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isPending ? "Importing..." : "Import album"}
          </button>
          <span className="text-xs text-slate-500">
            Uses server-side fetch with timeout and custom user-agent.
          </span>
        </div>

        {suppliers.length === 0 ? (
          <p className="text-xs text-slate-500">
            Create at least one supplier before running the importer.
          </p>
        ) : null}
      </form>

      {state.status !== "idle" ? (
        <div className="mt-5 space-y-4">
          <div
            className={
              state.status === "error"
                ? "rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"
                : "rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
            }
          >
            {state.message}
          </div>

          {state.result ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-semibold text-slate-900">Created product</h3>
              <dl className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
                <div className="flex items-center justify-between gap-4">
                  <dt>Title</dt>
                  <dd className="font-medium">{state.result.productTitle}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt>Supplier photos</dt>
                  <dd className="font-medium">{state.result.imageCount}</dd>
                </div>
              </dl>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href={`/p/${state.result.productId}`}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  Open product page
                </Link>
                <Link
                  href={`/admin/products/${state.result.productId}`}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  Edit media
                </Link>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
