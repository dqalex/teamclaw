import { NextResponse } from 'next/server';
import { paymentRegistry } from '@/src/core/payment';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ adapter: string }> }
) {
  try {
    const { adapter } = await params;
    const body = await request.json();
    const signature = request.headers.get('x-signature') || '';

    const paymentAdapter = paymentRegistry.getAdapter();

    if (!paymentAdapter.verifyWebhook(body, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = paymentAdapter.parseWebhook(body);
    if (!event) {
      return NextResponse.json({ error: 'Cannot parse webhook event' }, { status: 400 });
    }

    // 处理 webhook 事件（后续可扩展）
    console.debug(`[Payment Webhook] ${adapter}: ${event.eventType}`, event);

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Payment Webhook] Error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
