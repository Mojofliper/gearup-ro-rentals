
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingScreen } from './LoadingScreen';

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
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    if (fallback) {
      return <>{fallback}</>;
    }
    
    // Redirect to home page where auth modal can be triggered
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
};
