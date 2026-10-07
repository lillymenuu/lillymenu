"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Mail, Pencil, ShieldCheck, Store, MessageSquareText, Users, CalendarDays, Camera, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "cn";
import { saCall, urlArquivo } from "@/lib/superadmin";
import type { PerfilSuperadmin } from "@/db/queries/superadminPerfil";
import type { SaNotificacao } from "@/lib/superadminServer";

/* Pagina "Perfil" do proprio superadmin (referencia visual: Dashtrans /account/profile), acessada
   pelos itens "Profile"/"Account" dos menus de conta da sidebar e do topbar. Diferente da
   referencia (que mostra "Tasks/Projects/Connections" e um feed generico de atividade fabricados),
   aqui todo numero e todo item e real: lojas ativas e mensagens respondidas vem de contagens de
   verdade, "Atividade recente" reaproveita o mesmo feed do sininho de notificacoes, e "Outros
   administradores" lista quem mais tem acesso superadmin — sem "Get in touch"/"Message" (nao faz
   sentido entrar em contato com o proprio perfil); no lugar, um botao real de "Editar perfil". */

const PHP_ADMIN_URL = process.env.NEXT_PUBLIC_PHP_ADMIN_URL ?? "";

function iniciais(nome: string) {
  const p = nome.trim().split(/\s+/).filter(Boolean);
  return ((p[0]?.[0] ?? "?") + (p[1]?.[0] ?? "")).toUpperCase();
}

function AvatarPerfil({ nome, foto, className }: { nome: string; foto: string | null; className?: string }) {
  if (foto) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={urlArquivo(foto, PHP_ADMIN_URL)} alt="" className={cn("shrink-0 rounded-full border bg-white object-cover", className)} />
    );
  }
  return <span className={cn("flex shrink-0 items-center justify-center rounded-full bg-indigo-600 font-bold text-white", className)}>{iniciais(nome)}</span>;
}

function lerBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
    r.onerror = () => reject(new Error("leitura"));
    r.readAsDataURL(file);
  });
}

function mesAno(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso.replace(" ", "T"));
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

function dataCompleta(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso.replace(" ", "T"));
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

function tempoNaPlataforma(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso.replace(" ", "T"));
  if (isNaN(d.getTime())) return "—";
  const dias = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (dias < 30) return `${Math.max(dias, 0)} dias`;
  if (dias < 365) return `${Math.floor(dias / 30)} meses`;
  const anos = Math.floor(dias / 365);
  return `${anos} ano${anos > 1 ? "s" : ""}`;
}

