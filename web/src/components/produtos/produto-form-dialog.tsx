"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Grid2x2,
  Tag,
  CalendarCheck,
  Star,
  Box,
  Info,
  ImagePlus,
  Trash2,
  ChevronRight,
  Copy,
  ArrowRightLeft,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ImageCropDialog } from "./image-crop-dialog";
import { ConfigurarDiasDialog } from "./configurar-dias-dialog";
import type { Categoria, Produto } from "@/lib/produtos";

const DIAS_LABEL: Record<string, string> = {
  dom: "Dom",
  seg: "Seg",
  ter: "Ter",
  qua: "Qua",
  qui: "Qui",
  sex: "Sex",
  sab: "Sáb",
};

export function ProdutoFormDialog({
  open,
  onOpenChange,
  categorias,
  produto,
  categoriaPadrao,
  phpAdminUrl,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  categorias: Categoria[];
  produto: Produto | null;
  categoriaPadrao?: number | null;
  phpAdminUrl: string;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [aba, setAba] = useState("detalhes");
  const [nome, setNome] = useState("");
  const [codigo, setCodigo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [categoriaId, setCategoriaId] = useState<string>("");
  const [apenasAgendamento, setApenasAgendamento] = useState(false);
  const [qtdMinimaAtiva, setQtdMinimaAtiva] = useState(false);
  const [qtdMinima, setQtdMinima] = useState("1");

  const [preco, setPreco] = useState("");
  const [promoAtiva, setPromoAtiva] = useState(false);
  const [precoPromocional, setPrecoPromocional] = useState("");

  const [ativo, setAtivo] = useState(true);
  const [disponivelCatalogo, setDisponivelCatalogo] = useState(true);
  const [disponivelMesa, setDisponivelMesa] = useState(true);
  const [diasSemana, setDiasSemana] = useState<string[]>([]);
  const [horarioIni, setHorarioIni] = useState("");
  const [horarioFim, setHorarioFim] = useState("");
  const [diasDialogOpen, setDiasDialogOpen] = useState(false);

  const [pontosGanhoAtivo, setPontosGanhoAtivo] = useState(false);
  const [pontosGanho, setPontosGanho] = useState("1");
  const [pontosCustoAtivo, setPontosCustoAtivo] = useState(false);
  const [pontosCusto, setPontosCusto] = useState("1");

  const [estoqueEditando, setEstoqueEditando] = useState(false);
  const [estoqueQtd, setEstoqueQtd] = useState("0");
  const [estoqueMinimo, setEstoqueMinimo] = useState("0");
  const [estoqueAtual, setEstoqueAtual] = useState(0);
  const [salvandoEstoque, setSalvandoEstoque] = useState(false);

  const [transferindo, setTransferindo] = useState(false);
  const [categoriaTransferir, setCategoriaTransferir] = useState<string>("");
  const [duplicando, setDuplicando] = useState(false);

  const [imagemPreview, setImagemPreview] = useState<string | null>(null);
  const [imagemBase64, setImagemBase64] = useState<string | null>(null);
  const [imagemRemover, setImagemRemover] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setAba("detalhes");
    setErro(null);
    setImagemBase64(null);
    setImagemRemover(false);
    setEstoqueEditando(false);
    setTransferindo(false);
    if (produto) {
      setNome(produto.nome);
      setCodigo(produto.codigo ?? "");
      setDescricao(produto.descricao ?? "");
      setCategoriaId(produto.categoria_id ? String(produto.categoria_id) : "");
      setApenasAgendamento(produto.apenas_agendamento === 1);
      setQtdMinimaAtiva((produto.quantidade_minima ?? 0) > 0);
      setQtdMinima(String(produto.quantidade_minima || 1));
      setPreco(String(produto.preco_base));
      setPromoAtiva(Boolean(produto.preco_promocional) && produto.promo_desativado !== 1);
      setPrecoPromocional(produto.preco_promocional ? String(produto.preco_promocional) : "");
      setAtivo(produto.ativo === 1);
      setDisponivelCatalogo(produto.disponivel_catalogo !== 0);
      setDisponivelMesa(produto.disponivel_mesa !== 0);
      setDiasSemana(produto.dias_semana ?? []);
      setHorarioIni(produto.horario_ini ?? "");
      setHorarioFim(produto.horario_fim ?? "");
      setPontosGanhoAtivo((produto.pontos_ganho ?? 0) > 0);
      setPontosGanho(String(produto.pontos_ganho || 1));
      setPontosCustoAtivo((produto.pontos_custo ?? 0) > 0);
      setPontosCusto(String(produto.pontos_custo || 1));
      setEstoqueAtual(produto.estoque_quantidade ?? 0);
      setEstoqueQtd(String(produto.estoque_quantidade ?? 0));
      setEstoqueMinimo("0");
      setCategoriaTransferir(produto.categoria_id ? String(produto.categoria_id) : "");
      setImagemPreview(
        produto.imagem
          ? produto.imagem.startsWith("http")
            ? produto.imagem
            : `${phpAdminUrl}/${produto.imagem}`
          : null
      );
    } else {
      setNome("");
      setCodigo("");
      setDescricao("");
      setCategoriaId(categoriaPadrao ? String(categoriaPadrao) : "");
      setApenasAgendamento(false);
      setQtdMinimaAtiva(false);
      setQtdMinima("1");
      setPreco("");
      setPromoAtiva(false);
      setPrecoPromocional("");
      setAtivo(true);
      setDisponivelCatalogo(true);
      setDisponivelMesa(true);
      setDiasSemana([]);
      setHorarioIni("");
      setHorarioFim("");
      setPontosGanhoAtivo(false);
      setPontosGanho("1");
      setPontosCustoAtivo(false);
      setPontosCusto("1");
      setEstoqueAtual(0);
      setEstoqueQtd("0");
      setEstoqueMinimo("0");
      setImagemPreview(null);
    }
  }, [open, produto, categoriaPadrao, phpAdminUrl]);

  function handleImagemSelecionada(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCropFile(file);
    setCropOpen(true);
  }

  function handleCropConfirm(dataUrl: string) {
    setImagemBase64(dataUrl);
    setImagemPreview(dataUrl);
    setImagemRemover(false);
  }

  function removerImagem() {
    setImagemBase64(null);
    setImagemPreview(null);
    setImagemRemover(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function salvar(categoriaOverride?: string) {
    setErro(null);
    if (!nome.trim()) {
      setAba("detalhes");
      setErro("Informe o nome do produto.");
      return false;
    }
    const precoNum = parseFloat(preco.replace(",", "."));
    if (!precoNum || precoNum <= 0) {
      setAba("preco");
      setErro("Informe um preço válido.");
      return false;
    }

    setSalvando(true);
    try {
      const payload = {
        id: produto?.id,
        nome: nome.trim(),
        preco: precoNum,
        categoria_id: categoriaOverride !== undefined ? categoriaOverride || null : categoriaId || null,
        descricao: descricao.trim(),
        codigo: codigo.trim(),
        preco_promocional: promoAtiva && precoPromocional ? parseFloat(precoPromocional.replace(",", ".")) : "",
        promo_desativado: promoAtiva ? 0 : 1,
        ativo,
        apenas_agendamento: apenasAgendamento,
        quantidade_minima: qtdMinimaAtiva ? Math.max(1, parseInt(qtdMinima, 10) || 1) : 0,
        pontos_ganho: pontosGanhoAtivo ? Math.max(1, parseInt(pontosGanho, 10) || 1) : 0,
        pontos_custo: pontosCustoAtivo ? Math.max(1, parseInt(pontosCusto, 10) || 1) : 0,
        disponivel_catalogo: disponivelCatalogo,
        disponivel_mesa: disponivelMesa,
        dias_semana: diasSemana,
        horario_ini: horarioIni,
        horario_fim: horarioFim,
        imagem_base64: imagemBase64 ?? "",
        imagem_remover: imagemRemover,
      };
      const res = await fetch("/api/produtos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErro(data.msg ?? "Erro ao salvar produto.");
        return false;
      }
      return true;
    } finally {
      setSalvando(false);
    }
  }

  async function handleSalvarClick() {
    const ok = await salvar();
    if (ok) {
      toast.success(produto ? "Produto atualizado com sucesso" : "Produto criado com sucesso");
      onOpenChange(false);
      router.refresh();
    }
  }

  async function excluir() {
    if (!produto) return;
    if (!confirm(`Excluir "${produto.nome}"? Essa ação não pode ser desfeita.`)) return;
    setExcluindo(true);
    try {
      await fetch("/api/produtos", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: produto.id }),
      });
      toast.success("Produto excluído com sucesso");
      onOpenChange(false);
      router.refresh();
    } finally {
      setExcluindo(false);
    }
  }

  async function salvarEstoque() {
    if (!produto) return;
    setSalvandoEstoque(true);
    try {
      const res = await fetch("/api/estoque", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          produto_id: produto.id,
          quantidade: Math.max(0, parseInt(estoqueQtd, 10) || 0),
          quantidade_minima: Math.max(0, parseInt(estoqueMinimo, 10) || 0),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErro(data.msg ?? "Erro ao atualizar estoque.");
        return;
      }
      setEstoqueAtual(data.quantidade);
      setEstoqueEditando(false);
      toast.success("Item de estoque editado com sucesso");
      router.refresh();
    } finally {
      setSalvandoEstoque(false);
    }
  }

  async function duplicar() {
    if (!produto) return;
    setDuplicando(true);
    try {
      const res = await fetch("/api/produto-duplicar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: produto.id }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErro(data.msg ?? "Erro ao duplicar produto.");
        return;
      }
      toast.success("Produto duplicado com sucesso");
      onOpenChange(false);
      router.refresh();
    } finally {
      setDuplicando(false);
    }
  }

  async function transferir() {
    if (!produto) return;
    setCategoriaId(categoriaTransferir);
    const ok = await salvar(categoriaTransferir);
    if (ok) {
      toast.success("Produto transferido com sucesso");
      setTransferindo(false);
      onOpenChange(false);
      router.refresh();
    }
  }

  const diasResumo =
    diasSemana.length > 0 && horarioIni && horarioFim
      ? `${diasSemana.map((d) => DIAS_LABEL[d] ?? d).join(", ")} · ${horarioIni} às ${horarioFim}`
      : null;

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-4xl overflow-x-hidden sm:max-w-4xl">
        <DialogHeader className="flex-row items-center justify-between pr-8">
          <DialogTitle>{produto ? "Editar produto" : "Novo produto"} - detalhes</DialogTitle>
          {produto && (
            <button
              onClick={excluir}
              disabled={excluindo}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive"
              aria-label="Excluir produto"
              title="Excluir produto"
            >
              <Trash2 size={15} />
            </button>
          )}
        </DialogHeader>

        <div className="flex max-h-[65vh] flex-col overflow-y-auto overflow-x-hidden">
        <Tabs value={aba} onValueChange={(v) => v && setAba(v)}>
          <div className="overflow-x-auto">
            <TabsList variant="line" className="w-max">
              <TabsTrigger value="detalhes">
                <Grid2x2 size={14} /> Detalhes
              </TabsTrigger>
              <TabsTrigger value="preco">
                <Tag size={14} /> Preço e variações
              </TabsTrigger>
              <TabsTrigger value="pontos">
                <Star size={14} /> Pontos
              </TabsTrigger>
              <TabsTrigger value="disponibilidade">
                <CalendarCheck size={14} /> Disponibilidade
              </TabsTrigger>
              <TabsTrigger value="estoque">
                <Box size={14} /> Estoque
              </TabsTrigger>
              <TabsTrigger value="outros">
                <Info size={14} /> Outros
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="detalhes">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="relative flex size-32 items-center justify-center overflow-hidden rounded-lg border bg-muted"
                  title="Clique para escolher uma imagem"
                >
                  {imagemPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imagemPreview} alt="" className="size-full object-cover" />
                  ) : (
                    <ImagePlus size={26} className="text-muted-foreground" />
                  )}
                </button>
                {imagemPreview && (
                  <button
                    type="button"
                    onClick={removerImagem}
                    className="w-fit text-xs text-muted-foreground hover:text-destructive"
                  >
                    Remover imagem
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleImagemSelecionada}
                />
              </div>

              <div className="flex flex-col gap-3.5">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="p-nome">
                    Nome do produto<span className="text-destructive">*</span>
                  </Label>
                  <Input id="p-nome" value={nome} onChange={(e) => setNome(e.target.value)} />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="p-codigo">Código do produto (PDV)</Label>
                  <Input id="p-codigo" value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="Ex.: 123" className="max-w-64" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="p-descricao">Descrição do produto</Label>
                  <textarea
                    id="p-descricao"
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    rows={2}
                    placeholder="Descreva o produto"
                    className="rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                  <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                    <div>
                      <div className="text-sm font-medium">Produto apenas por agendamento</div>
                      <div className="text-xs text-muted-foreground">
                        Ao marcar essa opção o produto só poderá ser vendido por agendamento.
                      </div>
                    </div>
                    <Switch checked={apenasAgendamento} onCheckedChange={(v) => setApenasAgendamento(v === true)} />
                  </div>

                  <div className="flex flex-col gap-2 rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium">Quantidade mínima para pedido</div>
                        <div className="text-xs text-muted-foreground">
                          Ao habilitar seus clientes terão que pedir uma quantidade mínima desse produto.
                        </div>
                      </div>
                      <Switch checked={qtdMinimaAtiva} onCheckedChange={(v) => setQtdMinimaAtiva(v === true)} />
                    </div>
                    {qtdMinimaAtiva && (
                      <Input
                        type="number"
                        min={1}
                        value={qtdMinima}
                        onChange={(e) => setQtdMinima(e.target.value)}
                        className="max-w-32"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="preco">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="p-preco">Preço</Label>
                <Input
                  id="p-preco"
                  inputMode="decimal"
                  value={preco}
                  onChange={(e) => setPreco(e.target.value)}
                  placeholder="0,00"
                  className="max-w-48"
                />
              </div>

              <div className="flex flex-col gap-3 rounded-lg border p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium">Habilitar preço promocional</span>
                  <Switch checked={promoAtiva} onCheckedChange={(v) => setPromoAtiva(v === true)} />
                </div>
                {promoAtiva && (
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="p-preco-promo">Preço promocional</Label>
                    <Input
                      id="p-preco-promo"
                      inputMode="decimal"
                      value={precoPromocional}
                      onChange={(e) => setPrecoPromocional(e.target.value)}
                      placeholder="0,00"
                      className="max-w-48"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-3 rounded-lg border p-3 opacity-60">
                <div>
                  <div className="text-sm font-medium">Seu produto possui diferentes preços, tamanhos ou cores?</div>
                  <div className="text-xs text-muted-foreground">
                    Variações chegam em breve nesta versão — cadastre pelo admin atual por enquanto.
                  </div>
                </div>
                <Switch disabled checked={false} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="pontos">
            <div className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">
                O cliente ganha pontos em compras e usa o saldo para resgatar produtos. Abaixo você
                configura quanto este produto gera de pontos ao ser comprado e quanto custa em
                pontos para ser resgatado.
              </p>
              <div className="flex flex-col gap-2 rounded-lg border p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium">Ativar ganho de pontos</div>
                    <div className="text-xs text-muted-foreground">
                      O cliente acumula pontos a cada compra deste produto.
                    </div>
                  </div>
                  <Switch checked={pontosGanhoAtivo} onCheckedChange={(v) => setPontosGanhoAtivo(v === true)} />
                </div>
                {pontosGanhoAtivo && (
                  <Input
                    type="number"
                    min={1}
                    value={pontosGanho}
                    onChange={(e) => setPontosGanho(e.target.value)}
                    className="max-w-32"
                  />
                )}
              </div>
              <div className="flex flex-col gap-2 rounded-lg border p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium">Ativar troca por pontos</div>
                    <div className="text-xs text-muted-foreground">
                      O cliente pode usar o saldo de pontos para resgatar este produto.
                    </div>
                  </div>
                  <Switch checked={pontosCustoAtivo} onCheckedChange={(v) => setPontosCustoAtivo(v === true)} />
                </div>
                {pontosCustoAtivo && (
                  <Input
                    type="number"
                    min={1}
                    value={pontosCusto}
                    onChange={(e) => setPontosCusto(e.target.value)}
                    className="max-w-32"
                  />
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="disponibilidade">
            <div className="flex flex-col gap-4">
              <div className="rounded-lg border p-3">
                <div className="text-sm font-medium">Produto para dias específicos</div>
                <div className="text-xs text-muted-foreground">
                  Configure esse produto para que ele apareça apenas em dias específicos da semana.
                </div>
                <button
                  type="button"
                  onClick={() => setDiasDialogOpen(true)}
                  className="mt-1.5 text-sm font-medium text-primary hover:underline"
                >
                  Configurar dias
                </button>
                {diasResumo && (
                  <div className="mt-1.5 text-xs text-muted-foreground">
                    {diasResumo}{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setDiasSemana([]);
                        setHorarioIni("");
                        setHorarioFim("");
                      }}
                      className="text-destructive hover:underline"
                    >
                      remover
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <div>
                  <div className="text-sm font-medium">Produto indisponível</div>
                  <div className="text-xs text-muted-foreground">Ao pausar o produto ele não estará disponível para venda.</div>
                </div>
                <Switch checked={!ativo} onCheckedChange={(v) => setAtivo(v !== true)} />
              </div>

              <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <div>
                  <div className="text-sm font-medium">Disponível para comprar no seu catálogo digital (menu)</div>
                  <div className="text-xs text-muted-foreground">Produto disponível no link para compra no seu menu digital.</div>
                </div>
                <Switch checked={disponivelCatalogo} onCheckedChange={(v) => setDisponivelCatalogo(v === true)} />
              </div>

              <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <div>
                  <div className="text-sm font-medium">Disponível para pedidos na mesa (qrcode mesa)</div>
                  <div className="text-xs text-muted-foreground">Produto disponível para pedidos na mesa através do qrcode.</div>
                </div>
                <Switch checked={disponivelMesa} onCheckedChange={(v) => setDisponivelMesa(v === true)} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="estoque">
            {!produto ? (
              <div className="flex flex-col items-center gap-2 py-14 text-center text-muted-foreground">
                <Box size={24} />
                <p className="text-sm">Salve o produto primeiro para gerenciar o estoque.</p>
              </div>
            ) : (
              <div className="rounded-lg border p-3">
                <div className="text-sm font-semibold">{nome || produto.nome}</div>
                {!estoqueEditando ? (
                  <>
                    <div
                      className={`mt-1 flex items-center gap-1 text-xs ${estoqueAtual > 0 ? "text-emerald-600" : "text-destructive"}`}
                    >
                      {estoqueAtual > 0 ? "✓" : "✕"} {estoqueAtual} em estoque
                    </div>
                    <div className="mt-3 flex justify-end">
                      <Button size="sm" onClick={() => setEstoqueEditando(true)}>
                        Editar estoque
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="mt-2 flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="est-qtd">Quantidade</Label>
                        <Input
                          id="est-qtd"
                          type="number"
                          min={0}
                          value={estoqueQtd}
                          onChange={(e) => setEstoqueQtd(e.target.value)}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="est-min">Estoque mínimo</Label>
                        <Input
                          id="est-min"
                          type="number"
                          min={0}
                          value={estoqueMinimo}
                          onChange={(e) => setEstoqueMinimo(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => setEstoqueEditando(false)}>
                        Cancelar
                      </Button>
                      <Button size="sm" onClick={salvarEstoque} disabled={salvandoEstoque}>
                        {salvandoEstoque ? "Salvando..." : "Salvar"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="outros">
            {!produto ? (
              <div className="flex flex-col items-center gap-2 py-14 text-center text-muted-foreground">
                <Info size={24} />
                <p className="text-sm">Salve o produto primeiro para transferir ou duplicar.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="rounded-lg border p-3">
                  <button
                    type="button"
                    onClick={() => setTransferindo((v) => !v)}
                    className="flex w-full items-center justify-between gap-3 text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <ArrowRightLeft size={16} className="text-muted-foreground" />
                      <div>
                        <div className="text-sm font-medium">Transferir produto</div>
                        <div className="text-xs text-muted-foreground">
                          Criou o produto na categoria errada ou deseja movê-lo?
                        </div>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-muted-foreground" />
                  </button>
                  {transferindo && (
                    <div className="mt-3 flex items-center gap-2">
                      <Select
                        items={Object.fromEntries(categorias.map((c) => [String(c.id), c.nome]))}
                        value={categoriaTransferir}
                        onValueChange={(v) => setCategoriaTransferir(v ?? "")}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Sem categoria" />
                        </SelectTrigger>
                        <SelectContent>
                          {categorias.map((c) => (
                            <SelectItem key={c.id} value={String(c.id)}>
                              {c.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button size="sm" onClick={transferir} disabled={salvando}>
                        Transferir
                      </Button>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={duplicar}
                  disabled={duplicando}
                  className="flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <Copy size={16} className="text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">Duplicar produto</div>
                      <div className="text-xs text-muted-foreground">Tem outro parecido e deseja duplicá-lo?</div>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-muted-foreground" />
                </button>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {erro && <p className="text-sm text-destructive">{erro}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSalvarClick} disabled={salvando}>
            {salvando ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <ImageCropDialog open={cropOpen} onOpenChange={setCropOpen} file={cropFile} onConfirm={handleCropConfirm} />
    <ConfigurarDiasDialog
      open={diasDialogOpen}
      onOpenChange={setDiasDialogOpen}
      diasSemana={diasSemana}
      horarioIni={horarioIni}
      horarioFim={horarioFim}
      onConfirm={(dias, ini, fim) => {
        setDiasSemana(dias);
        setHorarioIni(ini);
        setHorarioFim(fim);
      }}
    />
    </>
  );
}
