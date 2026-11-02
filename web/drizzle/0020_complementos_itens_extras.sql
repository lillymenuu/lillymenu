ALTER TABLE "complementos_itens" ADD COLUMN "imagem" varchar(255);--> statement-breakpoint
ALTER TABLE "complementos_itens" ADD COLUMN "controla_estoque" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "complementos_itens" ADD COLUMN "estoque_quantidade" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "complementos_itens" ADD COLUMN "pontos_ganho" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "complementos_itens" ADD COLUMN "pontos_custo" integer DEFAULT 0 NOT NULL;