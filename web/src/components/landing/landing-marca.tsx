import { cn } from "cn";

/**
 * Nome da marca da landing: Poppins 800, tracking justo, e a ultima palavra (ex.: "Menu" em
 * "Lilly Menu") na cor de destaque. Nome de uma palavra so fica todo no tom escuro.
 */
export function LandingMarcaNome({ brand, className }: { brand: string; className?: string }) {
  const nome = brand.trim();
  const corte = nome.lastIndexOf(" ");
  const inicio = corte > 0 ? nome.slice(0, corte) : nome;
  const fim = corte > 0 ? nome.slice(corte + 1) : "";
  return (
    <span className={cn("leading-none font-extrabold tracking-[-0.02em] text-[#0f172a]", className)}>
      {inicio}
      {fim && (
        <>
          {" "}
          <span className="text-[var(--landing-accent)]">{fim}</span>
        </>
      )}
    </span>
  );
}

/** Logo (imagem ou inicial) + nome, usado na navbar. */
export function LandingMarca({ brand, logoImage }: { brand: string; logoImage?: string | null }) {
  return (
    <span className="flex items-center gap-2.5">
      {logoImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoImage}
          alt=""
          className="size-10 rounded-xl object-contain shadow-[0_8px_18px_-6px_rgb(var(--landing-accent-rgb)/0.5)] transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-105"
        />
      ) : (
        <span className="flex size-10 items-center justify-center rounded-xl bg-[var(--landing-accent)] text-base font-extrabold text-white shadow-[0_8px_18px_-6px_rgb(var(--landing-accent-rgb)/0.5)] transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-105">
          {brand.charAt(0)}
        </span>
      )}
      <LandingMarcaNome brand={brand} className="text-[21px] sm:text-[22px]" />
    </span>
  );
}
