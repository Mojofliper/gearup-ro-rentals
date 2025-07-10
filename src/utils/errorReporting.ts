// Simple error reporting service
interface ErrorReport {
  message: string;
  stack?: string;
  timestamp: string;
  url: string;
  userAgent: string;
  userId?: string;
}

class ErrorReportingService {
  private static instance: ErrorReportingService;
  private isConfigured = false;
  private reportingUrl?: string;
  private apiKey?: string;

  private constructor() {
    this.initialize();
  }

  static getInstance(): ErrorReportingService {
    if (!ErrorReportingService.instance) {
      ErrorReportingService.instance = new ErrorReportingService();
    }
    return ErrorReportingService.instance;
  }

  private initialize() {
    this.reportingUrl = import.meta.env.VITE_ERROR_REPORTING_URL;
    this.apiKey = import.meta.env.VITE_ERROR_REPORTING_API_KEY;

    this.isConfigured = !!(this.reportingUrl && this.apiKey);

    if (!this.isConfigured) {
      console.log(
        "Error reporting service not configured - set VITE_ERROR_REPORTING_URL and VITE_ERROR_REPORTING_API_KEY",
      );
    }
  }

  async reportError(error: Error | string, context?: Record<string, unknown>) {
    if (!this.isConfigured) {
      return;
    }

    try {
      const errorReport: ErrorReport = {
        message: typeof error === "string" ? error : error.message,
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        ...context,
      };

      await fetch(this.reportingUrl!, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(errorReport),
      });
    } catch (reportingError) {
      // Don't log reporting errors to avoid infinite loops
      console.debug("Failed to report error:", reportingError);
    }
  }

  async reportWarning(message: string, context?: Record<string, unknown>) {
    if (!this.isConfigured) {
      return;
    }

    try {
      const warningReport: ErrorReport = {
        message: `WARNING: ${message}`,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        ...context,
      };

      await fetch(this.reportingUrl!, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(warningReport),
      });
    } catch (reportingError) {
      console.debug("Failed to report warning:", reportingError);
    }
  }

  isServiceConfigured(): boolean {
    return this.isConfigured;
  }
}

// Export singleton instance
export const errorReporting = ErrorReportingService.getInstance();

// Utility function to report errors
export const reportError = (
  error: Error | string,
  context?: Record<string, unknown>,
) => {
  errorReporting.reportError(error, context);
};

// Utility function to report warnings
export const reportWarning = (
  message: string,
  context?: Record<string, unknown>,
) => {
  errorReporting.reportWarning(message, context);
};

// Global error handler
export const setupGlobalErrorHandler = () => {
  if (typeof window === "undefined") return;

  // Handle unhandled promise rejections
  window.addEventListener("unhandledrejection", (event) => {
    reportError(new Error(`Unhandled Promise Rejection: ${event.reason}`), {
      type: "unhandledrejection",
      reason: event.reason,
    });
  });

  // Handle global errors
  window.addEventListener("error", (event) => {
    reportError(event.error || new Error(event.message), {
      type: "global",
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });
};
