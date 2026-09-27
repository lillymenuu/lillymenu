import { Check } from "lucide-react";
import { HeroSignupForm } from "@/components/landing/hero-signup-form";
import type { PlanoSignup } from "@/db/queries/landingConfig";

const REFORCOS = ["Sem cartão de crédito", "Cancele quando quiser", "Suporte para configurar tudo"];

export function LandingSignup({
  planos,
  faturamentoOpcoes,
  segmentoOpcoes,
  leadLabels,
}: {
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
    <section id="cadastro" className="border-y border-[#ece7e0] bg-[#faf9f7]">
      <div className="mx-auto grid max-w-[1180px] gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 md:items-center md:py-24">
        <div className="flex flex-col gap-5">
          <h2 className="text-[28px] leading-[1.25] font-bold tracking-tight sm:text-[30px]">Comece a operar hoje mesmo</h2>
          <p className="max-w-md text-[14.5px] leading-relaxed text-[#5b6169]">
            Escolha seu plano, cadastre sua loja e já recebe o acesso ao painel por e-mail.
          </p>
          <ul className="flex flex-col gap-2.5">
            {REFORCOS.map((r) => (
              <li key={r} className="flex items-center gap-2.5 text-sm">
                <Check className="size-4 shrink-0 text-[#9c5523]" />
                {r}
              </li>
            ))}
          </ul>
        </div>

        <HeroSignupForm planos={planos} faturamentoOpcoes={faturamentoOpcoes} segmentoOpcoes={segmentoOpcoes} labels={leadLabels} />
      </div>
    </section>
  );
}
