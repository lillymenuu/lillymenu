import { ContatoForm } from "@/components/landing/contato-form";

export function LandingContato() {
  return (
    <section id="fale-conosco" className="scroll-mt-20 bg-[#f8fafc] py-16 md:py-24">
      <div className="mx-auto flex max-w-[640px] flex-col items-center gap-2 px-4 text-center sm:px-6">
        <span className="w-fit rounded-full bg-[#2563eb]/10 px-3 py-1 text-xs font-bold tracking-widest text-[#2563eb] uppercase">
          Fale com a gente
        </span>
        <h2 className="text-[26px] leading-[1.2] font-extrabold tracking-tight text-[#111827]">Tem alguma dúvida ou sugestão?</h2>
        <p className="max-w-md text-[14.5px] leading-relaxed text-[#5b6169]">
          Envie sua mensagem direto pra nossa equipe. Respondemos o mais rápido possível.
        </p>
      </div>

      <div className="mx-auto mt-8 max-w-[560px] px-4 sm:px-6">
        <ContatoForm />
      </div>
    </section>
  );
}
