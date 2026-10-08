import { Check, ArrowRight, CheckCircle2 } from "lucide-react";
import { HeroTypedTitle } from "./hero-typed-title";
import { SmoothAnchor } from "./smooth-anchor";

export function LandingHero({
  titulo,
  subtitulo,
  bgImage,
  stats,
}: {
  titulo: string;
  subtitulo: string;
  bgImage: string;
  stats: string[];
}) {
  const linhas = titulo.split(" ");
  const destaque = linhas.slice(-3).join(" ");
  const resto = linhas.slice(0, -3).join(" ");

  return (
    <section className="relative mx-3 mt-3 overflow-hidden rounded-3xl bg-linear-to-br from-[var(--landing-accent-soft)] via-[#f5f7ff] to-white shadow-[0_20px_60px_-24px_rgba(15,23,42,0.18)] sm:mx-6 sm:mt-6 md:mx-8 md:mt-8">
      <div className="mx-auto grid max-w-[1180px] gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 md:items-center md:py-24">
        <div className="flex flex-col items-start gap-6">
          <HeroTypedTitle resto={resto} destaque={destaque} />
          <p className="max-w-md text-base leading-relaxed text-[#4b5563] sm:text-lg">{subtitulo}</p>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <SmoothAnchor
              href="#cadastro"
              className="landing-cta-pulse flex h-12 items-center justify-center gap-2 rounded-lg bg-[var(--landing-accent)] px-6 text-base font-semibold text-white shadow-[0_10px_25px_-6px_rgb(var(--landing-accent-rgb)/0.5)] transition-transform hover:-translate-y-0.5 hover:bg-[var(--landing-accent-dark)]"
            >
              Começar grátis <ArrowRight className="size-4" />
            </SmoothAnchor>
            <SmoothAnchor href="#como-funciona" className="text-base font-semibold text-[var(--landing-accent)] hover:text-[var(--landing-accent-dark)]">
              Ver como funciona
            </SmoothAnchor>
          </div>

          {stats.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[#4b5563]">
              {stats.map((stat) => (
                <span key={stat} className="flex items-center gap-1.5">
                  <Check className="size-4 shrink-0 text-emerald-500" />
                  {stat}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <div className="relative overflow-hidden rounded-[22px] shadow-[0_24px_50px_rgba(11,18,32,0.18)]">
            {bgImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={bgImage} alt="" className="aspect-[4/3] w-full object-cover" />
            ) : (
              <div className="aspect-[4/3] w-full bg-linear-to-br from-[var(--landing-accent)] to-[var(--landing-accent-dark)]" />
            )}
          </div>

          <div className="landing-float absolute -top-4 right-4 flex items-center gap-2 rounded-xl bg-white px-4 py-3 shadow-[0_16px_35px_rgba(11,18,32,0.18)] sm:right-8">
            <CheckCircle2 className="size-5 shrink-0 text-emerald-500" />
            <div className="leading-tight">
              <div className="text-[13px] font-bold">Pedido #482 confirmado</div>
              <div className="text-xs text-[#6b7280]">Mesa 4 · agora</div>
            </div>
          </div>

          <div className="landing-float-delay absolute -bottom-6 left-4 w-[220px] rounded-xl bg-white p-3.5 shadow-[0_16px_35px_rgba(11,18,32,0.18)] sm:left-8">
            <div className="text-[13px] font-bold">Resumo do pedido</div>
            <div className="mt-2 flex flex-col gap-1 text-xs text-[#6b7280]">
              <div className="flex justify-between">
                <span>2x Combo executivo</span>
                <span>R$ 58,00</span>
              </div>
              <div className="flex justify-between">
                <span>1x Refrigerante</span>
                <span>R$ 8,00</span>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-[#e5e7eb] pt-2 text-[13px] font-bold">
              <span>Total</span>
              <span className="text-[var(--landing-accent)]">R$ 66,00</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
