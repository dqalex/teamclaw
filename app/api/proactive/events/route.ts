import { NextResponse } from 'next/server';
import { db } from '@/db/index';
import { proactiveEvents } from '@/db/schema';
import { and, eq, desc } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'triggered';
    const severity = searchParams.get('severity');
    const projectId = searchParams.get('project_id');
    const limit = Math.min(Number(searchParams.get('limit')) || 20, 100);

    const conditions = [];
    if (status !== 'all') conditions.push(eq(proactiveEvents.status, status as 'triggered' | 'acted' | 'dismissed' | 'failed'));
    if (severity) conditions.push(eq(proactiveEvents.severity, severity as 'info' | 'warning' | 'critical'));
    if (projectId) conditions.push(eq(proactiveEvents.projectId, projectId));

    const events = await db.select()
      .from(proactiveEvents)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(proactiveEvents.createdAt))
      .limit(limit);

    return NextResponse.json(events);
  } catch (error) {
    console.error('[Proactive Events GET] Error:', error);
    return NextResponse.json({ error: 'Failed to get proactive events' }, { status: 500 });
  }
}
