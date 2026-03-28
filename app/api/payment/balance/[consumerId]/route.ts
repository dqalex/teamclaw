import { NextResponse } from 'next/server';
import { creditsService } from '@/src/core/payment/credits-service';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ consumerId: string }> }
) {
  try {
    const { consumerId } = await params;
    const balance = await creditsService.getBalance(consumerId);
    return NextResponse.json(balance);
  } catch (error) {
    console.error('[Payment Balance] Error:', error);
    return NextResponse.json({ error: 'Failed to get credit balance' }, { status: 500 });
  }
}
