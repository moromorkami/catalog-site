"use client";

import { useActionState } from "react";
import { initialCheckoutState, submitOrderRequestAction } from "./actions";

type CheckoutFormProps = {
  productId: string;
};

export default function CheckoutForm({ productId }: CheckoutFormProps) {
  const [state, formAction, isPending] = useActionState(
    submitOrderRequestAction,
    initialCheckoutState,
  );

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Order Request</h2>
      <p className="mt-2 text-sm text-slate-600">
        Fill in your details and we will contact you with ordering steps.
      </p>

      <form action={formAction} className="mt-4 grid gap-3">
        <input type="hidden" name="productId" value={productId} />

        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-700">Name</span>
          <input
            name="name"
            required
            placeholder="Your name"
            disabled={isPending}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
          />
        </label>

        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-700">Phone or Telegram</span>
          <input
            name="contact"
            required
            placeholder="+48 123 456 789 or @telegram"
            disabled={isPending}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
          />
        </label>

        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-700">Qty</span>
          <input
            name="qty"
            type="number"
            min={1}
            max={1000}
            defaultValue={1}
            required
            disabled={isPending}
            className="w-32 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
          />
        </label>

        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-700">Note (optional)</span>
          <textarea
            name="note"
            rows={3}
            placeholder="Any extra info, color/size preference, timeline, etc."
            disabled={isPending}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
          />
        </label>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isPending ? "Submitting..." : "Submit request"}
          </button>
          {state.orderId ? (
            <span className="text-xs text-slate-500">Order ID: {state.orderId}</span>
          ) : null}
        </div>
      </form>

      {state.status !== "idle" ? (
        <div
          className={
            state.status === "success"
              ? "mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
              : "mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          }
        >
          {state.message}
        </div>
      ) : null}
    </section>
  );
}
