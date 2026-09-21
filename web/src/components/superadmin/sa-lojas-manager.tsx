"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, FileCheck2, Pencil, Power, PowerOff, Search, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatBRLMilhar } from "@/components/ordermanager/constants";
import { SaLojaEditarDialog } from "@/components/superadmin/sa-loja-editar-dialog";
import { SaComprovanteDialog } from "@/components/superadmin/sa-comprovante-dialog";
import { SaConfigTab } from "@/components/superadmin/sa-config-tab";
import { formatarData, saCall, type SaLoja, type SaLojasResposta } from "@/lib/superadmin";
import { cn } from "cn";

const POR_PAGINA = 10;

const STATUS_ESTILO: Record<string, string> = {
  ativa: "bg-emerald-100 text-emerald-700",
  trial: "bg-amber-100 text-amber-700",
  suspensa: "bg-rose-100 text-rose-700",
};

const FILTROS = [
  { chave: "todas", label: "Todas" },
  { chave: "ativa", label: "Ativas" },
  { chave: "trial", label: "Em teste" },
  { chave: "suspensa", label: "Suspensas" },
  { chave: "revisar", label: "Comprovante p/ revisar" },
];

function iniciais(nome: string) {
  const p = nome.trim().split(/\s+/).filter(Boolean);
  return ((p[0]?.[0] ?? "?") + (p[1]?.[0] ?? "")).toUpperCase();
}

type Confirmacao = { loja: SaLoja; acao: "ativar" | "suspender" | "excluir" };

