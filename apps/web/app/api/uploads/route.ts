import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/heic',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

/**
 * POST /api/uploads
 *
 * Accepts a multipart/form-data upload with a `file` field and an optional
 * `prefix` field (e.g. "squawks/", "compliance/"). Returns the public URL.
 *
 * Requires BLOB_READ_WRITE_TOKEN env var (Vercel Blob) in production.
 * Falls back to a stub in development.
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const prefix = (formData.get('prefix') as string | null) ?? 'uploads/';

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 422 });
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: 'File exceeds 10 MB limit' }, { status: 422 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: `File type ${file.type} not allowed` }, { status: 422 });
  }

  // In development without Blob token, return a stub URL
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    const stubUrl = `https://blob.vercel-storage.com/stub/${Date.now()}-${file.name}`;
    console.log(`[UPLOAD STUB] Would upload ${file.name} (${file.size} bytes) → ${stubUrl}`);
    return NextResponse.json({ url: stubUrl, name: file.name, size: file.size });
  }

  try {
    const { put } = await import('@vercel/blob');
    const pathname = `${prefix}${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const blob = await put(pathname, file, { access: 'public' });
    return NextResponse.json({ url: blob.url, name: file.name, size: file.size });
  } catch (e) {
    console.error('[UPLOAD] Failed:', e);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
