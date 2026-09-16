"use client";

import { useState } from "react";
import { AtSign, Banknote, CreditCard, Map, MessageCircle, QrCode, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useStoreTheme } from "@/components/store/store-theme";
import type { StorePerfil } from "@/lib/store/types";

type Aba = "info" | "horario" | "pagamento";

export function StoreInfoDialog({
  open,
  onOpenChange,
  perfil,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  perfil: StorePerfil;
}) {
  const { brown } = useStoreTheme();
  const [aba, setAba] = useState<Aba>("info");

  const instagramHandle = perfil.lojaInstagram.replace(/^@/, "");
  const wppNum = perfil.lojaContato.replace(/\D/g, "");

  const pagamentos = [
    perfil.pixAtivo && perfil.pixChave
      ? { key: "pix", nome: "PIX", sub: "Chave disponivel apos confirmar", icon: QrCode, bg: "#dcfce7", cor: "#16a34a" }
      : null,
    perfil.dinAtivo
      ? { key: "dinheiro", nome: "Dinheiro", sub: "Pagamento na entrega / retirada", icon: Banknote, bg: "#d1fae5", cor: "#059669" }
      : null,
    perfil.credAtivo
      ? { key: "credito", nome: "Cartao de credito", sub: "Maquininha na entrega / retirada", icon: CreditCard, bg: "#dbeafe", cor: "#2563eb" }
      : null,
    perfil.debAtivo
      ? { key: "debito", nome: "Cartao de debito", sub: "Maquininha na entrega / retirada", icon: CreditCard, bg: "#ede9fe", cor: "#7c3aed" }
      : null,
  ].filter((x): x is NonNullable<typeof x> => x !== null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="flex max-h-[88dvh] w-[calc(100%-24px)] max-w-[420px] flex-col gap-0 overflow-hidden rounded-[20px] p-0 sm:max-w-[420px]">
        <div className="flex shrink-0 items-center justify-between border-b border-neutral-100 px-[18px] py-3.5">
          <DialogTitle className="text-[.92rem] font-bold text-neutral-900">Informacoes da loja</DialogTitle>
          <button type="button" onClick={() => onOpenChange(false)} className="flex size-7 items-center justify-center rounded-full bg-neutral-100 text-neutral-600">
            <X size={14} />
          </button>
        </div>

        <div className="overflow-y-auto px-[18px] py-3">
          <div className="mb-4 flex gap-1 rounded-xl bg-neutral-100 p-1">
            {(
              [
                ["info", "Informacoes"],
                ["horario", "Horario"],
                ["pagamento", "Pagamento"],
              ] as const
            ).map(([valor, label]) => (
              <button
                key={valor}
                type="button"
                onClick={() => setAba(valor)}
                className="flex-1 rounded-lg py-2 text-[.78rem] font-semibold transition-all"
                style={aba === valor ? { background: "#fff", color: "#111", boxShadow: "0 2px 8px rgba(0,0,0,.1)" } : { color: "#888" }}
              >
                {label}
              </button>
            ))}
          </div>

          {aba === "info" && (
            <div>
              <div
                className="mx-auto mb-2.5 flex size-[74px] items-center justify-center overflow-hidden rounded-full border-[3px] border-white text-[1.8rem] font-extrabold text-white shadow-md"
                style={{ background: brown }}
              >
                {perfil.perfilLoja ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={perfil.perfilLoja} alt="" className="size-full object-cover" />
                ) : (
                  perfil.nomeLoja.charAt(0)
                )}
              </div>
              <p className="mb-4 text-center text-[1rem] font-bold text-neutral-900">{perfil.nomeLoja}</p>
              {perfil.descLoja && <p className="mb-4 text-center text-[.78rem] leading-relaxed text-neutral-500">{perfil.descLoja}</p>}

              {perfil.enderecoLoja && (
                <>
                  <p className="mb-1.5 text-[.68rem] font-bold tracking-wide text-neutral-300 uppercase">Endereco</p>
                  <div className="flex items-center gap-2.5 rounded-xl bg-neutral-50 px-3.5 py-3">
                    <span className="flex-1 text-[.84rem] leading-relaxed text-neutral-700">{perfil.enderecoLoja}</span>
                    <button
                      type="button"
                      title="Mapa"
                      onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(perfil.enderecoLoja)}`, "_blank")}
                      className="flex size-[38px] shrink-0 items-center justify-center rounded-[10px] text-white"
                      style={{ background: brown }}
                    >
                      <Map size={16} />
                    </button>
                  </div>
                </>
              )}

              {(wppNum || instagramHandle) && (
                <>
                  <p className="mt-3 mb-1.5 text-[.68rem] font-bold tracking-wide text-neutral-300 uppercase">Redes sociais</p>
                  <div className="flex gap-2.5">
                    {wppNum && (
                      <button
                        type="button"
                        title="WhatsApp"
                        onClick={() => window.open(`https://wa.me/55${wppNum}`, "_blank")}
                        className="flex size-[42px] items-center justify-center rounded-full border-[1.5px] border-neutral-200 text-neutral-600"
                      >
                        <MessageCircle size={18} />
                      </button>
                    )}
                    {instagramHandle && (
                      <button
                        type="button"
                        title="Instagram"
                        onClick={() => window.open(`https://instagram.com/${encodeURIComponent(instagramHandle)}`, "_blank")}
                        className="flex size-[42px] items-center justify-center rounded-full border-[1.5px] border-neutral-200 text-neutral-600"
                      >
                        <AtSign size={18} />
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {aba === "horario" && (
            <div>
              {perfil.semanaHorarios.map((d) => (
                <div
                  key={d.dia}
                  className="mb-1.5 flex items-center justify-between rounded-xl px-3 py-2.5"
                  style={d.hoje ? { background: "#fff7ed", border: "1.5px solid #fed7aa" } : { background: "#f9fafb" }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[.84rem] font-semibold text-neutral-900">{d.dia}</span>
                    {d.hoje && (
                      <span className="rounded-full bg-orange-500 px-1.5 py-0.5 text-[.6rem] font-bold tracking-wide text-white uppercase">Hoje</span>
                    )}
                  </div>
                  {d.aberto ? (
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="text-[.84rem] font-semibold text-emerald-600">
                        {d.inicio} – {d.fim}
                      </span>
                      {d.fechaBreve && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[.62rem] font-bold whitespace-nowrap text-amber-800">
                          Fecha em breve
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-[.78rem] text-neutral-300">Fechado</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {aba === "pagamento" && (
            <div>
              {pagamentos.map((p) => {
                const Icon = p.icon;
                return (
                  <div key={p.key} className="mb-2 flex items-center gap-3.5 rounded-2xl border border-neutral-100 bg-neutral-50 p-3.5 last:mb-0">
                    <div className="flex size-[42px] shrink-0 items-center justify-center rounded-xl" style={{ background: p.bg, color: p.cor }}>
                      <Icon size={19} />
                    </div>
                    <div>
                      <p className="text-[.86rem] font-bold text-neutral-900">{p.nome}</p>
                      <p className="mt-0.5 text-[.72rem] text-neutral-400">{p.sub}</p>
                    </div>
                  </div>
                );
              })}
              {pagamentos.length === 0 && <p className="py-6 text-center text-[.84rem] text-neutral-400">Nenhuma forma de pagamento configurada.</p>}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
