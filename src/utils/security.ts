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

// Add additional security utilities
export const escapeHtml = (text: string): string => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

export const isValidUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    return ['http:', 'https:'].includes(urlObj.protocol);
  } catch {
    return false;
  }
};

export const sanitizeFileName = (fileName: string): string => {
  return fileName
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .substring(0, 255);
};

export const generateSecureToken = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

export const validateFileType = (file: File, allowedTypes: string[]): boolean => {
  return allowedTypes.includes(file.type);
};

export const checkFileSize = (file: File, maxSizeMB: number): boolean => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
};
