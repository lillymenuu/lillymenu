"use client";

import { ShoppingBag } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";
import { useStoreTheme } from "@/components/store/store-theme";
import { formatarPreco } from "@/lib/store/format";
import type { StorePedidoSnapshot, StorePerfil } from "@/lib/store/types";

const PAG_LABEL: Record<string, string> = { pix: "Pix", dinheiro: "Dinheiro", credito: "Cartão de Crédito", debito: "Cartão de Débito" };

/* Mesma mensagem do enviarWppPedido() do loja.js legado. */
function montarMensagem(codigo: number | string, perfil: StorePerfil, s: StorePedidoSnapshot): string {
  const isEntrega = s.tipo === "entrega" || s.tipo === "entrega_agendada";
  const isAgendado = s.tipo === "entrega_agendada" || s.tipo === "retirada_agendada";
  const endereco = isEntrega ? s.endereco : perfil.enderecoLoja || "";
  const tempoLinha =
    isAgendado && s.agendamentoTexto
      ? `*Agendado para: ${s.agendamentoTexto}*`
      : isEntrega
        ? `*Tempo estimado para entrega: Entre ${perfil.tEntMin} e ${perfil.tEntMax} minutos*`
        : `*Tempo estimado para retirada: Entre ${perfil.tRetMin} e ${perfil.tRetMax} minutos*`;
  const cbGanho = perfil.cashbackAtivo && perfil.cashbackPct > 0 ? Math.round(((s.total * perfil.cashbackPct) / 100) * 100) / 100 : 0;
  const pts = Math.round(s.total / 10);

  const itensLinhas = s.itens
    .map((i) => {
      let l = `👉 ${i.qtd}x ${i.nome}  ${formatarPreco(i.precoUnit * i.qtd)}`;
      if (i.combosels?.length) l += "\n" + i.combosels.map((c) => `   • ${c.qtd > 1 ? c.qtd + "x " : ""} ${c.nome}`).join("\n");
      if (i.obsUsuario) l += `\n   📝 ${i.obsUsuario}`;
      else if (i.obs && !i.obs.startsWith("[combo]") && i.obs !== "[Resgate de pontos]") l += `\n   📝 ${i.obs}`;
      return l;
    })
    .join("\n");

  const L: string[] = [];
  L.push(`*NÚMERO DO PEDIDO*: ${codigo}`, "");
  L.push(`Nome Cardápio: ${perfil.nomeLoja}`, `Nome do cliente: ${s.nome}`, `Número do telefone:  ${s.telefone}`, "");
  L.push("Forma de pagamento: ", `- ${PAG_LABEL[s.formaPagamento] ?? s.formaPagamento}`);
  if (s.formaPagamento === "dinheiro") {
    if (s.trocoValor > 0) L.push(`- Troco para: ${formatarPreco(s.trocoValor)} (troco: ${formatarPreco(Math.max(0, s.trocoValor - s.total))})`);
    else L.push("- Sem troco");
  }
  L.push(`Tipo de entrega: ${isEntrega ? "Entrega" : "Retirada"}`, tempoLinha);
  if (endereco) L.push(`*${isEntrega ? "Endereço para entrega" : "Endereço para retirada"}: ${endereco}*`);
  if (s.taxa > 0) L.push(`*Taxa de entrega: ${formatarPreco(s.taxa)}*`);
  L.push("", "*RESUMO DO PEDIDO*:", itensLinhas, "", "", `*TOTAL*: ${formatarPreco(s.total)}`);
  if (cbGanho > 0) L.push(`*CASHBACK ganho*: ${formatarPreco(cbGanho)}`);
  if (perfil.clubePontosAtivo && pts > 0) L.push(`*Pontos a receber*: ${pts} pts`);
  if (s.formaPagamento === "pix" && perfil.pixChave) {
    L.push("");
    if (perfil.pixNome) L.push(" *Nome da chave Pix*: ", ` 👉 *${perfil.pixNome}*`, "");
    L.push(" *Chave Pix*: ", ` 👉 *${perfil.pixChave}*`);
  }
  L.push("", "Acompanhe seu pedido através do link abaixo:", perfil.lojaCanonicalUrl || (typeof window !== "undefined" ? window.location.href : ""));
  return L.join("\n");
}

const FAISCAS = [
  { dx: "-92px", dy: "-70px", c: "#f59e0b", d: ".0s" },
  { dx: "88px", dy: "-84px", c: "#10b981", d: ".08s" },
  { dx: "-108px", dy: "8px", c: "#f472b6", d: ".16s" },
  { dx: "112px", dy: "14px", c: "#60a5fa", d: ".04s" },
  { dx: "-64px", dy: "86px", c: "#a78bfa", d: ".12s" },
  { dx: "70px", dy: "90px", c: "#f59e0b", d: ".2s" },
  { dx: "0px", dy: "-104px", c: "#34d399", d: ".1s" },
];

