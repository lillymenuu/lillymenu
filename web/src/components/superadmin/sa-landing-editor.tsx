"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { GRUPOS_LANDING } from "@/lib/landingCmsCampos";
import { COR_ACENTO_LANDING_PADRAO } from "@/lib/landing";
import { cn } from "cn";

/* Editor do CMS da landing publica (lillymenu.com) — layout no mesmo padrao das outras telas do
   superadmin (cabecalho com titulo+subtitulo, conteudo em Card, abas como em sa-lojas-manager.tsx
   pra organizar os ~60 campos em secoes em vez de uma rolagem unica). A cobertura de campos (todo
   texto/imagem que a landing renderiza) ja existia em GRUPOS_LANDING — nao mudou, so o layout. */

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
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Landing page</h2>
          <p className="text-sm text-muted-foreground">Textos, imagens e planos exibidos em lillymenu.com. Edite e salve para atualizar a página pública.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" render={<a href="/" target="_blank" rel="noopener noreferrer" />}>
            <ExternalLink size={14} /> Ver página
          </Button>
          <Button onClick={salvar} disabled={salvando}>
            {salvando ? "Salvando..." : "Salvar alterações"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue={GRUPOS_LANDING[0].titulo}>
        <div className="overflow-x-auto pb-1">
          <TabsList className="w-max">
            {GRUPOS_LANDING.map((grupo) => (
              <TabsTrigger key={grupo.titulo} value={grupo.titulo}>
                {grupo.titulo}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {GRUPOS_LANDING.map((grupo) => (
          <TabsContent key={grupo.titulo} value={grupo.titulo} className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>{grupo.titulo}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                {grupo.campos.map((campo) => (
                  <div key={campo.chave} className={campo.tipo === "textarea" ? "flex flex-col gap-1.5 sm:col-span-2" : "flex flex-col gap-1.5"}>
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

                    {campo.tipo === "cor" && (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={valores[campo.chave] || COR_ACENTO_LANDING_PADRAO}
                            onChange={(e) => setCampo(campo.chave, e.target.value)}
                            className="h-9 w-14 shrink-0 cursor-pointer rounded-md border border-input p-1"
                            aria-label={campo.label}
                          />
                          <Input
                            id={`campo-${campo.chave}`}
                            value={valores[campo.chave] ?? ""}
                            onChange={(e) => setCampo(campo.chave, e.target.value)}
                            placeholder={COR_ACENTO_LANDING_PADRAO}
                            className="w-32"
                          />
                        </div>
                        {campo.sugestoes && campo.sugestoes.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5">
                            {campo.sugestoes.map((s) => (
                              <button
                                key={s.hex}
                                type="button"
                                onClick={() => setCampo(campo.chave, s.hex)}
                                className={cn(
                                  "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors hover:bg-muted",
                                  (valores[campo.chave] || COR_ACENTO_LANDING_PADRAO).toLowerCase() === s.hex.toLowerCase() && "border-foreground font-medium"
                                )}
                              >
                                <span className="size-3.5 shrink-0 rounded-full border" style={{ background: s.hex }} />
                                {s.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
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
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
