export function LandingSegmentos({ titulo, itens, imagem }: { titulo: string; itens: string[]; imagem: string }) {
  if (itens.length === 0) return null;

  return (
    <section className="relative overflow-hidden border-y bg-muted/30">
      {imagem && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imagem} alt="" aria-hidden className="pointer-events-none absolute inset-0 size-full object-cover" />
      )}
      <div className="relative mx-auto flex max-w-3xl flex-col items-center gap-5 px-4 py-14 text-center md:py-20 lg:px-6">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{titulo}</h2>
        <div className="flex flex-wrap justify-center gap-2">
          {itens.map((item) => (
            <span key={item} className="rounded-full border bg-background px-3 py-1.5 text-sm font-medium">
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
