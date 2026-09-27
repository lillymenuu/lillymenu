const PASSOS = [
  { titulo: "Cadastre sua loja", texto: "Leva menos de 2 minutos: seus dados, sua empresa e o plano que combina com o seu negócio." },
  { titulo: "Configure cardápio e PDV", texto: "Adicione produtos, mesas e formas de pagamento — tudo pronto pra operar no mesmo dia." },
  { titulo: "Comece a vender", texto: "Balcão, mesas e delivery próprio num painel só, sem comissão por pedido de marketplace." },
];

export function LandingComoFunciona() {
  return (
    <section id="como-funciona" className="bg-[#0b1220]">
      <div className="mx-auto max-w-[1180px] px-4 py-16 text-center sm:px-6 md:py-24">
        <span className="text-xs font-bold tracking-widest text-[#60a5fa] uppercase">Como funciona</span>
        <h2 className="mt-3 text-[30px] leading-[1.2] font-extrabold tracking-tight text-white">Do cadastro à primeira venda</h2>
        <p className="mx-auto mt-3 max-w-md text-[15px] text-white/60">Três passos simples pra colocar sua loja no ar.</p>

        <div className="mt-12 grid gap-5 text-left sm:grid-cols-3">
          {PASSOS.map((passo, i) => (
            <div
              key={passo.titulo}
              className={`flex flex-col gap-4 rounded-2xl border p-6 ${
                i === PASSOS.length - 1 ? "border-[#2563eb]/50 bg-[#111a2e]" : "border-white/10 bg-white/5"
              }`}
            >
              <span
                className={`flex size-9 items-center justify-center rounded-lg text-base font-bold ${
                  i === PASSOS.length - 1 ? "bg-white text-[#0b1220]" : "bg-[#1e293b] text-[#60a5fa]"
                }`}
              >
                {i + 1}
              </span>
              <h3 className="text-base font-bold text-white">{passo.titulo}</h3>
              <p className="text-[14px] leading-relaxed text-white/60">{passo.texto}</p>
            </div>
          ))}
        </div>

        <a
          href="#cadastro"
          className="mt-12 inline-flex h-12 items-center justify-center rounded-lg bg-white px-8 text-base font-semibold text-[#0b1220] transition-transform hover:-translate-y-0.5"
        >
          Criar minha loja grátis
        </a>
      </div>
    </section>
  );
}
