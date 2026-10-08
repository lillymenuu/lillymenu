import { Check } from "lucide-react";
import { cn } from "cn";
import { remapLegacyHref } from "@/lib/landing";
import type { PlanoMarketing } from "@/db/queries/landingConfig";
import { LandingBeneficios } from "./landing-beneficios";
import { SmoothAnchor } from "./smooth-anchor";

type Beneficio = { titulo: string; texto: string };

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
    <section id="planos" className="mx-auto max-w-[1180px] scroll-mt-20 px-4 py-16 sm:px-6 md:py-24">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="text-xs font-bold tracking-widest text-[var(--landing-accent)] uppercase">Planos</span>
        <h2 className="text-[30px] leading-[1.2] font-extrabold tracking-tight">{titulo}</h2>
        {destaques.length > 0 && (
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-1.5 text-sm text-[#4b5563]">
            {destaques.map((d) => (
              <span key={d} className="flex items-center gap-1.5">
                <Check className="size-3.5 text-[var(--landing-accent)]" /> {d}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="mt-10 flex flex-wrap justify-center gap-6">
        {planos.map((plano) => (
          <div
            key={plano.slug}
            className={cn(
              "flex w-full flex-col gap-4 rounded-2xl border border-[#e5e7eb] bg-white p-6 transition-all duration-300 ease-out hover:-translate-y-1.5 hover:border-[rgb(var(--landing-accent-rgb)/0.35)] hover:shadow-[0_24px_44px_rgba(15,23,42,0.12)] sm:w-[calc(50%-12px)] lg:w-[270px]",
              plano.badge && "border-[var(--landing-accent)] shadow-[0_20px_40px_rgb(var(--landing-accent-rgb)/0.12)] hover:shadow-[0_28px_52px_rgb(var(--landing-accent-rgb)/0.2)]"
            )}
          >
            {plano.badge && (
              <span className="w-fit rounded-full bg-[var(--landing-accent-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--landing-accent)]">{plano.badge}</span>
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
                  <Check className="mt-0.5 size-3.5 shrink-0 text-[var(--landing-accent)]" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <SmoothAnchor
              href={resolverLinkPlano(plano)}
              className="landing-cta-pulse mt-auto flex h-10 w-full items-center justify-center rounded-lg bg-[var(--landing-accent)] text-sm font-semibold text-white shadow-[0_10px_22px_-6px_rgb(var(--landing-accent-rgb)/0.4)] transition-transform hover:-translate-y-0.5 hover:bg-[var(--landing-accent-dark)]"
            >
              {plano.botaoTexto}
            </SmoothAnchor>
          </div>
        ))}
      </div>

      <LandingBeneficios titulo={beneficiosTitulo} beneficios={beneficios} />
    </section>
  );
}
