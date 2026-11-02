/* Tela mostrada no lugar da loja publica (e do modo garcom) quando a loja esta suspensa. */
export function LojaIndisponivel() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5ede5] p-6">
      <div className="max-w-sm rounded-2xl bg-white p-8 text-center shadow-lg">
        <span className="mb-3 block text-4xl">🔒</span>
        <h1 className="mb-2 text-lg font-semibold text-neutral-900">Loja indisponível no momento</h1>
        <p className="text-sm text-neutral-500">Esta loja não está recebendo pedidos agora. Tente novamente mais tarde.</p>
      </div>
    </div>
  );
}
