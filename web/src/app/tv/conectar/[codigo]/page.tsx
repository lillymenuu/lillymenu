import { redirect } from "next/navigation";
import { getSessaoAdmin } from "@/lib/session";
import { getSidebarDataCached } from "@/lib/acessoRecurso";
import { formatarCodigoPareamento, limparCodigoPareamento } from "@/lib/midiaIndoor";
import { ConectarTv } from "@/components/tv/conectar-tv";

/* Aberto pelo QR da TV no celular do admin: confirma o pareamento com a loja logada. */
export default async function ConectarTvPage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo: bruto } = await params;
  const codigo = limparCodigoPareamento(bruto);

  const sessao = await getSessaoAdmin();
  if (!sessao) redirect(`/login?next=${encodeURIComponent(`/tv/conectar/${codigo}`)}`);

  const sidebar = await getSidebarDataCached(sessao.id, sessao.lojaId, sessao.perfil);

  return (
    <ConectarTv
      codigo={codigo}
      codigoFormatado={formatarCodigoPareamento(codigo)}
      lojaNome={sidebar.loja.nome}
      lojaLogo={sidebar.loja.logo}
      permitido={!!sidebar.menu.midiaIndoor}
    />
  );
}
