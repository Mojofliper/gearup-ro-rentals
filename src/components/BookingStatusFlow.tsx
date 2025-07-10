import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAcceptBooking, useConfirmReturn, useCompleteRental } from '@/hooks/useBookings';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

interface BookingStatusFlowProps {
  booking: {
    id: string;
    status: string;
    start_date: string;
    end_date: string;
    total_amount: number;
  };
  onStatusUpdate: () => void;
  userRole: 'owner' | 'renter';
}

export const BookingStatusFlow: React.FC<BookingStatusFlowProps> = ({
  booking,
  onStatusUpdate,
  userRole
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const acceptBooking = useAcceptBooking();
  const confirmReturn = useConfirmReturn();
  const completeRental = useCompleteRental();

  const status = booking.status;
  const startDate = booking.start_date;
  const endDate = booking.end_date;
  const totalAmount = booking.total_amount;

  // Status info
  const statusInfo = (() => {
    switch (status) {
      case 'pending':
        return { label: 'În așteptare', color: 'bg-yellow-100 text-yellow-800', icon: Clock, description: 'Așteaptă confirmarea proprietarului' };
      case 'confirmed':
        return { label: 'Confirmată', color: 'bg-blue-100 text-blue-800', icon: CheckCircle, description: 'Rezervarea a fost confirmată' };
      case 'active':
        return { label: 'Activă', color: 'bg-green-100 text-green-800', icon: CheckCircle, description: 'Închirierea este în curs' };
      case 'completed':
        return { label: 'Finalizată', color: 'bg-gray-100 text-gray-800', icon: CheckCircle, description: 'Închirierea a fost finalizată' };
      case 'cancelled':
        return { label: 'Anulată', color: 'bg-red-100 text-red-800', icon: XCircle, description: 'Rezervarea a fost anulată' };
      default:
        return { label: 'Necunoscut', color: 'bg-gray-100 text-gray-800', icon: AlertCircle, description: 'Status necunoscut' };
    }
  })();

  // Action handlers
  const handleConfirmPickup = async () => {
    setIsLoading(true);
    try {
      await acceptBooking.mutateAsync({ bookingId: booking.id });
      toast({ title: 'Ridicare confirmată', description: 'Ai confirmat predarea echipamentului.' });
      onStatusUpdate();
    } catch (error) {
      toast({ title: 'Eroare', description: 'Nu s-a putut confirma ridicarea.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmReturn = async () => {
    setIsLoading(true);
    try {
      await confirmReturn.mutateAsync({ bookingId: booking.id });
      toast({ title: 'Returnare confirmată', description: 'Ai confirmat returnarea echipamentului.' });
      onStatusUpdate();
    } catch (error) {
      toast({ title: 'Eroare', description: 'Nu s-a putut confirma returnarea.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  // Render
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <statusInfo.icon className="h-5 w-5" />
          Status Rezervare
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
            <p className="text-sm text-gray-600 mt-1">{statusInfo.description}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-medium">Data început:</p>
            <p className="text-gray-600">{format(new Date(startDate), 'dd MMM yyyy')}</p>
          </div>
          <div>
            <p className="font-medium">Data sfârșit:</p>
            <p className="text-gray-600">{format(new Date(endDate), 'dd MMM yyyy')}</p>
          </div>
          <div>
            <p className="font-medium">Suma totală:</p>
            <p className="text-gray-600">{totalAmount} RON</p>
          </div>
        </div>
        {/* Dual confirmation logic */}
        {userRole === 'owner' && status === 'confirmed' && (
          <Button onClick={handleConfirmPickup} disabled={isLoading} className="mt-4">
            {isLoading ? 'Se confirmă...' : 'Confirmă ridicarea'}
          </Button>
        )}
        {userRole === 'renter' && status === 'active' && (
          <Button onClick={handleConfirmReturn} disabled={isLoading} className="mt-4">
            {isLoading ? 'Se confirmă...' : 'Confirmă returnarea'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}; 