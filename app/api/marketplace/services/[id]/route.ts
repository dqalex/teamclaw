/**
 * Marketplace 服务详情 API
 * GET /api/marketplace/services/[id]
 */

import { NextResponse } from 'next/server';
import { db, services } from '@/db';
import { eq, and } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [service] = await db.select().from(services).where(eq(services.id, id)).limit(1);
    if (!service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    return NextResponse.json({ service });
  } catch (error) {
    console.error('[Marketplace Service Detail] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch service' }, { status: 500 });
  }
}
