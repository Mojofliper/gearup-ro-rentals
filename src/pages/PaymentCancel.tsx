import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  XCircle, 
  Home, 
  ArrowLeft,
  CreditCard,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNotifications } from '@/hooks/useNotifications';

export const PaymentCancel: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get('booking_id');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { notifyBookingCancelled } = useNotifications();

  useEffect(() => {
    console.log('PaymentCancel: Component mounted, bookingId:', bookingId);
    console.log('PaymentCancel: Current URL:', window.location.href);
    
    const handlePaymentCancellation = async () => {
      if (!bookingId) {
        console.log('PaymentCancel: No booking_id in URL');
        setError('Lipsește booking_id din URL');
        return;
      }

      console.log('PaymentCancel: Attempting to cancel booking:', bookingId);

      try {
        // Update booking status to cancelled
        const { error } = await supabase
          .from('bookings')
          .update({
            status: 'cancelled',
            payment_status: 'failed', // Use allowed enum value
            cancellation_reason: 'Plata a fost anulată de utilizator'
          })
          .eq('id', bookingId);

        if (error) {
          console.error('PaymentCancel: Error updating booking status:', error, 'BookingId:', bookingId);
          toast.error('Eroare la anularea rezervării: ' + error.message);
          setError('Eroare la anularea rezervării: ' + error.message);
        } else {
          console.log('PaymentCancel: Booking status updated to cancelled for', bookingId);
          toast.success('Rezervarea a fost anulată');
          setSuccess(true);
        }
      } catch (err) {
        console.error('PaymentCancel: Error handling payment cancellation:', err, 'BookingId:', bookingId);
        setError('Eroare la anularea rezervării: ' + (err instanceof Error ? err.message : String(err)));
      }
    };

    handlePaymentCancellation();
  }, [bookingId]);

  const handleGoHome = () => {
    navigate('/');
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleRetryPayment = () => {
    // Go back to the previous page where payment was initiated
    navigate(-1);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12">
      <div className="max-w-md mx-auto px-4">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-2xl text-red-600">Plată anulată</CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-gray-600 mb-4">
                Ai anulat procesul de plată. Rezervarea ta {success ? 'a fost anulată.' : 'nu a putut fi anulată.'}
              </p>
              {error && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    {error}
                  </AlertDescription>
                </Alert>
              )}
              {!error && (
                <Alert className="border-orange-200 bg-orange-50">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-800">
                    Rezervarea va fi ștearsă automat în următoarele 30 de minute.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <div className="space-y-3">
              <Button onClick={handleRetryPayment} className="w-full">
                <CreditCard className="h-4 w-4 mr-2" />
                Încearcă din nou plata
              </Button>
              
              <Button onClick={handleGoBack} variant="outline" className="w-full">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Înapoi la rezervare
              </Button>
              
              <Button onClick={handleGoHome} variant="ghost" className="w-full">
                <Home className="h-4 w-4 mr-2" />
                Pagina principală
              </Button>
            </div>

            <div className="text-center text-sm text-gray-500">
              <p>Ai întrebări? Contactează-ne la support@gearup.ro</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}; 
