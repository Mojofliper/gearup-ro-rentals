import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react';

interface ClaimStatusBadgeProps {
  status: string;
  className?: string;
}

export const ClaimStatusBadge: React.FC<ClaimStatusBadgeProps> = ({ status, className = '' }) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          label: 'În așteptare',
          color: 'bg-yellow-100 text-yellow-800',
          icon: Clock
        };
      case 'approved':
        return {
          label: 'Aprobat',
          color: 'bg-green-100 text-green-800',
          icon: CheckCircle
        };
      case 'rejected':
        return {
          label: 'Respins',
          color: 'bg-red-100 text-red-800',
          icon: XCircle
        };
      case 'under_review':
        return {
          label: 'În revizuire',
          color: 'bg-blue-100 text-blue-800',
          icon: Clock
        };
      default:
        return {
          label: 'Necunoscut',
          color: 'bg-gray-100 text-gray-800',
          icon: AlertCircle
        };
    }
  };

  const config = getStatusConfig(status);
  const IconComponent = config.icon;

  return (
    <Badge className={`${config.color} ${className}`}>
      <IconComponent className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  );
}; 