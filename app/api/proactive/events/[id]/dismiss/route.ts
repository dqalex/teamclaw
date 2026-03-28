import { NextResponse } from 'next/server';
import { db } from '@/db/index';
import { proactiveEvents } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { eventBus } from '@/shared/lib/event-bus';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const reason = body.reason as string | undefined;

  const [event] = await db.select().from(proactiveEvents).where(eq(proactiveEvents.id, id));
  if (!event) {
    return NextResponse.json({ error: 'Proactive event not found' }, { status: 404 });
  }

  await db.update(proactiveEvents)
    .set({ status: 'dismissed', actedAt: new Date() })
    .where(eq(proactiveEvents.id, id));

  eventBus.emit({
    type: 'proactive_event_dismissed',
    resourceId: id,
    data: { eventId: id, reason },
  });

  return NextResponse.json({ success: true, eventId: id, status: 'dismissed' });
}
