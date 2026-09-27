const DESTAQUES = [
  { titulo: "Tudo em um só sistema", texto: "PDV, delivery, financeiro e estoque." },
  { titulo: "Delivery sem comissão", texto: "Cardápio e entrega são da sua loja." },
  { titulo: "30 dias grátis", texto: "Teste sem cartão de crédito." },
  { titulo: "Suporte todos os dias", texto: "Ajuda pra configurar tudo." },
];

export function LandingHighlights() {
  return (
    <section className="border-y border-[#e5e7eb] bg-white">
      <div className="mx-auto grid max-w-[1180px] grid-cols-2 gap-8 px-4 py-10 sm:px-6 lg:grid-cols-4">
        {DESTAQUES.map((d) => (
          <div key={d.titulo} className="flex flex-col gap-1">
            <span className="text-xl font-extrabold text-[#2563eb] sm:text-2xl">{d.titulo}</span>
            <span className="text-xs font-semibold tracking-wide text-[#6b7280] uppercase">{d.texto}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
