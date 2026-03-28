import { db } from '@/db';
import { NextRequest, NextResponse } from 'next/server';
import { workflowRuns } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { isValidId } from '@/lib/security';
import { WorkflowEngine } from '@/core/workflow/engine';
import { eventBus } from '@/shared/lib/event-bus';

export const dynamic = 'force-dynamic';

const engine = new WorkflowEngine();

// GET /api/workflow-runs/[id] - 获取 Workflow Run 详情
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!isValidId(id)) {
    return NextResponse.json({ error: 'Invalid workflow run ID format' }, { status: 400 });
  }

  try {
    const [run] = await db
      .select()
      .from(workflowRuns)
      .where(eq(workflowRuns.id, id))
      .limit(1);

    if (!run) {
      return NextResponse.json({ error: 'Workflow run not found' }, { status: 404 });
    }

    return NextResponse.json(run);
  } catch (error) {
    console.error(`[GET /api/workflow-runs/${id}] Error:`, error);
    return NextResponse.json({ error: 'Failed to fetch workflow run' }, { status: 500 });
  }
}

// POST /api/workflow-runs/[id] - 执行操作（advance/pause/resume/replay）
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!isValidId(id)) {
    return NextResponse.json({ error: 'Invalid workflow run ID format' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { action, nodeOutput, nodeId } = body as {
      action?: string;
      nodeOutput?: unknown;
      nodeId?: string;
    };

    if (!action || !['advance', 'pause', 'resume', 'replay'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be one of: advance, pause, resume, replay' },
        { status: 400 }
      );
    }

    let result: Record<string, unknown>;

    switch (action) {
      case 'advance': {
        const advanceResult = await engine.advance(id, nodeOutput);

        // 发射节点推进事件
        eventBus.emit({
          type: 'workflow_node_advanced',
          resourceId: id,
          data: { runId: id, currentNodeId: advanceResult.currentNodeId },
        });

        // 如果完成，额外发射完成事件
        if (advanceResult.status === 'completed') {
          eventBus.emit({
            type: 'workflow_run_completed',
            resourceId: id,
            data: { runId: id, status: 'completed' },
          });
        }

        result = advanceResult;
        break;
      }

      case 'pause': {
        result = await engine.pause(id);
        break;
      }

      case 'resume': {
        result = await engine.resume(id);
        break;
      }

      case 'replay': {
        if (!nodeId) {
          return NextResponse.json({ error: 'Missing nodeId for replay action' }, { status: 400 });
        }
        result = await engine.replayFrom(id, nodeId);
        break;
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to execute workflow action';
    console.error(`[POST /api/workflow-runs/${id}] Error:`, error);

    // 发射失败事件
    eventBus.emit({
      type: 'workflow_run_failed',
      resourceId: id,
      data: { runId: id, error: message },
    });

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
