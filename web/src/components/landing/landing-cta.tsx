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
    <section id="contato" className="border-t bg-muted/30">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-2 md:items-center md:py-20 lg:px-6">
        <div className="flex flex-col gap-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{titulo}</h2>
            <p className="mt-2 max-w-md text-muted-foreground">{texto}</p>
          </div>
          {itens.length > 0 && (
            <ul className="flex flex-col gap-4">
              {itens.map((item) => (
                <li key={item.titulo} className="flex flex-col gap-0.5">
                  <span className="font-medium">{item.titulo}</span>
                  <span className="text-sm text-muted-foreground">{item.texto}</span>
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
