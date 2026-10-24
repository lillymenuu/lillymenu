ALTER TABLE "mesas" ADD COLUMN "numero" integer;--> statement-breakpoint
UPDATE "mesas" m SET "numero" = sub.rn FROM (SELECT id, ROW_NUMBER() OVER (PARTITION BY loja_id ORDER BY id) AS rn FROM "mesas") sub WHERE m.id = sub.id;--> statement-breakpoint
ALTER TABLE "mesas" ALTER COLUMN "numero" SET DEFAULT 1;--> statement-breakpoint
ALTER TABLE "mesas" ALTER COLUMN "numero" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "mesas" ADD CONSTRAINT "mesas_uq_mesas_loja_numero" UNIQUE("loja_id","numero");
