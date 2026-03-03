import Link from "next/link";
import DbSetupMessage from "@/src/components/db-setup-message";
import { getPrismaSetupErrorMessage } from "@/src/lib/prisma-guard";
import { prisma } from "@/src/lib/prisma";
import CheckoutForm from "./checkout-form";

type CheckoutPageProps = {
  searchParams: Promise<{ productId?: string }>;
};

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  const { productId: rawProductId } = await searchParams;
  const productId = (rawProductId ?? "").trim();

  if (!productId) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-6 py-10 sm:px-10">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-900">Checkout</h1>
          <p className="mt-2 text-sm text-slate-600">
            Missing product ID. Open checkout from a product page.
          </p>
          <Link
            href="/"
            className="mt-4 inline-flex rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Go to home
          </Link>
        </section>
      </main>
    );
  }

  const loaded = await (async () => {
    try {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: {
          id: true,
          title: true,
          description: true,
          supplier: {
            select: {
              name: true,
            },
          },
          brand: {
            select: {
              name: true,
            },
          },
        },
      });

      return {
        ok: true as const,
        product,
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
    return <DbSetupMessage title="Checkout Not Ready Yet" errorMessage={loaded.setupErrorMessage} />;
  }

  if (!loaded.product) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-6 py-10 sm:px-10">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-900">Checkout</h1>
          <p className="mt-2 text-sm text-slate-600">Product not found.</p>
          <Link
            href="/"
            className="mt-4 inline-flex rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Go to home
          </Link>
        </section>
      </main>
    );
  }

  const { product } = loaded;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-6 py-10 sm:px-10">
      <header className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-slate-600">
          <Link href="/" className="hover:text-slate-900">
            Home
          </Link>
          <span>/</span>
          <Link href={`/p/${product.id}`} className="hover:text-slate-900">
            Product
          </Link>
          <span>/</span>
          <span className="text-slate-500">Checkout</span>
        </div>
        <h1 className="text-2xl font-semibold text-slate-900">Order via us</h1>
        <p className="mt-2 text-sm text-slate-600">{product.title}</p>
        <p className="mt-1 text-xs text-slate-500">
          Supplier: {product.supplier.name}
          {product.brand ? ` | Brand: ${product.brand.name}` : ""}
        </p>
        {product.description ? <p className="mt-3 text-sm text-slate-600">{product.description}</p> : null}
      </header>

      <CheckoutForm productId={product.id} />
    </main>
  );
}
