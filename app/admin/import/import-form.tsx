"use client";

import { useActionState } from "react";
import { importCsvAction, initialImportState } from "./actions";

export default function ImportForm() {
  const [state, formAction, isPending] = useActionState(importCsvAction, initialImportState);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Import CSV</h2>
      <p className="mt-2 text-sm text-slate-600">
        Upload a CSV with suppliers, brands, categories, products, and supplier images.
      </p>

      <form action={formAction} className="mt-4 grid gap-3" encType="multipart/form-data">
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-700">CSV file</span>
          <input
            type="file"
            name="file"
            accept=".csv,text/csv"
            required
            disabled={isPending}
            className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 file:mr-3 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-slate-700 disabled:cursor-not-allowed"
          />
        </label>

        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isPending ? "Importing..." : "Run import"}
          </button>
          <span className="text-xs text-slate-500">Max 2000 rows, 5MB file.</span>
        </div>
      </form>

      {state.status !== "idle" ? (
        <div className="mt-5 space-y-4">
          <div
            className={
              state.status === "error"
                ? "rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"
                : state.status === "partial"
                  ? "rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
                  : "rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
            }
          >
            {state.message}
          </div>

          {state.summary ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-semibold text-slate-900">Summary</h3>
              <dl className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
                <div className="flex items-center justify-between gap-4">
                  <dt>Rows total</dt>
                  <dd className="font-medium">{state.summary.rowsTotal}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt>Rows succeeded</dt>
                  <dd className="font-medium">{state.summary.rowsSucceeded}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt>Rows failed</dt>
                  <dd className="font-medium">{state.summary.rowsFailed}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt>Suppliers created</dt>
                  <dd className="font-medium">{state.summary.suppliersCreated}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt>Brands created</dt>
                  <dd className="font-medium">{state.summary.brandsCreated}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt>Categories created</dt>
                  <dd className="font-medium">{state.summary.categoriesCreated}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt>Products created</dt>
                  <dd className="font-medium">{state.summary.productsCreated}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt>Supplier images created</dt>
                  <dd className="font-medium">{state.summary.imagesCreated}</dd>
                </div>
              </dl>
            </div>
          ) : null}

          {state.errors.length > 0 ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <h3 className="text-sm font-semibold text-red-900">Row errors</h3>
              <ul className="mt-3 max-h-72 space-y-2 overflow-y-auto text-xs text-red-800">
                {state.errors.map((error) => (
                  <li key={`${error.row}-${error.title}`} className="rounded border border-red-200 bg-white p-2">
                    Row {error.row} ({error.title}): {error.error}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
