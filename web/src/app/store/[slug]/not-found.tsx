export default function StoreNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5ede5] p-6">
      <div className="max-w-sm rounded-2xl bg-white p-8 text-center shadow-lg">
        <span className="mb-3 block text-4xl">🔎</span>
        <h1 className="mb-2 text-lg font-semibold text-neutral-900">Loja nao encontrada</h1>
        <p className="text-sm text-neutral-500">Confira o link e tente novamente.</p>
      </div>
    </div>
  );
}
