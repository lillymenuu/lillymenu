import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

/*
 * "regions" no vercel.json nao esta sendo respeitado (builds saindo em iad1
 * mesmo com gru1 configurado — verificado via `vercel inspect`). O jeito que
 * a Vercel realmente honra pra apps Next.js e essa route segment config,
 * herdada por toda a arvore de rotas/paginas a partir do layout raiz — o
 * motivo original de fixar a regiao continua valendo: funcoes rodando perto
 * do Neon (sa-east-1) em vez de do outro lado do mundo (us-east).
 */
export const preferredRegion = "gru1";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LillyMenu",
  description: "Painel administrativo LillyMenu",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
