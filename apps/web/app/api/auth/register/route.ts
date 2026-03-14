import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';
import { hashPassword } from '@/lib/password';

export async function POST(request: NextRequest) {
  try {
    const { shopName, email, password, name } = await request.json() as {
      shopName: string; email: string; password: string; name?: string;
    };

    if (!shopName?.trim() || !email?.trim() || !password) {
      return NextResponse.json({ error: 'Shop name, email, and password are required' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      return NextResponse.json({ error: 'An account with that email already exists' }, { status: 409 });
    }

    const slug = shopName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const existingOrg = await prisma.organization.findUnique({ where: { slug } });
    const finalSlug = existingOrg ? `${slug}-${Date.now()}` : slug;

    const passwordHash = await hashPassword(password);

    // Create org, default rates, markup rules, and owner user in one transaction
    const { user } = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: { name: shopName.trim(), slug: finalSlug },
      });

      await tx.laborRate.createMany({
        data: [
          { orgId: org.id, name: 'Standard A&P', rate: 115, multiplier: 1.0, isDefault: true },
          { orgId: org.id, name: 'AOG Emergency', rate: 172.5, multiplier: 1.5 },
          { orgId: org.id, name: 'Avionics', rate: 135, multiplier: 1.0 },
        ],
      });

      // Default 5-tier sliding-scale markup rules
      await tx.markupRule.createMany({
        data: [
          { orgId: org.id, label: '< $50',        minCost: 0,    maxCost: 50,   markupPct: 100 },
          { orgId: org.id, label: '$50–$200',      minCost: 50,   maxCost: 200,  markupPct: 75  },
          { orgId: org.id, label: '$200–$500',     minCost: 200,  maxCost: 500,  markupPct: 50  },
          { orgId: org.id, label: '$500–$2,000',   minCost: 500,  maxCost: 2000, markupPct: 35  },
          { orgId: org.id, label: '> $2,000',      minCost: 2000, maxCost: null, markupPct: 20  },
        ],
      });

      const user = await tx.user.create({
        data: {
          orgId: org.id,
          email: email.toLowerCase(),
          name: name?.trim() || email.split('@')[0],
          role: 'OWNER',
          passwordHash,
        },
      });

      return { org, user };
    });

    return NextResponse.json({ success: true, userId: user.id }, { status: 201 });
  } catch (e) {
    console.error('[register]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
