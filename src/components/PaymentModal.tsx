import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, CreditCard, Shield, CheckCircle, XCircle, Lock, AlertTriangle, Info } from 'lucide-react';
import { useEscrowPayments } from '@/hooks/useEscrowPayments';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { 
  getStripe, 
  formatAmountForDisplay, 
  calculatePlatformFee,
  StripeError 
} from '@/integrations/stripe/client';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: {
    id: string;
    rental_amount: number;
    deposit_amount: number;
    total_amount: number;
    total_days: number;
    start_date: string;
    end_date: string;
    owner_id: string;
    gear?: {
      title: string;
    };
  };
  onPaymentSuccess?: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  booking,
  onPaymentSuccess
}) => {
  const { user } = useAuth();
  const {
    loading,
    connectedAccount,
    escrowTransaction,
    createEscrowPaymentIntent,
    getConnectedAccountStatus,
    getEscrowTransaction,
    canReceivePayments,
    needsOnboarding,
    setupStripeConnect
  } = useEscrowPayments();
  
  const [stripe, setStripe] = useState<unknown>(null);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error' | 'escrow_pending'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showOwnerSetup, setShowOwnerSetup] = useState(false);

  // Calculate amounts
  const rentalAmount = booking.rental_amount || 0;
  const depositAmount = booking.deposit_amount || 0;
  const platformFee = calculatePlatformFee(rentalAmount);
  const totalAmount = rentalAmount + depositAmount + platformFee;

  useEffect(() => {
    if (isOpen && booking) {
      initializeStripe();
      checkOwnerPaymentSetup();
      checkExistingEscrowTransaction();
    }
  }, [isOpen, booking]);

  // Handle payment cancellation when component unmounts during processing
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (paymentStatus === 'processing') {
        handlePaymentCancellation();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [paymentStatus]);

  const initializeStripe = async () => {
    try {
      const stripeInstance = await getStripe();
      if (!stripeInstance) {
        throw new Error('Failed to load Stripe');
      }
      setStripe(stripeInstance);
    } catch (error: unknown) {
      console.error('Stripe initialization error:', error);
      setErrorMessage('Failed to initialize payment system');
    }
  };

  const checkOwnerPaymentSetup = async () => {
    if (booking.owner_id && user?.id !== booking.owner_id) {
      // Only check if user is not the owner (renters checking owner setup)
      try {
        const account = await getConnectedAccountStatus();
        if (account && !account.charges_enabled) {
          setShowOwnerSetup(true);
        }
      } catch (error: unknown) {
        console.error('Error checking owner payment setup:', error);
      }
    }
  };

  const checkExistingEscrowTransaction = async () => {
    if (booking.id) {
      try {
        const transaction = await getEscrowTransaction(booking.id);
        if (transaction) {
          setPaymentStatus('escrow_pending');
        }
      } catch (error: unknown) {
        console.error('Error checking escrow transaction:', error);
      }
    }
  };

  const handleOwnerSetup = async () => {
    if (!user) {
      toast.error('You must be logged in to setup payments');
      return;
    }

    try {
      await setupStripeConnect(user.email || '', 'RO');
    } catch (error: unknown) {
      console.error('Owner setup error:', error);
      toast.error('Failed to setup payment account');
    }
  };

  const handleEscrowPayment = async () => {
    if (!user || !booking) return;

    setPaymentStatus('processing');
    setErrorMessage('');

    try {
      const result = await createEscrowPaymentIntent(
        booking.id,
        rentalAmount,
        depositAmount
      );

      if (result && result.url) {
        // Redirect to Stripe's hosted checkout page
        window.location.href = result.url;
      } else {
        throw new Error('Failed to create checkout session');
      }
    } catch (error: unknown) {
      console.error('Escrow payment error:', error);
      setPaymentStatus('error');
      setErrorMessage((error as Error).message || 'Failed to process payment');
      
      if ((error as Error).message?.includes('Owner account not ready')) {
        setShowOwnerSetup(true);
      }
    }
  };

  const handleClose = () => {
    if (paymentStatus === 'processing') return;
    
    // If payment was initiated but not completed, mark booking as cancelled
    if (paymentStatus === 'error') {
      handlePaymentCancellation();
    }
    
    setPaymentStatus('idle');
    setErrorMessage('');
    setShowOwnerSetup(false);
    onClose();
  };

  const handlePaymentCancellation = async () => {
    if (!booking?.id) return;

    try {
      // Update booking status to cancelled
      const { error } = await supabase
        .from('bookings')
        .update({
          status: 'cancelled',
          payment_status: 'failed', // Use valid enum value
          cancellation_reason: 'Payment cancelled by user'
        })
        .eq('id', booking.id);

      if (error) {
        console.error('Error updating booking status:', error);
      } else {
        console.log('Booking status updated to cancelled');
        toast.success('Rezervarea a fost anulată');
      }
    } catch (error: unknown) {
      console.error('Error handling payment cancellation:', error);
    }
  };

  if (!booking) return null;

  // Show owner setup message if owner needs to complete payment setup
  if (showOwnerSetup && user?.id === booking.owner_id) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Configurare plăți</DialogTitle>
            <DialogDescription>
              Configurați-vă contul de plată pentru a primi plăți pentru închirierea echipamentului.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Pentru a primi plăți pentru închirierea echipamentului, trebuie să vă configurați contul de plată.
              </AlertDescription>
            </Alert>

            <div className="p-3 bg-muted rounded-lg">
              <h3 className="font-semibold mb-2">Procesul de configurare:</h3>
              <ul className="text-sm space-y-1">
                <li>• Verificare identitate</li>
                <li>• Configurare cont bancar</li>
                <li>• Activare plăți</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={handleOwnerSetup} disabled={loading}>
              {loading ? <Loader2 className="animate-spin mr-2" /> : <CreditCard className="mr-2" />}
              Configurare cont plată
            </Button>
            <Button variant="outline" onClick={handleClose}>
              Anulează
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Show escrow pending status
  if (paymentStatus === 'escrow_pending' && escrowTransaction) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Plată în escrow</DialogTitle>
            <DialogDescription>
              Vizualizați statusul plății în escrow pentru această închiriere.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Alert className="border-blue-200 bg-blue-50">
              <Shield className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                Plata este în escrow și va fi eliberată după finalizarea închirierii.
              </AlertDescription>
            </Alert>

            <div className="space-y-2 p-3 bg-muted rounded-lg">
              <div className="flex justify-between text-sm">
                <span>Status escrow:</span>
                <Badge variant={escrowTransaction.escrow_status === 'held' ? 'default' : 'secondary'}>
                  {escrowTransaction.escrow_status === 'held' ? 'Fonduri reținute' : 'În procesare'}
                </Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span>Suma totală:</span>
                <span>{formatAmountForDisplay(escrowTransaction.rental_amount + escrowTransaction.deposit_amount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Taxă platformă:</span>
                <span>{formatAmountForDisplay(escrowTransaction.platform_fee)}</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={handleClose} className="w-full">
              Închide
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Plată securizată cu escrow</DialogTitle>
          <DialogDescription>
            Finalizați plata pentru închirierea echipamentului folosind sistemul de escrow securizat.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Booking Summary */}
          <div className="p-3 bg-muted rounded-lg">
                            <h3 className="font-semibold mb-2">{booking.gear?.title || 'Echipament'}</h3>
            <p className="text-sm text-muted-foreground">
              {new Date(booking.start_date).toLocaleDateString()} - {new Date(booking.end_date).toLocaleDateString()}
            </p>
          </div>

          {/* Escrow Information */}
          <Alert className="border-green-200 bg-green-50">
            <Lock className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Plata este protejată prin sistemul de escrow. Fondurile vor fi eliberate automat după finalizarea închirierii.
            </AlertDescription>
          </Alert>

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

          {/* Owner Setup Warning */}
          {showOwnerSetup && user?.id !== booking.owner_id && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Proprietarul echipamentului trebuie să își configureze contul de plată înainte de a putea procesa plata.
              </AlertDescription>
            </Alert>
          )}

          {/* Payment Status */}
          {paymentStatus === 'success' && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Plata a fost procesată cu succes și este în escrow!
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
              <Button 
                onClick={handleEscrowPayment} 
                disabled={loading || showOwnerSetup}
                className="flex-1"
              >
                {loading ? <Loader2 className="animate-spin mr-2" /> : <Shield className="mr-2" />}
                Plătește cu escrow
              </Button>
              <Button 
                variant="outline" 
                onClick={handleClose}
                disabled={loading}
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
              <Button onClick={handleEscrowPayment} disabled={loading}>
                Încearcă din nou
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 
