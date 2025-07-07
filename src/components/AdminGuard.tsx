import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  children: React.ReactElement;
}

export const AdminGuard: React.FC<Props> = ({ children }) => {
  const { user, profile, loading } = useAuth();

  if (loading) return null;
  if (!user || profile?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }
  return children;
}; 