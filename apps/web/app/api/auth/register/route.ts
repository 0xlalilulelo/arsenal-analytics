import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';

export async function POST(request: NextRequest) {
  try {
    const { shopName, email } = await request.json();

    if (!shopName || !email) {
      return NextResponse.json({ error: 'Shop name and email are required' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'An account with that email already exists' }, { status: 409 });
    }

    const slug = shopName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const existingOrg = await prisma.organization.findUnique({ where: { slug } });
    const finalSlug = existingOrg ? `${slug}-${Date.now()}` : slug;

    const org = await prisma.organization.create({ data: { name: shopName, slug: finalSlug } });

    // Create default labor rates for the new org
    await prisma.laborRate.createMany({
      data: [
        { orgId: org.id, name: 'Standard A&P', rate: 115, multiplier: 1.0, isDefault: true },
        { orgId: org.id, name: 'AOG', rate: 172.5, multiplier: 1.5 },
      ],
    });

    // Create owner user (no password hash in demo — production would use bcrypt)
    await prisma.user.create({
      data: { orgId: org.id, email, name: email.split('@')[0], role: 'OWNER' },
    });

    return NextResponse.json({ success: true, orgSlug: finalSlug }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
