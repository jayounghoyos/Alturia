ALTER TABLE "Certificate" ADD COLUMN "publicToken" TEXT;

UPDATE "Certificate"
SET "publicToken" = "id"
WHERE "publicToken" IS NULL;

ALTER TABLE "Certificate" ALTER COLUMN "publicToken" SET NOT NULL;

CREATE UNIQUE INDEX "Certificate_publicToken_key" ON "Certificate"("publicToken");
