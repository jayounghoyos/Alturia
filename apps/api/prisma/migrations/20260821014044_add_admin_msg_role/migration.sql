-- AlterEnum
ALTER TYPE "MsgRole" ADD VALUE 'ADMIN';

-- NOTE: Prisma's diff also proposed `DROP INDEX "KnowledgeChunk_embedding_idx"`
-- here — it can't model the hand-added pgvector index (see prisma/README.md)
-- and treats it as drift to remove. Deliberately dropped from this migration;
-- the index stays untouched.
