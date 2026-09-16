import { notFound } from "next/navigation";
import { storePhpFetch, StoreApiError } from "@/lib/store/api";
import type { StorePerfil, StoreCatalogo } from "@/lib/store/types";
import { StoreView } from "@/components/store/store-view";

export default async function StorePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const qs = `?loja=${encodeURIComponent(slug)}`;

  let perfil: StorePerfil;
  let catalogo: StoreCatalogo;
  try {
    [perfil, catalogo] = await Promise.all([
      storePhpFetch<StorePerfil & { ok: true }>(`/public/api/loja_perfil.php${qs}`),
      storePhpFetch<StoreCatalogo & { ok: true }>(`/public/api/loja_catalogo.php${qs}`),
    ]);
  } catch (e) {
    if (e instanceof StoreApiError && e.status === 404) {
      notFound();
    }
    throw e;
  }

  if (!perfil.lojaAtiva) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5ede5] p-6">
        <div className="max-w-sm rounded-2xl bg-white p-8 text-center shadow-lg">
          <span className="mb-3 block text-4xl">🛎️</span>
          <h1 className="mb-2 text-lg font-semibold text-neutral-900">
            {perfil.nomeLoja} esta temporariamente indisponivel
          </h1>
          <p className="text-sm text-neutral-500">
            Este cardapio nao esta aceitando pedidos no momento. Tente novamente mais tarde.
          </p>
        </div>
      </div>
    );
  }

  return <StoreView perfil={perfil} catalogo={catalogo} />;
}
