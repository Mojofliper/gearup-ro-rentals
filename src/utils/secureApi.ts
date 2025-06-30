
import { supabase } from '@/integrations/supabase/client';

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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new SecureApiError('Authentication required', 'AUTH_REQUIRED', 401);
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
    console.error('Secure API call failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      requireAuth
    });

    // Re-throw SecureApiError as-is
    if (error instanceof SecureApiError) {
      throw error;
    }

    // Handle Supabase errors
    if (error && typeof error === 'object' && 'code' in error) {
      throw new SecureApiError(
        'Database operation failed',
        error.code as string,
        400
      );
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
      case 'RATE_LIMIT_EXCEEDED':
        return 'Ai efectuat prea multe acțiuni. Te rugăm să încerci din nou mai târziu.';
      case 'VALIDATION_ERROR':
        return 'Datele introduse nu sunt valide.';
      default:
        return 'A apărut o eroare. Te rugăm să încerci din nou.';
    }
  }

  return 'A apărut o eroare neașteptată.';
};
