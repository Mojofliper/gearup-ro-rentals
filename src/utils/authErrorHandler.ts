import { supabase } from '@/integrations/supabase/client';

// Industry-standard auth error handling patterns
export class AuthErrorHandler {
  private static instance: AuthErrorHandler;
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (value: unknown) => void;
    reject: (reason?: unknown) => void;
  }> = [];

  private constructor() {}

  static getInstance(): AuthErrorHandler {
    if (!AuthErrorHandler.instance) {
      AuthErrorHandler.instance = new AuthErrorHandler();
    }
    return AuthErrorHandler.instance;
  }

  // Check if error is auth-related
  isAuthError(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;
    
    const errorObj = error as Record<string, unknown>;
    
    // Check for common auth error patterns
    if (errorObj.message && typeof errorObj.message === 'string') {
      const message = errorObj.message.toLowerCase();
      return message.includes('401') || 
             message.includes('403') || 
             message.includes('unauthorized') || 
             message.includes('forbidden') ||
             message.includes('jwt') ||
             message.includes('token') ||
             message.includes('session');
    }
    
    // Check for status codes
    if (errorObj.status && typeof errorObj.status === 'number') {
      return errorObj.status === 401 || errorObj.status === 403;
    }
    
    return false;
  }

  // Handle auth errors with automatic token refresh
  async handleAuthError(error: unknown): Promise<boolean> {
    if (!this.isAuthError(error)) {
      return false;
    }

    console.log('AuthErrorHandler: Handling auth error:', error);

    // If already refreshing, queue this request
    if (this.isRefreshing) {
      return new Promise((resolve, reject) => {
        this.failedQueue.push({ resolve, reject });
      });
    }

    this.isRefreshing = true;

    try {
      // Try to refresh the session
      const { data, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError) {
        console.error('AuthErrorHandler: Session refresh failed:', refreshError);
        // Clear session and redirect to login
        await this.clearSession();
        return false;
      }

      if (data.session) {
        console.log('AuthErrorHandler: Session refreshed successfully');
        // Process queued requests
        this.processQueue(null, data.session);
        return true;
      } else {
        console.log('AuthErrorHandler: No session after refresh');
        await this.clearSession();
        return false;
      }
    } catch (refreshError) {
      console.error('AuthErrorHandler: Exception during session refresh:', refreshError);
      this.processQueue(refreshError, null);
      await this.clearSession();
      return false;
    } finally {
      this.isRefreshing = false;
    }
  }

  // Clear session and redirect to login
  private async clearSession(): Promise<void> {
    try {
      await supabase.auth.signOut();
      // Clear any cached data
      localStorage.removeItem('supabase.auth.token');
      sessionStorage.clear();
      
      // Redirect to home page (login will be handled by auth guard)
      if (window.location.pathname !== '/') {
        window.location.href = '/';
      }
    } catch (error) {
      console.error('AuthErrorHandler: Error clearing session:', error);
    }
  }

  // Process queued requests
  private processQueue(error: unknown, session: unknown): void {
    this.failedQueue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error);
      } else {
        resolve(session);
      }
    });
    
    this.failedQueue = [];
  }

  // Check if user is authenticated
  async isAuthenticated(): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return !!session?.user;
    } catch (error) {
      console.error('AuthErrorHandler: Error checking authentication:', error);
      return false;
    }
  }

  // Get current session
  async getCurrentSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      return session;
    } catch (error) {
      console.error('AuthErrorHandler: Error getting session:', error);
      return null;
    }
  }

  // Utility function to wrap API calls with auth error handling
  async withAuthErrorHandling<T>(apiCall: () => Promise<T>): Promise<T> {
    try {
      return await apiCall();
    } catch (error) {
      if (this.isAuthError(error)) {
        const refreshed = await this.handleAuthError(error);
        if (refreshed) {
          // Retry the original call once after successful refresh
          return await apiCall();
        }
      }
      throw error;
    }
  }
}

// Export singleton instance
export const authErrorHandler = AuthErrorHandler.getInstance();

// Utility function to wrap API calls with auth error handling
export const withAuthErrorHandling = async <T>(
  apiCall: () => Promise<T>
): Promise<T> => {
  try {
    return await apiCall();
  } catch (error) {
    if (authErrorHandler.isAuthError(error)) {
      const refreshed = await authErrorHandler.handleAuthError(error);
      if (refreshed) {
        // Retry the original call once after successful refresh
        return await apiCall();
      }
    }
    throw error;
  }
};

// Add the method to the AuthErrorHandler class
AuthErrorHandler.prototype.withAuthErrorHandling = withAuthErrorHandling;

// React Query error handler for auth errors
export const handleQueryError = (error: unknown): void => {
  if (authErrorHandler.isAuthError(error)) {
    // Don't throw here, let React Query handle the error state
    // The auth error handler will handle the session refresh
    authErrorHandler.handleAuthError(error).catch(console.error);
  }
}; 