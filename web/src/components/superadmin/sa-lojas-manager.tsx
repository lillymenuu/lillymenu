"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SaLojaEditarDialog } from "@/components/superadmin/sa-loja-editar-dialog";
import { SaLojaCard } from "@/components/superadmin/sa-loja-card";
import { SaLojaFaturamentoDialog } from "@/components/superadmin/sa-loja-faturamento-dialog";
import { SaComprovanteDialog } from "@/components/superadmin/sa-comprovante-dialog";
import { SaConfigTab } from "@/components/superadmin/sa-config-tab";
import { formatarData, saCall, type SaLoja, type SaLojasResposta } from "@/lib/superadmin";
import { cn } from "cn";

const POR_PAGINA = 9;

const FILTROS = [
  { chave: "todas", label: "Todas" },
  { chave: "ativa", label: "Ativas" },
  { chave: "trial", label: "Em teste" },
  { chave: "suspensa", label: "Suspensas" },
  { chave: "revisar", label: "Comprovante p/ revisar" },
];

type Confirmacao = { loja: SaLoja; acao: "ativar" | "suspender" | "excluir" };

export function SaLojasManager({ inicial, phpAdminUrl }: { inicial: SaLojasResposta; phpAdminUrl: string }) {
  const searchParams = useSearchParams();
  const [dados, setDados] = useState(inicial);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("todas");
  const [pagina, setPagina] = useState(1);
  const [editando, setEditando] = useState<SaLoja | null>(null);
  const [faturamentoDe, setFaturamentoDe] = useState<SaLoja | null>(null);
  const [comprovanteDe, setComprovanteDe] = useState<SaLoja | null>(null);
  const [confirmar, setConfirmar] = useState<Confirmacao | null>(null);
  const [executando, setExecutando] = useState(false);
  const [buscaLead, setBuscaLead] = useState("");

  async function recarregar() {
    const r = await saCall<SaLojasResposta | { ok: false }>("superadmin_lojas");
    if (r.ok) setDados(r as SaLojasResposta);
  }

  /* Deep-link da busca do topbar (?loja=<id>): abre direto o editar dessa loja. */
  useEffect(() => {
    const id = searchParams.get("loja");
    if (!id) return;
    const loja = dados.lojas.find((l) => l.id === Number(id));
    if (loja) setEditando(loja);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

          {visiveis.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">Nenhuma loja encontrada.</CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visiveis.map((l) => (
                <SaLojaCard
                  key={l.id}
                  loja={l}
                  phpAdminUrl={phpAdminUrl}
                  onAbrirFaturamento={() => setFaturamentoDe(l)}
                  onEditar={() => setEditando(l)}
                  onSuspender={() => setConfirmar({ loja: l, acao: "suspender" })}
                  onAtivar={() => setConfirmar({ loja: l, acao: "ativar" })}
                  onExcluir={() => setConfirmar({ loja: l, acao: "excluir" })}
                  onRevisarComprovante={() => setComprovanteDe(l)}
                />
              ))}
            </div>
          )}

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
      <SaLojaFaturamentoDialog loja={faturamentoDe} onOpenChange={(v) => !v && setFaturamentoDe(null)} />
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
