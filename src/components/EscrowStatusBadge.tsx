import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Shield, Lock, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';

interface EscrowStatusBadgeProps {
  status: 'pending' | 'held' | 'released' | 'refunded' | 'transfer_failed';
  size?: 'sm' | 'default' | 'lg';
  showIcon?: boolean;
}

export const EscrowStatusBadge: React.FC<EscrowStatusBadgeProps> = ({
  status,
  size = 'default',
  showIcon = true
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'pending':
        return {
          label: 'În procesare',
          variant: 'secondary' as const,
          icon: Clock,
          color: 'text-gray-600'
        };
      case 'held':
        return {
          label: 'Fonduri reținute',
          variant: 'default' as const,
          icon: Lock,
          color: 'text-blue-600'
        };
      case 'released':
        return {
          label: 'Eliberat',
          variant: 'default' as const,
          icon: CheckCircle,
          color: 'text-green-600'
        };
      case 'refunded':
        return {
          label: 'Rambursat',
          variant: 'secondary' as const,
          icon: XCircle,
          color: 'text-red-600'
        };
      case 'transfer_failed':
        return {
          label: 'Eșec transfer',
          variant: 'destructive' as const,
          icon: AlertTriangle,
          color: 'text-red-600'
        };
      default:
        return {
          label: 'Necunoscut',
          variant: 'secondary' as const,
          icon: Shield,
          color: 'text-gray-600'
        };
    }
  };

  const config = getStatusConfig();
  const IconComponent = config.icon;

  return (
    <Badge variant={config.variant} className={`${size === 'sm' ? 'text-xs px-2 py-1' : ''}`}>
      {showIcon && <IconComponent className={`h-3 w-3 mr-1 ${config.color}`} />}
      {config.label}
    </Badge>
  );
};

export default EscrowStatusBadge; 
