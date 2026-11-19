export type SidebarData = {
  ok: true;
  loja: {
    id: number;
    nome: string;
    inicial: string;
    logo: string | null;
    capa: string | null;
    contato: string;
    cnpj: string;
    enderecoLinhas: string[];
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
  /** Telas que o usuario poderia ver mas o plano da loja nao inclui (itens "novo" aparecem com cadeado). */
  bloqueadoPorPlano?: Record<string, boolean>;
};
