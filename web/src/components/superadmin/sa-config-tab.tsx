"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Boxes, MapPinned, QrCode } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatBRLMilhar } from "@/components/ordermanager/constants";
import { saCall, type SaCategoriaRecursos, type SaConfig, type SaPlano } from "@/lib/superadmin";

export function SaConfigTab({
  config,
  planos,
  categorias,
  onAtualizado,
}: {
  config: SaConfig;
  planos: SaPlano[];
  categorias: SaCategoriaRecursos[];
  onAtualizado: () => void;
}) {
  const [pixChave, setPixChave] = useState(config.pix_chave);
  const [pixNome, setPixNome] = useState(config.pix_nome);
  const [whats, setWhats] = useState(config.whats_numero);
  const [salvandoPix, setSalvandoPix] = useState(false);
  const [nominatim, setNominatim] = useState(config.nominatim_ativo);
  const [planoEditando, setPlanoEditando] = useState<SaPlano | null>(null);

  async function salvarPix() {
    setSalvandoPix(true);
    try {
      const r = await saCall("superadmin_config_salvar", { tipo: "pix", pix_chave: pixChave, pix_nome: pixNome, whats_numero: whats });
      if (r.ok) toast.success("Dados de recebimento salvos");
      else toast.error(r.msg ?? "Erro ao salvar.");
    } finally {
      setSalvandoPix(false);
    }
  }

  async function alternarNominatim(v: boolean) {
    setNominatim(v);
    const r = await saCall("superadmin_config_salvar", { tipo: "nominatim", ativo: v });
    if (!r.ok) {
      setNominatim(!v);
      toast.error(r.msg ?? "Erro ao salvar.");
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
            <QrCode size={18} />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Recebimento das assinaturas</h3>
            <p className="text-xs text-muted-foreground">PIX exibido para as lojas e WhatsApp de contato.</p>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cfg-pix">Chave PIX</Label>
            <Input id="cfg-pix" value={pixChave} onChange={(e) => setPixChave(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cfg-nome">Nome do recebedor</Label>
            <Input id="cfg-nome" value={pixNome} onChange={(e) => setPixNome(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cfg-whats">WhatsApp do suporte</Label>
            <Input id="cfg-whats" value={whats} onChange={(e) => setWhats(e.target.value)} placeholder="5585999999999" />
          </div>
          <Button onClick={salvarPix} disabled={salvandoPix} className="self-end">
            {salvandoPix ? "Salvando..." : "Salvar"}
          </Button>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 pt-1">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-600">
              <MapPinned size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold">Endereço automático por localização</h3>
              <p className="text-xs text-muted-foreground">Usa o Nominatim para preencher o endereço do cliente.</p>
            </div>
            <Switch checked={nominatim} onCheckedChange={alternarNominatim} aria-label="Nominatim" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
              <Boxes size={18} />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Recursos por plano</h3>
              <p className="text-xs text-muted-foreground">Defina quais telas cada plano libera para a loja.</p>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {planos.length === 0 && <p className="text-sm text-muted-foreground">Nenhum plano ativo.</p>}
            {planos.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPlanoEditando(p)}
                className="flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors hover:bg-muted"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{p.nome}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatBRLMilhar(p.valor)} · {p.recursos === null ? "sem restrição" : `${p.recursos.length} recursos`}
                  </p>
                </div>
                <span className="text-xs font-medium text-primary">Editar</span>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>

      <Dialog open={planoEditando !== null} onOpenChange={(v) => !v && setPlanoEditando(null)}>
        <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto sm:max-w-xl">
          {planoEditando && (
            <RecursosForm
              key={planoEditando.id}
              plano={planoEditando}
              categorias={categorias}
              onFechar={() => setPlanoEditando(null)}
              onSalvo={onAtualizado}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RecursosForm({
  plano,
  categorias,
  onFechar,
  onSalvo,
}: {
  plano: SaPlano;
  categorias: SaCategoriaRecursos[];
  onFechar: () => void;
  onSalvo: () => void;
}) {
  const [semRestricao, setSemRestricao] = useState(plano.recursos === null);
  const [marcados, setMarcados] = useState<Set<string>>(new Set(plano.recursos ?? []));
  const [salvando, setSalvando] = useState(false);

  function alternar(chave: string, v: boolean) {
    setMarcados((atual) => {
      const novo = new Set(atual);
      if (v) novo.add(chave);
      else novo.delete(chave);
      return novo;
    });
  }

  async function salvar() {
    setSalvando(true);
    try {
      const r = await saCall("superadmin_config_salvar", {
        tipo: "recursos",
        plano_id: plano.id,
        sem_restricao: semRestricao,
        recursos: [...marcados],
      });
      if (!r.ok) {
        toast.error(r.msg ?? "Erro ao salvar.");
        return;
      }
      toast.success("Recursos do plano salvos");
      onSalvo();
      onFechar();
    } finally {
      setSalvando(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Recursos — {plano.nome}</DialogTitle>
      </DialogHeader>

      <label className="flex items-center justify-between gap-3 rounded-lg border bg-muted/40 px-3 py-2.5 text-sm font-medium">
        Sem restrição (libera todas as telas)
        <Switch checked={semRestricao} onCheckedChange={setSemRestricao} />
      </label>

      <div className={semRestricao ? "pointer-events-none opacity-40" : ""}>
        {categorias.map((cat) => (
          <div key={cat.titulo} className="mb-4">
            <p className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{cat.titulo}</p>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {cat.itens.map((item) => (
                <label key={item.chave} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted">
                  <Checkbox checked={marcados.has(item.chave)} onCheckedChange={(v) => alternar(item.chave, v === true)} />
                  {item.label}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onFechar} disabled={salvando}>
          Cancelar
        </Button>
        <Button onClick={salvar} disabled={salvando}>
          {salvando ? "Salvando..." : "Salvar"}
        </Button>
      </DialogFooter>
    </>
  );
}
