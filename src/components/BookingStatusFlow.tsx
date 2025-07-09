import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  Clock, 
  Package, 
  Truck, 
  Home, 
  Shield,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatAmountForDisplay } from '@/integrations/stripe/client';
import { useNotifications } from '@/hooks/useNotifications';

interface BookingStatusFlowProps {
  booking: Record<string, unknown>;
  onStatusUpdate?: () => void;
}

const statusConfig = {
  pending: {
    label: 'În așteptare',
    description: 'Așteaptă confirmarea proprietarului',
    icon: Clock,
    color: 'bg-yellow-100 text-yellow-800',
    badge: 'secondary'
  },
  confirmed: {
    label: 'Confirmat',
    description: 'Rezervarea a fost confirmată, plata în escrow',
    icon: Shield,
    color: 'bg-blue-100 text-blue-800',
    badge: 'default'
  },
  pickup_confirmed: {
    label: 'Ridicare confirmată',
    description: 'Echipamentul a fost ridicat, suma de închiriere eliberată proprietarului',
    icon: Package,
    color: 'bg-green-100 text-green-800',
    badge: 'default'
  },
  active: {
    label: 'În curs',
    description: 'Închirierea este activă',
    icon: Truck,
    color: 'bg-purple-100 text-purple-800',
    badge: 'default'
  },
  return_confirmed: {
    label: 'Returnare confirmată',
    description: 'Echipamentul a fost returnat, așteaptă finalizare',
    icon: Home,
    color: 'bg-orange-100 text-orange-800',
    badge: 'default'
  },
  completed: {
    label: 'Finalizat',
    description: 'Închirierea a fost finalizată, garanția returnată',
    icon: CheckCircle,
    color: 'bg-green-100 text-green-800',
    badge: 'default'
  },
  cancelled: {
    label: 'Anulat',
    description: 'Rezervarea a fost anulată',
    icon: AlertTriangle,
    color: 'bg-red-100 text-red-800',
    badge: 'destructive'
  }
};

