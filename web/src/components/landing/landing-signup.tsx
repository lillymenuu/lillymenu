import { Check } from "lucide-react";
import { HeroSignupForm } from "@/components/landing/hero-signup-form";

const REFORCOS = ["Sem cartão de crédito", "Cancele quando quiser", "Suporte para configurar tudo"];

export function LandingSignup({
  faturamentoOpcoes,
  segmentoOpcoes,
  leadLabels,
}: {
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
    <section id="cadastro" className="scroll-mt-20 border-y border-[#e5e7eb] bg-[#f9fafb]">
      <div className="mx-auto grid max-w-[1180px] gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 md:items-center md:py-24">
        <div className="flex flex-col gap-5">
          <h2 className="text-[30px] leading-[1.2] font-extrabold tracking-tight">Comece a operar hoje mesmo</h2>
          <p className="max-w-md text-[14.5px] leading-relaxed text-[#4b5563]">
            Cadastre sua loja e comece agora no plano grátis de 30 dias — o acesso ao painel chega no seu e-mail.
          </p>
          <ul className="flex flex-col gap-2.5">
            {REFORCOS.map((r) => (
              <li key={r} className="flex items-center gap-2.5 text-sm">
                <Check className="size-4 shrink-0 text-[#2563eb]" />
                {r}
              </li>
            ))}
          </ul>
        </div>

        <HeroSignupForm faturamentoOpcoes={faturamentoOpcoes} segmentoOpcoes={segmentoOpcoes} labels={leadLabels} />
      </div>
    </section>
  );
}
