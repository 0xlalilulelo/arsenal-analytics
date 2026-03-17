-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "address" TEXT,
ADD COLUMN     "defaultBillingTerms" TEXT NOT NULL DEFAULT 'NET_30',
ADD COLUMN     "defaultTaxRatePct" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "faaRepairStationNumber" TEXT,
ADD COLUMN     "laborRoundingMinutes" INTEGER NOT NULL DEFAULT 15,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "shopSuppliesPct" DOUBLE PRECISION NOT NULL DEFAULT 0.035;
