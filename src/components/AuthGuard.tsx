
import React from 'react';
import { useSecureAuth } from '@/hooks/useSecureAuth';
import { LoadingScreen } from './LoadingScreen';
import { AuthModal } from './AuthModal';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children, fallback }) => {
  const { isAuthenticated, loading } = useSecureAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return fallback || <AuthModal />;
  }

  return <>{children}</>;
};
