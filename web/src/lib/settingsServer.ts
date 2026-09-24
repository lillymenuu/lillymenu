import "server-only";
import { headers } from "next/headers";
import { detalheConfiguracoes } from "@/db/queries/configuracoesLoja";
import type { ConfiguracoesDetalhe } from "@/lib/settings";

async function baseUrlAtual(): Promise<string> {
  const store = await headers();
  const host = store.get("x-forwarded-host") ?? store.get("host") ?? "localhost";
  const proto = store.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}/`;
}

export async function getConfiguracoesDetalhe(lojaId: number, adminId: number, perfil: string): Promise<ConfiguracoesDetalhe> {
  const d = await detalheConfiguracoes(lojaId, adminId, perfil, await baseUrlAtual());

  return {
    ok: true,
    sou_admin_principal: d.souAdminPrincipal,
    loja_link_base: d.lojaLinkBase,
    loja: {
      nome: d.loja.nome,
      contato: d.loja.contato,
      descricao: d.loja.descricao,
      cpf: d.loja.cpf,
      cnpj: d.loja.cnpj,
      link: d.loja.link,
      link_slug: d.loja.linkSlug,
      instagram: d.loja.instagram,
      tiktok: d.loja.tiktok,
      cep: d.loja.cep,
      rua: d.loja.rua,
      numero: d.loja.numero,
      bairro: d.loja.bairro,
      cidade: d.loja.cidade,
      estado: d.loja.estado,
      complemento: d.loja.complemento,
      capa: d.loja.capa,
      perfil: d.loja.perfil,
      verificada: d.loja.verificada,
      tema_cor_menu: d.loja.temaCorMenu,
    },
    horarios: { abertura: d.horarios.abertura, fechamento: d.horarios.fechamento, dias_funcionamento: d.horarios.diasFuncionamento, por_dia: d.horarios.porDia },
    pagamento: {
      dinheiro_ativo: d.pagamento.dinheiroAtivo,
      pix: d.pagamento.pix,
      credito: { ativo: d.pagamento.credito.ativo, taxa_ativa: d.pagamento.credito.taxaAtiva, taxa: d.pagamento.credito.taxa, bandeiras: d.pagamento.credito.bandeiras, bandeiras_custom: d.pagamento.credito.bandeirasCustom as { slug: string; label: string }[] },
      debito: { ativo: d.pagamento.debito.ativo, taxa_ativa: d.pagamento.debito.taxaAtiva, taxa: d.pagamento.debito.taxa, bandeiras: d.pagamento.debito.bandeiras, bandeiras_custom: d.pagamento.debito.bandeirasCustom as { slug: string; label: string }[] },
      voucher_ativo: d.pagamento.voucherAtivo,
      fiado_ativo: d.pagamento.fiadoAtivo,
    },
    cashback: { ativo: d.cashback.ativo, expira_dias: d.cashback.expiraDias, carencia_horas: d.cashback.carenciaHoras, percentual: d.cashback.percentual },
    clube_pontos_ativo: d.clubePontosAtivo,
    cross_sell_ativo: d.crossSellAtivo,
    pedidos: {
      receber_pedidos_ativo: d.pedidos.receberPedidosAtivo,
      gestor_pedidos_ativo: d.pedidos.gestorPedidosAtivo,
      notificar_pedido_whatsapp_ativo: d.pedidos.notificarPedidoWhatsappAtivo,
      aceite_automatico_diggy_ativo: d.pedidos.aceiteAutomaticoDiggyAtivo,
      whatsapp_numero: d.pedidos.whatsappNumero,
      entrega: { ativo: d.pedidos.entrega.ativo, tempo_min: d.pedidos.entrega.tempoMin, tempo_max: d.pedidos.entrega.tempoMax, horario_ini: d.pedidos.entrega.horarioIni, horario_fim: d.pedidos.entrega.horarioFim },
      retirada: { ativo: d.pedidos.retirada.ativo, tempo_min: d.pedidos.retirada.tempoMin, tempo_max: d.pedidos.retirada.tempoMax },
      local_ativo: d.pedidos.localAtivo,
      pedido_minimo_entrega_ativo: d.pedidos.pedidoMinimoEntregaAtivo,
      pedido_minimo_entrega: d.pedidos.pedidoMinimoEntrega,
      pedido_minimo_retirada_ativo: d.pedidos.pedidoMinimoRetiradaAtivo,
      pedido_minimo_retirada: d.pedidos.pedidoMinimoRetirada,
    },
    agendamento: {
      delivery: { ativo: d.agendamento.delivery.ativo, min_tipo: d.agendamento.delivery.minTipo, min_valor: d.agendamento.delivery.minValor, max_tipo: d.agendamento.delivery.maxTipo, max_valor: d.agendamento.delivery.maxValor, horarios: d.agendamento.delivery.horarios },
      retirada: { ativo: d.agendamento.retirada.ativo, min_tipo: d.agendamento.retirada.minTipo, min_valor: d.agendamento.retirada.minValor, max_tipo: d.agendamento.retirada.maxTipo, max_valor: d.agendamento.retirada.maxValor, horarios: d.agendamento.retirada.horarios },
    },
    taxa_entrega: { tipo: d.taxaEntrega.tipo, gratis: d.taxaEntrega.gratis, fixa: { valor: d.taxaEntrega.fixa.valor, tempo_min: d.taxaEntrega.fixa.tempoMin, tempo_max: d.taxaEntrega.fixa.tempoMax } },
    versiculo_dashboard_ativo: d.versiculoDashboardAtivo,
  };
}
