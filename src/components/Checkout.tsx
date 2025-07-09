import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Calendar, MapPin, CreditCard, Shield, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateBooking } from '@/hooks/useBookings';
import { PaymentService } from '@/services/paymentService';
import { useNotifications } from '@/hooks/useNotifications';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { formatAmountForDisplay, calculatePlatformFee } from '@/integrations/stripe/client';
import { supabase } from '@/integrations/supabase/client';

interface CartItem {
  id: string;
  gear: {
    id: string;
    title: string;
    price_per_day: number;
    deposit_amount: number;
    owner: {
      id: string;
      full_name: string;
      location: string;
      is_verified: boolean;
    };
  };
  selectedDates: Date[];
  notes: string;
}

interface CheckoutProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onSuccess: () => void;
}

export const Checkout: React.FC<CheckoutProps> = ({ 
  isOpen, 
  onClose, 
  cartItems, 
  onSuccess 
}) => {
  const { user, profile } = useAuth();
  const { mutate: createBooking, isPending } = useCreateBooking();
  const { notifyBookingCreated } = useNotifications();
  const [currentStep, setCurrentStep] = useState<'review' | 'payment' | 'success'>('review');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string>('');

  const calculateItemTotal = (item: CartItem) => {
    const pricePerDay = item.gear.price_per_day;
    const depositAmount = item.gear.deposit_amount;
    const rentalTotal = item.selectedDates.length * pricePerDay;
    const platformFee = calculatePlatformFee(rentalTotal);
    return rentalTotal + depositAmount + platformFee;
  };

  const calculateCartTotal = () => {
    return cartItems.reduce((total, item) => total + calculateItemTotal(item), 0);
  };

  const calculateRentalTotal = () => {
    return cartItems.reduce((total, item) => {
      const pricePerDay = item.gear.price_per_day;
      return total + (item.selectedDates.length * pricePerDay);
    }, 0);
  };

  const calculateDepositTotal = () => {
    return cartItems.reduce((total, item) => {
      const depositAmount = item.gear.deposit_amount;
      return total + depositAmount;
    }, 0);
  };

  const calculatePlatformFeeTotal = () => {
    return calculatePlatformFee(calculateRentalTotal());
  };

  const handlePayment = async () => {
    if (!user) {
      toast.error('Trebuie să fii conectat pentru a finaliza plata.');
      return;
    }

    setProcessingPayment(true);
    setPaymentError('');

    try {
      // Create bookings for all items first
      const bookingPromises = cartItems.map(async item => {
        const sortedDates = [...item.selectedDates].sort((a, b) => a.getTime() - b.getTime());
        const startDate = sortedDates[0];
        const endDate = sortedDates[sortedDates.length - 1];
        
        const totalDays = item.selectedDates.length;
        const rentalAmount = totalDays * item.gear.price_per_day;
        const depositAmount = item.gear.deposit_amount;
        const platformFee = calculatePlatformFee(rentalAmount);
        const totalAmount = rentalAmount + depositAmount + platformFee;

        // Create booking directly using Supabase to match the actual schema
        const { data: booking, error: bookingError } = await supabase
          .from('bookings')
          .insert({
          gear_id: item.gear.id,
            renter_id: user.id,
          owner_id: item.gear.owner.id,
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          total_days: totalDays,
          rental_amount: rentalAmount,
          total_amount: totalAmount,
          platform_fee: platformFee,
            deposit_amount: depositAmount,
            status: 'pending',
            notes: item.notes || null
          })
          .select()
          .single();

        if (bookingError) {
          throw new Error(`Failed to create booking for ${item.gear.title}: ${bookingError.message}`);
        }

        // Send notification to owner about new booking
        try {
          await notifyBookingCreated(
            booking.id,
            item.gear.title,
            item.gear.owner.id,
            user.id
          );
        } catch (notifError) {
          console.error('Error sending booking notification:', notifError);
        }

        return { booking, item, rentalAmount, depositAmount };
      });

      const bookingResults = await Promise.all(bookingPromises);
      
      // Process payments for each booking
      for (const result of bookingResults) {
        const { booking, item, rentalAmount, depositAmount } = result;
        
        if (booking && booking.id) {
          try {
            // Create transaction record
            const transaction = await PaymentService.getOrCreateTransactionForBooking(booking);
            
            // Defensive parameter validation
            if (!booking.id || isNaN(transaction.amount) || isNaN(transaction.rental_amount) || isNaN(transaction.deposit_amount) || isNaN(transaction.platform_fee)) {
              console.error('Invalid payment parameters:', {
                bookingId: booking.id,
                transactionId: transaction.id,
                amount: transaction.amount,
                rentalAmount: transaction.rental_amount,
                depositAmount: transaction.deposit_amount,
                platformFee: transaction.platform_fee,
              });
              toast.error('Datele pentru plată sunt invalide. Vă rugăm să reîncercați sau să contactați suportul.');
              break;
            }
            // Defensive logging
            console.log('Calling createPaymentIntent with:', {
              bookingId: booking.id,
              transactionId: transaction.id,
              amount: transaction.amount,
              rentalAmount: transaction.rental_amount,
              depositAmount: transaction.deposit_amount,
              platformFee: transaction.platform_fee,
            });

            // Create payment intent
            const paymentResult = await PaymentService.createPaymentIntent({
              bookingId: booking.id,
              transactionId: transaction.id,
              amount: transaction.amount,
              rentalAmount: transaction.rental_amount,
              depositAmount: transaction.deposit_amount,
              platformFee: transaction.platform_fee,
              metadata: {
                gear_name: item.gear.title || 'Unknown Gear'
              }
            });

            // Redirect to Stripe Checkout
            if (paymentResult.url) {
              window.location.href = paymentResult.url;
              return; // Exit early as we're redirecting
            }
          } catch (error: unknown) {
            console.error('Payment error for booking:', booking.id, error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            setPaymentError(`Eroare la plata pentru ${item.gear.title}: ${errorMessage}`);
            break;
          }
        }
      }

      // If we get here, all payments were successful
      setCurrentStep('success');

      // Clear cart
      localStorage.removeItem('gearup-cart');
      window.dispatchEvent(new Event('cartUpdated'));
      
      toast.success('Rezervările au fost create cu succes!');

      setTimeout(() => {
        onSuccess();
        onClose();
        setCurrentStep('review');
      }, 3000);

    } catch (error: unknown) {
      console.error('Payment error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Nu s-a putut procesa plata. Te rugăm să încerci din nou.';
      setPaymentError(errorMessage);
      toast.error('Eroare la plată');
    } finally {
      setProcessingPayment(false);
    }
  };

  if (currentStep === 'success') {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <div className="text-center py-8">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Rezervări create!</h2>
            <p className="text-gray-600 mb-4">
              Rezervările au fost create cu succes. Vei fi redirecționat către plata securizată.
            </p>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-green-800">
                Vei primi un email de confirmare în curând cu toate detaliile rezervărilor.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Finalizează comanda</DialogTitle>
          <DialogDescription>
            Revizuiește detaliile comenzii și finalizează plata securizată.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Order Summary */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Sumar comandă</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-12 h-12 bg-gray-200 rounded overflow-hidden flex-shrink-0">
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <Calendar className="h-6 w-6" />
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-800">{item.gear.title}</h4>
                      <p className="text-sm text-gray-600">
                        {item.selectedDates.length} {item.selectedDates.length === 1 ? 'zi' : 'zile'}
                      </p>
                      <p className="text-sm text-gray-600">
                        De la {item.gear.owner.full_name}
                      </p>
                      <div className="flex items-center space-x-1 mt-1">
                        <MapPin className="h-3 w-3 text-gray-400" />
                        <span className="text-xs text-gray-500">{item.gear.owner.location}</span>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="font-medium text-gray-800">
                        {formatAmountForDisplay(calculateItemTotal(item))}
                      </p>
                    </div>
                  </div>
                ))}

                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Total închiriere</span>
                    <span>{formatAmountForDisplay(calculateRentalTotal())}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Total garanții</span>
                    <span>{formatAmountForDisplay(calculateDepositTotal())}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Taxă platformă (13%)</span>
                    <span>{formatAmountForDisplay(calculatePlatformFeeTotal())}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total</span>
                    <span>{formatAmountForDisplay(calculateCartTotal())}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* User Info */}
            <Card>
              <CardHeader>
                <CardTitle>Informații personale</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <Label>Nume complet</Label>
                    <Input value={profile?.full_name || ''} disabled />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input value={user?.email || ''} disabled />
                  </div>
                  <div>
                    <Label>Telefon</Label>
                    <Input value="Nu specificat" disabled />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payment Section */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CreditCard className="h-5 w-5" />
                  <span>Plată securizată</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-2">Procesare plată</h4>
                  <div className="space-y-1 text-sm text-blue-700">
                    <p>• Vei fi redirecționat către Stripe Checkout</p>
                    <p>• Plăți securizate cu 3D Secure</p>
                    <p>• Fondurile sunt protejate prin escrow</p>
                    <p>• Taxă platformă: 13% din închiriere</p>
                  </div>
                </div>

                {paymentError && (
                  <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <span className="text-sm text-red-800">{paymentError}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Security Notice */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start space-x-2">
                  <Shield className="h-5 w-5 text-green-600 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-green-800">Plată securizată cu escrow</p>
                    <p className="text-green-700">
                      Toate plățile sunt procesate prin Stripe și protejate prin sistemul de escrow. 
                      Fondurile sunt eliberate automat după finalizarea închirierii.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Button */}
            <Button
              onClick={handlePayment}
              disabled={processingPayment || isPending}
              className="w-full"
              size="lg"
            >
              {processingPayment || isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Se procesează...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Plătește {formatAmountForDisplay(calculateCartTotal())}
                </>
              )}
            </Button>

            <p className="text-xs text-gray-500 text-center">
              Prin finalizarea comenzii, ești de acord cu termenii și condițiile GearUp.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 
