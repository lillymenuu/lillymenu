"use client";

import { LayoutGrid, Table2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type SalesView = "cards" | "tabela";

export function ViewToggle({ value, onChange }: { value: SalesView; onChange: (v: SalesView) => void }) {
  return (
    <Tabs value={value} onValueChange={(v) => v && onChange(v as SalesView)}>
      <TabsList>
        <TabsTrigger value="cards" className="px-2.5">
          <LayoutGrid size={13} /> Cards
        </TabsTrigger>
        <TabsTrigger value="tabela" className="px-2.5">
          <Table2 size={13} /> Tabela
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
