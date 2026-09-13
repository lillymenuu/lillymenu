"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatBRL } from "@/components/ordermanager/constants";
import { PosInfoCard } from "@/components/pos/pos-info-card";
import type { PosEndereco } from "@/components/pos/pos-tipo-pedido";

export function PosEnderecoCard({
  endereco,
  onEnderecoChange,
  taxaEntrega,
}: {
  endereco: PosEndereco;
  onEnderecoChange: (e: PosEndereco) => void;
  taxaEntrega: number;
}) {
  const [dialogAberto, setDialogAberto] = useState(false);
  const [rascunho, setRascunho] = useState(endereco);

  useEffect(() => {
    if (dialogAberto) setRascunho(endereco);
  }, [dialogAberto, endereco]);

  const preenchido = endereco.rua.trim() !== "";

  function salvar() {
    onEnderecoChange(rascunho);
    setDialogAberto(false);
  }

  return (
    <>
      {preenchido ? (
        <PosInfoCard onLimpar={() => onEnderecoChange({ rua: "", numero: "", bairro: "", cidade: "", cep: "", complemento: "" })} onEditar={() => setDialogAberto(true)}>
          <div className="mb-1 text-xs font-semibold text-muted-foreground">Endereço de entrega</div>
          <div className="text-sm">
            {endereco.rua}
            {endereco.numero ? `, ${endereco.numero}` : ""}
          </div>
          {endereco.bairro ? <div className="text-sm text-muted-foreground">{endereco.bairro}</div> : null}
          {endereco.cep ? <div className="text-sm text-muted-foreground">{endereco.cep}</div> : null}
          {taxaEntrega > 0 ? (
            <div className="mt-1.5 text-sm">
              <span className="text-muted-foreground">Taxa de entrega </span>
              <span className="font-semibold">{formatBRL(taxaEntrega)}</span>
            </div>
          ) : null}
        </PosInfoCard>
      ) : (
        <button
          type="button"
          onClick={() => setDialogAberto(true)}
          className="w-full rounded-xl border border-dashed p-3 text-left text-sm text-muted-foreground transition-colors hover:bg-muted/40"
        >
          Informar endereço de entrega
        </button>
      )}

      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="max-w-sm sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Endereço de entrega</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Rua</Label>
              <Input value={rascunho.rua} onChange={(e) => setRascunho({ ...rascunho, rua: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Número</Label>
              <Input value={rascunho.numero} onChange={(e) => setRascunho({ ...rascunho, numero: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">CEP</Label>
              <Input value={rascunho.cep} onChange={(e) => setRascunho({ ...rascunho, cep: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Bairro</Label>
              <Input value={rascunho.bairro} onChange={(e) => setRascunho({ ...rascunho, bairro: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Cidade</Label>
              <Input value={rascunho.cidade} onChange={(e) => setRascunho({ ...rascunho, cidade: e.target.value })} />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Complemento</Label>
              <Input value={rascunho.complemento} onChange={(e) => setRascunho({ ...rascunho, complemento: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full" onClick={salvar}>
              Salvar endereço
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
