import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Mídia Indoor – Menu Digital | LillyMenu",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#09090b" };

export default function TvLayout({ children }: { children: React.ReactNode }) {
  return children;
}
