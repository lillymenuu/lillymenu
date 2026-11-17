import "server-only";
import { db } from "@/db";
import { configuracoes } from "@/db/schema";
import { getConfig } from "@/db/queries/config";

/*
 * Impressoras da loja (perfis de impressao) — ficam em configuracoes.impressoras_perfis
 * como JSON, compartilhadas por todos os computadores da loja. Qual impressora do
 * Windows corresponde a cada perfil NAO fica aqui: e um vinculo local de cada
 * computador (localStorage), ja que o nome da impressora muda de maquina pra maquina.
 */
const CHAVE = "impressoras_perfis";

export type ImpressoraLoja = {
  id: string;
  nome: string;
  usoPara: "cozinha" | "pdv" | "ambos";
  papel: "50mm" | "80mm";
  copias: number;
  tipoImpressao: "simples" | "completa";
  impressaoAutomatica: boolean;
  tamanhoFonte: "pequeno" | "medio";
  mostrarGruposComplementos: boolean;
};

function normalizar(p: Record<string, unknown>): ImpressoraLoja | null {
  const id = typeof p.id === "string" ? p.id.slice(0, 60) : "";
  const nome = typeof p.nome === "string" ? p.nome.trim().slice(0, 80) : "";
  if (!id || !nome) return null;
  const um = <T extends string>(v: unknown, ok: readonly T[], padrao: T): T => (ok.includes(v as T) ? (v as T) : padrao);
  return {
    id,
    nome,
    usoPara: um(p.usoPara, ["cozinha", "pdv", "ambos"] as const, "ambos"),
    papel: um(p.papel, ["50mm", "80mm"] as const, "80mm"),
    copias: Math.min(4, Math.max(1, Math.round(Number(p.copias) || 1))),
    tipoImpressao: um(p.tipoImpressao, ["simples", "completa"] as const, "completa"),
    impressaoAutomatica: !!p.impressaoAutomatica,
    tamanhoFonte: um(p.tamanhoFonte, ["pequeno", "medio"] as const, "pequeno"),
    mostrarGruposComplementos: !!p.mostrarGruposComplementos,
  };
}

export async function listarImpressorasLoja(lojaId: number): Promise<ImpressoraLoja[]> {
  try {
    const arr = JSON.parse(await getConfig(lojaId, CHAVE, "[]"));
    return Array.isArray(arr) ? arr.map(normalizar).filter((p): p is ImpressoraLoja => !!p) : [];
  } catch {
    return [];
  }
}

async function gravar(lojaId: number, lista: ImpressoraLoja[]) {
  const valor = JSON.stringify(lista);
  await db
    .insert(configuracoes)
    .values({ loja_id: lojaId, chave: CHAVE, valor })
    .onConflictDoUpdate({ target: [configuracoes.loja_id, configuracoes.chave], set: { valor } });
}

export async function salvarImpressoraLoja(lojaId: number, dados: Record<string, unknown>) {
  const perfil = normalizar(dados);
  if (!perfil) return { ok: false as const, msg: "Informe o nome da impressora." };
  const lista = await listarImpressorasLoja(lojaId);
  const idx = lista.findIndex((p) => p.id === perfil.id);
  if (idx >= 0) lista[idx] = perfil;
  else {
    if (lista.length >= 20) return { ok: false as const, msg: "Limite de 20 impressoras por loja." };
    lista.push(perfil);
  }
  await gravar(lojaId, lista);
  return { ok: true as const, perfis: lista };
}

export async function excluirImpressoraLoja(lojaId: number, id: string) {
  const lista = (await listarImpressorasLoja(lojaId)).filter((p) => p.id !== id);
  await gravar(lojaId, lista);
  return { ok: true as const, perfis: lista };
}
