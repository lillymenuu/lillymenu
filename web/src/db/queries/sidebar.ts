import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { admins, assinaturas, permissoesNiveis, permissoesUsuarios, planos } from "@/db/schema";
import { getConfigs } from "@/db/queries/config";
import type { SidebarData } from "@/lib/sidebar";

/*
 * Equivalente de admin/api/v1/sidebar.php, lendo direto do Neon em vez do
 * MySQL via token Bearer do PHP. Mesma logica de permissao por usuario
 * (menu.* em permissoes_usuarios/niveis) e por plano contratado (recursos_json
 * do plano da assinatura).
 */

const CHAVE_POR_MENU: Record<string, string> = {
  dashboard: "menu.dashboard",
  pdv: "menu.pdv",
  gestor: "menu.gestor_pedidos",
  pedidos: "menu.pedidos",
  produtos: "menu.produtos",
  promo: "menu.promo",
  estoque: "menu.estoque",
  clientes: "menu.clientes",
  relatorios: "menu.relatorios",
  fidelidade: "menu.relatorios_fidelidade",
  orcamentos: "menu.orcamentos",
  controleCaixa: "menu.controle_caixa",
  controleFiado: "menu.controle_fiado",
  motoboys: "menu.motoboys",
  modoGarcom: "menu.modo_garcom",
  financeiro: "menu.financeiro",
  cupons: "menu.cupons",
  listaTransmissao: "menu.lista_transmissao",
  whatslilly: "menu.whatslilly",
  configuracoes: "menu.configuracoes",
  crossSellConfig: "menu.cross_sell_config",
  crossSellRelatorio: "menu.relatorio_cross_sell",
};

export async function getSidebarDataNeon(adminId: number, lojaId: number, perfil: string): Promise<SidebarData> {
  /* 1. permissoes por usuario (menu.*), se o admin tiver um nivel atribuido */
  const permLinhas = await db
    .select({ permissoesJson: permissoesNiveis.permissoes_json })
    .from(permissoesUsuarios)
    .innerJoin(permissoesNiveis, eq(permissoesNiveis.id, permissoesUsuarios.permissao_id))
    .where(eq(permissoesUsuarios.admin_id, adminId))
    .limit(1);

  const menuPermitido = new Set<string>();
  const permissoesJsonBruto = permLinhas[0]?.permissoesJson;
  if (permissoesJsonBruto) {
    try {
      const lista = JSON.parse(permissoesJsonBruto) as unknown;
      if (Array.isArray(lista)) {
        for (const item of lista) {
          const s = String(item);
          if (s.startsWith("menu.")) menuPermitido.add(s);
        }
      }
    } catch {
      /* json invalido: trata como sem restricao */
    }
  }
  const menuRestrito = menuPermitido.size > 0;

  /* 2. recursos do plano (recursos_json), se a loja nao for superadmin */
  let recursosPlano: string[] | null = null;
  let planoNome = "Customizado";
  let planoStatus = "";
  let planoExpira = "";
  let planoBadge = "";

  if (perfil !== "superadmin") {
    const assLinhas = await db
      .select({
        status: assinaturas.status,
        trialFim: assinaturas.trial_fim,
        cicloFim: assinaturas.ciclo_fim,
        planoNome: planos.nome,
        recursosJson: planos.recursos_json,
      })
      .from(assinaturas)
      .leftJoin(planos, eq(planos.id, assinaturas.plano_id))
      .where(eq(assinaturas.loja_id, lojaId))
      .orderBy(desc(assinaturas.id))
      .limit(1);

    const ass = assLinhas[0];
    if (ass) {
      if (ass.planoNome) planoNome = ass.planoNome;
      if (ass.recursosJson) {
        try {
          const lista = JSON.parse(ass.recursosJson) as unknown;
          if (Array.isArray(lista)) recursosPlano = lista.map(String);
        } catch {
          recursosPlano = null;
        }
      }

      let status = (ass.status ?? "").toLowerCase();
      if (status === "ativo") status = "ativa";
      const hoje = new Date().toISOString().slice(0, 10);
      let expiraRaw: string | null = null;
      if (status === "trial") {
        planoStatus = "trial";
        expiraRaw = ass.trialFim;
      } else {
        expiraRaw = ass.cicloFim ?? ass.trialFim;
      }
      if (expiraRaw) {
        if (expiraRaw < hoje) {
          planoExpira = "Expirado";
          planoStatus = "expirado";
        } else {
          const [, mes, dia] = expiraRaw.split("-");
          planoExpira = `ate ${dia}/${mes}`;
        }
      }
      if (planoStatus === "trial") planoBadge = "Trial";
    }
  }

  const pode = (chave: string) => {
    const permitidoPorUsuario = !menuRestrito || menuPermitido.has(chave);
    const permitidoPorPlano = recursosPlano === null || chave === "menu.dashboard" || recursosPlano.includes(chave);
    return permitidoPorUsuario && permitidoPorPlano;
  };

  const menu: Record<string, boolean> = {};
  for (const [chaveMenu, chavePermissao] of Object.entries(CHAVE_POR_MENU)) {
    menu[chaveMenu] = pode(chavePermissao);
  }
  menu.lojas = perfil === "superadmin";
  menu.gerenciamento = perfil === "superadmin";

  /* 3. dados da loja (tabela configuracoes) */
  const cfg = await getConfigs(lojaId, [
    "nome_loja",
    "loja_perfil",
    "loja_verificada",
    "loja_force_fechada",
    "loja_capa",
    "loja_contato",
    "loja_cnpj",
    "loja_rua",
    "loja_numero",
    "loja_bairro",
    "loja_cidade",
    "loja_estado",
    "loja_cep",
    "loja_complemento",
  ]);

  const lojaNome = cfg.nome_loja || "Minha Loja";
  const enderecoLinha1 = [cfg.loja_rua, cfg.loja_numero].filter(Boolean).join(", ");
  const cidadeEstado = [cfg.loja_cidade, cfg.loja_estado].filter(Boolean).join("/");
  const enderecoLinha2 = [cfg.loja_bairro, cidadeEstado].filter(Boolean).join(" - ");
  const enderecoLinha3 = cfg.loja_cep ? `CEP: ${cfg.loja_cep}` : "";
  const enderecoLinha4 = cfg.loja_complemento.trim();
  const enderecoLinhas = [enderecoLinha1, enderecoLinha2, enderecoLinha3, enderecoLinha4].filter((l) => l !== "");

  /* 4. dados do admin logado */
  const adminLinhas = await db.select({ nome: admins.nome, email: admins.email }).from(admins).where(eq(admins.id, adminId)).limit(1);
  const admin = adminLinhas[0];

  return {
    ok: true,
    loja: {
      id: lojaId,
      nome: lojaNome,
      inicial: lojaNome.charAt(0).toUpperCase(),
      logo: cfg.loja_perfil || null,
      capa: cfg.loja_capa || null,
      contato: cfg.loja_contato,
      cnpj: cfg.loja_cnpj,
      enderecoLinhas,
      verificada: cfg.loja_verificada === "1",
      aberta: cfg.loja_force_fechada !== "1",
    },
    plano: {
      nome: planoNome,
      status: planoStatus,
      expira: planoExpira,
      badge: planoBadge,
    },
    admin: {
      nome: admin?.nome ?? "",
      email: admin?.email ?? "",
      perfil,
    },
    menu,
  };
}