export function SaLojasManager({ inicial, phpAdminUrl }: { inicial: SaLojasResposta; phpAdminUrl: string }) {
  const [dados, setDados] = useState(inicial);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("todas");
  const [pagina, setPagina] = useState(1);
  const [editando, setEditando] = useState<SaLoja | null>(null);
  const [comprovanteDe, setComprovanteDe] = useState<SaLoja | null>(null);
  const [confirmar, setConfirmar] = useState<Confirmacao | null>(null);
  const [executando, setExecutando] = useState(false);
  const [buscaLead, setBuscaLead] = useState("");

  async function recarregar() {
    const r = await saCall<SaLojasResposta | { ok: false }>("superadmin_lojas");
    if (r.ok) setDados(r as SaLojasResposta);
  }

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return dados.lojas.filter((l) => {
      if (termo && !`${l.nome} ${l.admin.nome} ${l.admin.email}`.toLowerCase().includes(termo)) return false;
      if (filtro === "revisar") return l.cobranca.aguardando_revisao;
      if (filtro !== "todas") return l.status === filtro;
      return true;
    });
  }, [dados.lojas, busca, filtro]);

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const visiveis = filtradas.slice((paginaAtual - 1) * POR_PAGINA, paginaAtual * POR_PAGINA);

  const leads = useMemo(() => {
    const termo = buscaLead.trim().toLowerCase();
    if (!termo) return dados.leads;
    return dados.leads.filter((l) => `${l.nome} ${l.empresa} ${l.email} ${l.cidade}`.toLowerCase().includes(termo));
  }, [dados.leads, buscaLead]);

  async function executar() {
    if (!confirmar) return;
    setExecutando(true);
    try {
      const r = await saCall("superadmin_loja_acao", { acao: confirmar.acao, loja_id: confirmar.loja.id });
      if (!r.ok) {
        toast.error(r.msg ?? "Não foi possível concluir a ação.");
        return;
      }
      toast.success(
        confirmar.acao === "excluir" ? "Loja excluída" : confirmar.acao === "ativar" ? "Loja ativada" : "Loja suspensa"
      );
      setConfirmar(null);
      await recarregar();
    } finally {
      setExecutando(false);
    }
  }

  const textoConfirmacao = confirmar && {
    ativar: { titulo: "Ativar loja", desc: `Ativar "${confirmar.loja.nome}" e liberar o acesso do administrador?`, botao: "Ativar", destrutivo: false },
    suspender: { titulo: "Suspender loja", desc: `Suspender "${confirmar.loja.nome}"? O administrador perde o acesso até a reativação.`, botao: "Suspender", destrutivo: true },
    excluir: { titulo: "Excluir loja", desc: `Excluir "${confirmar.loja.nome}" e TODOS os seus dados (pedidos, produtos, clientes...)? Esta ação não pode ser desfeita.`, botao: "Excluir definitivamente", destrutivo: true },
  }[confirmar.acao];

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-4">
      <div>
        <h2 className="text-2xl font-semibold">Lojas</h2>
        <p className="text-sm text-muted-foreground">Gerencie as lojas cadastradas, cobranças, leads e configurações da plataforma.</p>
      </div>

      <Tabs defaultValue="lojas">
        <TabsList>
          <TabsTrigger value="lojas">Lojas ({dados.lojas.length})</TabsTrigger>
          <TabsTrigger value="leads">Leads ({dados.leads.length})</TabsTrigger>
          <TabsTrigger value="config">Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="lojas" className="mt-4 flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-lg border bg-background px-3 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30">
              <Search size={16} className="text-muted-foreground" />
              <input
                value={busca}
                onChange={(e) => {
                  setBusca(e.target.value);
                  setPagina(1);
                }}
                placeholder="Pesquisar loja ou administrador"
                className="h-9 min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {FILTROS.map((f) => (
                <button
                  key={f.chave}
                  type="button"
                  onClick={() => {
                    setFiltro(f.chave);
                    setPagina(1);
                  }}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    filtro === f.chave ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <Card className="overflow-hidden py-0">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Loja</TableHead>
                    <TableHead>Administrador</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Expira</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Comprovante</TableHead>
                    <TableHead className="pr-4 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visiveis.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                        Nenhuma loja encontrada.
                      </TableCell>
                    </TableRow>
                  )}
                  {visiveis.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="pl-4">
                        <div className="flex items-center gap-3">
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{iniciais(l.nome)}</div>
                          <div className="leading-tight">
                            <p className="font-medium">{l.nome}</p>
                            <p className="text-xs text-muted-foreground">#{l.id} · criada em {formatarData(l.criado_em)}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="leading-tight">{l.admin.nome || "-"}</p>
                        <p className="text-xs text-muted-foreground">{l.admin.email || "-"}</p>
                      </TableCell>
                      <TableCell>
                        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize", STATUS_ESTILO[l.status] ?? "bg-slate-100 text-slate-600")}>
                          {l.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        {l.em_teste ? (
                          <>
                            <p className="leading-tight font-medium">{formatarData(l.trial_fim)}</p>
                            <p className="text-xs text-muted-foreground">Fim do teste</p>
                          </>
                        ) : (
                          <>
                            <p className="leading-tight font-medium">{formatarData(l.expira_em)}</p>
                            <p className="text-xs text-muted-foreground">
                              {l.expira_dias === null ? "-" : l.expira_dias < 0 ? "expirado" : `${l.expira_dias} dias`}
                            </p>
                          </>
                        )}
                      </TableCell>
                      <TableCell>
                        {l.plano_nome ? (
                          <>
                            <p className="leading-tight font-medium">{l.plano_nome}</p>
                            <p className="text-xs text-muted-foreground">{l.plano_valor != null ? formatBRLMilhar(l.plano_valor) : ""}</p>
                          </>
                        ) : l.plano_desejado ? (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">Desejado: {l.plano_desejado}</span>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        {l.cobranca.aguardando_revisao ? (
                          <button
                            type="button"
                            onClick={() => setComprovanteDe(l)}
                            className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-200"
                          >
                            <FileCheck2 size={13} /> Revisar
                          </button>
                        ) : l.cobranca.aprovado ? (
                          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">✓ Aprovado</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="pr-4">
                        <div className="flex justify-end gap-1">
                          <Button size="icon-sm" variant="ghost" onClick={() => setEditando(l)} aria-label="Editar" title="Editar">
                            <Pencil size={15} />
                          </Button>
                          {l.ativo ? (
                            <Button size="icon-sm" variant="ghost" onClick={() => setConfirmar({ loja: l, acao: "suspender" })} aria-label="Suspender" title="Suspender">
                              <PowerOff size={15} />
                            </Button>
                          ) : (
                            <Button size="icon-sm" variant="ghost" className="text-emerald-600" onClick={() => setConfirmar({ loja: l, acao: "ativar" })} aria-label="Ativar" title="Ativar">
                              <Power size={15} />
                            </Button>
                          )}
                          <Button size="icon-sm" variant="ghost" className="text-destructive" onClick={() => setConfirmar({ loja: l, acao: "excluir" })} aria-label="Excluir" title="Excluir">
                            <Trash2 size={15} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {filtradas.length === 0
                ? "0 lojas"
                : `${(paginaAtual - 1) * POR_PAGINA + 1}–${Math.min(paginaAtual * POR_PAGINA, filtradas.length)} de ${filtradas.length}`}
            </span>
            <div className="flex items-center gap-1">
              <Button size="icon-sm" variant="outline" disabled={paginaAtual <= 1} onClick={() => setPagina(paginaAtual - 1)} aria-label="Página anterior">
                <ChevronLeft size={16} />
              </Button>
              <span className="px-2 tabular-nums">
                {paginaAtual} / {totalPaginas}
              </span>
              <Button size="icon-sm" variant="outline" disabled={paginaAtual >= totalPaginas} onClick={() => setPagina(paginaAtual + 1)} aria-label="Próxima página">
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="leads" className="mt-4 flex flex-col gap-3">
          <div className="flex max-w-md items-center gap-2 rounded-lg border bg-background px-3 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30">
            <Search size={16} className="text-muted-foreground" />
            <input value={buscaLead} onChange={(e) => setBuscaLead(e.target.value)} placeholder="Pesquisar lead" className="h-9 min-w-0 flex-1 bg-transparent text-sm outline-none" />
          </div>
          <Card className="overflow-hidden py-0">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Data</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>WhatsApp</TableHead>
                    <TableHead>CNPJ</TableHead>
                    <TableHead>Cidade/UF</TableHead>
                    <TableHead className="pr-4">Segmento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                        Nenhum lead encontrado.
                      </TableCell>
                    </TableRow>
                  )}
                  {leads.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="pl-4">{formatarData(l.criado_em)}</TableCell>
                      <TableCell className="font-medium">{l.nome || "-"}</TableCell>
                      <TableCell>{l.empresa || "-"}</TableCell>
                      <TableCell>{l.email || "-"}</TableCell>
                      <TableCell>{l.whatsapp || "-"}</TableCell>
                      <TableCell>{l.cnpj || "-"}</TableCell>
                      <TableCell>{[l.cidade, l.estado].filter(Boolean).join("/") || "-"}</TableCell>
                      <TableCell className="pr-4">{l.segmento || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config" className="mt-4">
          <SaConfigTab config={dados.config} planos={dados.planos} categorias={dados.categorias} onAtualizado={recarregar} />
        </TabsContent>
      </Tabs>

      <SaLojaEditarDialog loja={editando} planos={dados.planos} onOpenChange={(v) => !v && setEditando(null)} onSalvo={recarregar} />
      <SaComprovanteDialog loja={comprovanteDe} phpAdminUrl={phpAdminUrl} onOpenChange={(v) => !v && setComprovanteDe(null)} onAtualizado={recarregar} />

      <Dialog open={confirmar !== null} onOpenChange={(v) => !v && !executando && setConfirmar(null)}>
        <DialogContent className="max-w-md sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{textoConfirmacao?.titulo}</DialogTitle>
            <DialogDescription>{textoConfirmacao?.desc}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmar(null)} disabled={executando}>
              Cancelar
            </Button>
            <Button variant={textoConfirmacao?.destrutivo ? "destructive" : "default"} onClick={executar} disabled={executando}>
              {executando ? "Aguarde..." : textoConfirmacao?.botao}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
