"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClientePerfilDialog } from "@/components/cliente/cliente-perfil-dialog";
import { ClienteEditarDialog } from "@/components/cliente/cliente-editar-dialog";
import { ClienteCriarDialog } from "./cliente-criar-dialog";
import { formatDataCurta } from "@/components/cliente/types";
import { formatBRL } from "@/components/ordermanager/constants";
import type { Cliente, ClientesListarResposta } from "@/lib/clientes";
import { cn } from "cn";

export function ClientsManager({
  clientesIniciais,
  totalInicial,
  paginasInicial,
}: {
  clientesIniciais: Cliente[];
  totalInicial: number;
  paginasInicial: number;
}) {
  const [busca, setBusca] = useState("");
  const [pagina, setPagina] = useState(1);

  const [clientes, setClientes] = useState(clientesIniciais);
  const [total, setTotal] = useState(totalInicial);
  const [paginas, setPaginas] = useState(paginasInicial);
  const [carregando, setCarregando] = useState(false);

  const [perfilId, setPerfilId] = useState<number | null>(null);
  const [editarId, setEditarId] = useState<number | null>(null);
  const [criarOpen, setCriarOpen] = useState(false);

  const primeiraRenderRef = useRef(true);
  const buscaTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function carregar(termo: string, paginaAlvo: number) {
    setCarregando(true);
    try {
      const qs = new URLSearchParams({ pagina: String(paginaAlvo) });
      if (termo) qs.set("busca", termo);
      const res = await fetch(`/api/clients/listar?${qs.toString()}`, { cache: "no-store" });
      const data: ClientesListarResposta & { ok: boolean; msg?: string } = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Erro ao carregar os clientes.");
        return;
      }
      setClientes(data.clientes);
      setTotal(data.total);
      setPaginas(data.paginas);
    } catch {
      toast.error("Erro ao carregar os clientes.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    if (primeiraRenderRef.current) {
      primeiraRenderRef.current = false;
      return;
    }
    carregar(busca, pagina);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagina]);

  function mudarBusca(valor: string) {
    setBusca(valor);
    if (buscaTimerRef.current) clearTimeout(buscaTimerRef.current);
    if (valor.trim().length > 0 && valor.trim().length < 2) return;
    buscaTimerRef.current = setTimeout(() => {
      setPagina(1);
      carregar(valor, 1);
    }, 300);
  }

  return (
    <div className="flex h-full flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Clientes</h1>
          <p className="text-sm text-muted-foreground">Aqui você cadastra e gerencia seus clientes.</p>
        </div>
        <Button size="sm" onClick={() => setCriarOpen(true)}>
          <Plus size={14} /> Cadastrar cliente
        </Button>
      </div>

      <Card className="rounded-2xl">
        <CardContent>
          <div className="flex max-w-sm flex-col gap-1">
            <span className="text-[10px] font-medium text-muted-foreground uppercase">Nome ou telefone</span>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground" size={14} />
              <Input
                className="pl-8"
                placeholder="Pesquise pelo nome ou telefone"
                value={busca}
                onChange={(e) => mudarBusca(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="gap-0 rounded-2xl py-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Aniversário</TableHead>
                <TableHead>Cashback</TableHead>
                <TableHead>Pontos</TableHead>
                <TableHead>Endereço</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {carregando ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6}>
                      <div className="h-5 w-full animate-pulse rounded-md bg-muted" />
                    </TableCell>
                  </TableRow>
                ))
              ) : clientes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    Nenhum cliente encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                clientes.map((c) => (
                  <TableRow key={c.id} className="cursor-pointer" onClick={() => setPerfilId(c.id)}>
                    <TableCell className="font-medium">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditarId(c.id);
                        }}
                        className="text-primary hover:underline"
                      >
                        {c.nome}
                      </button>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{c.telefone}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.aniversario ? formatDataCurta(c.aniversario) : "Não informado"}
                    </TableCell>
                    <TableCell>{formatBRL(c.cashback_saldo)}</TableCell>
                    <TableCell>{c.pontos_saldo} pts</TableCell>
                    <TableCell className="max-w-64 truncate text-muted-foreground">{c.endereco_texto}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {paginas > 1 && (
          <div className="flex items-center justify-center gap-1 border-t p-3">
            <PageButton disabled={pagina <= 1} onClick={() => setPagina(1)}>
              «
            </PageButton>
            <PageButton disabled={pagina <= 1} onClick={() => setPagina((p) => Math.max(1, p - 1))}>
              ‹
            </PageButton>
            <span className="px-1.5 text-xs text-muted-foreground">
              Página {pagina} de {paginas}
            </span>
            <PageButton
              disabled={pagina >= paginas}
              onClick={() => setPagina((p) => Math.min(paginas, p + 1))}
            >
              ›
            </PageButton>
            <PageButton disabled={pagina >= paginas} onClick={() => setPagina(paginas)}>
              »
            </PageButton>
          </div>
        )}
      </Card>

      <ClientePerfilDialog
        open={perfilId !== null}
        onOpenChange={(v) => !v && setPerfilId(null)}
        clienteId={perfilId}
      />

      {editarId !== null && (
        <ClienteEditarDialog
          open={editarId !== null}
          onOpenChange={(v) => !v && setEditarId(null)}
          clienteId={editarId}
          onSalvo={() => carregar(busca, pagina)}
        />
      )}

      <ClienteCriarDialog
        open={criarOpen}
        onOpenChange={setCriarOpen}
        onCriado={() => carregar(busca, pagina)}
      />
    </div>
  );
}

function PageButton({
  disabled,
  onClick,
  children,
}: {
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex size-7 items-center justify-center rounded-md border text-xs font-semibold text-foreground transition-colors",
        disabled ? "cursor-not-allowed opacity-40" : "hover:border-primary hover:text-primary"
      )}
    >
      {children}
    </button>
  );
}
