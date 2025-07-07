// Error reporting service for production monitoring
// This can be integrated with Sentry, LogRocket, or similar services

export interface ErrorReport {
  message: string;
  stack?: string;
  context?: Record<string, any>;
  user?: {
    id?: string;
    email?: string;
  };
  timestamp: string;
  url: string;
  userAgent: string;
}

class ErrorReportingService {
  private isInitialized = false;
  private serviceUrl: string | null = null;
  private apiKey: string | null = null;

  constructor() {
    // Initialize with environment variables
    this.serviceUrl = import.meta.env.VITE_ERROR_REPORTING_URL || null;
    this.apiKey = import.meta.env.VITE_ERROR_REPORTING_API_KEY || null;
  }

  async initialize(): Promise<void> {
    if (this.serviceUrl && this.apiKey) {
      this.isInitialized = true;
      console.log('Error reporting service initialized');
    } else {
      console.warn('Error reporting service not configured - set VITE_ERROR_REPORTING_URL and VITE_ERROR_REPORTING_API_KEY');
    }
  }

  async captureError(
    error: Error | string,
    context?: Record<string, any>,
    user?: { id?: string; email?: string }
  ): Promise<void> {
    if (!this.isInitialized) {
      console.error('Error reporting not initialized');
      return;
    }

    try {
      const errorReport: ErrorReport = {
        message: typeof error === 'string' ? error : error.message,
        stack: typeof error === 'string' ? undefined : error.stack,
        context,
        user,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent
      };

      // Send to error reporting service
      await this.sendErrorReport(errorReport);
    } catch (reportingError) {
      console.error('Failed to send error report:', reportingError);
    }
  }

  async captureException(
    exception: Error,
    context?: Record<string, any>,
    user?: { id?: string; email?: string }
  ): Promise<void> {
    await this.captureError(exception, context, user);
  }

  async captureMessage(
    message: string,
    level: 'info' | 'warning' | 'error' = 'info',
    context?: Record<string, any>,
    user?: { id?: string; email?: string }
  ): Promise<void> {
    if (level === 'error') {
      await this.captureError(message, context, user);
    } else {
      // For info and warning, just log locally for now
      console.log(`[${level.toUpperCase()}] ${message}`, context);
    }
  }

  setUser(user: { id?: string; email?: string }): void {
    // Store user context for future error reports
    this.currentUser = user;
  }

  addBreadcrumb(
    category: string,
    message: string,
    data?: Record<string, any>
  ): void {
    // Add breadcrumb for debugging
    this.breadcrumbs.push({
      category,
      message,
      data,
      timestamp: new Date().toISOString()
    });

    // Keep only last 50 breadcrumbs
    if (this.breadcrumbs.length > 50) {
      this.breadcrumbs = this.breadcrumbs.slice(-50);
    }
  }

  private async sendErrorReport(report: ErrorReport): Promise<void> {
    if (!this.serviceUrl || !this.apiKey) {
      return;
    }

    try {
      const response = await fetch(this.serviceUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          ...report,
          breadcrumbs: this.breadcrumbs
        })
      });

      if (!response.ok) {
        throw new Error(`Error reporting failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to send error report:', error);
    }
  }

  // Fallback to console for development
  private fallbackReport(report: ErrorReport): void {
    console.group('🚨 Error Report');
    console.error('Message:', report.message);
    if (report.stack) {
      console.error('Stack:', report.stack);
    }
    if (report.context) {
      console.error('Context:', report.context);
    }
    if (report.user) {
      console.error('User:', report.user);
    }
    console.error('URL:', report.url);
    console.error('Timestamp:', report.timestamp);
    console.groupEnd();
  }

  private currentUser: { id?: string; email?: string } | null = null;
  private breadcrumbs: Array<{
    category: string;
    message: string;
    data?: Record<string, any>;
    timestamp: string;
  }> = [];
}

// Create singleton instance
export const errorReporting = new ErrorReportingService();

// Initialize on app start
errorReporting.initialize().catch(console.error);

// Export convenience functions
export const captureError = (error: Error | string, context?: Record<string, any>) => 
  errorReporting.captureError(error, context);

export const captureException = (exception: Error, context?: Record<string, any>) => 
  errorReporting.captureException(exception, context);

export const captureMessage = (message: string, level?: 'info' | 'warning' | 'error', context?: Record<string, any>) => 
  errorReporting.captureMessage(message, level, context);

export const setUser = (user: { id?: string; email?: string }) => 
  errorReporting.setUser(user);

export const addBreadcrumb = (category: string, message: string, data?: Record<string, any>) => 
  errorReporting.addBreadcrumb(category, message, data); 