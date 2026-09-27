import "server-only";
import { Resend } from "resend";

/*
 * Wrapper fino sobre o Resend. Mesma postura "best-effort" de
 * registrarOperacao/limparMensagensExpiradas: se a chave nao estiver
 * configurada ou o envio falhar, loga e nao derruba o fluxo principal
 * (cadastro/lead ja foram gravados no banco, o e-mail e so um complemento).
 */

const EMAIL_FROM = process.env.EMAIL_FROM || "LillyMenu <onboarding@resend.dev>";

export async function enviarEmail(destinatario: string, assunto: string, html: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY nao configurada — e-mail nao enviado:", assunto, "->", destinatario);
    return false;
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({ from: EMAIL_FROM, to: destinatario, subject: assunto, html });
    if (error) {
      console.error("[email] falha ao enviar", assunto, error);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[email] falha ao enviar", assunto, e);
    return false;
  }
}
