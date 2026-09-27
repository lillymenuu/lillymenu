import { EspecialistaLeadForm } from "@/components/landing/especialista-lead-form";

type CtaItem = { titulo: string; texto: string };

export function LandingCta({
  titulo,
  texto,
  itens,
  botaoTexto,
  faturamentoOpcoes,
  modeloNegocioOpcoes,
}: {
  titulo: string;
  texto: string;
  itens: CtaItem[];
  botaoTexto: string;
  faturamentoOpcoes: string[];
  modeloNegocioOpcoes: string[];
}) {
  return (
    <section id="contato" className="mx-auto max-w-[1180px] px-4 py-16 sm:px-6 md:py-24">
      <div className="grid gap-10 rounded-[22px] bg-gradient-to-br from-[#9c5523] to-[#7a3f10] p-8 shadow-[0_24px_50px_rgba(8,20,33,0.3)] md:grid-cols-2 md:items-center md:p-14">
        <div className="flex flex-col gap-6 text-white">
          <div>
            <h2 className="text-[28px] leading-[1.25] font-bold tracking-tight sm:text-[30px]">{titulo}</h2>
            <p className="mt-2 max-w-md text-[14.5px] leading-relaxed text-white/75">{texto}</p>
          </div>
          {itens.length > 0 && (
            <ul className="flex flex-col gap-4">
              {itens.map((item) => (
                <li key={item.titulo} className="flex flex-col gap-0.5">
                  <span className="font-bold">{item.titulo}</span>
                  <span className="text-[14.5px] leading-relaxed text-white/75">{item.texto}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <EspecialistaLeadForm faturamentoOpcoes={faturamentoOpcoes} modeloNegocioOpcoes={modeloNegocioOpcoes} botaoTexto={botaoTexto} />
      </div>
    </section>
  );
}
