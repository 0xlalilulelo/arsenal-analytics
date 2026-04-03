import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/get-org-id';
import { hasRole } from '@/lib/rbac';
import { prisma } from '@mro/db';

/**
 * POST /api/quotes/[id]/convert
 *
 * Converts an APPROVED quote into a Work Order.
 * - Copies QuoteLines as WorkOrderLineItems
 * - Carries quotedAmount + depositCollected to the WO
 * - Sets billingStage = 'Stage3_Authorized'
 * - Marks the Quote as CONVERTED
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || !hasRole(sessionUser.role, 'MANAGER')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { depositCollected } = body;

    const quote = await prisma.quote.findUnique({
      where: { id },
      include: {
        lines: { orderBy: { sortOrder: 'asc' } },
        laborRate: { select: { id: true, rate: true } },
      },
    });

    if (!quote) return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    if (quote.status !== 'APPROVED') {
      return NextResponse.json(
        { error: `Quote must be in APPROVED status to convert (current: ${quote.status})` },
        { status: 422 },
      );
    }

    // Check it hasn't already been converted
    const existingWO = await prisma.workOrder.findFirst({ where: { quoteId: id }, select: { id: true, number: true } });
    if (existingWO) {
      return NextResponse.json(
        { error: 'Quote already converted', workOrderId: existingWO.id, workOrderNumber: existingWO.number },
        { status: 409 },
      );
    }

    // Resolve labor rate — use quote's rate or fall back to default
    const org = await prisma.organization.findUnique({ where: { id: sessionUser.orgId }, select: { id: true } });
    if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 });

    let laborRateId = quote.laborRateId;
    let laborRate = quote.laborRate?.rate ?? 115;
    if (!laborRateId) {
      const defaultRate = await prisma.laborRate.findFirst({ where: { orgId: org.id, isDefault: true } });
      if (defaultRate) { laborRateId = defaultRate.id; laborRate = defaultRate.rate; }
    }
    if (!laborRateId) return NextResponse.json({ error: 'No labor rate found' }, { status: 422 });

    const count = await prisma.workOrder.count({ where: { orgId: org.id } });
    const number = `WO-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    // Determine WO type: if billingModel is anything special, start as SCHEDULED
    const woType = 'SCHEDULED';

    // Map quote lines → WO line items (only LABOR lines become task cards directly)
    const laborLines = quote.lines.filter(l => l.category === 'LABOR');
    const otherLines = quote.lines.filter(l => l.category !== 'LABOR');

    // Estimate total from quote
    const estimatedTotal = quote.total;

    const wo = await prisma.workOrder.create({
      data: {
        orgId: org.id,
        number,
        type: woType,
        status: 'OPEN',
        customerId: quote.customerId,
        aircraftId: quote.aircraftId!,
        laborRateId,
        billingModel: quote.billingModel,
        nteAmount: quote.nteAmount,
        quoteId: id,
        quotedAmount: quote.total,
        depositCollected: depositCollected ?? quote.depositAmount ?? 0,
        billingStage: 'Stage3_Authorized',
        estimatedTotal,
        notes: quote.notes,
        lineItems: {
          create: [
            ...laborLines.map((l, idx) => ({
              taskNumber: `TASK-${String(idx + 1).padStart(3, '0')}`,
              description: l.description,
              estHours: l.qty,
              laborRate,
              sortOrder: idx,
            })),
            // Non-labor lines become a summary task card
            ...(otherLines.length > 0 ? [{
              taskNumber: `TASK-${String(laborLines.length + 1).padStart(3, '0')}`,
              description: 'Parts, subcontract & other items (from quote)',
              estHours: 0,
              laborRate,
              sortOrder: laborLines.length,
            }] : []),
          ],
        },
      },
      include: {
        customer: { select: { name: true } },
        aircraft: { select: { nNumber: true } },
        lineItems: true,
      },
    });

    // Mark quote as CONVERTED
    await prisma.quote.update({
      where: { id },
      data: { status: 'CONVERTED' },
    });

    return NextResponse.json({ data: wo }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
