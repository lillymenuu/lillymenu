import { Mail } from "lucide-react";
import { ContatoForm } from "@/components/landing/contato-form";

export function LandingContato() {
  return (
    <section id="fale-conosco" className="scroll-mt-20 bg-[#f8fafc] py-16 md:py-24">
      <div className="mx-auto max-w-[1180px] px-4 sm:px-6">
        <div className="max-w-xl">
          <h2 className="text-[32px] leading-[1.15] font-extrabold tracking-tight text-[#111827] sm:text-[40px]">
            Fale com a gente.
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-[#5b6169]">
            Dúvidas sobre o sistema, seu plano ou uma parceria: manda uma mensagem que a gente responde por e-mail.
          </p>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
          <ContatoForm />

          <aside className="flex flex-col gap-5">
            <div>
              <span className="text-xs font-medium tracking-wide text-[#6b7280] uppercase">E-mail</span>
              <div className="mt-1 flex items-center gap-2 text-base font-semibold text-[#111827]">
                <Mail className="size-4 text-[var(--landing-accent)]" />
                lilly.menuu@gmail.com
              </div>
              <p className="mt-1 text-[13px] text-[#6b7280]">Costumamos responder em até 24h úteis.</p>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
