/* eslint-disable @next/next/no-img-element */
"use client";

import { useMemo, useState } from "react";

type TabKey = "supplier" | "qc";

type PhotoItem = {
  id: string;
  url: string;
  label: string;
};

type QcSet = {
  id: string;
  title: string;
  warehouse: string | null;
  notes: string | null;
  photos: PhotoItem[];
};

type PhotoTabsProps = {
  productName: string;
  supplierPhotos: PhotoItem[];
  qcPhotos: PhotoItem[];
  qcSets: QcSet[];
};

function PhotoGrid({
  photos,
  productName,
}: {
  photos: PhotoItem[];
  productName: string;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {photos.map((photo) => (
        <figure key={photo.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <img
            src={photo.url}
            alt={`${productName} - ${photo.label}`}
            className="h-40 w-full rounded-md border border-slate-200 bg-white object-cover"
          />
          <figcaption className="mt-2 text-xs text-slate-500">{photo.label}</figcaption>
        </figure>
      ))}
    </div>
  );
}

export default function PhotoTabs({
  productName,
  supplierPhotos,
  qcPhotos,
  qcSets,
}: PhotoTabsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("supplier");
  const hasQcContent = qcPhotos.length > 0 || qcSets.some((set) => set.photos.length > 0);

  const supplierTabContent = useMemo(() => {
    if (supplierPhotos.length === 0) {
      return <p className="text-sm text-slate-600">No supplier photos uploaded yet.</p>;
    }

    return <PhotoGrid photos={supplierPhotos} productName={productName} />;
  }, [productName, supplierPhotos]);

  const qcTabContent = useMemo(() => {
    if (!hasQcContent) {
      return <p className="text-sm text-slate-600">No QC photos uploaded yet.</p>;
    }

    return (
      <div className="space-y-5">
        {qcSets.map((set) => (
          <section key={set.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-slate-900">{set.title}</h3>
              <p className="text-xs text-slate-600">
                {set.warehouse ? `Warehouse: ${set.warehouse}` : "Warehouse not set"}
              </p>
              {set.notes ? <p className="mt-1 text-xs text-slate-500">{set.notes}</p> : null}
            </div>
            {set.photos.length > 0 ? (
              <PhotoGrid photos={set.photos} productName={productName} />
            ) : (
              <p className="text-xs text-slate-500">No photos in this QC set.</p>
            )}
          </section>
        ))}
        {qcPhotos.length > 0 ? (
          <section>
            <h3 className="mb-2 text-sm font-semibold text-slate-900">Standalone QC Photos</h3>
            <PhotoGrid photos={qcPhotos} productName={productName} />
          </section>
        ) : null}
      </div>
    );
  }, [hasQcContent, productName, qcPhotos, qcSets]);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("supplier")}
          className={`rounded-md px-3 py-2 text-sm font-medium ${
            activeTab === "supplier"
              ? "bg-slate-900 text-white"
              : "border border-slate-300 text-slate-700 hover:bg-slate-100"
          }`}
        >
          Supplier photos
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("qc")}
          className={`rounded-md px-3 py-2 text-sm font-medium ${
            activeTab === "qc"
              ? "bg-slate-900 text-white"
              : "border border-slate-300 text-slate-700 hover:bg-slate-100"
          }`}
        >
          QC photos
        </button>
      </div>
      {activeTab === "supplier" ? supplierTabContent : qcTabContent}
    </section>
  );
}
