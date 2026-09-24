import { NextRequest, NextResponse } from "next/server";
import { getSessaoSuperadmin } from "@/lib/session";
import { getListagemLojasSuperadmin, getConversasSuporteSuperadmin } from "@/lib/superadminServer";
import { salvarLojaSuperadmin } from "@/db/queries/superadminLojaSalvar";
import { excluirLojaSuperadmin, aprovarComprovante, rejeitarComprovante, trocarPlanoSuperadmin, ativarLoja, suspenderLoja } from "@/db/queries/superadminLojaAcao";
import { salvarConfigPix, salvarConfigNominatim, salvarRecursosPlano } from "@/db/queries/superadminConfigGlobal";
import { mensagensSuporte, enviarMensagemSuporte, digitandoSuporteSet, digitandoLojaGet, unreadSuporte, type MensagemSuporte } from "@/db/queries/suporteChat";

/*
 * Substitui o proxy unico pra admin/api/v1/superadmin_*.php: cada "alvo"
 * agora despacha direto pras funcoes Neon equivalentes, sem passar pelo PHP.
 */

type Body = Record<string, unknown>;

function mapMensagem(m: MensagemSuporte) {
  return { id: m.id, remetente: m.remetente, mensagem: m.mensagem, anexo_arquivo: m.anexoArquivo, criado_em: m.criadoEm };
}

async function handleLojaAcao(body: Body) {
  const acao = String(body.acao ?? "");
  const lojaId = Number(body.loja_id ?? 0);
  switch (acao) {
    case "ativar":
      return ativarLoja(lojaId);
    case "suspender":
      return suspenderLoja(lojaId);
    case "excluir":
      return excluirLojaSuperadmin(lojaId);
    case "plano":
      return trocarPlanoSuperadmin(lojaId, Number(body.plano_id ?? 0));
    case "aprovar_comprovante":
      return aprovarComprovante(Number(body.cobranca_id ?? 0));
    case "rejeitar_comprovante":
      return rejeitarComprovante(Number(body.cobranca_id ?? 0), String(body.motivo ?? ""));
    default:
      return { ok: false, msg: "Ação inválida." };
  }
}

async function handleConfigSalvar(body: Body) {
  const tipo = String(body.tipo ?? "");
  switch (tipo) {
    case "pix":
      return salvarConfigPix(String(body.pix_chave ?? ""), String(body.pix_nome ?? ""), String(body.whats_numero ?? ""));
    case "nominatim":
      return salvarConfigNominatim(Boolean(body.ativo));
    case "recursos":
      return salvarRecursosPlano(Number(body.plano_id ?? 0), Array.isArray(body.recursos) ? (body.recursos as string[]) : [], Boolean(body.sem_restricao));
    default:
      return { ok: false, msg: "Tipo inválido." };
  }
}

async function handleSuporteGet(params: URLSearchParams) {
  const acao = params.get("acao") ?? "";

  if (acao === "conversas") return { ok: true, conversas: await getConversasSuporteSuperadmin(false) };

  if (acao === "mensagens") {
    const resultado = await mensagensSuporte(Number(params.get("loja_id") ?? "0"), Number(params.get("after_id") ?? "0"));
    if (!resultado.ok) return resultado;
    return { ok: true, mensagens: resultado.mensagens.map(mapMensagem) };
  }

  if (acao === "digitando") {
    return { ok: true, digitando: await digitandoLojaGet(Number(params.get("loja_id") ?? "0")) };
  }

  if (acao === "unread") return { ok: true, unread: await unreadSuporte() };

  return { ok: false, msg: "Ação inválida." };
}

async function handleSuportePost(body: Body) {
  const acao = String(body.acao ?? "");
  const lojaId = Number(body.loja_id ?? 0);

  if (acao === "digitando") return digitandoSuporteSet(lojaId, Boolean(body.ativo));

  if (acao === "enviar") {
    const resultado = await enviarMensagemSuporte(lojaId, String(body.mensagem ?? ""), String(body.imagem_base64 ?? ""), String(body.imagem_ext ?? ""));
    if (!resultado.ok) return resultado;
    return { ok: true, mensagem: mapMensagem(resultado.mensagem) };
  }

  return { ok: false, msg: "Ação inválida." };
}

export async function GET(request: NextRequest) {
  const sessao = await getSessaoSuperadmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Não autenticado." }, { status: 401 });

  const alvo = request.nextUrl.searchParams.get("alvo") ?? "";

  if (alvo === "superadmin_lojas") return NextResponse.json(await getListagemLojasSuperadmin());
  if (alvo === "superadmin_suporte") return NextResponse.json(await handleSuporteGet(request.nextUrl.searchParams));

  return NextResponse.json({ ok: false, msg: "Não encontrado." }, { status: 404 });
}

export async function POST(request: NextRequest) {
  const sessao = await getSessaoSuperadmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Não autenticado." }, { status: 401 });

  const alvo = request.nextUrl.searchParams.get("alvo") ?? "";
  const body: Body = await request.json().catch(() => ({}));

  if (alvo === "superadmin_loja_salvar") {
    const resultado = await salvarLojaSuperadmin({
      lojaId: Number(body.loja_id ?? 0),
      adminId: body.admin_id ? Number(body.admin_id) : undefined,
      nome: String(body.nome ?? ""),
      email: String(body.email ?? ""),
      usuario: String(body.usuario ?? ""),
      contato: body.contato ? String(body.contato) : undefined,
      senha: body.senha ? String(body.senha) : undefined,
      senha2: body.senha2 ? String(body.senha2) : undefined,
      trialInicio: body.trial_inicio ? String(body.trial_inicio) : undefined,
      trialFim: body.trial_fim ? String(body.trial_fim) : undefined,
    });
    return NextResponse.json(resultado);
  }

  if (alvo === "superadmin_loja_acao") return NextResponse.json(await handleLojaAcao(body));
  if (alvo === "superadmin_config_salvar") return NextResponse.json(await handleConfigSalvar(body));
  if (alvo === "superadmin_suporte") return NextResponse.json(await handleSuportePost(body));

  return NextResponse.json({ ok: false, msg: "Não encontrado." }, { status: 404 });
}
