-- Wiki lessons index + task closure fields
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "resolutionSummary" TEXT;
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "lessonsLearned" TEXT;
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "closedAt" TIMESTAMP(3);
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "closedById" TEXT;

ALTER TABLE "WikiPage" ADD COLUMN IF NOT EXISTS "kind" TEXT NOT NULL DEFAULT 'page';
ALTER TABLE "WikiPage" ADD COLUMN IF NOT EXISTS "projectId" TEXT;

ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "lessonsWikiPageId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Project_lessonsWikiPageId_key" ON "Project"("lessonsWikiPageId");
CREATE INDEX IF NOT EXISTS "WikiPage_projectId_idx" ON "WikiPage"("projectId");
CREATE INDEX IF NOT EXISTS "WikiPage_kind_idx" ON "WikiPage"("kind");

ALTER TABLE "Task" ADD CONSTRAINT "Task_closedById_fkey"
  FOREIGN KEY ("closedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "WikiPage" ADD CONSTRAINT "WikiPage_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Project" ADD CONSTRAINT "Project_lessonsWikiPageId_fkey"
  FOREIGN KEY ("lessonsWikiPageId") REFERENCES "WikiPage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
