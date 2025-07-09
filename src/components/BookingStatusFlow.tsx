import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Clock, AlertCircle, CheckCircle2, XCircle, CreditCard, Package, Handshake, MapPin } from 'lucide-react';
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
    label: 'Predare confirmată',
    description: 'Ambele părți au confirmat predarea echipamentului',
    icon: Handshake,
    color: 'bg-green-100 text-green-800',
    badge: 'default'
  },
  active: {
    label: 'În curs',
    description: 'Închirierea este activă - echipamentul este la chiriaș',
    icon: Package,
    color: 'bg-green-100 text-green-800',
    badge: 'default'
  },
  return_confirmed: {
    label: 'Returnare confirmată',
    description: 'Ambele părți au confirmat returnarea echipamentului',
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
          description: 'Eroare la confirmarea predării: ' + error.message,
          variant: 'destructive',
        });
      } else {
        const role = by === 'owner' ? 'proprietar' : 'chiriaș';
        const action = by === 'owner' ? 'predarea' : 'ridicarea';
        toast({
          title: 'Predare confirmată',
          description: `Confirmarea ${role}ului pentru ${action} a fost înregistrată.`,
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
          description: `Confirmarea ${role}ului pentru returnare a fost înregistrată.`,
        });
        
        // Check if both parties have confirmed return
        const newReturnConfirmedByOwner = by === 'owner' ? true : returnConfirmedByOwner;
        const newReturnConfirmedByRenter = by === 'renter' ? true : returnConfirmedByRenter;
        
        if (newReturnConfirmedByOwner && newReturnConfirmedByRenter) {
          // Both parties confirmed return - database trigger will handle escrow release
          toast({
            title: 'Returnare completă',
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
        return 'Proprietarul a confirmat predarea. Așteaptă confirmarea chiriașului pentru ridicare.';
      } else if (pickupConfirmedByRenter && !pickupConfirmedByOwner) {
        return 'Chiriașul a confirmat ridicarea. Așteaptă confirmarea proprietarului pentru predare.';
      } else if (!pickupConfirmedByOwner && !pickupConfirmedByRenter) {
        return 'Ambele părți trebuie să confirme predarea/ridicarea echipamentului.';
      }
    } else if (currentStatus === 'active') {
      if (returnConfirmedByRenter && !returnConfirmedByOwner) {
        return 'Chiriașul a confirmat returnarea. Așteaptă confirmarea proprietarului pentru primire.';
      } else if (returnConfirmedByOwner && !returnConfirmedByRenter) {
        return 'Proprietarul a confirmat primirea. Așteaptă confirmarea chiriașului pentru returnare.';
      } else if (!returnConfirmedByOwner && !returnConfirmedByRenter) {
        return 'Ambele părți trebuie să confirme returnarea echipamentului.';
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
            <h4 className="font-medium text-yellow-800 flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Plată necesară
            </h4>
            <p className="text-sm text-yellow-700">
              Plata trebuie finalizată înainte de a putea confirma predarea echipamentului.
            </p>
            <div className="text-xs text-yellow-600 space-y-1">
              <p><strong>Fluxul corect:</strong></p>
              <p>1. Chiriașul finalizează plata (închiriere + 13% taxă platformă + depozit)</p>
              <p>2. Proprietarul setează locația de predare</p>
              <p>3. Ambele părți se întâlnesc și confirmă predarea/ridicarea</p>
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
                Așteaptă ca chiriașul să finalizeze plata, apoi setează locația de predare.
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
                <h4 className="font-medium text-blue-800 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Setează locația de predare
                </h4>
                <p className="text-sm text-blue-700">
                  Plata a fost finalizată. Acum trebuie să setezi locația de predare înainte de confirmări.
                </p>
              </div>
            )}
            
            {/* Pickup Confirmation */}
            {booking.pickup_location && (
          <div className="border rounded-lg p-4 space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Handshake className="h-4 w-4" />
              Confirmare Predare/Ridicare
            </h4>
            <p className="text-sm text-muted-foreground">
              Ambele părți trebuie să confirme că echipamentul a fost predat și ridicat.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center justify-between p-3 border rounded">
                <span className="text-sm font-medium">Proprietar</span>
                {pickupConfirmedByOwner ? (
                  <div className="flex items-center gap-1 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-xs">Confirmat</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-yellow-600">
                    <Clock className="h-4 w-4" />
                    <span className="text-xs">În așteptare</span>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between p-3 border rounded">
                <span className="text-sm font-medium">Chiriaș</span>
                {pickupConfirmedByRenter ? (
                  <div className="flex items-center gap-1 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-xs">Confirmat</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-yellow-600">
                    <Clock className="h-4 w-4" />
                    <span className="text-xs">În așteptare</span>
                  </div>
                )}
              </div>
            </div>
            
            {canOwnerConfirmPickup && (
              <Button
                onClick={() => handlePickupConfirm('owner')}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <Handshake className="h-4 w-4 mr-2" />
                Confirmă predarea echipamentului
              </Button>
            )}
            
            {canRenterConfirmPickup && (
              <Button
                onClick={() => handlePickupConfirm('renter')}
                disabled={loading}
                className="w-full"
                variant="outline"
              >
                <Package className="h-4 w-4 mr-2" />
                Confirmă ridicarea echipamentului
              </Button>
            )}

            {bothPickupConfirmed && (
              <div className="text-center p-3 bg-green-50 border border-green-200 rounded">
                <CheckCircle2 className="h-5 w-5 text-green-600 mx-auto mb-1" />
                <p className="text-sm text-green-800 font-medium">
                  Predare completă!
                </p>
                <p className="text-xs text-green-700">
                  Ambele părți au confirmat. Echipamentul este acum în posesia chiriașului.
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
            <h4 className="font-medium flex items-center gap-2">
              <Package className="h-4 w-4" />
              Confirmare Returnare
            </h4>
            <p className="text-sm text-muted-foreground">
              Ambele părți trebuie să confirme că echipamentul a fost returnat și primit.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center justify-between p-3 border rounded">
                <span className="text-sm font-medium">Proprietar</span>
                {returnConfirmedByOwner ? (
                  <div className="flex items-center gap-1 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-xs">Confirmat</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-yellow-600">
                    <Clock className="h-4 w-4" />
                    <span className="text-xs">În așteptare</span>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between p-3 border rounded">
                <span className="text-sm font-medium">Chiriaș</span>
                {returnConfirmedByRenter ? (
                  <div className="flex items-center gap-1 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-xs">Confirmat</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-yellow-600">
                    <Clock className="h-4 w-4" />
                    <span className="text-xs">În așteptare</span>
                  </div>
                )}
              </div>
            </div>
            
            {canOwnerConfirmReturn && (
              <Button
                onClick={() => handleReturnConfirm('owner')}
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Confirmă primirea echipamentului
              </Button>
            )}
            
            {canRenterConfirmReturn && (
              <Button
                onClick={() => handleReturnConfirm('renter')}
                disabled={loading}
                className="w-full"
                variant="outline"
              >
                <Package className="h-4 w-4 mr-2" />
                Confirmă returnarea echipamentului
              </Button>
            )}

            {bothReturnConfirmed && (
              <div className="text-center p-3 bg-green-50 border border-green-200 rounded">
                <CheckCircle2 className="h-5 w-5 text-green-600 mx-auto mb-1" />
                <p className="text-sm text-green-800 font-medium">
                  Returnare completă!
                </p>
                <p className="text-xs text-green-700">
                  Ambele părți au confirmat. Plata închirierii va fi eliberată proprietarului și depozitul va fi returnat chiriașului.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Escrow Status */}
        {booking.rental_amount_released && (
          <div className="text-center p-3 bg-blue-50 border border-blue-200 rounded">
            <CheckCircle2 className="h-5 w-5 text-blue-600 mx-auto mb-1" />
            <p className="text-sm text-blue-800 font-medium">
              Plata închirierii eliberată
            </p>
            <p className="text-xs text-blue-700">
              Plata închirierii a fost transferată către proprietar.
            </p>
          </div>
        )}

        {booking.deposit_returned && (
          <div className="text-center p-3 bg-green-50 border border-green-200 rounded">
            <CheckCircle2 className="h-5 w-5 text-green-600 mx-auto mb-1" />
            <p className="text-sm text-green-800 font-medium">
              Depozit returnat
            </p>
            <p className="text-xs text-green-700">
              Depozitul a fost returnat chiriașului.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 