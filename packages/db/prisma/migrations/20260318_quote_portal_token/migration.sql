-- AlterTable
ALTER TABLE "Quote" ADD COLUMN "portalToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Quote_portalToken_key" ON "Quote"("portalToken");
