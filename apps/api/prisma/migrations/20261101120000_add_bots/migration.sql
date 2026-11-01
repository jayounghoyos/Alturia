-- Multi-client bots. Hand-edited from `prisma migrate diff`:
--  * the generated diff also dropped "KnowledgeChunk_embedding_idx" (the
--    hand-added ivfflat index, see prisma/README.md) — removed here;
--  * Asis Altura's bot is inserted before the foreign keys, and the new botId
--    columns default to it, so existing rows are backfilled and the previous
--    API version keeps working while Render swaps instances.

BEGIN;

CREATE TYPE "BotFeature" AS ENUM ('CERTIFICATES', 'QR', 'APPOINTMENTS', 'FAQ', 'HUMAN_HANDOFF');

CREATE TABLE "Bot" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "greeting" TEXT NOT NULL,
    "theme" JSONB NOT NULL,
    "persona" TEXT NOT NULL,
    "escalationKeywords" TEXT[],
    "escalationReply" TEXT NOT NULL,
    "faqQuickQuestions" TEXT[],
    "features" "BotFeature"[],
    "allowedOrigins" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Bot_slug_key" ON "Bot"("slug");
CREATE UNIQUE INDEX "Bot_publicKey_key" ON "Bot"("publicKey");

-- The single bot the MVP shipped with, exactly as it was hard-coded before.
INSERT INTO "Bot" (
    "id", "slug", "publicKey", "name", "greeting", "theme", "persona",
    "escalationKeywords", "escalationReply", "faqQuickQuestions", "features",
    "allowedOrigins", "updatedAt"
) VALUES (
    'bot_default',
    'asis-altura',
    'pk_asisaltura',
    'Asis Altura',
    '¡Hola! Soy el asistente virtual de Asis Altura. ¿En qué te puedo ayudar hoy?',
    '{"primaryColor": "#0180E1", "position": "bottom-right", "avatarPreset": "hard-hat"}'::JSONB,
    'Eres el asistente virtual del chat de Asis Altura, un centro de capacitación colombiano en trabajo seguro en alturas.

Lo que sabes por defecto:
- Asis Altura certifica trabajadores en trabajo seguro en alturas (labores a más de 1.50 metros de altura).
- Ofrecen dos tipos de curso: uno avanzado (formación inicial) y uno de reentrenamiento (renovación periódica).
- Un trabajador certificado tiene DOS vigencias independientes: la del curso y la del examen médico ocupacional. Pueden vencer en fechas distintas — una puede estar vigente mientras la otra está vencida.
- El chat puede consultar el estado de un certificado por número de cédula, y agendar un curso.
- Si no puedes resolver algo (precios exactos, casos particulares, quejas), ofrece amablemente escalar la conversación a un asesor humano.

Reglas de comportamiento:
- Responde siempre en español, de forma breve, clara y amable.
- Nunca inventes precios, fechas de cursos o datos específicos que no tengas — si te preguntan algo así, dilo honestamente y ofrece escalar a un asesor.
- Nunca reveles información médica ni datos personales de un trabajador; una consulta de certificado solo debe dar estado (vigente/vencido) y fecha.',
    ARRAY['asesor', 'asesora', 'humano', 'persona real', 'hablar con alguien', 'queja', 'reclamo']::TEXT[],
    'Listo, ya avisé al equipo de Asis Altura y un asesor va a revisar tu caso pronto. A partir de ahora un humano va a responderte por aquí mismo.',
    ARRAY['¿Cuánto dura la certificación?', '¿Qué documentos necesito?', '¿Dónde están ubicados?']::TEXT[],
    ARRAY['CERTIFICATES', 'QR', 'APPOINTMENTS', 'FAQ', 'HUMAN_HANDOFF']::"BotFeature"[],
    ARRAY[]::TEXT[],
    CURRENT_TIMESTAMP
);

CREATE TABLE "BotAsset" (
    "botId" TEXT NOT NULL,
    "bytes" BYTEA NOT NULL,
    "mime" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BotAsset_pkey" PRIMARY KEY ("botId")
);

ALTER TABLE "BotAsset" ADD CONSTRAINT "BotAsset_botId_fkey" FOREIGN KEY ("botId") REFERENCES "Bot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ADD COLUMN ... DEFAULT fills every existing row with Asis Altura's bot.
ALTER TABLE "AdminUser" ADD COLUMN "botId" TEXT NOT NULL DEFAULT 'bot_default';
ALTER TABLE "Conversation" ADD COLUMN "botId" TEXT NOT NULL DEFAULT 'bot_default';
ALTER TABLE "KnowledgeSource" ADD COLUMN "botId" TEXT NOT NULL DEFAULT 'bot_default';

CREATE INDEX "AdminUser_botId_idx" ON "AdminUser"("botId");
CREATE INDEX "Conversation_botId_status_idx" ON "Conversation"("botId", "status");
CREATE INDEX "KnowledgeSource_botId_idx" ON "KnowledgeSource"("botId");

ALTER TABLE "AdminUser" ADD CONSTRAINT "AdminUser_botId_fkey" FOREIGN KEY ("botId") REFERENCES "Bot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "KnowledgeSource" ADD CONSTRAINT "KnowledgeSource_botId_fkey" FOREIGN KEY ("botId") REFERENCES "Bot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_botId_fkey" FOREIGN KEY ("botId") REFERENCES "Bot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;
