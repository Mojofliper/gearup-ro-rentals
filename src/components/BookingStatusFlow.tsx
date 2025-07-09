import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Clock, AlertCircle, CheckCircle2, XCircle, CreditCard } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface BookingStatusFlowProps {
  booking: any;
  onStatusUpdate?: () => void;
  onPaymentClick?: (booking: any) => void;
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
    icon: CheckCircle,
    color: 'bg-blue-100 text-blue-800',
    badge: 'default'
  },
  pickup_confirmed: {
    label: 'Ridicare confirmată',
    description: 'Ambele părți au confirmat ridicarea, plata închirierii eliberată',
    icon: CheckCircle2,
    color: 'bg-green-100 text-green-800',
    badge: 'default'
  },
  active: {
    label: 'În curs',
    description: 'Închirierea este activă',
    icon: CheckCircle2,
    color: 'bg-green-100 text-green-800',
    badge: 'default'
  },
  return_confirmed: {
    label: 'Returnare confirmată',
    description: 'Ambele părți au confirmat returnarea, depozitul va fi returnat',
    icon: CheckCircle2,
    color: 'bg-purple-100 text-purple-800',
    badge: 'default'
  },
  completed: {
    label: 'Finalizat',
    description: 'Închirierea a fost finalizată cu succes',
    icon: CheckCircle2,
    color: 'bg-green-100 text-green-800',
    badge: 'outline'
  },
  cancelled: {
    label: 'Anulat',
    description: 'Rezervarea a fost anulată',
    icon: XCircle,
    color: 'bg-red-100 text-red-800',
    badge: 'destructive'
  }
};

