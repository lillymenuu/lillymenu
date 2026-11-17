/*
 * Tipo compartilhado + augmentation global de window.impressaoQZ, exposto
 * por src/lib/impressao-qz.ts (QZ Tray via npm). Fica num lib separado pra
 * evitar duas declaracoes "declare global" conflitantes.
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
  /* opcionais: perfis antigos (salvos antes desses campos) caem no padrao */
  tamanhoFonte?: "pequeno" | "medio";
  mostrarGruposComplementos?: boolean;
};

declare global {
  interface Window {
    impressaoQZ?: {
      listarPerfis: () => PerfilImpressao[];
      salvarPerfil: (p: PerfilImpressao) => Promise<PerfilImpressao>;
      excluirPerfil: (id: string) => Promise<void>;
      listarImpressorasSistema: () => Promise<string[]>;
      imprimirTeste: (perfil: PerfilImpressao, lojaNome: string) => Promise<void>;
      imprimirManual: (pedidoId: string | number, lojaNome: string, uso?: string) => Promise<string>;
      imprimirAutomaticoPedido: (uso: string, pedidoId: string | number, lojaNome: string) => Promise<void>;
      garantirConexao: () => Promise<void>;
    };
  }
}
