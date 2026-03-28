/**
 * 支付适配器接口（Phase 5 支付对接）
 */

export interface PaymentRequest {
  orderId: string;
  amount: number;         // 金额（分）
  currency: string;       // 'CNY' | 'USD'
  description: string;
  consumerId: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentResult {
  success: boolean;
  paymentId?: string;       // 第三方支付流水号
  paymentUrl?: string;      // 支付跳转 URL（如微信 Native 二维码 URL）
  error?: string;
}

export interface RefundRequest {
  orderId: string;
  paymentId: string;
  amount?: number;          // 部分退款时指定，不填则全额退款
  reason?: string;
}

export interface RefundResult {
  success: boolean;
  refundId?: string;
  error?: string;
}

export interface WebhookPayload {
  eventType: 'payment_success' | 'payment_failed' | 'refund_success' | 'refund_failed';
  orderId: string;
  paymentId: string;
  amount: number;
  rawBody: unknown;
  signature: string;
}

export interface IPaymentAdapter {
  readonly name: string;

  /** 创建支付 */
  createPayment(request: PaymentRequest): Promise<PaymentResult>;

  /** 查询支付状态 */
  queryPayment(paymentId: string): Promise<{ status: string; paid?: boolean }>;

  /** 发起退款 */
  refund(request: RefundRequest): Promise<RefundResult>;

  /** 验证 Webhook 签名 */
  verifyWebhook(payload: unknown, signature: string): boolean;

  /** 解析 Webhook 事件 */
  parseWebhook(body: unknown): WebhookPayload | null;
}

/** 支付配置 */
export interface PaymentConfig {
  enabled: boolean;
  adapter: 'stripe' | 'wechat_pay' | 'credits_only';

  // Stripe 配置
  stripeSecretKey?: string;
  stripeWebhookSecret?: string;

  // 微信支付配置
  wechatAppId?: string;
  wechatMchId?: string;
  wechatApiKey?: string;
  wechatNotifyUrl?: string;
}
