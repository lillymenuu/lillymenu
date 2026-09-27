ALTER TABLE "caixa_movimentacoes" ALTER COLUMN "observacoes" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "caixa_movimentacoes" ADD COLUMN "motivo" varchar(30);--> statement-breakpoint
ALTER TABLE "caixa_movimentacoes" ADD COLUMN "autorizado_por_id" integer;--> statement-breakpoint
ALTER TABLE "caixa_movimentacoes" ADD COLUMN "autorizado_por_nome" varchar(100);