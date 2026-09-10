"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "cn";

const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function paraISO(ano: number, mes: number, dia: number) {
  return `${ano}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

function parseISO(iso: string) {
  const [ano, mes, dia] = iso.split("-").map(Number);
  return { ano, mes: mes - 1, dia };
}

function formatCurto(iso: string) {
  const { ano, mes, dia } = parseISO(iso);
  return `${String(dia).padStart(2, "0")}/${String(mes + 1).padStart(2, "0")}/${ano}`;
}

function diasDoMes(ano: number, mes: number) {
  const primeiroDia = new Date(ano, mes, 1).getDay();
  const totalDias = new Date(ano, mes + 1, 0).getDate();
  const diasMesAnterior = new Date(ano, mes, 0).getDate();

  const celulas: { dia: number; ano: number; mes: number; foraDoMes: boolean }[] = [];
  for (let i = primeiroDia - 1; i >= 0; i--) {
    celulas.push({ dia: diasMesAnterior - i, ano, mes: mes - 1, foraDoMes: true });
  }
  for (let d = 1; d <= totalDias; d++) {
    celulas.push({ dia: d, ano, mes, foraDoMes: false });
  }
  while (celulas.length % 7 !== 0 || celulas.length < 42) {
    const ultimo = celulas[celulas.length - 1];
    const proximo = ultimo.dia + 1;
    celulas.push({ dia: proximo, ano, mes: mes + 1, foraDoMes: true });
  }
  return celulas;
}

export function DateRangePicker({
  dataIni,
  dataFim,
  onChange,
}: {
  dataIni: string;
  dataFim: string;
  onChange: (dataIni: string, dataFim: string) => void;
}) {
  const inicioAtual = parseISO(dataIni || dataFim);
  const [open, setOpen] = useState(false);
  const [mesVisivel, setMesVisivel] = useState({ ano: inicioAtual.ano, mes: inicioAtual.mes });
  const [selecaoInicio, setSelecaoInicio] = useState<string | null>(dataIni || null);

  function mudarMes(delta: number) {
    setMesVisivel((atual) => {
      const novoMes = atual.mes + delta;
      const novoAno = atual.ano + Math.floor(novoMes / 12);
      return { ano: novoAno, mes: ((novoMes % 12) + 12) % 12 };
    });
  }

  function clicarDia(iso: string) {
    if (!selecaoInicio || (dataIni && dataFim && dataIni !== dataFim)) {
      setSelecaoInicio(iso);
      onChange(iso, iso);
      return;
    }
    if (iso < selecaoInicio) {
      setSelecaoInicio(iso);
      onChange(iso, iso);
      return;
    }
    onChange(selecaoInicio, iso);
    setSelecaoInicio(null);
    setOpen(false);
  }

  const celulas = diasDoMes(mesVisivel.ano, mesVisivel.mes);
  const rotulo =
    dataIni && dataFim
      ? dataIni === dataFim
        ? formatCurto(dataIni)
        : `${formatCurto(dataIni)} - ${formatCurto(dataFim)}`
      : "Período";

  return (
    <Popover
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) setSelecaoInicio(dataIni || null);
      }}
    >
      <PopoverTrigger
        className="flex h-8 w-44 items-center gap-1.5 rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <CalendarDays size={14} className="shrink-0 text-muted-foreground" />
        <span className="truncate">{rotulo}</span>
      </PopoverTrigger>
      <PopoverContent className="w-64">
        <div className="flex items-center justify-between pb-2">
          <button
            type="button"
            onClick={() => mudarMes(-1)}
            className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="text-sm font-medium">
            {MESES[mesVisivel.mes]} {mesVisivel.ano}
          </span>
          <button
            type="button"
            onClick={() => mudarMes(1)}
            className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
          >
            <ChevronRight size={14} />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-y-1 text-center">
          {DIAS_SEMANA.map((d) => (
            <span key={d} className="text-[10px] font-medium text-muted-foreground">
              {d}
            </span>
          ))}
          {celulas.map((c, i) => {
            const iso = paraISO(c.ano, c.mes, c.dia);
            const noIntervalo = dataIni && dataFim && iso >= dataIni && iso <= dataFim;
            const extremidade = iso === dataIni || iso === dataFim;
            return (
              <button
                key={i}
                type="button"
                disabled={c.foraDoMes}
                onClick={() => clicarDia(iso)}
                className={cn(
                  "flex size-8 items-center justify-center rounded-md text-xs transition-colors",
                  c.foraDoMes && "text-muted-foreground/40",
                  !c.foraDoMes && !noIntervalo && "hover:bg-muted",
                  noIntervalo && !extremidade && "bg-primary/10",
                  extremidade && "bg-primary font-medium text-primary-foreground"
                )}
              >
                {c.dia}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
