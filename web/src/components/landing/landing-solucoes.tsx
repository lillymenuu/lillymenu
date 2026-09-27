import { Monitor, ShoppingBag, Users, Wallet, BarChart3, type LucideIcon } from "lucide-react";

export type Solucao = { titulo: string; texto: string; imagem: string };

const ICONES: LucideIcon[] = [Monitor, ShoppingBag, Users, Wallet, BarChart3];

export function LandingSolucoes({ titulo, itens }: { titulo: string; itens: Solucao[] }) {
  if (itens.length === 0) return null;

  return (
    <section id="solucoes" className="mx-auto max-w-[1180px] px-4 py-16 sm:px-6 md:py-24">
      <h2 className="max-w-xl text-[28px] leading-[1.25] font-bold tracking-tight sm:text-[30px]">{titulo}</h2>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {itens.map((item, i) => {
          const Icone = ICONES[i % ICONES.length];
          return (
            <div
              key={item.titulo}
              className="group flex flex-col overflow-hidden rounded-[20px] bg-white shadow-[0_22px_45px_rgba(8,20,33,0.1)] transition-transform duration-200 hover:-translate-y-1"
            >
              {item.imagem && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.imagem} alt={item.titulo} className="h-40 w-full object-cover" />
              )}
              <div className="flex flex-col gap-2 p-6">
                <span className="flex size-9 items-center justify-center rounded-[9px] bg-[#f5ede5] text-[#7a3f10]">
                  <Icone className="size-4.5" />
                </span>
                <h3 className="text-[17px] font-bold">{item.titulo}</h3>
                <p className="text-[14.5px] leading-relaxed text-[#5b6169]">{item.texto}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