function tempoRelativo(iso: string) {
  const d = new Date(iso.replace(" ", "T"));
  if (isNaN(d.getTime())) return "";
  const minutos = Math.floor((Date.now() - d.getTime()) / 60000);
  if (minutos < 1) return "agora";
  if (minutos < 60) return `${minutos}min atrás`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `${horas}h atrás`;
  const dias = Math.floor(horas / 24);
  if (dias < 7) return `${dias}d atrás`;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export function SaPerfil({ perfil, notificacoes }: { perfil: PerfilSuperadmin; notificacoes: SaNotificacao[] }) {
  const [editando, setEditando] = useState(false);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Card>
        <CardContent className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <AvatarPerfil nome={perfil.nome} foto={perfil.foto} className="size-20 text-2xl" />
            <div className="min-w-0">
              <h1 className="text-xl font-semibold text-foreground">{perfil.nome}</h1>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1 font-medium text-indigo-700">
                  <ShieldCheck size={13} /> Superadmin
                </span>
                {mesAno(perfil.criadoEm) && (
                  <>
                    <span aria-hidden>•</span>
                    <span>Entrou em {mesAno(perfil.criadoEm)}</span>
                  </>
                )}
              </p>
              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                <span>
                  <strong className="font-semibold text-foreground">{perfil.lojasAtivas}</strong> <span className="text-muted-foreground">lojas ativas</span>
                </span>
                <span>
                  <strong className="font-semibold text-foreground">{perfil.mensagensRespondidas}</strong> <span className="text-muted-foreground">mensagens respondidas</span>
                </span>
                <span>
                  <strong className="font-semibold text-foreground">{tempoNaPlataforma(perfil.criadoEm)}</strong> <span className="text-muted-foreground">na plataforma</span>
                </span>
              </div>
            </div>
          </div>
          <Button onClick={() => setEditando(true)} className="shrink-0 self-start sm:self-center">
            <Pencil size={14} /> Editar perfil
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Sobre</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start gap-2.5">
                <ShieldCheck size={15} className="mt-0.5 shrink-0 text-muted-foreground" />
                <span>
                  <span className="text-muted-foreground">Perfil: </span>
                  <span className="font-medium text-foreground">Superadmin</span>
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <Mail size={15} className="mt-0.5 shrink-0 text-muted-foreground" />
                <span className="min-w-0 break-all">
                  <span className="text-muted-foreground">E-mail: </span>
                  <span className="font-medium text-foreground">{perfil.email}</span>
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <CalendarDays size={15} className="mt-0.5 shrink-0 text-muted-foreground" />
                <span>
                  <span className="text-muted-foreground">Conta criada em: </span>
                  <span className="font-medium text-foreground">{dataCompleta(perfil.criadoEm)}</span>
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="text-muted-foreground">Status:</span>
                <Badge className={perfil.ativo ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}>{perfil.ativo ? "Ativo" : "Inativo"}</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users size={15} /> Outros administradores
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {perfil.outrosSuperadmins.length === 0 ? (
                <p className="text-sm text-muted-foreground">Você é o único administrador da plataforma.</p>
              ) : (
                perfil.outrosSuperadmins.map((o) => (
                  <div key={o.id} className="flex items-center gap-2.5">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-foreground">{iniciais(o.nome)}</span>
                    <div className="min-w-0 leading-tight">
                      <p className="truncate text-sm font-medium text-foreground">{o.nome}</p>
                      <p className="truncate text-xs text-muted-foreground">{o.email}</p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquareText size={15} /> Atividade recente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {notificacoes.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma atividade por enquanto.</p>}
            {notificacoes.map((n, i) => (
              <Link
                key={`${n.tipo}-${n.loja_id}-${i}`}
                href={`/superadmin/suporte?loja=${n.loja_id}`}
                className="-mx-2 flex items-start gap-3 rounded-lg px-2 py-2.5 text-sm transition-colors hover:bg-muted"
              >
                {n.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={urlArquivo(n.logo, PHP_ADMIN_URL)} alt="" className="size-9 shrink-0 rounded-full border bg-white object-cover" />
                ) : (
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                    <Store size={15} />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">{n.titulo}</p>
                  <p className="truncate text-muted-foreground">{n.subtitulo}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground/70">{tempoRelativo(n.quando)}</p>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <SaPerfilEditarDialog perfil={perfil} open={editando} onOpenChange={setEditando} />
    </div>
  );
}

function SaPerfilEditarDialog({ perfil, open, onOpenChange }: { perfil: PerfilSuperadmin; open: boolean; onOpenChange: (v: boolean) => void }) {
  const router = useRouter();
  const inputFotoRef = useRef<HTMLInputElement>(null);
  const [nome, setNome] = useState(perfil.nome);
  const [email, setEmail] = useState(perfil.email);
  const [novaSenha, setNovaSenha] = useState("");
  const [fotoArquivo, setFotoArquivo] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [removerFoto, setRemoverFoto] = useState(false);
  const [salvando, setSalvando] = useState(false);

  function escolherFoto(file: File | undefined) {
    if (!file) return;
    if (!/\.(jpe?g|png|webp)$/i.test(file.name)) return void toast.error("Envie uma imagem JPG, PNG ou WebP.");
    if (file.size > 5 * 1024 * 1024) return void toast.error("Imagem muito grande (máximo 5MB).");
    if (fotoPreview) URL.revokeObjectURL(fotoPreview);
    setFotoArquivo(file);
    setFotoPreview(URL.createObjectURL(file));
    setRemoverFoto(false);
  }

  function removerFotoAtual() {
    if (fotoPreview) URL.revokeObjectURL(fotoPreview);
    setFotoArquivo(null);
    setFotoPreview(null);
    setRemoverFoto(true);
    if (inputFotoRef.current) inputFotoRef.current.value = "";
  }

  async function salvar() {
    setSalvando(true);
    try {
      const corpo: Record<string, unknown> = { nome, email, nova_senha: novaSenha };
      if (fotoArquivo) {
        corpo.foto_base64 = await lerBase64(fotoArquivo);
        corpo.foto_ext = fotoArquivo.name.split(".").pop()?.toLowerCase() ?? "";
      } else if (removerFoto) {
        corpo.remover_foto = true;
      }
      const r = await saCall("superadmin_perfil_salvar", corpo);
      if (!r.ok) {
        toast.error(r.msg ?? "Erro ao salvar o perfil.");
        return;
      }
      toast.success("Perfil atualizado");
      setNovaSenha("");
      setFotoArquivo(null);
      setRemoverFoto(false);
      onOpenChange(false);
      router.refresh();
    } finally {
      setSalvando(false);
    }
  }

  const fotoAtual = removerFoto ? null : (fotoPreview ?? perfil.foto);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Editar perfil</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            {fotoAtual ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={fotoPreview ?? urlArquivo(perfil.foto ?? "", PHP_ADMIN_URL)} alt="" className="size-14 shrink-0 rounded-full border bg-white object-cover" />
            ) : (
              <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-lg font-bold text-white">{iniciais(nome || perfil.nome)}</span>
            )}
            <div className="flex flex-col gap-1">
              <Button type="button" variant="outline" size="sm" onClick={() => inputFotoRef.current?.click()}>
                <Camera size={14} /> Trocar foto
              </Button>
              {fotoAtual && (
                <button type="button" onClick={removerFotoAtual} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive">
                  <X size={12} /> Remover foto
                </button>
              )}
            </div>
            <input ref={inputFotoRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => escolherFoto(e.target.files?.[0])} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sa-perfil-nome">Nome</Label>
            <Input id="sa-perfil-nome" value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sa-perfil-email">E-mail</Label>
            <Input id="sa-perfil-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sa-perfil-senha">Nova senha (opcional)</Label>
            <Input id="sa-perfil-senha" type="password" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} placeholder="Deixe em branco para manter a atual" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={salvando}>
            Cancelar
          </Button>
          <Button onClick={salvar} disabled={salvando || !nome.trim() || !email.trim()}>
            {salvando ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
