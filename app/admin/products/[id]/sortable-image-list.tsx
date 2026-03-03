"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";

type SortableImage = {
  id: string;
  url: string;
  sortOrder: number;
};

type ActionHandler = (formData: FormData) => void | Promise<void>;

type SortableImageListProps = {
  productId: string;
  qcSetId?: string;
  images: SortableImage[];
  reorderAction: ActionHandler;
  deleteAction: ActionHandler;
  emptyMessage: string;
  groupLabel: string;
};

function moveBefore<T extends { id: string }>(
  items: T[],
  draggedId: string,
  targetId: string,
) {
  if (draggedId === targetId) {
    return items;
  }

  const draggedIndex = items.findIndex((item) => item.id === draggedId);
  const targetIndex = items.findIndex((item) => item.id === targetId);
  if (draggedIndex === -1 || targetIndex === -1) {
    return items;
  }

  const next = [...items];
  const [dragged] = next.splice(draggedIndex, 1);
  next.splice(targetIndex, 0, dragged);
  return next;
}

function moveByOffset<T extends { id: string }>(
  items: T[],
  itemId: string,
  offset: number,
) {
  const index = items.findIndex((item) => item.id === itemId);
  const nextIndex = index + offset;
  if (index === -1 || nextIndex < 0 || nextIndex >= items.length) {
    return items;
  }

  const next = [...items];
  const [item] = next.splice(index, 1);
  next.splice(nextIndex, 0, item);
  return next;
}

export default function SortableImageList({
  productId,
  qcSetId,
  images,
  reorderAction,
  deleteAction,
  emptyMessage,
  groupLabel,
}: SortableImageListProps) {
  const [orderedImages, setOrderedImages] = useState<SortableImage[]>(images);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  useEffect(() => {
    setOrderedImages(images);
  }, [images]);

  const orderedIds = useMemo(
    () => orderedImages.map((image) => image.id).join(","),
    [orderedImages],
  );

  if (orderedImages.length === 0) {
    return <p className="text-sm text-slate-600">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-3">
      <ul className="grid gap-3">
        {orderedImages.map((image, index) => (
          <li
            key={image.id}
            draggable
            onDragStart={() => setDraggingId(image.id)}
            onDragEnd={() => setDraggingId(null)}
            onDragOver={(event) => {
              event.preventDefault();
            }}
            onDrop={(event) => {
              event.preventDefault();
              if (!draggingId) {
                return;
              }
              setOrderedImages((prev) => moveBefore(prev, draggingId, image.id));
              setDraggingId(null);
            }}
            className="rounded-lg border border-slate-200 bg-slate-50 p-3"
          >
            <div className="flex flex-wrap items-center gap-3">
              <Image
                src={image.url}
                alt={`${groupLabel} ${index + 1}`}
                width={80}
                height={80}
                className="h-20 w-20 rounded-md border border-slate-200 object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900">
                  {groupLabel} #{index + 1}
                </p>
                <p className="truncate text-xs text-slate-500">{image.url}</p>
                <p className="mt-1 text-xs text-slate-500">Drag to reorder.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setOrderedImages((prev) => moveByOffset(prev, image.id, -1));
                  }}
                  className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  Up
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOrderedImages((prev) => moveByOffset(prev, image.id, 1));
                  }}
                  className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  Down
                </button>
                <form action={deleteAction}>
                  <input type="hidden" name="productId" value={productId} />
                  <input type="hidden" name="imageId" value={image.id} />
                  <button
                    type="submit"
                    className="rounded-md border border-red-300 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </form>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <form action={reorderAction} className="flex items-center gap-2">
        <input type="hidden" name="productId" value={productId} />
        {qcSetId ? <input type="hidden" name="qcSetId" value={qcSetId} /> : null}
        <input type="hidden" name="orderedIds" value={orderedIds} />
        <button
          type="submit"
          disabled={orderedImages.length < 2}
          className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          Save order
        </button>
      </form>
    </div>
  );
}
