export type Solucao = { titulo: string; texto: string; imagem: string };

export function LandingSolucoes({ titulo, itens }: { titulo: string; itens: Solucao[] }) {
  if (itens.length === 0) return null;

  return (
    <section id="solucoes" className="mx-auto max-w-6xl px-4 py-14 md:py-20 lg:px-6">
      <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">{titulo}</h2>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {itens.map((item) => (
          <div key={item.titulo} className="flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm">
            {item.imagem && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.imagem} alt={item.titulo} className="h-40 w-full object-cover" />
            )}
            <div className="flex flex-col gap-1.5 p-5">
              <h3 className="text-base font-semibold">{item.titulo}</h3>
              <p className="text-sm text-muted-foreground">{item.texto}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
