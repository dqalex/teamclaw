import { NextResponse } from 'next/server';
import { db } from '@/db/index';
import { proactiveRules } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { generateId } from '@/lib/id';
import { eventBus } from '@/shared/lib/event-bus';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');
    const enabled = searchParams.get('enabled');

    const conditions = [];
    if (projectId) conditions.push(eq(proactiveRules.projectId, projectId));
    if (enabled !== null) conditions.push(eq(proactiveRules.enabled, enabled === 'true'));

    const rules = await db.select().from(proactiveRules)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return NextResponse.json(rules);
  } catch (error) {
    console.error('[Proactive Rules GET] Error:', error);
    return NextResponse.json({ error: 'Failed to get proactive rules' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, triggerType, config, enabled, cooldownMinutes, projectId } = body;

    if (!name || !triggerType) {
      return NextResponse.json({ error: 'name and triggerType are required' }, { status: 400 });
    }

    const id = generateId();
    const rule = {
      id,
      name,
      triggerType,
      config: config || {},
      enabled: enabled !== false,
      cooldownMinutes: cooldownMinutes || 60,
      projectId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(proactiveRules).values(rule);

    eventBus.emit({
      type: 'proactive_event_triggered',
      resourceId: id,
      data: { action: 'rule_created', rule },
    });

    return NextResponse.json(rule, { status: 201 });
  } catch (error) {
    console.error('[Proactive Rules POST] Error:', error);
    return NextResponse.json({ error: 'Failed to create proactive rule' }, { status: 500 });
  }
}
