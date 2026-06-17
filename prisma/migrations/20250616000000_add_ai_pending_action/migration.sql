-- CreateTable
CREATE TABLE IF NOT EXISTS "AiPendingAction" (
    "id" UUID NOT NULL,
    "toolName" TEXT NOT NULL,
    "args" JSONB NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT,
    "preview" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiPendingAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AiPendingAction_workspaceId_idx" ON "AiPendingAction"("workspaceId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AiPendingAction_expiresAt_idx" ON "AiPendingAction"("expiresAt");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AiPendingAction_workspaceId_fkey'
  ) THEN
    ALTER TABLE "AiPendingAction" ADD CONSTRAINT "AiPendingAction_workspaceId_fkey"
      FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
