import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { getSessaoAdmin } from "@/lib/session";
import { mensagensLoja } from "@/db/queries/suporteChat";
import { getSidebarDataNeon } from "@/db/queries/sidebar";
import { SuporteChat, type SuporteMensagem } from "@/components/suporte/suporte-chat";

export default async function SuportePage() {
  const sessao = await getSessaoAdmin();
  if (!sessao) redirect("/login");

  const phpAdminUrl = process.env.NEXT_PUBLIC_PHP_ADMIN_URL ?? "";
  let mensagens: SuporteMensagem[] = [];
  let erro: string | null = null;
  let lojaNome = "Minha loja";
  let lojaLogo: string | null = null;

  try {
    const resultado = await mensagensLoja(sessao.lojaId, 0);
    if (!resultado.ok) throw new Error(resultado.erro);
    mensagens = resultado.mensagens.map((m) => ({ id: m.id, remetente: m.remetente as "loja" | "suporte", mensagem: m.mensagem, anexo_arquivo: m.anexoArquivo, criado_em: m.criadoEm }));

    const sidebar = await getSidebarDataNeon(sessao.id, sessao.lojaId, sessao.perfil);
    lojaNome = sidebar.loja.nome;
    if (sidebar.loja.logo) lojaLogo = sidebar.loja.logo.startsWith("http") ? sidebar.loja.logo : `${phpAdminUrl}/${sidebar.loja.logo}`;
  } catch {
    erro = "Erro ao carregar o suporte.";
  }

  if (erro) {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <Card className="border-destructive/40">
          <CardContent className="py-6 text-center text-sm text-destructive">{erro}</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-3 py-6 sm:px-5">
      <SuporteChat mensagensIniciais={mensagens} phpAdminUrl={phpAdminUrl} lojaNome={lojaNome} lojaLogo={lojaLogo} />
    </div>
  );
}
