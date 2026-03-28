import type { IPaymentAdapter, PaymentRequest, PaymentResult, RefundRequest, RefundResult, WebhookPayload } from './types';

/**
 * Stripe 支付适配器（预留实现）
 * 需要 STRIPE_SECRET_KEY 环境变量
 */
export class StripeAdapter implements IPaymentAdapter {
  readonly name = 'stripe';
  private secretKey: string;
  private webhookSecret: string;

  constructor(config: { secretKey: string; webhookSecret: string }) {
    this.secretKey = config.secretKey;
    this.webhookSecret = config.webhookSecret;
  }

  async createPayment(request: PaymentRequest): Promise<PaymentResult> {
    try {
      // Stripe Checkout Session 创建
      // 注：实际接入时需要 import stripe SDK
      // const session = await stripe.checkout.sessions.create({...});
      return {
        success: false,
        error: 'Stripe integration requires STRIPE_SECRET_KEY environment variable',
      };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  async queryPayment(paymentId: string): Promise<{ status: string; paid?: boolean }> {
    // const session = await stripe.checkout.sessions.retrieve(paymentId);
    return { status: 'pending', paid: false };
  }

  async refund(request: RefundRequest): Promise<RefundResult> {
    return { success: false, error: 'Stripe integration not yet configured' };
  }

  verifyWebhook(payload: unknown, signature: string): boolean {
    // Stripe 签名验证: stripe.webhooks.constructEvent(body, sig, webhookSecret)
    return false;
  }

  parseWebhook(body: unknown): WebhookPayload | null {
    // 解析 Stripe webhook event
    return null;
  }
}
