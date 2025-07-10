import React from 'react';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, CheckCircle, XCircle, Eye, User, Building } from 'lucide-react';

interface ClaimStatusBadgeProps {
  status: string;
  claim?: any;
  booking?: any;
  currentUserId?: string;
  className?: string;
}

export const ClaimStatusBadge: React.FC<ClaimStatusBadgeProps> = ({ 
  status, 
  claim, 
  booking, 
  currentUserId,
  className = '' 
}) => {
  const getClaimantType = () => {
    if (!claim || !booking) return null;
    
    if (claim.claimant_id === booking.renter_id) {
      return 'renter';
    } else if (claim.claimant_id === booking.owner_id) {
      return 'owner';
    }
    return null;
  };

  const getStatusConfig = (status: string) => {
    const claimantType = getClaimantType();
    const isCurrentUserClaim = currentUserId && claim?.claimant_id === currentUserId;
    
    switch (status) {
      case 'pending':
        return {
          label: claimantType === 'renter' 
            ? (isCurrentUserClaim ? 'Revendicare ta în așteptare' : 'Revendicare chiriaș în așteptare')
            : (isCurrentUserClaim ? 'Revendicare ta în așteptare' : 'Revendicare proprietar în așteptare'),
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: Clock
        };
      case 'under_review':
        return {
          label: claimantType === 'renter'
            ? (isCurrentUserClaim ? 'Revendicare ta în revizuire' : 'Revendicare chiriaș în revizuire')
            : (isCurrentUserClaim ? 'Revendicare ta în revizuire' : 'Revendicare proprietar în revizuire'),
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: Eye
        };
      case 'approved':
        return {
          label: claimantType === 'renter'
            ? (isCurrentUserClaim ? 'Revendicare ta aprobată' : 'Revendicare chiriaș aprobată')
            : (isCurrentUserClaim ? 'Revendicare ta aprobată' : 'Revendicare proprietar aprobată'),
          // Green for the claimant (winner), red for the other party (loser)
          color: isCurrentUserClaim 
            ? 'bg-green-100 text-green-800 border-green-200'
            : 'bg-red-100 text-red-800 border-red-200',
          icon: isCurrentUserClaim ? CheckCircle : XCircle
        };
      case 'rejected':
        return {
          label: claimantType === 'renter'
            ? (isCurrentUserClaim ? 'Revendicare ta respinsă' : 'Revendicare chiriaș respinsă')
            : (isCurrentUserClaim ? 'Revendicare ta respinsă' : 'Revendicare proprietar respinsă'),
          // Red for the claimant (loser), green for the other party (winner)
          color: isCurrentUserClaim 
            ? 'bg-red-100 text-red-800 border-red-200'
            : 'bg-green-100 text-green-800 border-green-200',
          icon: isCurrentUserClaim ? XCircle : CheckCircle
        };
      default:
        return {
          label: 'Status necunoscut',
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: AlertTriangle
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;
  const claimantType = getClaimantType();
  const ClaimantIcon = claimantType === 'renter' ? User : Building;

  return (
    <Badge variant="outline" className={`${config.color} ${className} flex items-center gap-1 text-xs`}>
      <Icon className="h-3 w-3" />
      <ClaimantIcon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}; 