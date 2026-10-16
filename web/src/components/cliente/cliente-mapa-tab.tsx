"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { MapPin, Navigation, Copy } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "cn";

const ClienteMapaSimples = dynamic(() => import("./cliente-mapa-simples").then((m) => m.ClienteMapaSimples), { ssr: false });

type MapaResposta = { ok: true; lat: number; lng: number; endereco: string } | { ok: false; msg: string };

export function ClienteMapaTab({ clienteId }: { clienteId: number }) {
  const [carregando, setCarregando] = useState(true);
  const [mapa, setMapa] = useState<MapaResposta | null>(null);

  useEffect(() => {
    let cancelado = false;
    setCarregando(true);
    fetch(`/api/cliente/mapa?id=${clienteId}`)
      .then((r) => r.json())
      .then((data: MapaResposta) => {
        if (!cancelado) setMapa(data);
      })
      .catch(() => !cancelado && setMapa({ ok: false, msg: "Erro ao carregar o mapa." }))
      .finally(() => !cancelado && setCarregando(false));
    return () => {
      cancelado = true;
    };
  }, [clienteId]);

  if (carregando) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Carregando...</p>;
  }

  if (!mapa || !mapa.ok) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border p-6 text-center">
        <MapPin size={18} className="text-muted-foreground" />
        <span className="text-sm font-normal text-muted-foreground">{mapa?.msg ?? "Não foi possível localizar o endereço no mapa."}</span>
      </div>
    );
  }

  const { lat, lng, endereco } = mapa;
  const linkMaps = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  const linkWaze = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;

  function copiarLinks() {
    navigator.clipboard
      .writeText(`Google Maps: ${linkMaps}\nWaze: ${linkWaze}`)
      .then(() => toast.success("Links copiados."))
      .catch(() => toast.error("Erro ao copiar os links."));
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-normal text-muted-foreground">{endereco}</p>

      <div className="h-56 w-full overflow-hidden rounded-2xl border">
        <ClienteMapaSimples lat={lat} lng={lng} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <a href={linkMaps} target="_blank" rel="noreferrer" className={cn(buttonVariants({ variant: "outline" }), "gap-1.5 rounded-full font-normal")}>
          <MapPin size={14} /> Maps
        </a>
        <a href={linkWaze} target="_blank" rel="noreferrer" className={cn(buttonVariants({ variant: "outline" }), "gap-1.5 rounded-full font-normal")}>
          <Navigation size={14} /> Waze
        </a>
      </div>

      <Button variant="ghost" size="sm" className="gap-1.5 rounded-full font-normal" onClick={copiarLinks}>
        <Copy size={14} /> Copiar links de rotas
      </Button>
    </div>
  );
}
