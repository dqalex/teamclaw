/**
 * Payment + Credits MCP Handlers（v1.1 Phase 5）
 */
import { creditsService } from '@/src/core/payment/credits-service';

export async function handlePurchaseCredits(params: Record<string, unknown>) {
  try {
    const result = await creditsService.purchaseCredits({
      consumerId: params.consumer_id as string,
      creditsAmount: params.credits_amount as number,
      amountCents: params.amount_cents as number,
      currency: params.currency as string | undefined,
    });
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function handleGetConsumerBalance(params: Record<string, unknown>) {
  try {
    const result = await creditsService.getBalance(params.consumer_id as string);
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}
