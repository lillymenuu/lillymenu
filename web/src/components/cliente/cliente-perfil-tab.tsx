"use client";

import { Wallet, Gift, Landmark, ReceiptText, CalendarDays, ListChecks, Star } from "lucide-react";
import { formatBRL } from "@/components/ordermanager/constants";
import { formatDataCurta, formatEndereco, type ClienteStats } from "./types";

function Cartao({
  icone,
  valor,
  label,
}: {
  icone: React.ReactNode;
  valor: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border p-2.5">
      <span className="mt-0.5 text-muted-foreground">{icone}</span>
      <div>
        <div className="font-medium">{valor}</div>
        <div className="text-xs font-normal text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

export function ClientePerfilTab({ stats }: { stats: ClienteStats }) {
  const enderecoTexto = formatEndereco(stats.endereco);

  return (
    <div className="flex flex-col gap-2.5">
      <div className="grid grid-cols-2 gap-2 text-sm">
        <Cartao icone={<Wallet size={16} />} valor={formatBRL(stats.cashback)} label="cashback acumulado" />
        <Cartao icone={<Gift size={16} />} valor={stats.pontos} label="pontos" />
        <Cartao icone={<Landmark size={16} />} valor={formatBRL(stats.saldo_fiado)} label="saldo fiado" />
        <Cartao icone={<ReceiptText size={16} />} valor={formatBRL(stats.ticket_medio)} label="ticket médio" />
        <Cartao icone={<CalendarDays size={16} />} valor={formatDataCurta(stats.ultimo_pedido)} label="último pedido" />
        <Cartao icone={<ListChecks size={16} />} valor={stats.pedidos_feitos} label="pedidos feitos" />
        <Cartao
          icone={<Star size={16} />}
          valor={stats.avaliacao_media != null ? stats.avaliacao_media.toFixed(1) : "Sem dados"}
          label="avaliação média"
        />
      </div>

      <div className="flex flex-col gap-2 border-t pt-2.5 text-sm">
        <div className="text-sm font-medium">Informações pessoais</div>
        <div>
          <div className="text-xs font-normal text-muted-foreground">Telefone</div>
          <div className="font-normal">{stats.telefone || "-"}</div>
        </div>
        <div>
          <div className="text-xs font-normal text-muted-foreground">Endereço</div>
          <div className="font-normal">{enderecoTexto || "Não informado"}</div>
        </div>
      </div>
    </div>
  );
}
