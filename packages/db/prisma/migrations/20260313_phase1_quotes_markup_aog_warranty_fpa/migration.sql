-- CreateEnum
CREATE TYPE "SquawkClass" AS ENUM ('AIRFRAME', 'ENGINE', 'AVIONICS', 'PROPELLER', 'LANDING_GEAR', 'INTERIOR', 'OTHER');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'SENT', 'VIEWED', 'APPROVED', 'DECLINED', 'EXPIRED', 'CONVERTED');

-- CreateEnum
CREATE TYPE "QuoteLineCategory" AS ENUM ('LABOR', 'PARTS', 'SUBCONTRACT', 'SHOP_SUPPLIES', 'FREIGHT', 'OTHER');

-- CreateEnum
CREATE TYPE "WarrantyClaimStatus" AS ENUM ('NONE', 'PENDING', 'APPROVED', 'DENIED', 'REPLACED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ComplianceType" ADD VALUE 'ANNUAL';
ALTER TYPE "ComplianceType" ADD VALUE 'DER';
ALTER TYPE "ComplianceType" ADD VALUE 'OTHER';

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "portalToken" TEXT,
ADD COLUMN     "stripeCheckoutExpiry" TIMESTAMP(3),
ADD COLUMN     "stripeCheckoutUrl" TEXT,
ADD COLUMN     "stripePaymentIntentId" TEXT;

-- AlterTable
ALTER TABLE "Squawk" ADD COLUMN     "classification" "SquawkClass" NOT NULL DEFAULT 'AIRFRAME';

-- AlterTable
ALTER TABLE "WorkOrder" ADD COLUMN     "aogEventId" TEXT,
ADD COLUMN     "billingStage" TEXT,
ADD COLUMN     "depositCollected" DOUBLE PRECISION,
ADD COLUMN     "quoteId" TEXT,
ADD COLUMN     "quotedAmount" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "quoteNumber" TEXT NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "customerId" TEXT NOT NULL,
    "aircraftId" TEXT,
    "billingModel" "BillingModel" NOT NULL DEFAULT 'TIME_AND_MATERIALS',
    "nteAmount" DOUBLE PRECISION,
    "laborRateId" TEXT,
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "depositPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "depositAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "validDays" INTEGER NOT NULL DEFAULT 30,
    "expiresAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "declinedAt" TIMESTAMP(3),
    "declineReason" TEXT,
    "notes" TEXT,
    "internalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteLine" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "category" "QuoteLineCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "qty" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuoteLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarkupRule" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "minCost" DOUBLE PRECISION NOT NULL,
    "maxCost" DOUBLE PRECISION,
    "markupPct" DOUBLE PRECISION NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarkupRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AOGEvent" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "activatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "location" TEXT,
    "calloutFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "mileage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "mileageRate" DOUBLE PRECISION NOT NULL DEFAULT 1.25,
    "driveHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "driveRate" DOUBLE PRECISION NOT NULL DEFAULT 70.0,
    "techCount" INTEGER NOT NULL DEFAULT 1,
    "minimumHours" DOUBLE PRECISION NOT NULL DEFAULT 2.0,
    "resolvedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AOGEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WarrantyRecord" (
    "id" TEXT NOT NULL,
    "partRequestId" TEXT NOT NULL,
    "vendor" TEXT NOT NULL,
    "warrantyMonths" INTEGER NOT NULL,
    "installDate" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "claimStatus" "WarrantyClaimStatus" NOT NULL DEFAULT 'NONE',
    "claimRef" TEXT,
    "claimDate" TIMESTAMP(3),
    "claimAmount" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WarrantyRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoreReturn" (
    "id" TEXT NOT NULL,
    "partRequestId" TEXT NOT NULL,
    "corePartNumber" TEXT NOT NULL,
    "coreDescription" TEXT,
    "coreValue" DOUBLE PRECISION NOT NULL,
    "vendor" TEXT NOT NULL,
    "returnDueDate" TIMESTAMP(3),
    "returnedAt" TIMESTAMP(3),
    "trackingNumber" TEXT,
    "creditReceived" DOUBLE PRECISION,
    "creditApplied" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoreReturn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FPASnapshot" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "revenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "laborBilled" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "laborCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "partsBilled" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "partsCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "grossProfit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "grossMarginPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "billableHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "utilizationPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgDaysToInvoice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "aogCount" INTEGER NOT NULL DEFAULT 0,
    "woCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FPASnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashFlowSnapshot" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "snapshotDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "arCurrent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ar1to30" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ar31to60" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ar61to90" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ar90plus" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "arExpected30d" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "arExpected60d" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "arExpected90d" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "wipValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "wipProjected30d" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "partsOnOrder" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "forecastBalance30d" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "forecastBalance60d" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "forecastBalance90d" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CashFlowSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Quote_quoteNumber_key" ON "Quote"("quoteNumber");

-- CreateIndex
CREATE UNIQUE INDEX "MarkupRule_orgId_minCost_key" ON "MarkupRule"("orgId", "minCost");

-- CreateIndex
CREATE UNIQUE INDEX "WarrantyRecord_partRequestId_key" ON "WarrantyRecord"("partRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "CoreReturn_partRequestId_key" ON "CoreReturn"("partRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "FPASnapshot_orgId_month_key" ON "FPASnapshot"("orgId", "month");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_portalToken_key" ON "Invoice"("portalToken");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrder_aogEventId_key" ON "WorkOrder"("aogEventId");

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_aogEventId_fkey" FOREIGN KEY ("aogEventId") REFERENCES "AOGEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_aircraftId_fkey" FOREIGN KEY ("aircraftId") REFERENCES "Aircraft"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_laborRateId_fkey" FOREIGN KEY ("laborRateId") REFERENCES "LaborRate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteLine" ADD CONSTRAINT "QuoteLine_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarkupRule" ADD CONSTRAINT "MarkupRule_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AOGEvent" ADD CONSTRAINT "AOGEvent_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarrantyRecord" ADD CONSTRAINT "WarrantyRecord_partRequestId_fkey" FOREIGN KEY ("partRequestId") REFERENCES "PartRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoreReturn" ADD CONSTRAINT "CoreReturn_partRequestId_fkey" FOREIGN KEY ("partRequestId") REFERENCES "PartRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FPASnapshot" ADD CONSTRAINT "FPASnapshot_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashFlowSnapshot" ADD CONSTRAINT "CashFlowSnapshot_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

