-- P0 foundation: FAA Documents, Parts Traceability, Tool Crib, Training & Qualifications.

-- ─── Enums ──────────────────────────────────────────────────────────────────

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('FORM_337', 'CERT_8130_3', 'MAINT_RELEASE', 'LOGBOOK_ENTRY', 'PARTS_TAG');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('DRAFT', 'ISSUED', 'VOID');

-- CreateEnum
CREATE TYPE "ToolOwnership" AS ENUM ('COMPANY', 'EMPLOYEE');

-- CreateEnum
CREATE TYPE "ToolStatus" AS ENUM ('AVAILABLE', 'CHECKED_OUT', 'CALIBRATION_DUE', 'OUT_OF_SERVICE', 'LOST');

-- CreateEnum
CREATE TYPE "CertStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED');

-- ─── Organization: feature flags ────────────────────────────────────────────

-- AlterTable
ALTER TABLE "Organization"
    ADD COLUMN "featureFaaDocs"        BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "featureToolCrib"       BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "featureTraceability"   BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "featureQualifications" BOOLEAN NOT NULL DEFAULT false;

-- ─── P0-2 Parts Traceability: PartLot + PartRequest.partLotId ───────────────

-- CreateTable
CREATE TABLE "PartLot" (
    "id"               TEXT            NOT NULL,
    "partId"           TEXT            NOT NULL,
    "serialNumber"     TEXT,
    "lotNumber"        TEXT,
    "batchNumber"      TEXT,
    "mfgDate"          TIMESTAMP(3),
    "expirationDate"   TIMESTAMP(3),
    "revision"         TEXT,
    "qtyOnHand"        INTEGER         NOT NULL DEFAULT 0,
    "condition"        "PartCondition" NOT NULL DEFAULT 'NEW',
    "receivedPoLineId" TEXT,
    "cocDocUrl"        TEXT,
    "form8130Url"      TEXT,
    "notes"            TEXT,
    "createdAt"        TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3)    NOT NULL,

    CONSTRAINT "PartLot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PartLot_partId_serialNumber_key" ON "PartLot"("partId", "serialNumber");

-- CreateIndex
CREATE INDEX "PartLot_partId_condition_idx" ON "PartLot"("partId", "condition");

-- CreateIndex
CREATE INDEX "PartLot_expirationDate_idx" ON "PartLot"("expirationDate");

-- AddForeignKey
ALTER TABLE "PartLot"
    ADD CONSTRAINT "PartLot_partId_fkey"
    FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartLot"
    ADD CONSTRAINT "PartLot_receivedPoLineId_fkey"
    FOREIGN KEY ("receivedPoLineId") REFERENCES "POLineItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: PartRequest → partLotId
ALTER TABLE "PartRequest"
    ADD COLUMN "partLotId" TEXT;

-- AddForeignKey
ALTER TABLE "PartRequest"
    ADD CONSTRAINT "PartRequest_partLotId_fkey"
    FOREIGN KEY ("partLotId") REFERENCES "PartLot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── P0-1 FAA Document Generation ───────────────────────────────────────────

