"use client";

import { useMemo, useState } from "react";

type UploadState = {
  supplierUrls: string[];
  qcUrls: string[];
  error: string | null;
  uploadingSupplier: boolean;
  uploadingQc: boolean;
};

const initialState: UploadState = {
  supplierUrls: [],
  qcUrls: [],
  error: null,
  uploadingSupplier: false,
  uploadingQc: false,
};

async function uploadFiles(files: File[]): Promise<string[]> {
  if (files.length === 0) {
    return [];
  }

  const formData = new FormData();
  for (const file of files) {
    formData.append("files", file);
  }

  const response = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error || "Upload failed.");
  }

  return Array.isArray(payload.urls) ? payload.urls : [];
}

export default function UploadFields() {
  const [state, setState] = useState<UploadState>(initialState);

  const canSubmit = useMemo(
    () => !state.uploadingSupplier && !state.uploadingQc,
    [state.uploadingQc, state.uploadingSupplier],
  );

  async function handleUpload(
    event: React.ChangeEvent<HTMLInputElement>,
    type: "supplier" | "qc",
  ) {
    const selectedFiles = Array.from(event.target.files ?? []);
    if (selectedFiles.length === 0) {
      return;
    }

    setState((prev) => ({
      ...prev,
      error: null,
      uploadingSupplier: type === "supplier" ? true : prev.uploadingSupplier,
      uploadingQc: type === "qc" ? true : prev.uploadingQc,
    }));

    try {
      const urls = await uploadFiles(selectedFiles);
      setState((prev) => ({
        ...prev,
        supplierUrls:
          type === "supplier" ? [...prev.supplierUrls, ...urls] : prev.supplierUrls,
        qcUrls: type === "qc" ? [...prev.qcUrls, ...urls] : prev.qcUrls,
      }));
      event.target.value = "";
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed.";
      setState((prev) => ({ ...prev, error: message }));
    } finally {
      setState((prev) => ({
        ...prev,
        uploadingSupplier: type === "supplier" ? false : prev.uploadingSupplier,
        uploadingQc: type === "qc" ? false : prev.uploadingQc,
      }));
    }
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <h3 className="text-sm font-semibold text-slate-900">Upload images</h3>
      <p className="mt-1 text-xs text-slate-600">
        Files upload immediately to `/api/upload`, then are attached on product create.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-700">Supplier photos</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={(event) => void handleUpload(event, "supplier")}
            disabled={state.uploadingSupplier}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          />
          <p className="mt-1 text-xs text-slate-500">
            {state.uploadingSupplier
              ? "Uploading supplier photos..."
              : `${state.supplierUrls.length} uploaded`}
          </p>
        </label>

        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-700">QC photos</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={(event) => void handleUpload(event, "qc")}
            disabled={state.uploadingQc}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          />
          <p className="mt-1 text-xs text-slate-500">
            {state.uploadingQc ? "Uploading QC photos..." : `${state.qcUrls.length} uploaded`}
          </p>
        </label>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <label className="text-sm sm:col-span-1">
          <span className="mb-1 block font-medium text-slate-700">QC set title</span>
          <input
            name="qcSetTitle"
            placeholder="Initial QC Set"
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
          />
        </label>
        <label className="text-sm sm:col-span-1">
          <span className="mb-1 block font-medium text-slate-700">Warehouse (optional)</span>
          <input
            name="qcWarehouse"
            placeholder="WH-01"
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
          />
        </label>
        <label className="text-sm sm:col-span-1">
          <span className="mb-1 block font-medium text-slate-700">QC notes (optional)</span>
          <input
            name="qcNotes"
            placeholder="Visual check passed"
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
          />
        </label>
      </div>

      {!canSubmit ? (
        <p className="mt-3 text-xs text-amber-700">Wait for uploads to finish before submit.</p>
      ) : null}
      {state.error ? <p className="mt-2 text-xs text-red-600">{state.error}</p> : null}

      {state.supplierUrls.map((url, index) => (
        <input key={`supplier-${index}`} type="hidden" name="supplierPhotoUrls" value={url} />
      ))}
      {state.qcUrls.map((url, index) => (
        <input key={`qc-${index}`} type="hidden" name="qcPhotoUrls" value={url} />
      ))}
      <input type="hidden" name="uploadsReady" value={canSubmit ? "1" : "0"} />
    </section>
  );
}
