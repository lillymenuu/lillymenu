import { phpApiFetch } from "@/lib/phpApi";

export type SidebarData = {
  ok: true;
  loja: {
    nome: string;
    inicial: string;
    logo: string | null;
    verificada: boolean;
    aberta: boolean;
  };
  plano: {
    nome: string;
    status: string;
    expira: string;
    badge: string;
  };
  admin: {
    nome: string;
    email: string;
    perfil: string;
  };
  menu: Record<string, boolean>;
};

export function getSidebarData() {
  return phpApiFetch<SidebarData>("/admin/api/v1/sidebar.php");
}
