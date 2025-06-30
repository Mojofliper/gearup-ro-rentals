
import { supabase } from '@/integrations/supabase/client';

// Enhanced security helpers
export const secureApiCall = async <T>(
  apiCall: () => Promise<T>,
  context?: string
): Promise<T> => {
  try {
    // Check if user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('Authentication required');
    }

    // Execute the API call
    const result = await apiCall();
    
    // Log successful operation (without sensitive data)
    console.log(`Secure API call successful${context ? ` - ${context}` : ''}`);
    
    return result;
  } catch (error) {
    // Log security event
    console.error(`Secure API call failed${context ? ` - ${context}` : ''}:`, error);
    throw error;
  }
};

// Rate limiting helper
export const checkRateLimit = async (
  actionType: string,
  maxActions: number = 10,
  windowMinutes: number = 60
): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc('check_rate_limit', {
      action_type: actionType,
      max_actions: maxActions,
      window_minutes: windowMinutes
    });

    if (error) {
      console.error('Rate limit check failed:', error);
      return false;
    }

    return data;
  } catch (error) {
    console.error('Rate limit error:', error);
    return false;
  }
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
export const sanitizeUserData = (data: any): any => {
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
