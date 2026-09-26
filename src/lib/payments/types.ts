export interface CheckoutInput { userId: string; productId: string; successUrl: string; }
export interface CheckoutResult { checkoutUrl: string; providerOrderId: string; }
export interface PaymentProvider { createCheckout(input: CheckoutInput): Promise<CheckoutResult>; verifyWebhook(payload: string, signature: string): Promise<boolean>; }
