// Security monitoring and logging utilities

export const logSecurityEvent = (event: string, details?: any) => {
  // In production, this would send to a monitoring service
  console.warn(`[SECURITY] ${event}`, details);
  
  // For now, just log to console - in production you'd send to your monitoring service
  if (typeof window !== 'undefined') {
    try {
      // Store security events in sessionStorage for debugging
      const events = JSON.parse(sessionStorage.getItem('security_events') || '[]');
      events.push({
        timestamp: new Date().toISOString(),
        event,
        details,
        userAgent: navigator.userAgent,
        url: window.location.href
      });
      
      // Keep only last 50 events
      if (events.length > 50) {
        events.splice(0, events.length - 50);
      }
      
      sessionStorage.setItem('security_events', JSON.stringify(events));
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }
};

export const detectSuspiciousActivity = (userInput: string): boolean => {
  const suspiciousPatterns = [
    /script\s*>/i,
    /javascript:/i,
    /data:\s*text\/html/i,
    /<\s*iframe/i,
    /on\w+\s*=/i, // Event handlers like onclick, onload, etc.
    /eval\s*\(/i,
    /document\s*\.\s*write/i,
    /window\s*\.\s*location/i
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(userInput)) {
      logSecurityEvent('SUSPICIOUS_INPUT_DETECTED', {
        input: userInput.substring(0, 100), // Log first 100 chars only
        pattern: pattern.toString()
      });
      return true;
    }
  }
  
  return false;
};

export const sanitizeForDisplay = (input: string): string => {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

// Content Security Policy helpers
export const reportCSPViolation = (violationReport: any) => {
  logSecurityEvent('CSP_VIOLATION', violationReport);
};
