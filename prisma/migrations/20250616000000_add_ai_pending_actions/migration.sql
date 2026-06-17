-- CreateTable
CREATE TABLE "AiPendingAction" (
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
CREATE INDEX "AiPendingAction_workspaceId_idx" ON "AiPendingAction"("workspaceId");

-- CreateIndex
CREATE INDEX "AiPendingAction_expiresAt_idx" ON "AiPendingAction"("expiresAt");

-- AddForeignKey
ALTER TABLE "AiPendingAction" ADD CONSTRAINT "AiPendingAction_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
