
import { supabase } from '@/integrations/supabase/client';

// Custom error class for security-related errors
export class SecureApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'SecureApiError';
  }
}

// Enhanced security helpers
export const secureApiCall = async <T>(
  apiCall: () => Promise<T>,
  options?: {
    requireAuth?: boolean;
    rateLimit?: {
      action: string;
      maxActions: number;
      windowMinutes: number;
    };
  }
): Promise<T> => {
  try {
    // Check if user is authenticated
    if (options?.requireAuth !== false) {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new SecureApiError('Authentication required', 'AUTH_REQUIRED', 401);
      }
    }

    // Check rate limits if specified - but don't block on errors
    if (options?.rateLimit) {
      try {
        const canProceed = await checkRateLimit(
          options.rateLimit.action,
          options.rateLimit.maxActions,
          options.rateLimit.windowMinutes
        );
        
        if (!canProceed) {
          throw new SecureApiError('Rate limit exceeded', 'RATE_LIMIT_EXCEEDED', 429);
        }
      } catch (rateLimitError) {
        // Log the error but don't block the operation
        console.warn('Rate limit check failed, allowing operation to proceed:', rateLimitError);
      }
    }

    // Execute the API call
    const result = await apiCall();
    
    // Log successful operation (without sensitive data)
    console.log(`Secure API call successful${options?.rateLimit ? ` - ${options.rateLimit.action}` : ''}`);
    
    return result;
  } catch (error) {
    // Log security event
    console.error(`Secure API call failed${options?.rateLimit ? ` - ${options.rateLimit.action}` : ''}:`, error);
    throw error;
  }
};

// Rate limiting helper - with better error handling
export const checkRateLimit = async (
  actionType: string,
  maxActions: number = 10,
  windowMinutes: number = 60
): Promise<boolean> => {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn('No authenticated user for rate limit check');
      return true; // Allow operation if no user (will be caught by auth check)
    }

    // Try to call the rate limit function
    const { data, error } = await supabase.rpc('check_rate_limit', {
      action_type: actionType,
      max_actions: maxActions,
      window_minutes: windowMinutes
    });

    if (error) {
      console.error('Rate limit check failed:', error);
      return true; // Allow operation on error to prevent blocking legitimate users
    }

    return data;
  } catch (error) {
    console.error('Rate limit error:', error);
    return true; // Allow operation on error
  }
};

// Error handler for API responses
export const handleApiError = (error: unknown): string => {
  if (error instanceof SecureApiError) {
    return error.message;
  }
  
  if ((error as Error)?.message) {
    return (error as Error).message;
  }
  
  return 'An unexpected error occurred';
};

// Input sanitization
export const sanitizeInput = (input: string): string => {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, ''); // Remove event handlers
};

// Secure file upload validation
export const validateFileUpload = (file: File): { valid: boolean; error?: string } => {
  const maxSize = 5 * 1024 * 1024; // 5MB
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  
  if (file.size > maxSize) {
    return { valid: false, error: 'File size exceeds 5MB limit' };
  }
  
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed' };
  }
  
  return { valid: true };
};

// Secure data export (removes sensitive fields)
export const sanitizeUserData = (data: unknown): unknown => {
  const sensitiveFields = ['password', 'email', 'phone', 'raw_user_meta_data'];
  
  if (Array.isArray(data)) {
    return data.map(item => sanitizeUserData(item));
  }
  
  if (typeof data === 'object' && data !== null) {
    const sanitized = { ...data };
    sensitiveFields.forEach(field => {
      delete sanitized[field];
    });
    return sanitized;
  }
  
  return data;
};
