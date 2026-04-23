import { NextRequest, NextResponse } from 'next/server';
import { getOrgId } from '@/lib/get-org-id';
import { buildZplPartLabel, buildZplToolLabel, type PartLabelData, type ToolLabelData } from '@mro/core';

export async function POST(request: NextRequest) {
  try {
    const orgId = await getOrgId();
    if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json() as { type: 'PART' | 'TOOL'; data: PartLabelData | ToolLabelData };
    const { type, data } = body;

    let zpl: string;
    if (type === 'PART') {
      zpl = buildZplPartLabel(data as PartLabelData);
    } else if (type === 'TOOL') {
      zpl = buildZplToolLabel(data as ToolLabelData);
    } else {
      return NextResponse.json({ error: 'type must be PART or TOOL' }, { status: 422 });
    }

    return NextResponse.json({ zpl });
  } catch (e) {
    console.error('[LABELS_POST]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
