type DbSetupMessageProps = {
  title: string;
  errorMessage?: string;
};

export default function DbSetupMessage({ title, errorMessage }: DbSetupMessageProps) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-6 py-10 sm:px-10">
      <section className="rounded-xl border border-amber-300 bg-amber-50 p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-amber-900">{title}</h1>
        <p className="mt-2 text-sm text-amber-800">
          Database tables are missing or Prisma cannot connect yet. Complete setup, then reload.
        </p>

        <div className="mt-4 rounded-lg border border-amber-200 bg-white p-4 text-sm text-slate-800">
          <p className="font-medium text-slate-900">Run:</p>
          <p className="mt-1 font-mono text-xs">npx prisma dev</p>
          <p className="mt-1 font-mono text-xs">npx prisma migrate dev</p>
          <p className="mt-1 text-xs text-slate-500">If you are not using migrations:</p>
          <p className="mt-1 font-mono text-xs">npx prisma db push</p>
          <p className="mt-1 font-mono text-xs">npm run db:seed</p>
        </div>

        {errorMessage ? (
          <pre className="mt-4 overflow-x-auto rounded-lg border border-amber-200 bg-white p-4 text-xs text-slate-700">
            {errorMessage}
          </pre>
        ) : null}
      </section>
    </main>
  );
}
