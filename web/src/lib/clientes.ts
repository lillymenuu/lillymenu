import { phpApiFetch } from "@/lib/phpApi";

export type Cliente = {
  id: number;
  nome: string;
  telefone: string;
  endereco: string | null;
  endereco_texto: string;
  aniversario: string | null;
  cep: string | null;
  rua: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  complemento: string | null;
  criado_em: string;
  cashback_saldo: number;
  pontos_saldo: number;
  saldo_fiado: number;
  total_pedidos: number;
  total_gasto: number;
};

export type ClientesListarParams = {
  busca?: string;
  pagina?: number;
};

export type ClientesListarResposta = {
  ok: true;
  clientes: Cliente[];
  total: number;
  paginas: number;
  pagina: number;
};

export function getClientesListar(params: ClientesListarParams = {}) {
  const qs = new URLSearchParams();
  if (params.busca) qs.set("busca", params.busca);
  if (params.pagina) qs.set("pagina", String(params.pagina));
  const query = qs.toString();
  return phpApiFetch<ClientesListarResposta>(
    `/admin/api/v1/clientes_listar.php${query ? `?${query}` : ""}`
  );
}
