import { Check, Users, PiggyBank, Layers, Ticket, Percent, Gift, type LucideIcon } from "lucide-react";
import { cn } from "cn";
import { remapLegacyHref } from "@/lib/landing";
import type { PlanoMarketing } from "@/db/queries/landingConfig";

type Beneficio = { titulo: string; texto: string };

const ICONES_BENEFICIO: LucideIcon[] = [Users, PiggyBank, Layers, Ticket, Percent, Gift];

/** Botoes "Assine ja!" (self-serve) apontavam pro dominio antigo — o destino certo agora e a secao de cadastro. */
function resolverLinkPlano(plano: PlanoMarketing): string {
  if (/assin/i.test(plano.botaoTexto)) return "#cadastro";
  return remapLegacyHref(plano.botaoLink);
}

export function LandingPlanos({
  titulo,
  destaques,
  planos,
  beneficiosTitulo,
  beneficios,
}: {
  titulo: string;
  destaques: string[];
  planos: PlanoMarketing[];
  beneficiosTitulo: string;
  beneficios: Beneficio[];
}) {
  if (planos.length === 0) return null;

  return (
    <section id="planos" className="mx-auto max-w-[1180px] px-4 py-16 sm:px-6 md:py-24">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="text-xs font-bold tracking-widest text-[#2563eb] uppercase">Planos</span>
        <h2 className="text-[30px] leading-[1.2] font-extrabold tracking-tight">{titulo}</h2>
        {destaques.length > 0 && (
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-1.5 text-sm text-[#4b5563]">
            {destaques.map((d) => (
              <span key={d} className="flex items-center gap-1.5">
                <Check className="size-3.5 text-[#2563eb]" /> {d}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {planos.map((plano) => (
          <div
            key={plano.slug}
            className={cn(
              "flex flex-col gap-4 rounded-2xl border border-[#e5e7eb] bg-white p-6",
              plano.badge && "border-[#2563eb] shadow-[0_20px_40px_rgba(37,99,235,0.12)]"
            )}
          >
            {plano.badge && (
              <span className="w-fit rounded-full bg-[#eef2ff] px-2.5 py-1 text-xs font-semibold text-[#2563eb]">{plano.badge}</span>
            )}
            <div>
              <h3 className="text-[17px] font-bold">{plano.nome}</h3>
              <p className="mt-1 text-[14.5px] leading-relaxed text-[#4b5563]">{plano.descricao}</p>
            </div>
            {plano.preco && (
              <div className="text-2xl font-extrabold tracking-tight">
                {plano.preco}
                {plano.preco !== "R$ 0,00" && <span className="text-sm font-normal text-[#4b5563]">/mês</span>}
              </div>
            )}
            <ul className="flex flex-col gap-2 text-sm">
              {plano.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <Check className="mt-0.5 size-3.5 shrink-0 text-[#2563eb]" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <a
              href={resolverLinkPlano(plano)}
              className="mt-auto flex h-10 w-full items-center justify-center rounded-lg bg-[#2563eb] text-sm font-semibold text-white shadow-[0_10px_22px_-6px_rgba(37,99,235,0.4)] transition-transform hover:-translate-y-0.5 hover:bg-[#1d4ed8]"
            >
              {plano.botaoTexto}
            </a>
          </div>
        ))}
      </div>

      {beneficios.length > 0 && (
        <div className="mt-20">
          <h3 className="text-center text-[24px] font-bold tracking-tight">{beneficiosTitulo}</h3>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {beneficios.map((b, i) => {
              const Icone = ICONES_BENEFICIO[i % ICONES_BENEFICIO.length];
              return (
                <div key={b.titulo} className="flex flex-col gap-2 rounded-2xl bg-[#f9fafb] p-6">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-[#eef2ff] text-[#2563eb]">
                    <Icone className="size-4.5" />
                  </span>
                  <h4 className="text-[15px] font-bold">{b.titulo}</h4>
                  <p className="text-[14.5px] leading-relaxed text-[#4b5563]">{b.texto}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
