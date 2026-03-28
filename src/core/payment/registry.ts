import type { IPaymentAdapter, PaymentConfig } from './types';
import { CreditsOnlyAdapter } from './credits-only-adapter';

class PaymentRegistry {
  private adapter: IPaymentAdapter | null = null;
  private config: PaymentConfig | null = null;

  configure(config: PaymentConfig): void {
    this.config = config;

    switch (config.adapter) {
      case 'credits_only':
        this.adapter = new CreditsOnlyAdapter();
        break;
      case 'stripe':
        if (!config.stripeSecretKey) {
          console.warn('[Payment] Stripe configured but no STRIPE_SECRET_KEY, falling back to credits_only');
          this.adapter = new CreditsOnlyAdapter();
        } else {
          // 动态导入避免未安装 stripe SDK 时报错
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const { StripeAdapter } = require('./stripe-adapter');
          this.adapter = new StripeAdapter({
            secretKey: config.stripeSecretKey,
            webhookSecret: config.stripeWebhookSecret || '',
          });
        }
        break;
      case 'wechat_pay':
        console.warn('[Payment] WeChat Pay not yet implemented, falling back to credits_only');
        this.adapter = new CreditsOnlyAdapter();
        break;
      default:
        this.adapter = new CreditsOnlyAdapter();
    }

    if (this.adapter) {
      console.debug(`[Payment] Configured adapter: ${this.adapter.name}`);
    }
  }

  getAdapter(): IPaymentAdapter {
    if (!this.adapter) {
      this.configure({ enabled: true, adapter: 'credits_only' });
    }
    return this.adapter!;
  }

  getConfig(): PaymentConfig {
    return this.config || { enabled: true, adapter: 'credits_only' };
  }
}

export const paymentRegistry = new PaymentRegistry();
