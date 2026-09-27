import { remapLegacyHref, aplicarBrand } from "@/lib/landing";

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-4">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
    </svg>
  );
}

function LinkedinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="size-4">
      <path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.5 8h4V23h-4V8zM8.5 8h3.8v2.05h.05c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.78 2.65 4.78 6.1V23h-4v-6.7c0-1.6-.03-3.66-2.23-3.66-2.23 0-2.57 1.74-2.57 3.55V23h-4V8z" />
    </svg>
  );
}

function YoutubeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-4">
      <rect x="2" y="5" width="20" height="14" rx="4" />
      <path d="M10 9.5v5l4.5-2.5z" fill="currentColor" stroke="none" />
    </svg>
  );
}

type LinkItem = { label: string; href: string };

export function LandingFooter({
  brand,
  menuTitulo,
  menuItens,
  paraVoceTitulo,
  paraVoceItens,
  email,
  telefone,
  endereco,
  instagram,
  linkedin,
  youtube,
}: {
  brand: string;
  menuTitulo: string;
  menuItens: LinkItem[];
  paraVoceTitulo: string;
  paraVoceItens: LinkItem[];
  email: string;
  telefone: string;
  endereco: string;
  instagram: string;
  linkedin: string;
  youtube: string;
}) {
  return (
    <footer className="border-t bg-background">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4 lg:px-6">
        <div className="flex flex-col gap-3">
          <span className="text-lg font-semibold">{brand}</span>
          <p className="text-sm text-muted-foreground">{endereco}</p>
          <p className="text-sm text-muted-foreground">{telefone}</p>
          <p className="text-sm text-muted-foreground">{email}</p>
          <div className="mt-1 flex items-center gap-3 text-muted-foreground">
            {instagram && (
              <a href={instagram} target="_blank" rel="noreferrer" aria-label="Instagram" className="hover:text-foreground">
                <InstagramIcon />
              </a>
            )}
            {linkedin && (
              <a href={linkedin} target="_blank" rel="noreferrer" aria-label="LinkedIn" className="hover:text-foreground">
                <LinkedinIcon />
              </a>
            )}
            {youtube && (
              <a href={youtube} target="_blank" rel="noreferrer" aria-label="YouTube" className="hover:text-foreground">
                <YoutubeIcon />
              </a>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold">{menuTitulo}</span>
          {menuItens.map((item) => (
            <a key={item.label} href={remapLegacyHref(item.href)} className="text-sm text-muted-foreground hover:text-foreground">
              {aplicarBrand(item.label, brand)}
            </a>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold">{paraVoceTitulo}</span>
          {paraVoceItens.map((item) => (
            <a key={item.label} href={remapLegacyHref(item.href)} className="text-sm text-muted-foreground hover:text-foreground">
              {aplicarBrand(item.label, brand)}
            </a>
          ))}
        </div>
      </div>

      <div className="border-t py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} {brand}. Todos os direitos reservados.
      </div>
    </footer>
  );
}
