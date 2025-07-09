// Stripe Error Handler for Analytics Blocking
export class StripeErrorHandler {
  private static isAnalyticsBlocked = false;

  static handleAnalyticsError(error: unknown): void {
    // Check if this is an analytics blocking error
    const errorObj = error as Record<string, unknown>;
    if ((errorObj?.message as string)?.includes('r.stripe.com') || 
        (errorObj?.message as string)?.includes('ERR_BLOCKED_BY_CLIENT') ||
        errorObj?.code === 'NETWORK_ERROR') {
      
      if (!this.isAnalyticsBlocked) {
        console.warn('Stripe analytics are being blocked. This is normal if you have an ad blocker enabled.');
        this.isAnalyticsBlocked = true;
      }
      
      // Don't throw the error - analytics blocking shouldn't break the app
      return;
    }
    
    // For other errors, log them normally
    console.error('Stripe error:', error);
  }

  static isAnalyticsBlockedError(error: unknown): boolean {
    const errorObj = error as Record<string, unknown>;
    return (errorObj?.message as string)?.includes('r.stripe.com') || 
           (errorObj?.message as string)?.includes('ERR_BLOCKED_BY_CLIENT') ||
           errorObj?.code === 'NETWORK_ERROR';
  }
}

// Global error handler for unhandled Stripe promise rejections
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    if (StripeErrorHandler.isAnalyticsBlockedError(event.reason)) {
      event.preventDefault();
      StripeErrorHandler.handleAnalyticsError(event.reason);
    }
  });
} 