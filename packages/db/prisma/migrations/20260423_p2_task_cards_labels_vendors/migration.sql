-- P2 foundation: Task Card Templates (P2-9), Label Printing stub (P2-10), Vendor Performance (P2-11 — no schema needed).

-- ─── Organization: feature flag ─────────────────────────────────────────────

-- AlterTable
ALTER TABLE "Organization"
    ADD COLUMN "featureTaskCards" BOOLEAN NOT NULL DEFAULT false;

-- ─── P2-9 Task Card Template Library ────────────────────────────────────────

-- CreateTable
CREATE TABLE "TaskCardTemplate" (
    "id"            TEXT            NOT NULL,
    "orgId"         TEXT            NOT NULL,
    "name"          TEXT            NOT NULL,
    "description"   TEXT,
    "category"      TEXT,
    "workOrderType" "WorkOrderType",
    "createdAt"     TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3)    NOT NULL,

    CONSTRAINT "TaskCardTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskCardTemplateStep" (
    "id"           TEXT         NOT NULL,
    "templateId"   TEXT         NOT NULL,
    "sortOrder"    INTEGER      NOT NULL DEFAULT 0,
    "taskNumber"   TEXT         NOT NULL,
    "description"  TEXT         NOT NULL,
    "referenceDoc" TEXT,
    "estHours"     DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "TaskCardTemplateStep_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaskCardTemplate_orgId_idx" ON "TaskCardTemplate"("orgId");

-- CreateIndex
CREATE INDEX "TaskCardTemplate_orgId_workOrderType_idx" ON "TaskCardTemplate"("orgId", "workOrderType");

-- CreateIndex
CREATE INDEX "TaskCardTemplateStep_templateId_idx" ON "TaskCardTemplateStep"("templateId");

-- AddForeignKey
ALTER TABLE "TaskCardTemplate"
    ADD CONSTRAINT "TaskCardTemplate_orgId_fkey"
    FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskCardTemplateStep"
    ADD CONSTRAINT "TaskCardTemplateStep_templateId_fkey"
    FOREIGN KEY ("templateId") REFERENCES "TaskCardTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
