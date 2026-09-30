import "server-only";
import { enviarEmail } from "@/lib/email";

/*
 * Formulario "Fale com a gente" da landing page: mensagem direta ao
 * superadmin (nao e um lead comercial como leads_especialista, nao
 * grava no banco -- so envia por e-mail).
 */

const EMAIL_SUPERADMIN = "lilly.menuu@gmail.com";

export type ContatoInput = {
  nome: string;
  email: string;
  whatsapp: string;
  assunto: string;
  mensagem: string;
};

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function enviarContato(input: ContatoInput): Promise<{ ok: true } | { ok: false; msg: string }> {
  const nome = input.nome.trim();
  const email = input.email.trim().toLowerCase();
  const whatsapp = input.whatsapp.trim();
  const assunto = input.assunto.trim();
  const mensagem = input.mensagem.trim();

  if (!nome || !email || !mensagem) return { ok: false, msg: "Preencha nome, e-mail e a mensagem." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, msg: "E-mail inválido." };

  const html = `
    <p><strong>${escapeHtml(nome)}</strong> entrou em contato pelo site.</p>
    <p>E-mail: ${escapeHtml(email)}<br/>WhatsApp: ${escapeHtml(whatsapp || "não informado")}<br/>Assunto: ${escapeHtml(assunto || "não informado")}</p>
    <p>Mensagem:<br/>${escapeHtml(mensagem).replace(/\n/g, "<br/>")}</p>
  `;

  const enviado = await enviarEmail(EMAIL_SUPERADMIN, `Contato pelo site: ${assunto || nome}`, html);
  if (!enviado) return { ok: false, msg: "Não foi possível enviar sua mensagem. Tente novamente." };

  return { ok: true };
}
