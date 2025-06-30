
import React from 'react';
import { useSecureAuth } from '@/hooks/useSecureAuth';
import { LoadingScreen } from './LoadingScreen';
import { Navigate } from 'react-router-dom';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ 
  children, 
  fallback,
  redirectTo = '/'
}) => {
  const { isAuthenticated, loading } = useSecureAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    if (fallback) {
      return <>{fallback}</>;
    }
    
    // Redirect to home page where auth modal can be triggered
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
};
