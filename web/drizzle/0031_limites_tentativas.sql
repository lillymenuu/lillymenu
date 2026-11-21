CREATE TABLE "limites_tentativas" (
	"chave" varchar(255) PRIMARY KEY NOT NULL,
	"tentativas" integer DEFAULT 0 NOT NULL,
	"janela_inicio" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "limites_tentativas_janela_idx" ON "limites_tentativas" USING btree ("janela_inicio");