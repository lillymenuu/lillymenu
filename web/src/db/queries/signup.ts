import "server-only";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { admins, assinaturas, leadsEspecialista, leadsLojas, lojas } from "@/db/schema";
import { dataFortaleza, adicionarDiasFortaleza } from "@/db/queries/tempo";
import { getPlanoPorLandingSlug } from "@/db/queries/landingConfig";
import { enviarEmail } from "@/lib/email";

/*
 * Equivalente de public/api/cadastro_loja.php (cadastro self-service da
 * landing) e leads_especialista (CTA "falar com especialista"). Cria a loja
 * de verdade (loja + admin + assinatura trial), diferente do fluxo de
 * "so lead" usado em outros formularios de contato.
 */

function gerarSenhaTemporaria(): string {
  return randomBytes(9).toString("base64url");
}

async function gerarUsuarioUnico(base: string): Promise<string> {
  const raiz = base
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 40) || "loja";

  for (let tentativa = 0; tentativa < 20; tentativa++) {
    const candidato = tentativa === 0 ? raiz : `${raiz}${tentativa}`;
    const [existente] = await db.select({ id: admins.id }).from(admins).where(eq(admins.usuario, candidato)).limit(1);
    if (!existente) return candidato;
  }
  return `${raiz}${Date.now()}`;
}

function emailBoasVindasHtml(nome: string, email: string, senha: string, loginUrl: string): string {
  return `
    <p>Olá, ${nome}!</p>
    <p>Sua loja no LillyMenu foi criada com sucesso. Use os dados abaixo para acessar o painel:</p>
    <p><strong>E-mail:</strong> ${email}<br/><strong>Senha:</strong> ${senha}</p>
    <p><a href="${loginUrl}">Acessar o painel</a></p>
    <p>Recomendamos trocar a senha assim que entrar.</p>
  `;
}

export type CadastroLojaInput = {
  nome: string;
  empresa: string;
  email: string;
  whatsapp: string;
  planoSlug: string;
  faturamento?: string;
  segmento?: string;
};

export type CadastroLojaResultado = { ok: true; lojaId: number; adminEmail: string } | { ok: false; msg: string };

export async function criarContaLoja(input: CadastroLojaInput): Promise<CadastroLojaResultado> {
  const nome = input.nome.trim();
  const empresa = input.empresa.trim();
  const email = input.email.trim().toLowerCase();
  const whatsapp = input.whatsapp.trim();

  if (!nome || !empresa || !email || !whatsapp) return { ok: false, msg: "Preencha todos os campos obrigatórios." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, msg: "E-mail inválido." };

  const [emailExistente] = await db.select({ id: admins.id }).from(admins).where(eq(admins.email, email)).limit(1);
  if (emailExistente) return { ok: false, msg: "Já existe uma conta com esse e-mail." };

  const plano = await getPlanoPorLandingSlug(input.planoSlug);
  if (!plano) return { ok: false, msg: "Plano inválido." };

  const [novaLoja] = await db.insert(lojas).values({ nome: empresa, ativo: true, plano_id: plano.id }).returning({ id: lojas.id });

  const senha = gerarSenhaTemporaria();
  const senhaHash = bcrypt.hashSync(senha, 10);
  const usuario = await gerarUsuarioUnico(email.split("@")[0]);

  await db.insert(admins).values({ nome, usuario, email, senha: senhaHash, perfil: "admin", ativo: true, loja_id: novaLoja.id });

  const trialInicio = dataFortaleza();
  const trialFim = adicionarDiasFortaleza(plano.diasTrial);
  await db.insert(assinaturas).values({ loja_id: novaLoja.id, plano_id: plano.id, status: "trial", trial_inicio: trialInicio, trial_fim: trialFim });

  await db.insert(leadsLojas).values({
    nome,
    empresa,
    email,
    whatsapp,
    cnpj: "",
    cep: "",
    rua: "",
    numero: "",
    bairro: "",
    cidade: "",
    estado: "",
    faturamento: input.faturamento || null,
    segmento: input.segmento || null,
  });

  const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://lillymenu.com"}/login`;
  await enviarEmail(email, "Seu acesso ao LillyMenu", emailBoasVindasHtml(nome, email, senha, loginUrl));

  return { ok: true, lojaId: novaLoja.id, adminEmail: email };
}

export type LeadEspecialistaInput = {
  nome: string;
  email: string;
  telefone: string;
  empresa: string;
  faturamento?: string;
  modeloNegocio?: string;
  aceiteWhatsapp: boolean;
};

export async function criarLeadEspecialista(input: LeadEspecialistaInput): Promise<{ ok: true } | { ok: false; msg: string }> {
  const nome = input.nome.trim();
  const email = input.email.trim().toLowerCase();
  const telefone = input.telefone.trim();
  const empresa = input.empresa.trim();

  if (!nome || !email || !telefone || !empresa) return { ok: false, msg: "Preencha todos os campos obrigatórios." };

  await db.insert(leadsEspecialista).values({
    nome,
    email,
    telefone,
    empresa,
    faturamento: input.faturamento || null,
    modelo_negocio: input.modeloNegocio || null,
    aceite_whatsapp: input.aceiteWhatsapp,
  });

  const notificarEmail = process.env.LEADS_NOTIFICACAO_EMAIL;
  if (notificarEmail) {
    await enviarEmail(
      notificarEmail,
      "Novo lead — falar com especialista",
      `<p><strong>${nome}</strong> (${empresa}) quer falar com um especialista.</p><p>E-mail: ${email}<br/>Telefone: ${telefone}</p>`
    );
  }

  return { ok: true };
}
