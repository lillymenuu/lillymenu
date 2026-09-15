/*
 * Tipo compartilhado + augmentation global de window.impressaoQZ, exposto
 * por admin/assets/js/impressao_qz.js (carregado via <Script> tanto no
 * dialog de configuracao em Settings quanto no overlay do POS). Fica num
 * lib separado pra evitar duas declaracoes "declare global" conflitantes
 * (TypeScript exige que sejam identicas quando mescladas).
 */
export type PerfilImpressao = {
  id: string | null;
  nome: string;
  qzPrinterName: string;
  tipo: string;
  usoPara: string;
  papel: string;
  copias: number;
  tipoImpressao: string;
  impressaoAutomatica: boolean;
};

declare global {
  interface Window {
    impressaoQZ?: {
      listarPerfis: () => PerfilImpressao[];
      salvarPerfil: (p: PerfilImpressao) => PerfilImpressao;
      excluirPerfil: (id: string) => void;
      listarImpressorasSistema: () => Promise<string[]>;
      imprimirTeste: (perfil: PerfilImpressao, lojaNome: string) => Promise<void>;
      imprimirAutomaticoPedido: (uso: string, pedidoId: string | number, lojaNome: string) => Promise<void>;
      garantirConexao: () => Promise<void>;
    };
  }
}
