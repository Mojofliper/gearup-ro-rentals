/**
 * CSP Helper Utilities
 *
 * This file contains utilities to help with Content Security Policy issues
 * that may arise from browser extensions or external services.
 */

/**
 * Check if CSP errors are likely from browser extensions
 */
export const isCSPFromExtensions = (errorMessage: string): boolean => {
  const extensionIndicators = [
    "content.js",
    "extension",
    "chrome-extension",
    "moz-extension",
    "safari-extension",
  ];

  return extensionIndicators.some((indicator) =>
    errorMessage.toLowerCase().includes(indicator.toLowerCase()),
  );
};

/**
 * Get recommendations for CSP issues
 */
export const getCSPRecommendations = (errorMessage: string): string[] => {
  const recommendations: string[] = [];

  if (isCSPFromExtensions(errorMessage)) {
    recommendations.push(
      "This CSP error appears to be caused by a browser extension.",
      "Try disabling browser extensions temporarily or use incognito/private mode.",
      "Extensions like ad blockers, password managers, or developer tools can interfere with CSP.",
    );
  } else {
    recommendations.push(
      "This CSP error may be from external services or the application itself.",
      "Check if you're using any external scripts or styles that need to be whitelisted.",
      "Consider adding appropriate CSP directives to allow necessary resources.",
    );
  }

  return recommendations;
};

/**
 * Log CSP errors with helpful context
 */
export const logCSPError = (error: string): void => {
  console.warn("CSP Error detected:", error);

  const recommendations = getCSPRecommendations(error);
  console.warn("Recommendations:", recommendations);

  if (isCSPFromExtensions(error)) {
    console.warn(
      "💡 Tip: Try disabling browser extensions or use incognito mode",
    );
  }
};

/**
 * Check if we're in a development environment
 */
export const isDevelopment = (): boolean => {
  return import.meta.env.DEV || process.env.NODE_ENV === "development";
};

/**
 * Get environment-specific CSP settings
 */
export const getCSPConfig = () => {
  if (isDevelopment()) {
    return {
      // More permissive for development
      "script-src": ["'self'", "'unsafe-eval'", "'unsafe-inline'"],
      "style-src": ["'self'", "'unsafe-inline'"],
      "connect-src": [
        "'self'",
        "https://*.supabase.co",
        "https://*.stripe.com",
      ],
    };
  }

  return {
    // Stricter for production
    "script-src": ["'self'"],
    "style-src": ["'self'"],
    "connect-src": ["'self'", "https://*.supabase.co", "https://*.stripe.com"],
  };
};
