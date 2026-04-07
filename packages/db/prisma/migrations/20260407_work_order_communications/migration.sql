-- CreateEnum
CREATE TYPE "CommDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "CommStatus" AS ENUM ('AWAITING_REPLY', 'REPLIED', 'RESOLVED', 'INFO_ONLY');

-- CreateTable
CREATE TABLE "WorkOrderCommunication" (
    "id"           TEXT NOT NULL,
    "orgId"        TEXT NOT NULL,
    "workOrderId"  TEXT NOT NULL,
    "subject"      TEXT NOT NULL,
    "direction"    "CommDirection" NOT NULL,
    "status"       "CommStatus" NOT NULL,
    "contactName"  TEXT,
    "contactEmail" TEXT,
    "notes"        TEXT,
    "occurredAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,
    "createdById"  TEXT,

    CONSTRAINT "WorkOrderCommunication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkOrderCommunication_workOrderId_status_idx"
    ON "WorkOrderCommunication"("workOrderId", "status");

-- CreateIndex
CREATE INDEX "WorkOrderCommunication_orgId_status_idx"
    ON "WorkOrderCommunication"("orgId", "status");

-- AddForeignKey
ALTER TABLE "WorkOrderCommunication"
    ADD CONSTRAINT "WorkOrderCommunication_orgId_fkey"
    FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderCommunication"
    ADD CONSTRAINT "WorkOrderCommunication_workOrderId_fkey"
    FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderCommunication"
    ADD CONSTRAINT "WorkOrderCommunication_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
