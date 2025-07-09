// Console error filter to suppress non-critical errors
export const setupConsoleFilter = () => {
  if (typeof window === 'undefined') return;

  const originalError = console.error;
  const originalWarn = console.warn;

  // Filter out source map errors and other non-critical errors
  console.error = (...args: unknown[]) => {
    const message = args.join(' ');
    
    // Filter out source map errors
    if (message.includes('Source map error') || 
        message.includes('installHook.js.map') ||
        message.includes('JSON.parse: unexpected character')) {
      return;
    }

    // Filter out CSP warnings (these are just warnings, not errors)
    if (message.includes('Content-Security-Policy') && 
        (message.includes('blocked an inline style') || 
         message.includes('blocked an inline script'))) {
      return;
    }

    // Filter out cookie warnings
    if (message.includes('Cookie') && message.includes('has been rejected')) {
      return;
    }

    // Filter out Stripe HTTPS warnings in development
    if (message.includes('live Stripe.js integrations must use HTTPS') && 
        window.location.hostname === 'localhost') {
      return;
    }

    // Filter out error reporting service warnings
    if (message.includes('Error reporting service not configured') ||
        message.includes('Error reporting not initialized')) {
      return;
    }

    // Filter out partitioned cookie warnings
    if (message.includes('Partitioned cookie or storage access was provided')) {
      return;
    }

    // Filter out websocket cookie warnings
    if (message.includes('Cookie') && message.includes('has been rejected for invalid domain') && message.includes('websocket')) {
      return;
    }

    // Filter out Vite hot update messages (these are normal)
    if (message.includes('[vite]') && (message.includes('hot updated') || message.includes('connected'))) {
      return;
    }

    // Call original error function for real errors
    originalError.apply(console, args);
  };

  // Filter out non-critical warnings
  console.warn = (...args: unknown[]) => {
    const message = args.join(' ');
    
    // Filter out CSP warnings
    if (message.includes('Content-Security-Policy') && 
        (message.includes('blocked an inline style') || 
         message.includes('blocked an inline script'))) {
      return;
    }

    // Filter out cookie warnings
    if (message.includes('Cookie') && message.includes('has been rejected')) {
      return;
    }

    // Filter out Stripe HTTPS warnings in development
    if (message.includes('live Stripe.js integrations must use HTTPS') && 
        window.location.hostname === 'localhost') {
      return;
    }

    // Call original warn function for real warnings
    originalWarn.apply(console, args);
  };

  // Restore original functions on page unload
  window.addEventListener('beforeunload', () => {
    console.error = originalError;
    console.warn = originalWarn;
  });
}; 