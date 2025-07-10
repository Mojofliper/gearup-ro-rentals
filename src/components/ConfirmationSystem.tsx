import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { CheckCircle, Clock, AlertCircle, Handshake, Package } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

interface ConfirmationSystemProps {
  booking: Record<string, unknown>;
  onStatusUpdate?: () => void;
}

interface ConfirmationStatus {
  ownerConfirmed: boolean;
  renterConfirmed: boolean;
  bothConfirmed: boolean;
}

export const ConfirmationSystem: React.FC<ConfirmationSystemProps> = ({
  booking,
  onStatusUpdate
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [confirmationStatus, setConfirmationStatus] = useState<ConfirmationStatus>({
    ownerConfirmed: false,
    renterConfirmed: false,
    bothConfirmed: false
  });

  const bookingId = booking.id as string;
  const status = booking.status as string;
  const isOwner = user?.id === booking.owner_id;
  const isRenter = user?.id === booking.renter_id;

  useEffect(() => {
    const checkConfirmationStatus = () => {
      const ownerConfirmed = booking.pickup_confirmed_by_owner as boolean || false;
      const renterConfirmed = booking.pickup_confirmed_by_renter as boolean || false;
      const bothConfirmed = ownerConfirmed && renterConfirmed;

      setConfirmationStatus({
        ownerConfirmed,
        renterConfirmed,
        bothConfirmed
      });
    };

    checkConfirmationStatus();
  }, [booking]);

  const handleConfirmation = async (role: 'owner' | 'renter') => {
    if (!user) {
      toast({
        title: 'Eroare',
        description: 'Trebuie să fii autentificat',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const updateData: Record<string, unknown> = {};
      
      if (role === 'owner') {
        updateData.pickup_confirmed_by_owner = true;
        updateData.pickup_confirmed_by_owner_at = new Date().toISOString();
      } else {
        updateData.pickup_confirmed_by_renter = true;
        updateData.pickup_confirmed_by_renter_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', bookingId);

      if (error) {
        toast({
          title: 'Eroare',
          description: 'Eroare la confirmare: ' + error.message,
          variant: 'destructive',
        });
      } else {
        const roleName = role === 'owner' ? 'proprietar' : 'chiriaș';
        toast({
          title: 'Confirmare reușită',
          description: `Confirmarea ${roleName}ului a fost înregistrată.`,
        });
        
        // Update local state
        setConfirmationStatus(prev => ({
          ...prev,
          [role === 'owner' ? 'ownerConfirmed' : 'renterConfirmed']: true,
          bothConfirmed: role === 'owner' ? prev.renterConfirmed : prev.ownerConfirmed
        }));

        onStatusUpdate?.();
        queryClient.invalidateQueries({ queryKey: ['bookings', bookingId] });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'A apărut o eroare neașteptată';
      toast({
        title: 'Eroare',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = () => {
    if (status === 'confirmed') {
      return {
        title: 'Confirmare Predare/Ridicare',
        description: 'Ambele părți trebuie să confirme că echipamentul a fost predat și ridicat.',
        icon: Handshake,
        color: 'bg-blue-50 border-blue-200'
      };
    } else if (status === 'active') {
      return {
        title: 'Confirmare Returnare',
        description: 'Ambele părți trebuie să confirme că echipamentul a fost returnat și primit.',
        icon: Package,
        color: 'bg-green-50 border-green-200'
      };
    }
    return {
      title: 'Status Necunoscut',
      description: 'Status necunoscut pentru confirmare.',
      icon: AlertCircle,
      color: 'bg-gray-50 border-gray-200'
    };
  };

  const statusInfo = getStatusInfo();
  const IconComponent = statusInfo.icon;

  const canConfirm = (role: 'owner' | 'renter') => {
    if (role === 'owner' && !isOwner) return false;
    if (role === 'renter' && !isRenter) return false;
    
    if (role === 'owner') {
      return !confirmationStatus.ownerConfirmed;
    } else {
      return !confirmationStatus.renterConfirmed;
    }
  };

  const getConfirmationText = (role: 'owner' | 'renter') => {
    const isConfirmed = role === 'owner' ? confirmationStatus.ownerConfirmed : confirmationStatus.renterConfirmed;
    
    if (isConfirmed) {
      return (
        <div className="flex items-center gap-1 text-green-600">
          <CheckCircle className="h-4 w-4" />
          <span className="text-xs">Confirmat</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center gap-1 text-yellow-600">
          <Clock className="h-4 w-4" />
          <span className="text-xs">În așteptare</span>
        </div>
      );
    }
  };

  return (
    <Card className={`border ${statusInfo.color}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IconComponent className="h-5 w-5" />
          {statusInfo.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600">
          {statusInfo.description}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex items-center justify-between p-3 border rounded bg-white">
            <span className="text-sm font-medium">Proprietar</span>
            {getConfirmationText('owner')}
          </div>
          <div className="flex items-center justify-between p-3 border rounded bg-white">
            <span className="text-sm font-medium">Chiriaș</span>
            {getConfirmationText('renter')}
          </div>
        </div>

        {canConfirm('owner') && (
          <Button
            onClick={() => handleConfirmation('owner')}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            <Handshake className="h-4 w-4 mr-2" />
            Confirmă predarea echipamentului
          </Button>
        )}

        {canConfirm('renter') && (
          <Button
            onClick={() => handleConfirmation('renter')}
            disabled={loading}
            className="w-full"
            variant="outline"
          >
            <Package className="h-4 w-4 mr-2" />
            Confirmă ridicarea echipamentului
          </Button>
        )}

        {confirmationStatus.bothConfirmed && (
          <div className="text-center p-3 bg-green-50 border border-green-200 rounded">
            <CheckCircle className="h-5 w-5 text-green-600 mx-auto mb-1" />
            <p className="text-sm text-green-800 font-medium">
              Confirmare completă!
            </p>
            <p className="text-xs text-green-700">
              Ambele părți au confirmat. Procesul poate continua.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 
