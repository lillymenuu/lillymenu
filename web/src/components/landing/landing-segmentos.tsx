export function LandingSegmentos({ titulo, itens, imagem }: { titulo: string; itens: string[]; imagem: string }) {
  if (itens.length === 0) return null;

  return (
    <section className="relative overflow-hidden border-y border-[#e5e7eb] bg-[#f9fafb]">
      {imagem && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imagem} alt="" aria-hidden className="pointer-events-none absolute inset-0 size-full object-cover" />
          <div className="pointer-events-none absolute inset-0 bg-[#f9fafb]/70" aria-hidden />
        </>
      )}
      <div className="relative mx-auto flex max-w-[860px] flex-col items-center gap-6 px-4 py-16 text-center sm:px-6 md:py-24">
        <h2 className="text-[30px] leading-[1.2] font-extrabold tracking-tight">{titulo}</h2>
        <div className="flex flex-wrap justify-center gap-2">
          {itens.map((item) => (
            <span
              key={item}
              className="rounded-full border border-[#e5e7eb] bg-white px-3.5 py-1.5 text-sm font-medium text-[#111827]"
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
