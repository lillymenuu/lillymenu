"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";

function apenasDigitos(v: string): string {
  return v.replace(/\D/g, "");
}

function digitosParaDecimal(digitos: string): string {
  if (!digitos) return "";
  return (parseInt(digitos, 10) / 100).toFixed(2);
}

function digitosParaExibicao(digitos: string): string {
  if (!digitos) return "";
  const num = parseInt(digitos, 10) / 100;
  return num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function decimalParaDigitos(decimal: string): string {
  if (!decimal) return "";
  const num = Math.round(parseFloat(decimal.replace(",", ".")) * 100);
  return Number.isFinite(num) && num > 0 ? String(num) : "";
}

/**
 * Input de dinheiro com mascara (formato brasileiro, R$ 0,00) — value/onChange
 * trabalham com uma string decimal simples ("7.5"), mesmo formato ja usado no
 * resto do formulario de produto, so a exibicao/digitacao e que ganha mascara.
 */
export function MoneyInput({
  value,
  onChange,
  className,
  placeholder = "R$ 0,00",
  ...props
}: {
  value: string;
  onChange: (v: string) => void;
} & Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "type" | "inputMode">) {
  const [digitos, setDigitos] = useState(() => decimalParaDigitos(value));

  useEffect(() => {
    const esperado = decimalParaDigitos(value);
    if (esperado !== digitos) setDigitos(esperado);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const novosDigitos = apenasDigitos(e.target.value);
    setDigitos(novosDigitos);
    onChange(digitosParaDecimal(novosDigitos));
  }

  return (
    <Input
      {...props}
      type="text"
      inputMode="decimal"
      value={digitos ? `R$ ${digitosParaExibicao(digitos)}` : ""}
      onChange={handleChange}
      placeholder={placeholder}
      className={className}
    />
  );
}
