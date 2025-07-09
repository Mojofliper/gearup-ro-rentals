// Security monitoring and logging utilities
import { supabase } from '@/integrations/supabase/client';

export const logSecurityEvent = (event: string, details?: unknown) => {
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
export const reportCSPViolation = (violationReport: unknown) => {
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

export const isScamContent = (text: string): boolean => {
  const emailRegex = /[\w.+-]+@[\w-]+\.[\w.-]+/i;
  const phoneRegex = /\b(\+\d{1,3}[- ]?)?(\d{3}[- ]?){2}\d{4}\b/;
  return emailRegex.test(text) || phoneRegex.test(text);
};

// Security utilities for authentication and authorization

interface RateLimitEntry {
  count: number;
  firstAttempt: number;
  lastAttempt: number;
}

class AuthRateLimiter {
  private attempts: Map<string, RateLimitEntry> = new Map();
  private readonly maxAttempts = 5;
  private readonly windowMs = 15 * 60 * 1000; // 15 minutes
  private readonly lockoutMs = 30 * 60 * 1000; // 30 minutes

  isRateLimited(identifier: string): boolean {
    const now = Date.now();
    const entry = this.attempts.get(identifier);

    if (!entry) {
      return false;
    }

    // Check if still in lockout period
    if (entry.count >= this.maxAttempts && (now - entry.lastAttempt) < this.lockoutMs) {
      return true;
    }

    // Reset if window has passed
    if ((now - entry.firstAttempt) > this.windowMs) {
      this.attempts.delete(identifier);
      return false;
    }

    return entry.count >= this.maxAttempts;
  }

  recordAttempt(identifier: string): void {
    const now = Date.now();
    const entry = this.attempts.get(identifier);

    if (!entry) {
      this.attempts.set(identifier, {
        count: 1,
        firstAttempt: now,
        lastAttempt: now
      });
    } else {
      entry.count++;
      entry.lastAttempt = now;
    }

    // Clean up old entries
    this.cleanup();
  }

  resetAttempts(identifier: string): void {
    this.attempts.delete(identifier);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [identifier, entry] of this.attempts.entries()) {
      if ((now - entry.firstAttempt) > this.windowMs) {
        this.attempts.delete(identifier);
      }
    }
  }

  getRemainingTime(identifier: string): number {
    const entry = this.attempts.get(identifier);
    if (!entry || entry.count < this.maxAttempts) {
      return 0;
    }

    const timeSinceLastAttempt = Date.now() - entry.lastAttempt;
    return Math.max(0, this.lockoutMs - timeSinceLastAttempt);
  }
}

export const authRateLimiter = new AuthRateLimiter();

// Input validation functions
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < 6) {
    errors.push('Parola trebuie să aibă cel puțin 6 caractere');
  }
  
  if (password.length > 128) {
    errors.push('Parola nu poate avea mai mult de 128 de caractere');
  }
  
  // Optional: Add more password strength requirements
  if (!/[A-Z]/.test(password)) {
    errors.push('Parola trebuie să conțină cel puțin o literă mare');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Parola trebuie să conțină cel puțin o literă mică');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Parola trebuie să conțină cel puțin o cifră');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validatePhoneNumber = (phone: string): boolean => {
  if (!phone) return true; // Optional field
  const cleanPhone = phone.replace(/\s/g, '');
  return /^(\+40|0)[0-9]{9}$/.test(cleanPhone);
};

export const validateFullName = (name: string): boolean => {
  if (!name || name.trim().length < 2) return false;
  if (name.length > 100) return false;
  return /^[a-zA-ZăâîșțĂÂÎȘȚ\s]+$/.test(name);
};

export const validateLocation = (location: string): boolean => {
  if (!location || location.trim().length < 2) return false;
  if (location.length > 100) return false;
  return true;
};

// CSRF protection
export const generateCSRFToken = (): string => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

export const validateCSRFToken = (token: string, storedToken: string): boolean => {
  return token === storedToken;
};

// Session security
export const validateSession = (session: unknown): boolean => {
  if (!session || !(session as Record<string, unknown>).user || !(session as Record<string, unknown>).access_token) {
    return false;
  }
  
  // Check if token is expired
  const now = Math.floor(Date.now() / 1000);
  const sessionObj = session as Record<string, unknown>;
  if (sessionObj.expires_at && (sessionObj.expires_at as number) < now) {
    return false;
  }
  
  return true;
};

// Check if Supabase session is ready for API calls
export const isSessionReady = async (): Promise<boolean> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return validateSession(session);
  } catch (error) {
    console.error('Error checking session readiness:', error);
    return false;
  }
};

// Wait for session to be ready
export const waitForSession = async (maxWaitMs: number = 5000): Promise<boolean> => {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitMs) {
    if (await isSessionReady()) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return false;
};

// Sanitize user input
export const sanitizeInput = (input: string): string => {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .substring(0, 1000); // Limit length
};

// Generate secure random string
export const generateSecureTokenWithLength = (length: number = 32): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};
