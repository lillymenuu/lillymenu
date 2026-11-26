ALTER TABLE "permissoes_niveis" ADD COLUMN "loja_id" integer;--> statement-breakpoint
CREATE INDEX "permissoes_niveis_idx_loja" ON "permissoes_niveis" USING btree ("loja_id");