import { NextRequest, NextResponse } from 'next/server';
import { getOrgId } from '@/lib/get-org-id';

export async function POST(request: NextRequest) {
  try {
    const orgId = await getOrgId();
    if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json() as { dataUrl?: string };
    const { dataUrl } = body;

    if (!dataUrl || !dataUrl.startsWith('data:image/png;base64,')) {
      return NextResponse.json({ error: 'dataUrl must be a PNG base64 data URL' }, { status: 422 });
    }

    const base64 = dataUrl.replace('data:image/png;base64,', '');
    const buffer = Buffer.from(base64, 'base64');

    const filename = `signatures/${orgId}-${Date.now()}.png`;

    let url: string;
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const { put } = await import('@vercel/blob');
      const blob = await put(filename, buffer, { access: 'public', contentType: 'image/png' });
      url = blob.url;
    } else {
      // Stub: return data URL as-is in dev when Blob is not configured
      url = dataUrl;
    }

    return NextResponse.json({ url });
  } catch (e) {
    console.error('[SIGNATURES_POST]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