export function StoreSuccessDialog({
  open,
  onOpenChange,
  codigo,
  perfil,
  snapshot,
  onAcompanhar,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  codigo: number | string;
  perfil: StorePerfil;
  snapshot: StorePedidoSnapshot | null;
  onAcompanhar: () => void;
}) {
  const { brown } = useStoreTheme();

  const isEntrega = snapshot ? snapshot.tipo === "entrega" || snapshot.tipo === "entrega_agendada" : true;
  const isAgendado = snapshot ? snapshot.tipo.endsWith("_agendada") : false;
  const previsao = isAgendado && snapshot?.agendamentoTexto
    ? snapshot.agendamentoTexto
    : isEntrega
      ? `${perfil.tEntMin}-${perfil.tEntMax} min`
      : `${perfil.tRetMin}-${perfil.tRetMax} min`;
  const previsaoLabel = isAgendado ? (isEntrega ? "Entrega agendada" : "Retirada agendada") : isEntrega ? "Entrega em" : "Retirada em";

  function enviarWhatsapp() {
    const numero = perfil.lojaContato.replace(/\D/g, "");
    if (!numero || !snapshot) return;
    window.open(`https://wa.me/55${numero}?text=${encodeURIComponent(montarMensagem(codigo, perfil, snapshot))}`, "_blank");
  }

  const rise = (delay: number) => ({ animation: `store-success-rise .6s cubic-bezier(.2,.8,.2,1) ${delay}s both` });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="top-0 left-1/2 h-dvh w-full max-w-[901px] translate-y-0 -translate-x-1/2 gap-0 rounded-none border-0 p-0 sm:max-w-[901px]"
        style={{ background: `radial-gradient(120% 70% at 50% 0%, #ecfdf5 0%, #ffffff 55%), #fff` }}
      >
        <div className="flex h-full flex-col items-center justify-center overflow-hidden px-6 py-8 text-center">
          <div className="relative mb-8 flex size-[120px] items-center justify-center">
            {[0, 0.8].map((d) => (
              <span
                key={d}
                className="absolute inset-3 rounded-full border-2 border-emerald-400"
                style={{ animation: `store-success-ring 2.4s ease-out ${d + 0.5}s infinite` }}
              />
            ))}
            {FAISCAS.map((f, i) => (
              <span
                key={i}
                className="absolute top-1/2 left-1/2 size-2 rounded-full"
                style={{
                  background: f.c,
                  ["--dx" as string]: f.dx,
                  ["--dy" as string]: f.dy,
                  animation: `store-success-spark 1.3s ease-out ${0.35 + parseFloat(f.d)}s both`,
                }}
              />
            ))}
            <div
              className="relative flex size-[96px] items-center justify-center rounded-full"
              style={{
                background: "linear-gradient(145deg,#34d399,#059669)",
                boxShadow: "0 12px 34px rgba(5,150,105,.38), inset 0 2px 0 rgba(255,255,255,.35)",
                animation: "store-success-pop .7s cubic-bezier(.34,1.56,.64,1) both",
              }}
            >
              <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12.5l4.5 4.5L19 7.5" strokeDasharray="24" strokeDashoffset="24" style={{ animation: "store-success-draw .55s ease-out .55s forwards" }} />
              </svg>
            </div>
          </div>

          <p className="mb-1.5 text-[.72rem] font-bold tracking-[.18em] text-emerald-600 uppercase" style={rise(0.5)}>
            Pedido #{codigo} confirmado
          </p>
          <DialogTitle className="mb-2 text-[1.55rem] leading-tight font-extrabold tracking-tight text-neutral-900" style={rise(0.6)}>
            Seu pedido foi criado
            <br />
            com sucesso!
          </DialogTitle>
          <p className="mb-6 max-w-[320px] text-[.85rem] leading-relaxed text-neutral-500" style={rise(0.7)}>
            {perfil.nomeLoja} já recebeu seu pedido e vai começar a preparar.
          </p>

          <div
            className="mb-7 flex w-full max-w-[420px] items-stretch divide-x divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-100 bg-white/90 text-left shadow-[0_10px_30px_rgba(0,0,0,.06)] backdrop-blur"
            style={rise(0.8)}
          >
            <div className="flex-1 px-4 py-3.5">
              <p className="text-[.66rem] font-semibold tracking-wider text-neutral-400 uppercase">{previsaoLabel}</p>
              <p className="mt-0.5 text-[.92rem] font-bold text-neutral-900">{previsao}</p>
            </div>
            {snapshot && (
              <div className="flex-1 px-4 py-3.5">
                <p className="text-[.66rem] font-semibold tracking-wider text-neutral-400 uppercase">Total</p>
                <p className="mt-0.5 text-[.92rem] font-bold text-neutral-900">{formatarPreco(snapshot.total)}</p>
              </div>
            )}
          </div>

          <div className="flex w-full max-w-[420px] flex-col gap-3" style={rise(0.95)}>
            <button
              type="button"
              onClick={enviarWhatsapp}
              className="relative flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-2xl py-4 text-[.88rem] font-extrabold tracking-wide text-white uppercase transition-transform active:scale-[.98]"
              style={{ background: `linear-gradient(135deg, ${brown}, ${brown}dd)`, boxShadow: `0 10px 26px ${brown}55` }}
            >
              <span
                className="pointer-events-none absolute inset-y-0 w-1/3 -skew-x-12 bg-white/25"
                style={{ animation: "store-success-shine 3s ease-in-out 1.6s infinite" }}
              />
              <WhatsAppIcon size={20} className="relative" />
              <span className="relative">Enviar para o WhatsApp da loja</span>
            </button>
            <button
              type="button"
              onClick={onAcompanhar}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border-[1.5px] border-neutral-200 bg-white py-3.5 text-[.86rem] font-semibold text-neutral-700 transition-colors hover:bg-neutral-50"
            >
              <ShoppingBag size={16} />
              Acompanhar pedido
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
