"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GRUPOS_LANDING } from "@/lib/landingCmsCampos";

type ImagemPendente = { dataUri: string };

export function SaLandingEditor({ configInicial }: { configInicial: Record<string, string> }) {
  const [valores, setValores] = useState<Record<string, string>>(configInicial);
  const [imagensPendentes, setImagensPendentes] = useState<Record<string, ImagemPendente>>({});
  const [salvando, setSalvando] = useState(false);

  function setCampo(chave: string, valor: string) {
    setValores((v) => ({ ...v, [chave]: valor }));
  }

  function selecionarImagem(chave: string, arquivo: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUri = String(reader.result ?? "");
      setImagensPendentes((v) => ({ ...v, [chave]: { dataUri } }));
    };
    reader.readAsDataURL(arquivo);
  }

  async function salvar() {
    setSalvando(true);
    try {
      const imagens = Object.entries(imagensPendentes).map(([chave, img]) => ({ chave, dataUri: img.dataUri }));
      const res = await fetch("/api/superadmin/landing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ valores, imagens }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Não foi possível salvar.");
        return;
      }
      setValores((v) => ({ ...v, ...data.config }));
      setImagensPendentes({});
      toast.success("Conteúdo da landing atualizado.");
    } catch {
      toast.error("Erro de conexão ao salvar.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4 p-4 md:p-6">
      <div className="sticky top-0 z-10 -mx-4 flex items-center justify-between border-b bg-background/95 px-4 py-3 backdrop-blur md:-mx-6 md:px-6">
        <div>
          <h1 className="text-lg font-semibold">Landing page</h1>
          <p className="text-sm text-muted-foreground">Textos, imagens e planos exibidos em lillymenu.com</p>
        </div>
        <Button onClick={salvar} disabled={salvando}>
          {salvando ? "Salvando..." : "Salvar alterações"}
        </Button>
      </div>

      {GRUPOS_LANDING.map((grupo) => (
        <Card key={grupo.titulo}>
          <CardContent className="flex flex-col gap-4">
            <h2 className="text-sm font-semibold">{grupo.titulo}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {grupo.campos.map((campo) => (
                <div key={campo.chave} className={campo.tipo === "textarea" ? "sm:col-span-2 flex flex-col gap-1.5" : "flex flex-col gap-1.5"}>
                  <Label htmlFor={`campo-${campo.chave}`}>{campo.label}</Label>

                  {campo.tipo === "texto" && (
                    <Input id={`campo-${campo.chave}`} value={valores[campo.chave] ?? ""} onChange={(e) => setCampo(campo.chave, e.target.value)} />
                  )}

                  {campo.tipo === "textarea" && (
                    <textarea
                      id={`campo-${campo.chave}`}
                      value={valores[campo.chave] ?? ""}
                      onChange={(e) => setCampo(campo.chave, e.target.value)}
                      rows={campo.ajuda ? 4 : 2}
                      className="w-full rounded-lg border border-input bg-transparent p-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    />
                  )}

                  {campo.tipo === "imagem" && (
                    <div className="flex items-center gap-3">
                      {(imagensPendentes[campo.chave]?.dataUri || valores[campo.chave]) && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={imagensPendentes[campo.chave]?.dataUri || valores[campo.chave]}
                          alt=""
                          className="size-14 shrink-0 rounded-lg border object-cover"
                        />
                      )}
                      <Input
                        id={`campo-${campo.chave}`}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={(e) => {
                          const arquivo = e.target.files?.[0];
                          if (arquivo) selecionarImagem(campo.chave, arquivo);
                        }}
                      />
                    </div>
                  )}

                  {campo.ajuda && <p className="text-xs text-muted-foreground">{campo.ajuda}</p>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
