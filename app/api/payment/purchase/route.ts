import { NextResponse } from 'next/server';
import { creditsService } from '@/src/core/payment/credits-service';

export async function POST(request: Request) {
  const body = await request.json();
  const { consumerId, creditsAmount, amountCents, currency } = body;

  if (!consumerId || !creditsAmount || !amountCents) {
    return NextResponse.json({ error: 'consumerId, creditsAmount, amountCents are required' }, { status: 400 });
  }

  if (creditsAmount <= 0 || amountCents <= 0) {
    return NextResponse.json({ error: 'creditsAmount and amountCents must be positive' }, { status: 400 });
  }

  try {
    const result = await creditsService.purchaseCredits({
      consumerId,
      creditsAmount,
      amountCents,
      currency,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
