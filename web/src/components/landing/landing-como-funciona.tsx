const PASSOS = [
  { titulo: "Cadastre sua loja", texto: "Leva menos de 2 minutos: seus dados, sua empresa e o plano que combina com o seu negócio." },
  { titulo: "Configure cardápio e PDV", texto: "Adicione produtos, mesas e formas de pagamento — tudo pronto pra operar no mesmo dia." },
  { titulo: "Comece a vender", texto: "Balcão, mesas e delivery próprio num painel só, sem comissão por pedido de marketplace." },
];

export function LandingComoFunciona() {
  return (
    <section id="como-funciona" className="mx-auto max-w-[1180px] px-4 py-16 sm:px-6 md:py-24">
      <h2 className="max-w-xl text-[28px] leading-[1.25] font-bold tracking-tight sm:text-[30px]">Do cadastro à primeira venda</h2>

      <div className="mt-12 grid gap-10 sm:grid-cols-3 sm:gap-6">
        {PASSOS.map((passo, i) => (
          <div key={passo.titulo} className="relative flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#f5ede5] text-base font-bold text-[#7a3f10]">
                {i + 1}
              </span>
              {i < PASSOS.length - 1 && <span className="hidden h-px flex-1 bg-[#ece7e0] sm:block" aria-hidden />}
            </div>
            <h3 className="text-[17px] font-bold">{passo.titulo}</h3>
            <p className="text-[14.5px] leading-relaxed text-[#5b6169]">{passo.texto}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
