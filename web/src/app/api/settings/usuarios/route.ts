import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { listarUsuarios } from "@/db/queries/usuariosAdmin";

export async function GET() {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const d = await listarUsuarios(sessao.lojaId, sessao.id, sessao.perfil);

  return NextResponse.json({
    ok: true,
    sou_admin_principal: d.souAdminPrincipal,
    nivel_admin_id: d.nivelAdminId,
    nivel_garcom_id: d.nivelGarcomId,
    niveis: d.niveis,
    niveis_personalizados: d.niveisPersonalizados,
    usuarios: d.usuarios.map((u) => ({
      id: u.id,
      nome: u.nome ?? "",
      email: u.email ?? "",
      usuario: u.usuario,
      perfil: u.perfil,
      ativo: u.ativo ? 1 : 0,
      codigo_acesso: u.codigoAcesso,
      permissao_id: u.permissaoId,
      permissao_nome: u.permissaoNome,
      permissao_slug: u.permissaoSlug,
      rotulo_nivel: u.rotuloNivel,
    })),
  });
}
