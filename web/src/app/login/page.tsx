import { Suspense, type CSSProperties } from "react";
import Link from "next/link";
import { Poppins } from "next/font/google";
import { getLandingConfig, lc } from "@/db/queries/landingConfig";
import { corAcentoLanding } from "@/lib/landing";
import { LandingMarca } from "@/components/landing/landing-marca";
import { LoginForm } from "./login-form";

export const revalidate = 300;

/* So a marca usa Poppins (a mesma da landing); o resto do login segue com a fonte do painel. */
const poppins = Poppins({ subsets: ["latin"], weight: ["800"] });

export default async function LoginPage() {
  const config = await getLandingConfig();
  const brand = lc(config, "brand", "Lilly Menu");
  const acento = corAcentoLanding(config.landing_theme_color);

  const marca = (
    <Link
      href="/"
      aria-label={`${brand}: página inicial`}
      className={`${poppins.className} group inline-flex`}
      style={{ "--landing-accent": acento.hex, "--landing-accent-rgb": acento.rgb } as CSSProperties}
    >
      <LandingMarca brand={brand} logoImage={lc(config, "logo_image")} />
    </Link>
  );

  return (
    <Suspense>
      <LoginForm marca={marca} brand={brand} />
    </Suspense>
  );
}
