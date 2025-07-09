import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { authErrorHandler } from '@/utils/authErrorHandler';

// Industry-standard auth-aware query hook
export function useAuthQuery<TData, TError = unknown>(
  queryKey: readonly unknown[],
  queryFn: () => Promise<TData>,
  options?: Omit<UseQueryOptions<TData, TError, TData, readonly unknown[]>, 'queryKey' | 'queryFn'>
): UseQueryResult<TData, TError> {
  const { user } = useAuth();

  return useQuery({
    queryKey,
    queryFn: async () => {
      // Check if user is authenticated before making the request
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Wrap the API call with auth error handling
      return await authErrorHandler.withAuthErrorHandling(queryFn);
    },
    enabled: !!user && (options?.enabled !== false),
    retry: (failureCount, error) => {
      // Don't retry on auth errors - let the auth handler deal with them
      if (authErrorHandler.isAuthError(error)) {
        return false;
      }
      
      // Default retry logic - 3 attempts
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => {
      // Exponential backoff with jitter
      const baseDelay = Math.min(1000 * 2 ** attemptIndex, 30000);
      const jitter = Math.random() * 0.1 * baseDelay;
      return baseDelay + jitter;
    },
    staleTime: options?.staleTime ?? 5 * 60 * 1000, // 5 minutes default
    gcTime: options?.gcTime ?? 10 * 60 * 1000, // 10 minutes default
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    ...options,
  });
}

// Auth-aware mutation hook
export function useAuthMutation<TData, TError = unknown, TVariables = unknown>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: Omit<UseQueryOptions<TData, TError, TData, readonly unknown[]>, 'queryKey' | 'queryFn'>
) {
  const { user } = useAuth();

  return {
    mutate: async (variables: TVariables) => {
      if (!user) {
        throw new Error('User not authenticated');
      }

      try {
        return await authErrorHandler.withAuthErrorHandling(() => mutationFn(variables));
      } catch (error) {
        if (authErrorHandler.isAuthError(error)) {
          // Auth error handler will handle the session refresh
          authErrorHandler.handleAuthError(error).catch(console.error);
        }
        throw error;
      }
    },
    isLoading: false, // You can implement loading state if needed
  };
}

// Utility hook for checking auth status
export function useAuthStatus() {
  const { user, loading } = useAuth();
  
  return {
    isAuthenticated: !!user,
    isLoading: loading,
    user,
  };
}

// Utility hook for conditional queries (only run when authenticated)
export function useConditionalAuthQuery<TData, TError = unknown>(
  queryKey: readonly unknown[],
  queryFn: () => Promise<TData>,
  options?: Omit<UseQueryOptions<TData, TError, TData, readonly unknown[]>, 'queryKey' | 'queryFn'>
): UseQueryResult<TData, TError> {
  const { isAuthenticated } = useAuthStatus();

  return useAuthQuery(queryKey, queryFn, {
    ...options,
    enabled: isAuthenticated && (options?.enabled !== false),
  });
} 