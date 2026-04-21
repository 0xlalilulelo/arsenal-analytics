import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';
import { getOrgId } from '@/lib/get-org-id';

// PATCH /api/parts/[id]/lots/[lotId] — update lot fields
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; lotId: string }> },
) {
  try {
    const orgId = await getOrgId();
    if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id: partId, lotId } = await params;
    const body = await request.json();

    const existing = await prisma.partLot.findUnique({
      where: { id: lotId },
      include: { part: { select: { orgId: true } } },
    });
    if (!existing || existing.partId !== partId || existing.part.orgId !== orgId) {
      return NextResponse.json({ error: 'Lot not found' }, { status: 404 });
    }

    const updated = await prisma.partLot.update({
      where: { id: lotId },
      data: {
        ...(body.serialNumber   !== undefined ? { serialNumber:   body.serialNumber   } : {}),
        ...(body.lotNumber      !== undefined ? { lotNumber:      body.lotNumber      } : {}),
        ...(body.batchNumber    !== undefined ? { batchNumber:    body.batchNumber    } : {}),
        ...(body.mfgDate        !== undefined ? { mfgDate:        body.mfgDate        ? new Date(body.mfgDate)        : null } : {}),
        ...(body.expirationDate !== undefined ? { expirationDate: body.expirationDate ? new Date(body.expirationDate) : null } : {}),
        ...(body.revision       !== undefined ? { revision:       body.revision       } : {}),
        ...(body.qtyOnHand      !== undefined ? { qtyOnHand:      body.qtyOnHand      } : {}),
        ...(body.condition      !== undefined ? { condition:      body.condition      } : {}),
        ...(body.cocDocUrl      !== undefined ? { cocDocUrl:      body.cocDocUrl      } : {}),
        ...(body.form8130Url    !== undefined ? { form8130Url:    body.form8130Url    } : {}),
        ...(body.notes          !== undefined ? { notes:          body.notes          } : {}),
      },
    });

    await prisma.auditLog.create({
      data: {
        orgId,
        entityType: 'PartLot',
        entityId:   lotId,
        action:     'LOT_UPDATED',
        before: {
          qtyOnHand: existing.qtyOnHand,
          condition: existing.condition,
        },
        after: {
          qtyOnHand: updated.qtyOnHand,
          condition: updated.condition,
        },
      },
    }).catch(() => {});

    return NextResponse.json({ data: updated });
  } catch (e) {
    console.error('[PART LOT] Update failed:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/parts/[id]/lots/[lotId] — remove a lot (refuses if installed)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; lotId: string }> },
) {
  try {
    const orgId = await getOrgId();
    if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id: partId, lotId } = await params;

    const existing = await prisma.partLot.findUnique({
      where: { id: lotId },
      include: {
        part: { select: { orgId: true } },
        _count: { select: { partRequests: true } },
      },
    });
    if (!existing || existing.partId !== partId || existing.part.orgId !== orgId) {
      return NextResponse.json({ error: 'Lot not found' }, { status: 404 });
    }

    if (existing._count.partRequests > 0) {
      return NextResponse.json(
        { error: 'Lot is referenced by part requests and cannot be deleted' },
        { status: 409 },
      );
    }

    await prisma.partLot.delete({ where: { id: lotId } });

    await prisma.auditLog.create({
      data: {
        orgId,
        entityType: 'PartLot',
        entityId:   lotId,
        action:     'LOT_DELETED',
        before: {
          serialNumber: existing.serialNumber,
          lotNumber:    existing.lotNumber,
          qtyOnHand:    existing.qtyOnHand,
        },
      },
    }).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[PART LOT] Delete failed:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
