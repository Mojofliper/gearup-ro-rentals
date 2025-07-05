import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CreditCard, Shield, CheckCircle, XCircle } from 'lucide-react';
import { useCreatePaymentIntent, useConfirmPayment } from '@/hooks/usePayments';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { 
  getStripe, 
  formatAmountForDisplay, 
  calculatePlatformFee,
  StripeError 
} from '@/integrations/stripe/client';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: any;
  onPaymentSuccess?: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  booking,
  onPaymentSuccess
}) => {
  const { user } = useAuth();
  const { mutate: createPaymentIntent, isPending: isCreatingIntent } = useCreatePaymentIntent();
  const { mutate: confirmPayment, isPending: isConfirming } = useConfirmPayment();
  
  const [stripe, setStripe] = useState<any>(null);
  const [elements, setElements] = useState<any>(null);
  const [cardElement, setCardElement] = useState<any>(null);
  const [clientSecret, setClientSecret] = useState<string>('');
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Calculate payment breakdown
  const rentalAmount = booking.total_amount || 0;
  const depositAmount = booking.deposit_amount || 0;
  const platformFee = calculatePlatformFee(rentalAmount);
  const totalAmount = rentalAmount + depositAmount + platformFee;

  useEffect(() => {
    if (isOpen) {
      initializeStripe();
    }
  }, [isOpen]);

  const initializeStripe = async () => {
    try {
      const stripeInstance = await getStripe();
      if (!stripeInstance) {
        throw new Error('Failed to load Stripe');
      }
      setStripe(stripeInstance);
    } catch (error) {
      console.error('Stripe initialization error:', error);
      setErrorMessage('Failed to initialize payment system');
    }
  };

  const handlePaymentIntentCreation = async () => {
    if (!user || !booking) return;

    try {
      setPaymentStatus('processing');
      setErrorMessage('');

      createPaymentIntent({
        bookingId: booking.id,
        amount: totalAmount,
        rentalAmount,
        depositAmount,
        platformFee,
        metadata: {
          gear_name: booking.gear?.name || 'Unknown Gear',
          owner_name: booking.owner?.full_name || 'Unknown Owner',
          renter_name: user.user_metadata?.full_name || 'Unknown Renter',
        },
      }, {
        onSuccess: (data) => {
          setClientSecret(data.clientSecret);
          setupCardElement(data.clientSecret);
        },
        onError: (error: any) => {
          console.error('Payment intent creation error:', error);
          setPaymentStatus('error');
          setErrorMessage(error.message || 'Failed to create payment intent');
        }
      });
    } catch (error) {
      console.error('Payment intent creation error:', error);
      setPaymentStatus('error');
      setErrorMessage('Failed to create payment intent');
    }
  };

  const setupCardElement = (secret: string) => {
    if (!stripe) return;

    const elementsInstance = stripe.elements({
      clientSecret: secret,
      appearance: {
        theme: 'stripe',
        variables: {
          colorPrimary: '#3b82f6',
        },
      },
    });

    setElements(elementsInstance);

    const card = elementsInstance.create('card', {
      style: {
        base: {
          fontSize: '16px',
          color: '#424770',
          '::placeholder': {
            color: '#aab7c4',
          },
        },
        invalid: {
          color: '#9e2146',
        },
      },
    });

    card.mount('#card-element');
    setCardElement(card);
  };

  const handlePaymentSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!stripe || !elements || !clientSecret) {
      setErrorMessage('Payment system not ready');
      return;
    }

    setPaymentStatus('processing');
    setErrorMessage('');

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment-success`,
        },
        redirect: 'if_required',
      });

      if (error) {
        console.error('Payment confirmation error:', error);
        setPaymentStatus('error');
        
        if (error.type === 'card_error' || error.type === 'validation_error') {
          setErrorMessage(error.message || 'Payment failed');
        } else {
          setErrorMessage('An unexpected error occurred');
        }
      } else {
        // Payment succeeded
        setPaymentStatus('success');
        
        // Confirm payment in our system
        confirmPayment(clientSecret, {
          onSuccess: () => {
            toast({
              title: 'Plată reușită!',
              description: 'Rezervarea ta a fost confirmată și plata procesată.',
            });
            onPaymentSuccess?.();
            setTimeout(() => {
              onClose();
            }, 2000);
          },
          onError: (error: any) => {
            console.error('Payment confirmation error:', error);
            setErrorMessage('Payment processed but confirmation failed');
          }
        });
      }
    } catch (error) {
      console.error('Payment submission error:', error);
      setPaymentStatus('error');
      setErrorMessage('Failed to process payment');
    }
  };

  const handleClose = () => {
    if (paymentStatus === 'processing') return;
    
    if (cardElement) {
      cardElement.destroy();
    }
    setPaymentStatus('idle');
    setErrorMessage('');
    setClientSecret('');
    setElements(null);
    setCardElement(null);
    onClose();
  };

  if (!booking) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Plată securizată</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Booking Summary */}
          <div className="p-3 bg-muted rounded-lg">
            <h3 className="font-semibold mb-2">{booking.gear?.name || 'Echipament'}</h3>
            <p className="text-sm text-muted-foreground">
              {new Date(booking.start_date).toLocaleDateString()} - {new Date(booking.end_date).toLocaleDateString()}
            </p>
          </div>

          {/* Payment Breakdown */}
          <div className="space-y-2 p-3 bg-muted rounded-lg">
            <div className="flex justify-between text-sm">
              <span>Închiriere ({booking.total_days} {booking.total_days === 1 ? 'zi' : 'zile'})</span>
              <span>{formatAmountForDisplay(rentalAmount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Taxă platformă (13%)</span>
              <span>{formatAmountForDisplay(platformFee)}</span>
            </div>
            {depositAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span>Garanție (returabilă)</span>
                <span>{formatAmountForDisplay(depositAmount)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span>{formatAmountForDisplay(totalAmount)}</span>
            </div>
          </div>

          {/* Payment Status */}
          {paymentStatus === 'success' && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Plata a fost procesată cu succes!
              </AlertDescription>
            </Alert>
          )}

          {paymentStatus === 'error' && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                {errorMessage || 'A apărut o eroare la procesarea plății'}
              </AlertDescription>
            </Alert>
          )}

          {/* Payment Form */}
          {paymentStatus === 'idle' && (
            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Detalii card
                </label>
                <div 
                  id="card-element" 
                  className="p-3 border rounded-md bg-white"
                />
              </div>

              {/* Security Notice */}
              <div className="flex items-start space-x-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <Shield className="h-4 w-4 text-blue-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-800 dark:text-blue-200">Plată securizată</p>
                  <p className="text-blue-700 dark:text-blue-300">
                    Datele tale sunt protejate prin criptare SSL și procesate de Stripe.
                  </p>
                </div>
              </div>
            </form>
          )}

          {/* Loading State */}
          {paymentStatus === 'processing' && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <span className="ml-2 text-sm text-muted-foreground">
                Se procesează plata...
              </span>
            </div>
          )}
        </div>

        <DialogFooter>
          {paymentStatus === 'idle' && (
            <>
              <Button 
                variant="outline" 
                onClick={handleClose}
                disabled={isCreatingIntent}
              >
                Anulează
              </Button>
              <Button 
                onClick={handlePaymentIntentCreation}
                disabled={isCreatingIntent || !stripe}
              >
                {isCreatingIntent ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Se pregătește...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Continuă la plată
                  </>
                )}
              </Button>
            </>
          )}
          
          {paymentStatus === 'success' && (
            <Button onClick={handleClose} className="w-full">
              Închide
            </Button>
          )}
          
          {paymentStatus === 'error' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Închide
              </Button>
              <Button onClick={handlePaymentIntentCreation}>
                Încearcă din nou
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 