export const BookingStatusFlow: React.FC<BookingStatusFlowProps> = ({
  booking,
  onStatusUpdate
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const { notifyBookingConfirmed } = useNotifications();

  const isOwner = user?.id === booking.owner_id;
  const isRenter = user?.id === booking.renter_id;
  const currentStatus = booking.status as string;
  const config = statusConfig[currentStatus as keyof typeof statusConfig];

  const canConfirmPickup = isOwner && currentStatus === 'confirmed';
  const canStartRental = isRenter && currentStatus === 'pickup_confirmed';
  const canConfirmReturn = isRenter && currentStatus === 'active';
  const canCompleteRental = isOwner && currentStatus === 'return_confirmed';

  // Add dual confirmation logic
  const pickupConfirmedByOwner = booking.pickup_confirmed_by_owner as boolean;
  const pickupConfirmedByRenter = booking.pickup_confirmed_by_renter as boolean;
  const returnConfirmedByRenter = booking.return_confirmed_by_renter as boolean;
  const returnConfirmedByOwner = booking.return_confirmed_by_owner as boolean;

  const canOwnerConfirmPickup = isOwner && !pickupConfirmedByOwner && currentStatus === 'confirmed';
  const canRenterConfirmPickup = isRenter && !pickupConfirmedByRenter && currentStatus === 'confirmed';
  const canOwnerConfirmReturn = isOwner && !returnConfirmedByOwner && currentStatus === 'return_confirmed';
  const canRenterConfirmReturn = isRenter && !returnConfirmedByRenter && currentStatus === 'active';

  const bothPickupConfirmed = pickupConfirmedByOwner && pickupConfirmedByRenter;
  const bothReturnConfirmed = returnConfirmedByOwner && returnConfirmedByRenter;

  const handleStatusUpdate = async (newStatus: string) => {
    if (!user) {
      toast.error('Trebuie să fii autentificat');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: newStatus })
        .eq('id', booking.id);

      if (error) {
        console.error('Error updating booking status:', error);
        toast.error('Eroare la actualizarea statusului: ' + error.message);
      } else {
        toast.success('Status actualizat cu succes');
        onStatusUpdate?.();
      }
    } catch (error) {
      console.error('Error updating booking status:', error);
      toast.error('Eroare la actualizarea statusului');
    } finally {
      setLoading(false);
    }
  };

  const handleEscrowRelease = async (releaseType: string) => {
    if (!user) {
      toast.error('Trebuie să fii autentificat');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/escrow-release', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          booking_id: booking.id,
          release_type: releaseType,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to release escrow funds');
      }

      toast.success('Escrow eliberat cu succes');
      onStatusUpdate?.();
    } catch (error) {
      console.error('Error releasing escrow:', error);
      toast.error('Eroare la eliberarea escrow: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handlePickupConfirm = async (by: 'owner' | 'renter') => {
    setLoading(true);
    try {
      const update: Record<string, unknown> = {};
      if (by === 'owner') {
        update.pickup_confirmed_by_owner = true;
        update.pickup_confirmed_by_owner_at = new Date().toISOString();
      } else {
        update.pickup_confirmed_by_renter = true;
        update.pickup_confirmed_by_renter_at = new Date().toISOString();
      }
      const { error } = await supabase.from('bookings').update(update).eq('id', booking.id);
      if (error) {
        toast.error('Eroare la confirmarea ridicării: ' + error.message);
      } else {
        toast.success('Ridicarea a fost confirmată');
        // Notify both parties
        await notifyBookingConfirmed(booking.id as string, booking.gear_title as string, booking.owner_id as string);
        await notifyBookingConfirmed(booking.id as string, booking.gear_title as string, booking.renter_id as string);
        onStatusUpdate?.();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReturnConfirm = async (by: 'owner' | 'renter') => {
    setLoading(true);
    try {
      const update: Record<string, unknown> = {};
      if (by === 'owner') {
        update.return_confirmed_by_owner = true;
        update.return_confirmed_by_owner_at = new Date().toISOString();
      } else {
        update.return_confirmed_by_renter = true;
        update.return_confirmed_by_renter_at = new Date().toISOString();
      }
      const { error } = await supabase.from('bookings').update(update).eq('id', booking.id);
      if (error) {
        toast.error('Eroare la confirmarea returnării: ' + error.message);
      } else {
        toast.success('Returnarea a fost confirmată');
        // Notify both parties
        await notifyBookingConfirmed(booking.id as string, booking.gear_title as string, booking.owner_id as string);
        await notifyBookingConfirmed(booking.id as string, booking.gear_title as string, booking.renter_id as string);
        onStatusUpdate?.();
      }
    } finally {
      setLoading(false);
    }
  };

  if (!config) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Status rezervare</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Status necunoscut: {currentStatus}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const StatusIcon = config.icon;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <StatusIcon className="h-5 w-5" />
          Status rezervare
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Status */}
        <div className="flex items-center justify-between">
          <div>
            <Badge variant={config.badge as string} className={config.color}>
              {config.label}
            </Badge>
            <p className="text-sm text-muted-foreground mt-1">
              {config.description}
            </p>
          </div>
        </div>

        {/* Escrow Status */}
        {booking.payment_status === 'paid' && (
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-blue-800">Status escrow</span>
            </div>
            <div className="space-y-1 text-sm text-blue-700">
              <div className="flex justify-between">
                <span>Suma închiriere:</span>
                <span>{formatAmountForDisplay(booking.total_amount as number)}</span>
              </div>
              <div className="flex justify-between">
                <span>Garanție:</span>
                <span>{formatAmountForDisplay(booking.deposit_amount as number)}</span>
              </div>
              {booking.rental_amount_released && (
                <div className="flex justify-between text-green-700">
                  <span>✓ Suma închiriere eliberată</span>
                  <span>{booking.pickup_confirmed_at ? new Date(booking.pickup_confirmed_at as string).toLocaleDateString() : ''}</span>
                </div>
              )}
              {booking.deposit_returned && (
                <div className="flex justify-between text-green-700">
                  <span>✓ Garanție returnată</span>
                  <span>{booking.escrow_release_date ? new Date(booking.escrow_release_date as string).toLocaleDateString() : ''}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2">
          {canOwnerConfirmPickup && (
            <Button onClick={() => handlePickupConfirm('owner')} disabled={loading} className="w-full">
              {loading ? <Loader2 className="animate-spin mr-2" /> : <Package className="mr-2" />}
              Proprietar: Confirmă predarea echipamentului
            </Button>
          )}
          {canRenterConfirmPickup && (
            <Button onClick={() => handlePickupConfirm('renter')} disabled={loading} className="w-full">
              {loading ? <Loader2 className="animate-spin mr-2" /> : <Package className="mr-2" />}
              Chiriaș: Confirmă primirea echipamentului
            </Button>
          )}
          {currentStatus === 'confirmed' && (pickupConfirmedByOwner || pickupConfirmedByRenter) && !bothPickupConfirmed && (
            <Alert className="bg-yellow-50 border-yellow-200">
              <AlertDescription>
                Așteaptă ca cealaltă parte să confirme ridicarea.
              </AlertDescription>
            </Alert>
          )}
          {bothPickupConfirmed && currentStatus === 'confirmed' && (
            <Button onClick={() => handleStatusUpdate('active')} disabled={loading} className="w-full">
              {loading ? <Loader2 className="animate-spin mr-2" /> : <Truck className="mr-2" />}
              Începe închirierea (ambele părți au confirmat)
            </Button>
          )}

          {canRenterConfirmReturn && (
            <Button onClick={() => handleReturnConfirm('renter')} disabled={loading} className="w-full">
              {loading ? <Loader2 className="animate-spin mr-2" /> : <Home className="mr-2" />}
              Chiriaș: Confirmă returnarea echipamentului
            </Button>
          )}
          {canOwnerConfirmReturn && (
            <Button onClick={() => handleReturnConfirm('owner')} disabled={loading} className="w-full">
              {loading ? <Loader2 className="animate-spin mr-2" /> : <Home className="mr-2" />}
              Proprietar: Confirmă primirea echipamentului
            </Button>
          )}
          {currentStatus === 'return_confirmed' && (returnConfirmedByOwner || returnConfirmedByRenter) && !bothReturnConfirmed && (
            <Alert className="bg-yellow-50 border-yellow-200">
              <AlertDescription>
                Așteaptă ca cealaltă parte să confirme returnarea.
              </AlertDescription>
            </Alert>
          )}
          {bothReturnConfirmed && currentStatus === 'return_confirmed' && (
            <Button onClick={() => handleStatusUpdate('completed')} disabled={loading} className="w-full">
              {loading ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle className="mr-2" />}
              Finalizează închirierea (ambele părți au confirmat)
            </Button>
          )}
        </div>

        {/* Status Flow Explanation */}
        <div className="text-xs text-muted-foreground">
          <p className="font-medium mb-1">Fluxul escrow:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Plata → Fondurile sunt în escrow</li>
            <li>Ridicare confirmată → Suma închiriere eliberată proprietarului</li>
            <li>Returnare confirmată → Garanția rămâne în escrow</li>
            <li>Finalizare → Garanția returnată chiriașului</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}; 