import { Check } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "cn";

function ConstelacaoDeFundo() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 800 500"
      className="pointer-events-none absolute -top-16 -left-24 h-[420px] w-[620px] text-[#9c5523] opacity-[0.08]"
      fill="none"
    >
      <g stroke="currentColor" strokeWidth="1.2">
        <path d="M20 40 L180 120 L340 60 L520 160 L680 90" />
        <path d="M180 120 L220 260 L400 220 L520 160" />
        <path d="M220 260 L120 360 L280 420" />
        <path d="M400 220 L460 380 L620 340 L680 90" />
      </g>
      <g fill="currentColor">
        {[
          [20, 40],
          [180, 120],
          [340, 60],
          [520, 160],
          [680, 90],
          [220, 260],
          [400, 220],
          [120, 360],
          [280, 420],
          [460, 380],
          [620, 340],
        ].map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3.5" />
        ))}
      </g>
    </svg>
  );
}

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
  return (
    <section className="relative overflow-hidden bg-[#faf9f7]">
      {bgImage ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={bgImage} alt="" aria-hidden className="pointer-events-none absolute inset-0 size-full object-cover" />
          <div className="pointer-events-none absolute inset-0 bg-[#faf9f7]/55" aria-hidden />
        </>
      ) : (
        <ConstelacaoDeFundo />
      )}

      <div className="relative mx-auto flex max-w-[1180px] flex-col items-start gap-6 px-4 py-20 sm:px-6 md:py-28">
        <h1 className="max-w-2xl text-[38px] leading-[1.2] font-bold tracking-[-0.5px] sm:text-[48px] sm:leading-[1.15]">{titulo}</h1>
        <p className="max-w-lg text-base leading-relaxed text-[#5b6169] sm:text-lg">{subtitulo}</p>

        <div className="flex flex-col gap-3 sm:flex-row">
          <a
            href="#cadastro"
            className={cn(
              buttonVariants({ size: "lg" }),
              "h-11 rounded-[10px] px-6 text-base shadow-[0_10px_22px_-6px_rgba(156,85,35,0.4)] transition-transform hover:-translate-y-0.5"
            )}
          >
            Cadastre-se grátis
          </a>
          <a
            href="#como-funciona"
            className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11 rounded-[10px] border-[#ece7e0] px-6 text-base")}
          >
            Ver como funciona
          </a>
        </div>

        {stats.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-2 text-sm text-[#5b6169]">
            {stats.map((stat) => (
              <span key={stat} className="flex items-center gap-1.5">
                <Check className="size-3.5 shrink-0 text-[#9c5523]" />
                {stat}
              </span>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
