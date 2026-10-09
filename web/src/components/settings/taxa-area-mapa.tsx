"use client";

import { useMemo } from "react";
import { MapContainer, TileLayer, Polygon, Marker, Tooltip, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type PontoMapa = { lat: number; lng: number };

const vertexIcon = L.divIcon({
  className: "",
  html: '<div style="width:14px;height:14px;border-radius:50%;background:#9c5523;border:2px solid #fff;box-shadow:0 0 2px rgba(0,0,0,.6)"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

function CliquesMapa({ onClick }: { onClick: (p: PontoMapa) => void }) {
  useMapEvents({
    click: (e) => onClick({ lat: e.latlng.lat, lng: e.latlng.lng }),
  });
  return null;
}

export function TaxaAreaMapa({
  centro,
  poligono,
  onChange,
  outras = [],
  className,
}: {
  centro: PontoMapa;
  poligono: PontoMapa[];
  onChange: (p: PontoMapa[]) => void;
  outras?: { nome: string; poligono: PontoMapa[] }[];
  className?: string;
}) {
  const posicoes = useMemo(() => poligono.map((p) => [p.lat, p.lng] as [number, number]), [poligono]);

  function adicionarPonto(p: PontoMapa) {
    onChange([...poligono, p]);
  }

  function moverPonto(indice: number, p: PontoMapa) {
    const novo = [...poligono];
    novo[indice] = p;
    onChange(novo);
  }

  function removerPonto(indice: number) {
    onChange(poligono.filter((_, i) => i !== indice));
  }

  return (
    <MapContainer center={[centro.lat, centro.lng]} zoom={14} doubleClickZoom={false} className={className} style={{ height: "100%", width: "100%" }}>
      <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <CliquesMapa onClick={adicionarPonto} />
      {outras.map((a, i) => (
        <Polygon key={`outra-${i}`} positions={a.poligono.map((p) => [p.lat, p.lng])} pathOptions={{ color: "#9ca3af", weight: 1.5, fillOpacity: 0.08, dashArray: "4" }}>
          <Tooltip permanent direction="center" className="!border-none !bg-transparent !shadow-none !text-[11px] !font-medium !text-neutral-500">
            {a.nome}
          </Tooltip>
        </Polygon>
      ))}
      {posicoes.length >= 2 ? <Polygon positions={posicoes} pathOptions={{ color: "#9c5523", weight: 2.5, fillOpacity: 0.18 }} /> : null}
      {poligono.map((p, i) => (
        <Marker
          key={i}
          position={[p.lat, p.lng]}
          icon={vertexIcon}
          draggable
          eventHandlers={{
            dragend: (e) => {
              const pos = (e.target as L.Marker).getLatLng();
              moverPonto(i, { lat: pos.lat, lng: pos.lng });
            },
            dblclick: () => removerPonto(i),
          }}
        />
      ))}
    </MapContainer>
  );
}
