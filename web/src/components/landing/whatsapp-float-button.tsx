import { MessageCircle } from "lucide-react";
import { buildWhatsappLink } from "@/lib/landing";

export function WhatsappFloatButton({ numero, mensagem }: { numero: string; mensagem: string }) {
  if (!numero) return null;

  return (
    <a
      href={buildWhatsappLink(numero, mensagem)}
      target="_blank"
      rel="noreferrer"
      aria-label="Falar no WhatsApp"
      className="fixed right-4 bottom-4 z-40 flex size-12 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg transition-transform hover:scale-105 sm:right-6 sm:bottom-6"
    >
      <MessageCircle className="size-6" />
    </a>
  );
}
