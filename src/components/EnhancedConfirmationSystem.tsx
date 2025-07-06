
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Camera, Check, Clock, AlertTriangle } from 'lucide-react';
import { useUpdateBooking } from '@/hooks/useBookings';
import { toast } from '@/hooks/use-toast';
import { PhotoUploadModal } from './PhotoUploadModal';
import { useAuth } from '@/contexts/AuthContext';

interface EnhancedConfirmationSystemProps {
  booking: any;
  onUpdate?: () => void;
}

export const EnhancedConfirmationSystem: React.FC<EnhancedConfirmationSystemProps> = ({
  booking,
  onUpdate
}) => {
  const { user } = useAuth();
  const { mutate: updateBooking, isPending } = useUpdateBooking();
  const [pickupLocation, setPickupLocation] = useState(booking.pickup_location || '');
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [photoType, setPhotoType] = useState<'pickup' | 'return'>('pickup');

  const isOwner = user?.id === booking.owner_id;
  const isRenter = user?.id === booking.renter_id;

  const handleSetPickupLocation = () => {
    updateBooking({
      id: booking.id,
      updates: { 
        pickup_location: pickupLocation,
        completion_phase: 'pickup_ready'
      }
    }, {
      onSuccess: () => {
        toast({
          title: 'Locația de preluare a fost setată',
          description: 'Clientul va fi notificat și poate veni să preia echipamentul.',
        });
        onUpdate?.();
      }
    });
  };

  const handleConfirmPickup = () => {
    updateBooking({
      id: booking.id,
      updates: { 
        pickup_confirmed_at: new Date().toISOString(),
        completion_phase: 'active'
      }
    }, {
      onSuccess: () => {
        toast({
          title: 'Preluare confirmată',
          description: 'Închirierea este acum activă.',
        });
        onUpdate?.();
      }
    });
  };

  const handleConfirmReturn = () => {
    updateBooking({
      id: booking.id,
      updates: { 
        return_confirmed_at: new Date().toISOString(),
        completion_phase: 'completed',
        status: 'completed'
      }
    }, {
      onSuccess: () => {
        toast({
          title: 'Returnare confirmată',
          description: 'Închirierea a fost finalizată cu succes.',
        });
        onUpdate?.();
      }
    });
  };

  const openPhotoModal = (type: 'pickup' | 'return') => {
    setPhotoType(type);
    setPhotoModalOpen(true);
  };

  const getPhaseDisplay = () => {
    const phase = booking.completion_phase;
    const phaseConfig = {
      pending: { label: 'În așteptare', color: 'bg-gray-500', icon: Clock },
      confirmed: { label: 'Confirmat', color: 'bg-blue-500', icon: Check },
      paid: { label: 'Plătit', color: 'bg-green-500', icon: Check },
      pickup_ready: { label: 'Gata preluare', color: 'bg-purple-500', icon: MapPin },
      active: { label: 'Activ', color: 'bg-orange-500', icon: Calendar },
      return_pending: { label: 'Returnare', color: 'bg-yellow-500', icon: Clock },
      completed: { label: 'Finalizat', color: 'bg-green-600', icon: Check },
      disputed: { label: 'Disputat', color: 'bg-red-500', icon: AlertTriangle },
      cancelled: { label: 'Anulat', color: 'bg-gray-400', icon: AlertTriangle }
    };

    const config = phaseConfig[phase as keyof typeof phaseConfig] || phaseConfig.pending;
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} text-white`}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Starea rezervării</CardTitle>
          {getPhaseDisplay()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Payment completed, waiting for pickup location */}
        {booking.completion_phase === 'paid' && isOwner && (
          <div className="space-y-3">
            <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                Plata a fost primită! Setează locația de preluare.
              </p>
            </div>
            <div>
              <Label htmlFor="pickup-location">Locația de preluare</Label>
              <Input
                id="pickup-location"
                placeholder="Ex: Strada Victoriei 10, București"
                value={pickupLocation}
                onChange={(e) => setPickupLocation(e.target.value)}
                className="mt-1"
              />
            </div>
            <Button 
              onClick={handleSetPickupLocation}
              disabled={!pickupLocation.trim() || isPending}
              className="w-full"
            >
              Setează locația de preluare
            </Button>
          </div>
        )}

        {/* Pickup location set, waiting for pickup */}
        {booking.completion_phase === 'pickup_ready' && booking.pickup_location && (
          <div className="space-y-3">
            <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                Locația de preluare
              </p>
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-blue-600" />
                <span className="text-sm">{booking.pickup_location}</span>
              </div>
            </div>
            
            {isRenter && (
              <div className="space-y-2">
                <Button 
                  onClick={() => openPhotoModal('pickup')}
                  variant="outline"
                  className="w-full"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Fotografiază echipamentul la preluare
                </Button>
                <Button 
                  onClick={handleConfirmPickup}
                  disabled={isPending}
                  className="w-full"
                >
                  Confirm preluarea echipamentului
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Active rental */}
        {booking.completion_phase === 'active' && (
          <div className="space-y-3">
            <div className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
              <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                Închirierea este activă
              </p>
              <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                Perioada: {new Date(booking.start_date).toLocaleDateString()} - {new Date(booking.end_date).toLocaleDateString()}
              </p>
            </div>

            {isRenter && (
              <div className="space-y-2">
                <Button 
                  onClick={() => openPhotoModal('return')}
                  variant="outline"
                  className="w-full"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Fotografiază echipamentul la returnare
                </Button>
                <Button 
                  onClick={handleConfirmReturn}
                  disabled={isPending}
                  className="w-full"
                >
                  Confirm returnarea echipamentului
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Completed */}
        {booking.completion_phase === 'completed' && (
          <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
            <p className="text-sm font-medium text-green-800 dark:text-green-200">
              Închirierea a fost finalizată cu succes! 🎉
            </p>
            {booking.return_confirmed_at && (
              <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                Returnat la: {new Date(booking.return_confirmed_at).toLocaleString()}
              </p>
            )}
          </div>
        )}

        <PhotoUploadModal
          isOpen={photoModalOpen}
          onClose={() => setPhotoModalOpen(false)}
          bookingId={booking.id}
          photoType={photoType}
          onPhotoUploaded={(url) => {
            console.log('Photo uploaded:', url);
            // Could add photo display logic here
          }}
        />
      </CardContent>
    </Card>
  );
};
