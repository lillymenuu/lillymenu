import { CheckCircle2 } from "lucide-react";
import { HeroSignupForm } from "@/components/landing/hero-signup-form";
import type { PlanoSignup } from "@/db/queries/landingConfig";

export function LandingHero({
  badge,
  titulo,
  subtitulo,
  bgImage,
  stats,
  planos,
  faturamentoOpcoes,
  segmentoOpcoes,
  leadLabels,
}: {
  badge: string;
  titulo: string;
  subtitulo: string;
  bgImage: string;
  stats: string[];
  planos: PlanoSignup[];
  faturamentoOpcoes: string[];
  segmentoOpcoes: string[];
  leadLabels: {
    titulo: string;
    nome: string;
    empresa: string;
    email: string;
    whatsapp: string;
    faturamento: string;
    segmento: string;
    aceite: string;
    botao: string;
  };
}) {
  return (
    <section className="relative overflow-hidden border-b bg-muted/30">
      {bgImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={bgImage} alt="" aria-hidden className="pointer-events-none absolute inset-0 size-full object-cover" />
      )}

      <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-2 md:items-center md:py-20 lg:px-6">
        <div className="flex flex-col gap-5">
          {badge && (
            <span className="inline-flex w-fit items-center rounded-full border bg-background px-3 py-1 text-xs font-medium text-primary">
              {badge}
            </span>
          )}
          <h1 className="text-3xl leading-tight font-semibold tracking-tight sm:text-4xl lg:text-5xl">{titulo}</h1>
          <p className="max-w-lg text-base text-muted-foreground sm:text-lg">{subtitulo}</p>

          {stats.length > 0 && (
            <ul className="flex flex-col gap-2.5">
              {stats.map((stat) => (
                <li key={stat} className="flex items-start gap-2.5 text-sm">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>{stat}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <HeroSignupForm planos={planos} faturamentoOpcoes={faturamentoOpcoes} segmentoOpcoes={segmentoOpcoes} labels={leadLabels} />
        </div>
      </div>
    </section>
  );
}
