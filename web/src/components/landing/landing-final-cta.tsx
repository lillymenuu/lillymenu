import { Check, ArrowRight } from "lucide-react";

const PILLS = ["Grátis por 30 dias", "Sem cartão de crédito", "Cancele quando quiser"];

export function LandingFinalCta() {
  return (
    <section className="mx-auto max-w-[1180px] px-4 pb-16 sm:px-6 md:pb-24">
      <div className="relative overflow-hidden rounded-[22px] bg-linear-to-br from-[#0b1220] via-[#111a2e] to-[#1d4ed8] p-8 shadow-[0_24px_50px_rgba(11,18,32,0.3)] sm:p-14">
        <div className="relative flex max-w-lg flex-col gap-5">
          <h2 className="text-[30px] leading-[1.2] font-extrabold tracking-tight text-white">
            Pronto pra simplificar a gestão do seu negócio?
          </h2>
          <p className="text-[15px] leading-relaxed text-white/70">
            Cadastre sua loja agora e comece a operar ainda hoje — PDV, delivery próprio, financeiro e estoque num só lugar.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <a
              href="#cadastro"
              className="flex h-12 items-center justify-center gap-2 rounded-lg bg-white px-6 text-base font-bold text-[#0b1220] transition-transform hover:-translate-y-0.5"
            >
              Cadastre-se grátis <ArrowRight className="size-4" />
            </a>
            <a href="#planos" className="text-base font-semibold text-white underline underline-offset-4">
              Ver planos
            </a>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {PILLS.map((p) => (
              <span key={p} className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white/85">
                <Check className="size-3.5 text-emerald-400" /> {p}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