-- CreateTable
CREATE TABLE "GeneratedDocument" (
    "id"                TEXT             NOT NULL,
    "orgId"             TEXT             NOT NULL,
    "type"              "DocumentType"   NOT NULL,
    "workOrderId"       TEXT,
    "complianceItemId"  TEXT,
    "partRequestId"     TEXT,
    "documentNumber"    TEXT             NOT NULL,
    "status"            "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "pdfUrl"            TEXT,
    "payloadJson"       JSONB            NOT NULL,
    "issuedAt"          TIMESTAMP(3),
    "issuedByUserId"    TEXT,
    "signatureImageUrl" TEXT,
    "voidedAt"          TIMESTAMP(3),
    "voidReason"        TEXT,
    "createdAt"         TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"         TIMESTAMP(3)     NOT NULL,

    CONSTRAINT "GeneratedDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GeneratedDocument_orgId_documentNumber_key"
    ON "GeneratedDocument"("orgId", "documentNumber");

-- CreateIndex
CREATE INDEX "GeneratedDocument_workOrderId_idx" ON "GeneratedDocument"("workOrderId");

-- CreateIndex
CREATE INDEX "GeneratedDocument_complianceItemId_idx" ON "GeneratedDocument"("complianceItemId");

-- CreateIndex
CREATE INDEX "GeneratedDocument_partRequestId_idx" ON "GeneratedDocument"("partRequestId");

-- CreateIndex
CREATE INDEX "GeneratedDocument_orgId_type_status_idx"
    ON "GeneratedDocument"("orgId", "type", "status");

-- AddForeignKey
ALTER TABLE "GeneratedDocument"
    ADD CONSTRAINT "GeneratedDocument_orgId_fkey"
    FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedDocument"
    ADD CONSTRAINT "GeneratedDocument_workOrderId_fkey"
    FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedDocument"
    ADD CONSTRAINT "GeneratedDocument_complianceItemId_fkey"
    FOREIGN KEY ("complianceItemId") REFERENCES "ComplianceItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedDocument"
    ADD CONSTRAINT "GeneratedDocument_partRequestId_fkey"
    FOREIGN KEY ("partRequestId") REFERENCES "PartRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedDocument"
    ADD CONSTRAINT "GeneratedDocument_issuedByUserId_fkey"
    FOREIGN KEY ("issuedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── P0-3 Tool Crib ─────────────────────────────────────────────────────────

-- CreateTable
CREATE TABLE "Tool" (
    "id"                        TEXT            NOT NULL,
    "orgId"                     TEXT            NOT NULL,
    "assetTag"                  TEXT            NOT NULL,
    "name"                      TEXT            NOT NULL,
    "manufacturer"              TEXT,
    "modelNumber"               TEXT,
    "serialNumber"              TEXT,
    "ownership"                 "ToolOwnership" NOT NULL DEFAULT 'COMPANY',
    "ownerTechnicianId"         TEXT,
    "calibrationRequired"       BOOLEAN         NOT NULL DEFAULT false,
    "calibrationIntervalMonths" INTEGER,
    "lastCalibratedAt"          TIMESTAMP(3),
    "nextCalibrationDue"        TIMESTAMP(3),
    "calibrationCertUrl"        TEXT,
    "status"                    "ToolStatus"    NOT NULL DEFAULT 'AVAILABLE',
    "bin"                       TEXT,
    "notes"                     TEXT,
    "createdAt"                 TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"                 TIMESTAMP(3)    NOT NULL,

    CONSTRAINT "Tool_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tool_orgId_assetTag_key" ON "Tool"("orgId", "assetTag");

-- CreateIndex
CREATE INDEX "Tool_orgId_status_idx" ON "Tool"("orgId", "status");

-- CreateIndex
CREATE INDEX "Tool_nextCalibrationDue_idx" ON "Tool"("nextCalibrationDue");

-- AddForeignKey
ALTER TABLE "Tool"
    ADD CONSTRAINT "Tool_orgId_fkey"
    FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tool"
    ADD CONSTRAINT "Tool_ownerTechnicianId_fkey"
    FOREIGN KEY ("ownerTechnicianId") REFERENCES "Technician"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "ToolCheckout" (
    "id"            TEXT         NOT NULL,
    "toolId"        TEXT         NOT NULL,
    "technicianId"  TEXT         NOT NULL,
    "workOrderId"   TEXT,
    "checkedOutAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueBackAt"     TIMESTAMP(3),
    "returnedAt"    TIMESTAMP(3),
    "conditionNote" TEXT,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ToolCheckout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ToolCheckout_toolId_returnedAt_idx" ON "ToolCheckout"("toolId", "returnedAt");

-- CreateIndex
CREATE INDEX "ToolCheckout_technicianId_returnedAt_idx"
    ON "ToolCheckout"("technicianId", "returnedAt");

-- AddForeignKey
ALTER TABLE "ToolCheckout"
    ADD CONSTRAINT "ToolCheckout_toolId_fkey"
    FOREIGN KEY ("toolId") REFERENCES "Tool"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToolCheckout"
    ADD CONSTRAINT "ToolCheckout_technicianId_fkey"
    FOREIGN KEY ("technicianId") REFERENCES "Technician"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToolCheckout"
    ADD CONSTRAINT "ToolCheckout_workOrderId_fkey"
    FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "ToolCalibrationEvent" (
    "id"          TEXT         NOT NULL,
    "toolId"      TEXT         NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL,
    "performedBy" TEXT         NOT NULL,
    "vendor"      TEXT,
    "certUrl"     TEXT,
    "nextDueAt"   TIMESTAMP(3) NOT NULL,
    "notes"       TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ToolCalibrationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ToolCalibrationEvent_toolId_performedAt_idx"
    ON "ToolCalibrationEvent"("toolId", "performedAt");

-- AddForeignKey
ALTER TABLE "ToolCalibrationEvent"
    ADD CONSTRAINT "ToolCalibrationEvent_toolId_fkey"
    FOREIGN KEY ("toolId") REFERENCES "Tool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── P0-4 Training & Qualifications ─────────────────────────────────────────

-- CreateTable
CREATE TABLE "Certification" (
    "id"                    TEXT         NOT NULL,
    "orgId"                 TEXT         NOT NULL,
    "code"                  TEXT         NOT NULL,
    "name"                  TEXT         NOT NULL,
    "issuingAuthority"      TEXT,
    "requiresRenewal"       BOOLEAN      NOT NULL DEFAULT false,
    "renewalIntervalMonths" INTEGER,
    "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"             TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Certification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Certification_orgId_code_key" ON "Certification"("orgId", "code");

-- AddForeignKey
ALTER TABLE "Certification"
    ADD CONSTRAINT "Certification_orgId_fkey"
    FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "TechnicianCertification" (
    "id"              TEXT         NOT NULL,
    "technicianId"    TEXT         NOT NULL,
    "certificationId" TEXT         NOT NULL,
    "issuedAt"        TIMESTAMP(3) NOT NULL,
    "expiresAt"       TIMESTAMP(3),
    "certificateUrl"  TEXT,
    "status"          "CertStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TechnicianCertification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TechnicianCertification_technicianId_certificationId_key"
    ON "TechnicianCertification"("technicianId", "certificationId");

-- CreateIndex
CREATE INDEX "TechnicianCertification_expiresAt_idx" ON "TechnicianCertification"("expiresAt");

-- CreateIndex
CREATE INDEX "TechnicianCertification_status_idx" ON "TechnicianCertification"("status");

-- AddForeignKey
ALTER TABLE "TechnicianCertification"
    ADD CONSTRAINT "TechnicianCertification_technicianId_fkey"
    FOREIGN KEY ("technicianId") REFERENCES "Technician"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechnicianCertification"
    ADD CONSTRAINT "TechnicianCertification_certificationId_fkey"
    FOREIGN KEY ("certificationId") REFERENCES "Certification"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "TaskCertificationRequirement" (
    "id"              TEXT             NOT NULL,
    "orgId"           TEXT             NOT NULL,
    "taskPattern"     TEXT,
    "workOrderType"   "WorkOrderType",
    "certificationId" TEXT             NOT NULL,
    "required"        BOOLEAN          NOT NULL DEFAULT true,
    "createdAt"       TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3)     NOT NULL,

    CONSTRAINT "TaskCertificationRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaskCertificationRequirement_orgId_workOrderType_idx"
    ON "TaskCertificationRequirement"("orgId", "workOrderType");

-- CreateIndex
CREATE INDEX "TaskCertificationRequirement_orgId_taskPattern_idx"
    ON "TaskCertificationRequirement"("orgId", "taskPattern");

-- AddForeignKey
ALTER TABLE "TaskCertificationRequirement"
    ADD CONSTRAINT "TaskCertificationRequirement_orgId_fkey"
    FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskCertificationRequirement"
    ADD CONSTRAINT "TaskCertificationRequirement_certificationId_fkey"
    FOREIGN KEY ("certificationId") REFERENCES "Certification"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
