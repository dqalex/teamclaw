import { NextResponse } from 'next/server';
import { db } from '@/db/index';
import { eventLogs } from '@/db/schema';
import { and, eq, desc } from 'drizzle-orm';
import { generateId } from '@/lib/id';
import { eventBus } from '@/shared/lib/event-bus';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entity_type');
    const entityId = searchParams.get('entity_id');
    const projectId = searchParams.get('project_id');
    const actorType = searchParams.get('actor_type');
    const limit = Math.min(Number(searchParams.get('limit')) || 50, 200);

    const conditions = [];
    if (entityType) conditions.push(eq(eventLogs.entityType, entityType));
    if (entityId) conditions.push(eq(eventLogs.entityId, entityId));
    if (projectId) conditions.push(eq(eventLogs.projectId, projectId));
    if (actorType) conditions.push(eq(eventLogs.actorType, actorType as 'user' | 'agent' | 'system'));

    const logs = await db.select()
      .from(eventLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(eventLogs.createdAt))
      .limit(limit);

    return NextResponse.json(logs);
  } catch (error) {
    console.error('[Event Logs GET] Error:', error);
    return NextResponse.json({ error: 'Failed to get event logs' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { eventType, entityType, entityId, actorType, actorId, tokenCount, tokenCost, payload, projectId } = body;

    if (!eventType || !entityType || !entityId || !actorType) {
      return NextResponse.json(
        { error: 'eventType, entityType, entityId, actorType are required' },
        { status: 400 }
      );
    }

    const id = generateId();
    await db.insert(eventLogs).values({
      id,
      eventType,
      entityType,
      entityId,
      payload: payload || {},
      actorType,
      actorId,
      tokenCount,
      tokenCost,
      projectId,
      createdAt: new Date(),
    });

    eventBus.emit({
      type: 'event_log_created',
      resourceId: id,
      data: { eventLogId: id, eventType, entityType, entityId },
    });

    return NextResponse.json({ success: true, id }, { status: 201 });
  } catch (error) {
    console.error('[Event Logs POST] Error:', error);
    return NextResponse.json({ error: 'Failed to create event log' }, { status: 500 });
  }
}