export const BookingStatusFlow: React.FC<BookingStatusFlowProps> = ({
  booking,
  onStatusUpdate,
  onPaymentClick
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const isOwner = user?.id === booking.owner_id;
  const isRenter = user?.id === booking.renter_id;
  const currentStatus = booking.status;
  const config = statusConfig[currentStatus as keyof typeof statusConfig];

  // Dual confirmation states
  const pickupConfirmedByOwner = booking.pickup_confirmed_by_owner;
  const pickupConfirmedByRenter = booking.pickup_confirmed_by_renter;
  const returnConfirmedByRenter = booking.return_confirmed_by_renter;
  const returnConfirmedByOwner = booking.return_confirmed_by_owner;

  // Check if current user can confirm - ONLY if payment is completed
  const canOwnerConfirmPickup = isOwner && !pickupConfirmedByOwner && currentStatus === 'confirmed' && booking.payment_status === 'completed';
  const canRenterConfirmPickup = isRenter && !pickupConfirmedByRenter && currentStatus === 'confirmed' && booking.payment_status === 'completed';
  const canOwnerConfirmReturn = isOwner && !returnConfirmedByOwner && currentStatus === 'active';
  const canRenterConfirmReturn = isRenter && !returnConfirmedByRenter && currentStatus === 'active';

  // Check if both parties have confirmed
  const bothPickupConfirmed = pickupConfirmedByOwner && pickupConfirmedByRenter;
  const bothReturnConfirmed = returnConfirmedByOwner && returnConfirmedByRenter;

  const handlePickupConfirm = async (by: 'owner' | 'renter') => {
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
      const update: any = {};
      if (by === 'owner') {
        update.pickup_confirmed_by_owner = true;
        update.pickup_confirmed_by_owner_at = new Date().toISOString();
      } else {
        update.pickup_confirmed_by_renter = true;
        update.pickup_confirmed_by_renter_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('bookings')
        .update(update)
        .eq('id', booking.id);

      if (error) {
        toast({
          title: 'Eroare',
          description: 'Eroare la confirmarea ridicării: ' + error.message,
          variant: 'destructive',
        });
      } else {
        const role = by === 'owner' ? 'proprietar' : 'chiriaș';
        toast({
          title: 'Ridicare confirmată',
          description: `Confirmarea ${role}ului a fost înregistrată.`,
        });
        onStatusUpdate?.();
      }
    } catch (error) {
      toast({
        title: 'Eroare',
        description: 'A apărut o eroare neașteptată.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReturnConfirm = async (by: 'owner' | 'renter') => {
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
      const update: any = {};
      if (by === 'owner') {
        update.return_confirmed_by_owner = true;
        update.return_confirmed_by_owner_at = new Date().toISOString();
      } else {
        update.return_confirmed_by_renter = true;
        update.return_confirmed_by_renter_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('bookings')
        .update(update)
        .eq('id', booking.id);

      if (error) {
        toast({
          title: 'Eroare',
          description: 'Eroare la confirmarea returnării: ' + error.message,
          variant: 'destructive',
        });
      } else {
        const role = by === 'owner' ? 'proprietar' : 'chiriaș';
        toast({
          title: 'Returnare confirmată',
          description: `Confirmarea ${role}ului a fost înregistrată.`,
        });
        
        // Check if both parties have confirmed return
        const newReturnConfirmedByOwner = by === 'owner' ? true : returnConfirmedByOwner;
        const newReturnConfirmedByRenter = by === 'renter' ? true : returnConfirmedByRenter;
        
        if (newReturnConfirmedByOwner && newReturnConfirmedByRenter) {
          // Both parties confirmed return - database trigger will handle escrow release
          toast({
            title: 'Returnare confirmată',
            description: 'Ambele părți au confirmat returnarea. Plățile vor fi procesate automat.',
          });
        }
        
        onStatusUpdate?.();
      }
    } catch (error) {
      toast({
        title: 'Eroare',
        description: 'A apărut o eroare neașteptată.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusMessage = () => {
    if (currentStatus === 'confirmed') {
      if (pickupConfirmedByOwner && !pickupConfirmedByRenter) {
        return 'Așteaptă confirmarea chiriașului pentru ridicare';
      } else if (pickupConfirmedByRenter && !pickupConfirmedByOwner) {
        return 'Așteaptă confirmarea proprietarului pentru ridicare';
      } else if (!pickupConfirmedByOwner && !pickupConfirmedByRenter) {
        return 'Ambele părți trebuie să confirme ridicarea';
      }
    } else if (currentStatus === 'active') {
      if (returnConfirmedByRenter && !returnConfirmedByOwner) {
        return 'Așteaptă confirmarea proprietarului pentru returnare';
      } else if (returnConfirmedByOwner && !returnConfirmedByRenter) {
        return 'Așteaptă confirmarea chiriașului pentru returnare';
      } else if (!returnConfirmedByOwner && !returnConfirmedByRenter) {
        return 'Ambele părți trebuie să confirme returnarea';
      }
    }
    return config?.description || 'Status necunoscut';
  };

  if (!config) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Status Rezervare</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Status necunoscut: {currentStatus}</p>
        </CardContent>
      </Card>
    );
  }

  const IconComponent = config.icon;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IconComponent className="h-5 w-5" />
          Status Rezervare
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Status */}
        <div className="flex items-center justify-between">
          <div>
            <Badge variant={config.badge as any} className={config.color}>
              {config.label}
            </Badge>
            <p className="text-sm text-muted-foreground mt-1">
              {getStatusMessage()}
            </p>
          </div>
        </div>

        {/* Payment Required Section */}
        {currentStatus === 'confirmed' && booking.payment_status !== 'completed' && (
          <div className="border rounded-lg p-4 space-y-3 bg-yellow-50 border-yellow-200">
            <h4 className="font-medium text-yellow-800">Plată necesară</h4>
            <p className="text-sm text-yellow-700">
              Plata trebuie finalizată înainte de a putea confirma ridicarea echipamentului.
            </p>
            <div className="text-xs text-yellow-600 space-y-1">
              <p><strong>Fluxul corect:</strong></p>
              <p>1. Chiriașul finalizează plata (închiriere + 13% taxă platformă + depozit)</p>
              <p>2. Proprietarul setează locația de ridicare</p>
              <p>3. Ambele părți se întâlnesc și confirmă ridicarea</p>
              <p>4. După returnarea echipamentului:</p>
              <p>   • Plata închirierii → proprietarul</p>
              <p>   • Taxa platformă (13%) → platforma</p>
              <p>   • Depozitul → înapoi la chiriaș</p>
            </div>
            {isRenter && (
              <Button
                onClick={() => onPaymentClick?.(booking)}
                className="w-full bg-yellow-600 hover:bg-yellow-700"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Finalizează plata
              </Button>
            )}
            {isOwner && (
              <p className="text-sm text-yellow-600">
                Așteaptă ca chiriașul să finalizeze plata, apoi setează locația de ridicare.
              </p>
            )}
          </div>
        )}

        {/* Pickup Confirmation Section - Only show if payment is completed */}
        {currentStatus === 'confirmed' && booking.payment_status === 'completed' && (
          <>
            {/* Location Setup Reminder */}
            {isOwner && !booking.pickup_location && (
              <div className="border rounded-lg p-4 space-y-3 bg-blue-50 border-blue-200">
                <h4 className="font-medium text-blue-800">Setează locația de ridicare</h4>
                <p className="text-sm text-blue-700">
                  Plata a fost finalizată. Acum trebuie să setezi locația de ridicare înainte de confirmări.
                </p>
              </div>
            )}
            
            {/* Pickup Confirmation */}
            {booking.pickup_location && (
          <div className="border rounded-lg p-4 space-y-3">
            <h4 className="font-medium">Confirmare Ridicare</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center justify-between p-3 border rounded">
                <span className="text-sm">Proprietar</span>
                {pickupConfirmedByOwner ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <Clock className="h-5 w-5 text-yellow-600" />
                )}
              </div>
              <div className="flex items-center justify-between p-3 border rounded">
                <span className="text-sm">Chiriaș</span>
                {pickupConfirmedByRenter ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <Clock className="h-5 w-5 text-yellow-600" />
                )}
              </div>
            </div>
            
            {canOwnerConfirmPickup && (
              <Button
                onClick={() => handlePickupConfirm('owner')}
                disabled={loading}
                className="w-full"
              >
                Confirmă predarea
              </Button>
            )}
            
            {canRenterConfirmPickup && (
              <Button
                onClick={() => handlePickupConfirm('renter')}
                disabled={loading}
                className="w-full"
                variant="outline"
              >
                Confirmă ridicarea
              </Button>
            )}

            {bothPickupConfirmed && (
              <div className="text-center p-3 bg-green-50 border border-green-200 rounded">
                <CheckCircle2 className="h-5 w-5 text-green-600 mx-auto mb-1" />
                <p className="text-sm text-green-800">
                  Ambele părți au confirmat ridicarea. Echipamentul este acum în posesia chiriașului.
                </p>
              </div>
            )}
          </div>
        )}
          </>
        )}

        {/* Return Confirmation Section */}
        {currentStatus === 'active' && (
          <div className="border rounded-lg p-4 space-y-3">
            <h4 className="font-medium">Confirmare Returnare</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center justify-between p-3 border rounded">
                <span className="text-sm">Proprietar</span>
                {returnConfirmedByOwner ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <Clock className="h-5 w-5 text-yellow-600" />
                )}
              </div>
              <div className="flex items-center justify-between p-3 border rounded">
                <span className="text-sm">Chiriaș</span>
                {returnConfirmedByRenter ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <Clock className="h-5 w-5 text-yellow-600" />
                )}
              </div>
            </div>
            
            {canOwnerConfirmReturn && (
              <Button
                onClick={() => handleReturnConfirm('owner')}
                disabled={loading}
                className="w-full"
              >
                Confirmă returnarea
              </Button>
            )}
            
            {canRenterConfirmReturn && (
              <Button
                onClick={() => handleReturnConfirm('renter')}
                disabled={loading}
                className="w-full"
                variant="outline"
              >
                Confirmă returnarea
              </Button>
            )}

            {bothReturnConfirmed && (
              <div className="text-center p-3 bg-green-50 border border-green-200 rounded">
                <CheckCircle2 className="h-5 w-5 text-green-600 mx-auto mb-1" />
                <p className="text-sm text-green-800">
                  Ambele părți au confirmat returnarea. Plata închirierii va fi eliberată proprietarului și depozitul va fi returnat chiriașului.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Escrow Status */}
        {booking.rental_amount_released && (
          <div className="text-center p-3 bg-blue-50 border border-blue-200 rounded">
            <CheckCircle2 className="h-5 w-5 text-blue-600 mx-auto mb-1" />
            <p className="text-sm text-blue-800">
              Plata închirierii a fost eliberată proprietarului
            </p>
          </div>
        )}

        {booking.deposit_returned && (
          <div className="text-center p-3 bg-green-50 border border-green-200 rounded">
            <CheckCircle2 className="h-5 w-5 text-green-600 mx-auto mb-1" />
            <p className="text-sm text-green-800">
              Depozitul a fost returnat chiriașului
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 