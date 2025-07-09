import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle, 
  Shield, 
  Calendar, 
  MapPin, 
  CreditCard,
  ArrowRight,
  Home
} from 'lucide-react';
import { PaymentService } from '@/services/paymentService';
import { formatAmountForDisplay } from '@/integrations/stripe/client';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useNotifications } from '@/hooks/useNotifications';

interface PaymentSuccessData {
  booking: Record<string, unknown> | null;
  transaction: Record<string, unknown> | null;
  escrowTransaction?: Record<string, unknown> | null;
}

export const PaymentSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [paymentData, setPaymentData] = useState<PaymentSuccessData | null>(null);
  const [error, setError] = useState<string>('');
  const { notifyPaymentCompleted, notifyPaymentReceived } = useNotifications();

  const sessionId = searchParams.get('session_id');
  const bookingId = searchParams.get('booking_id');

  useEffect(() => {
    const handlePaymentSuccess = async () => {
      if (!sessionId) {
        setError('No payment session found');
        setLoading(false);
        return;
      }

      try {
        // Get booking details
        let booking = null;
        if (bookingId) {
          booking = await PaymentService.getBookingById(bookingId);
        }

        // Get transaction details
        let transaction = null;
        if (booking) {
          transaction = await PaymentService.getOrCreateTransactionForBooking(booking);
        }

        // Get escrow transaction if exists
        let escrowTransaction = null;
        if (booking) {
          try {
            escrowTransaction = await PaymentService.getEscrowTransaction(booking.id);
          } catch (error) {
            // Escrow transaction might not exist yet
            console.log('No escrow transaction found yet');
          }
        }

        // Update booking status to confirmed if payment was successful
        if (booking && booking.payment_status !== 'paid') {
          try {
            const { error: updateError } = await supabase
              .from('bookings')
              .update({
                status: 'confirmed',
                payment_status: 'paid'
              })
              .eq('id', booking.id);

            if (updateError) {
              console.error('Error updating booking status:', updateError);
            } else {
              console.log('Booking status updated to confirmed');
              // Refresh booking data
              booking = await PaymentService.getBookingById(bookingId!);
              
              // Send notifications
              try {
                if (booking) {
                  // Notify renter that payment was completed
                  await notifyPaymentCompleted(
                    booking.id,
                    booking.total_amount || 0,
                    booking.renter_id
                  );
                  
                  // Notify owner that payment was received
                  await notifyPaymentReceived(
                    booking.id,
                    booking.total_amount || 0,
                    booking.owner_id
                  );
                }
              } catch (notifError) {
                console.error('Error sending payment notifications:', notifError);
              }
            }
          } catch (error) {
            console.error('Error updating booking status:', error);
          }
        }

        setPaymentData({
          booking,
          transaction,
          escrowTransaction
        });

        toast.success('Plată procesată cu succes!');
      } catch (error: unknown) {
        console.error('Error handling payment success:', error);
        const errorMessage = error instanceof Error ? error.message : 'Eroare la procesarea plății';
        setError(errorMessage);
        toast.error('Eroare la procesarea plății');
      } finally {
        setLoading(false);
      }
    };

    handlePaymentSuccess();
  }, [sessionId, bookingId]);

  const handleViewBooking = () => {
    if (paymentData?.booking?.id) {
      navigate(`/dashboard?tab=bookings&booking=${paymentData.booking.id}`);
    } else {
      navigate('/dashboard');
    }
  };

  const handleGoHome = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Se procesează plata...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-xl text-red-600">Eroare la plată</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="space-y-3">
              <Button onClick={handleGoHome} className="w-full">
                <Home className="h-4 w-4 mr-2" />
                Înapoi la pagina principală
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!paymentData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Plată procesată</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-6">Plata a fost procesată cu succes!</p>
            <Button onClick={handleGoHome} className="w-full">
              <Home className="h-4 w-4 mr-2" />
              Înapoi la pagina principală
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { booking, transaction, escrowTransaction } = paymentData;

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Plată confirmată!</h1>
          <p className="text-gray-600">
            Plata a fost procesată cu succes și este în escrow.
          </p>
        </div>

        <div className="space-y-6">
          {/* Booking Summary */}
          {booking && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  Detalii rezervare
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Echipament</p>
                    <p className="font-medium">{(booking.gear as Record<string, unknown>)?.title as string || 'Echipament'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Perioada</p>
                    <p className="font-medium">
                      {new Date(booking.start_date as string).toLocaleDateString()} - {new Date(booking.end_date as string).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Zile</p>
                    <p className="font-medium">{booking.total_days as number} {(booking.total_days as number) === 1 ? 'zi' : 'zile'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <Badge variant={(booking.status as string) === 'pending' ? 'secondary' : 'default'}>
                      {(booking.status as string) === 'pending' ? 'În așteptare' : booking.status as string}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payment Details */}
          {transaction && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CreditCard className="h-5 w-5 mr-2" />
                  Detalii plată
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Închiriere:</span>
                    <span>{formatAmountForDisplay(transaction.rental_amount as number)}</span>
                  </div>
                  {(transaction.deposit_amount as number) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>Garanție:</span>
                      <span>{formatAmountForDisplay(transaction.deposit_amount as number)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span>Taxă platformă:</span>
                    <span>{formatAmountForDisplay(transaction.platform_fee as number)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Total plătit:</span>
                    <span>{formatAmountForDisplay(transaction.amount as number)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Escrow Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                Status escrow
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Shield className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-blue-800">Fondurile sunt în escrow</span>
                </div>
                <p className="text-sm text-blue-700">
                  Fondurile sunt protejate și vor fi eliberate automat după finalizarea închirierii. 
                  Garanția va fi returnată la finalizarea tranzacției.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Next Steps */}
          <Card>
            <CardHeader>
              <CardTitle>Următorii pași</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  <strong>1.</strong> Proprietarul va confirma rezervarea
                </p>
                <p className="text-sm text-gray-600">
                  <strong>2.</strong> Vei primi instrucțiuni pentru ridicare
                </p>
                <p className="text-sm text-gray-600">
                  <strong>3.</strong> După returnare, fondurile vor fi eliberate automat
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={handleViewBooking} className="flex-1">
              <ArrowRight className="h-4 w-4 mr-2" />
              Vezi rezervarea
            </Button>
            <Button onClick={handleGoHome} variant="outline" className="flex-1">
              <Home className="h-4 w-4 mr-2" />
              Pagina principală
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
