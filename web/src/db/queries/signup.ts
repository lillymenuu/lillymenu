import "server-only";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { admins, assinaturas, leadsEspecialista, leadsLojas, lojas } from "@/db/schema";
import { dataFortaleza, adicionarDiasFortaleza } from "@/db/queries/tempo";
import { getPlanoTrialGratuito } from "@/db/queries/landingConfig";
import { enviarEmail } from "@/lib/email";
import { validarCpfCnpj } from "@/lib/cpfCnpj";

/*
 * Equivalente de public/api/cadastro_loja.php (cadastro self-service da
 * landing) e leads_especialista (CTA "falar com especialista"). Cria a loja
 * de verdade (loja + admin + assinatura trial), diferente do fluxo de
 * "so lead" usado em outros formularios de contato.
 */

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

function emailBoasVindasHtml(nome: string, loginUrl: string): string {
  return `
    <p>Olá, ${nome}!</p>
    <p>Sua loja no LillyMenu foi criada com sucesso 🎉</p>
    <p>Use o e-mail e a senha que você cadastrou para acessar o painel:</p>
    <p><a href="${loginUrl}">Acessar o painel</a></p>
  `;
}

export type CadastroLojaInput = {
  nome: string;
  empresa: string;
  email: string;
  whatsapp: string;
  senha: string;
  cpfCnpj: string;
  cep?: string;
  rua?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  faturamento?: string;
  segmento?: string;
};

export type CadastroLojaResultado = { ok: true; lojaId: number; adminEmail: string } | { ok: false; msg: string };

export async function criarContaLoja(input: CadastroLojaInput): Promise<CadastroLojaResultado> {
  const nome = input.nome.trim();
  const empresa = input.empresa.trim();
  const email = input.email.trim().toLowerCase();
  const whatsapp = input.whatsapp.trim();
  const cpfCnpj = input.cpfCnpj.trim();
  const cep = (input.cep || "").trim();
  const rua = (input.rua || "").trim();
  const numero = (input.numero || "").trim();
  const bairro = (input.bairro || "").trim();
  const cidade = (input.cidade || "").trim();
  const estado = (input.estado || "").trim();

  if (!nome || !empresa || !email || !whatsapp || !input.senha || !cpfCnpj) {
    return { ok: false, msg: "Preencha todos os campos obrigatórios." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, msg: "E-mail inválido." };
  if (input.senha.length < 6) return { ok: false, msg: "A senha deve ter pelo menos 6 caracteres." };
  if (!validarCpfCnpj(cpfCnpj)) return { ok: false, msg: "CPF/CNPJ inválido." };

  const [emailExistente] = await db.select({ id: admins.id }).from(admins).where(eq(admins.email, email)).limit(1);
  if (emailExistente) return { ok: false, msg: "Já existe uma conta com esse e-mail." };

  const plano = await getPlanoTrialGratuito();
  if (!plano) return { ok: false, msg: "Não há plano de teste disponível no momento." };

  const enderecoResumo = rua ? `${rua}, ${numero} - ${bairro}, ${cidade}/${estado} - CEP ${cep}` : null;
  const [novaLoja] = await db
    .insert(lojas)
    .values({ nome: empresa, ativo: true, plano_id: plano.id, endereco: enderecoResumo })
    .returning({ id: lojas.id });

  const senhaHash = bcrypt.hashSync(input.senha, 10);
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
    cnpj: cpfCnpj,
    cep,
    rua,
    numero,
    bairro,
    cidade,
    estado,
    faturamento: input.faturamento || null,
    segmento: input.segmento || null,
  });

  const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://lillymenu.com"}/login`;
  await enviarEmail(email, "Sua loja no LillyMenu foi criada!", emailBoasVindasHtml(nome, loginUrl));

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
