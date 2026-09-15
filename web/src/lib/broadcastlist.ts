export type BlLista = {
  id: number;
  nome: string;
  criado_em: string;
  total_membros: number;
};

export type BlCliente = {
  id: number;
  nome: string;
  telefone: string;
};

export type BlDestinatario = {
  cliente_id: number;
  nome: string;
  telefone: string;
};

export type BlListarResposta = {
  ok: true;
  listas: BlLista[];
};

export type BlClientesResposta = {
  ok: true;
  clientes: BlCliente[];
};

export type BlDetalheResposta = {
  ok: true;
  lista: { id: number; nome: string };
  membros: number[];
};

export type BlEnvioIniciarResposta = {
  ok: true;
  envio_id: number;
  destinatarios: BlDestinatario[];
};

export type BlEnvioItemResposta = {
  ok: true;
  enviado: boolean;
  erro: string | null;
};

export type BlEnvioFinalizarResposta = {
  ok: true;
  resumo: { total_destinatarios: number; total_enviados: number; total_falhas: number };
};
