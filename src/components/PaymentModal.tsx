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
import { PaymentService } from '@/services/paymentService';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: any;
  transaction?: any;
  onPaymentSuccess?: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  booking,
  transaction,
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

  // Use transaction fields if available
  const rentalAmount = (transaction?.rental_amount ?? booking.total_amount) || 0;
  const depositAmount = (transaction?.deposit_amount ?? booking.deposit_amount) || 0;
  const platformFee = transaction?.platform_fee ?? calculatePlatformFee(rentalAmount);
  const totalAmount = transaction?.amount ?? (rentalAmount + depositAmount + platformFee);

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

  const handleCheckoutRedirect = async () => {
    if (!user || !booking) return;
    
    // If no transaction is provided, we need to create one
    let transactionToUse = transaction;
    if (!transactionToUse) {
      try {
        transactionToUse = await PaymentService.getOrCreateTransactionForBooking(booking);
      } catch (error: any) {
        console.error('Error creating transaction:', error);
        setPaymentStatus('error');
        setErrorMessage('Failed to create transaction');
        return;
      }
    }
    setPaymentStatus('processing');
    setErrorMessage('');
    createPaymentIntent({
      bookingId: booking.id,
      transactionId: transactionToUse?.id,
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
        console.log('Payment intent created successfully:', data);
        if (!data.url) {
          console.error('No URL returned from payment intent creation');
          setPaymentStatus('error');
          setErrorMessage('No payment URL received from server');
          return;
        }
        window.location.href = data.url;
      },
      onError: (error: any) => {
        console.error('Payment intent creation failed:', error);
        setPaymentStatus('error');
        setErrorMessage(error.message || 'Failed to create checkout session');
      }
    });
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
        </div>

        <DialogFooter>
          {paymentStatus === 'idle' && (
            <>
              <Button onClick={handleCheckoutRedirect} disabled={isCreatingIntent}>
                {isCreatingIntent ? <Loader2 className="animate-spin mr-2" /> : <CreditCard className="mr-2" />}
                Continuă la plată
              </Button>
              <Button 
                variant="outline" 
                onClick={handleClose}
                disabled={isCreatingIntent}
              >
                Anulează
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
              <Button onClick={handleCheckoutRedirect}>
                Încearcă din nou
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 