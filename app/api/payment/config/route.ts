import { NextResponse } from 'next/server';
import { paymentRegistry } from '@/src/core/payment';

export async function GET() {
  try {
    const config = paymentRegistry.getConfig();
    return NextResponse.json({
      enabled: config.enabled,
      adapter: config.adapter,
      supportedMethods: ['credits_only'],
    });
  } catch (error) {
    console.error('[Payment Config] Error:', error);
    return NextResponse.json({ error: 'Failed to get payment config' }, { status: 500 });
  }
}
