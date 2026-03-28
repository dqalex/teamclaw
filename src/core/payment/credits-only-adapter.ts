import type { IPaymentAdapter, PaymentRequest, PaymentResult, RefundRequest, RefundResult, WebhookPayload } from './types';

/**
 * Credits-Only 支付适配器
 * 直接从 Consumer 的 credits 扣减，不接入第三方支付
 * 适用于内测阶段或内部使用场景
 */
export class CreditsOnlyAdapter implements IPaymentAdapter {
  readonly name = 'credits_only';

  async createPayment(request: PaymentRequest): Promise<PaymentResult> {
    // Credits 模式下，"支付"就是直接扣减 credits
    // 实际扣减逻辑在 service layer 中处理
    return {
      success: true,
      paymentId: `credits_${request.orderId}`,
    };
  }

  async queryPayment(paymentId: string): Promise<{ status: string; paid?: boolean }> {
    return { status: 'paid', paid: true };
  }

  async refund(request: RefundRequest): Promise<RefundResult> {
    // Credits 退还在 service layer 处理
    return { success: true, refundId: `refund_${request.paymentId}` };
  }

  verifyWebhook(_payload: unknown, _signature: string): boolean {
    return false; // Credits 模式没有 webhook
  }

  parseWebhook(_body: unknown): WebhookPayload | null {
    return null;
  }
}
