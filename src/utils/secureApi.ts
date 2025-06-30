
import { supabase } from '@/integrations/supabase/client';
import { securityMonitor, logRateLimitExceeded } from './securityMonitor';

interface SecureApiOptions {
  requireAuth?: boolean;
  rateLimit?: {
    action: string;
    maxActions?: number;
    windowMinutes?: number;
  };
  sanitize?: boolean;
}

export class SecureApiError extends Error {
  constructor(
    message: string,
    public code: string = 'UNKNOWN_ERROR',
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'SecureApiError';
  }
}

const checkRateLimit = async (actionType: string, maxActions = 10, windowMinutes = 60): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc('check_rate_limit', {
      action_type: actionType,
      max_actions: maxActions,
      window_minutes: windowMinutes
    });

    if (error) {
      console.error('Rate limit check error:', error);
      return false;
    }

    return data;
  } catch (error) {
    console.error('Rate limit check failed:', error);
    return false;
  }
};

export const secureApiCall = async <T>(
  operation: () => Promise<T>,
  options: SecureApiOptions = {}
): Promise<T> => {
  const { requireAuth = true, rateLimit, sanitize = true } = options;

  try {
    // Check authentication
    if (requireAuth) {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.user) {
        throw new SecureApiError('Authentication required', 'AUTH_REQUIRED', 401);
      }

      // Check if session is still valid
      const now = new Date().getTime();
      const sessionTime = new Date(session.created_at).getTime();
      const sessionAge = now - sessionTime;
      
      // Session timeout after 24 hours
      if (sessionAge > 24 * 60 * 60 * 1000) {
        await supabase.auth.signOut();
        throw new SecureApiError('Session expired', 'SESSION_EXPIRED', 401);
      }
    }

    // Check rate limiting
    if (rateLimit) {
      const allowed = await checkRateLimit(
        rateLimit.action,
        rateLimit.maxActions,
        rateLimit.windowMinutes
      );
      
      if (!allowed) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          logRateLimitExceeded(user.id, rateLimit.action);
        }
        
        throw new SecureApiError(
          'Rate limit exceeded. Please try again later.',
          'RATE_LIMIT_EXCEEDED',
          429
        );
      }
    }

    // Execute operation
    const result = await operation();
    return result;
  } catch (error) {
    // Log error securely (without sensitive data)
    const errorInfo = {
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      requireAuth,
      code: error instanceof SecureApiError ? error.code : 'UNKNOWN'
    };
    
    console.error('Secure API call failed:', errorInfo);

    // Log security event for certain error types
    if (error instanceof SecureApiError && 
        ['AUTH_REQUIRED', 'RATE_LIMIT_EXCEEDED', 'SESSION_EXPIRED'].includes(error.code)) {
      securityMonitor.logEvent({
        type: error.code === 'AUTH_REQUIRED' ? 'auth_failure' : 
              error.code === 'RATE_LIMIT_EXCEEDED' ? 'rate_limit_exceeded' : 'session_expired',
        details: { action: rateLimit?.action || 'unknown' }
      });
    }

    // Re-throw SecureApiError as-is
    if (error instanceof SecureApiError) {
      throw error;
    }

    // Handle Supabase errors
    if (error && typeof error === 'object' && 'code' in error) {
      const supabaseError = error as any;
      
      // Handle specific Supabase error codes
      switch (supabaseError.code) {
        case '23505': // unique violation
          throw new SecureApiError('Resource already exists', 'DUPLICATE_RESOURCE', 409);
        case '23503': // foreign key violation
          throw new SecureApiError('Invalid reference', 'INVALID_REFERENCE', 400);
        case '42501': // insufficient privilege
          throw new SecureApiError('Access denied', 'ACCESS_DENIED', 403);
        default:
          throw new SecureApiError('Database operation failed', supabaseError.code, 400);
      }
    }

    // Generic error
    throw new SecureApiError('Operation failed', 'OPERATION_FAILED', 500);
  }
};

export const handleApiError = (error: unknown): string => {
  if (error instanceof SecureApiError) {
    switch (error.code) {
      case 'AUTH_REQUIRED':
        return 'Trebuie să te autentifici pentru a efectua această acțiune.';
      case 'SESSION_EXPIRED':
        return 'Sesiunea a expirat. Te rugăm să te conectezi din nou.';
      case 'RATE_LIMIT_EXCEEDED':
        return 'Ai efectuat prea multe acțiuni. Te rugăm să încerci din nou mai târziu.';
      case 'VALIDATION_ERROR':
        return 'Datele introduse nu sunt valide.';
      case 'ACCESS_DENIED':
        return 'Nu ai permisiunea să efectuezi această acțiune.';
      case 'DUPLICATE_RESOURCE':
        return 'Resursa există deja.';
      case 'INVALID_REFERENCE':
        return 'Referința specificată nu este validă.';
      default:
        return 'A apărut o eroare. Te rugăm să încerci din nou.';
    }
  }

  // Handle network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return 'Problemă de conexiune. Verifică conexiunea la internet.';
  }

  return 'A apărut o eroare neașteptată.';
};

// Helper function to validate API responses
export const validateApiResponse = (data: any, expectedFields: string[]): boolean => {
  if (!data || typeof data !== 'object') {
    return false;
  }

  return expectedFields.every(field => field in data);
};

// Helper function for secure data fetching with retry logic
export const secureDataFetch = async <T>(
  fetcher: () => Promise<T>,
  retries: number = 2,
  delay: number = 1000
): Promise<T> => {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fetcher();
    } catch (error) {
      if (attempt === retries) {
        throw error;
      }
      
      // Don't retry auth errors or rate limit errors
      if (error instanceof SecureApiError && 
          ['AUTH_REQUIRED', 'RATE_LIMIT_EXCEEDED', 'ACCESS_DENIED'].includes(error.code)) {
        throw error;
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt)));
    }
  }
  
  throw new Error('Max retries exceeded');
};
