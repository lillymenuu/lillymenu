ALTER TABLE "certificados_fiscais" ALTER COLUMN "plugnotas_certificado_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "certificados_fiscais" ADD COLUMN "provedor" text DEFAULT 'plugnotas' NOT NULL;--> statement-breakpoint
ALTER TABLE "dados_fiscais_loja" ADD COLUMN "focusnfe_empresa_id" varchar(30);--> statement-breakpoint
ALTER TABLE "dados_fiscais_loja" ADD COLUMN "focusnfe_token_producao" varchar(100);--> statement-breakpoint
ALTER TABLE "dados_fiscais_loja" ADD COLUMN "focusnfe_token_homologacao" varchar(100);--> statement-breakpoint
ALTER TABLE "produtos" ADD COLUMN "icms_situacao_tributaria" varchar(3);