"use client";

import { formatBRL } from "@/components/ordermanager/constants";
import { PosInfoCard } from "@/components/pos/pos-info-card";
import type { PosEndereco } from "@/components/pos/pos-tipo-pedido";

export function PosEnderecoCard({
  endereco,
  onLimpar,
  onAbrir,
  taxaEntrega,
}: {
  endereco: PosEndereco;
  onLimpar: () => void;
  onAbrir: () => void;
  taxaEntrega: number;
}) {
  const preenchido = endereco.rua.trim() !== "";

  if (!preenchido) {
    return (
      <button
        type="button"
        onClick={onAbrir}
        className="w-full rounded-xl border border-dashed p-3 text-left text-sm text-muted-foreground transition-colors hover:bg-muted/40"
      >
        Informar endereço de entrega
      </button>
    );
  }

  return (
    <PosInfoCard onLimpar={onLimpar} onEditar={onAbrir}>
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
  );
}
