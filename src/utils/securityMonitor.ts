interface SecurityEvent {
  type: 'auth_failure' | 'rate_limit_exceeded' | 'suspicious_input' | 'session_expired';
  userId?: string;
  details: Record<string, any>;
  timestamp: Date;
}

class SecurityMonitor {
  private events: SecurityEvent[] = [];
  private maxEvents = 1000;

  logEvent(event: Omit<SecurityEvent, 'timestamp'>) {
    const securityEvent: SecurityEvent = {
      ...event,
      timestamp: new Date()
    };

    this.events.push(securityEvent);
    
    // Keep only the last maxEvents
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.warn('Security Event:', securityEvent);
    }

    // Check for patterns that might indicate an attack
    this.detectSuspiciousActivity();
  }

  private detectSuspiciousActivity() {
    const recentEvents = this.events.filter(
      event => Date.now() - event.timestamp.getTime() < 300000 // Last 5 minutes
    );

    // Check for multiple auth failures
    const authFailures = recentEvents.filter(e => e.type === 'auth_failure');
    if (authFailures.length > 5) {
      console.warn('Multiple authentication failures detected');
    }

    // Check for rate limit violations
    const rateLimitEvents = recentEvents.filter(e => e.type === 'rate_limit_exceeded');
    if (rateLimitEvents.length > 3) {
      console.warn('Multiple rate limit violations detected');
    }
  }

  getRecentEvents(minutes: number = 30): SecurityEvent[] {
    const cutoff = Date.now() - (minutes * 60 * 1000);
    return this.events.filter(event => event.timestamp.getTime() > cutoff);
  }

  clearEvents() {
    this.events = [];
  }
}

export const securityMonitor = new SecurityMonitor();

// Helper functions for common security events
export const logAuthFailure = (email: string, reason: string) => {
  securityMonitor.logEvent({
    type: 'auth_failure',
    details: { email, reason }
  });
};

export const logRateLimitExceeded = (userId: string, action: string) => {
  securityMonitor.logEvent({
    type: 'rate_limit_exceeded',
    userId,
    details: { action }
  });
};

export const logSuspiciousInput = (userId: string, input: string, reason: string) => {
  securityMonitor.logEvent({
    type: 'suspicious_input',
    userId,
    details: { input: input.substring(0, 100), reason } // Limit logged input length
  });
};

export const logSessionExpired = (userId: string) => {
  securityMonitor.logEvent({
    type: 'session_expired',
    userId,
    details: {}
  });
};
