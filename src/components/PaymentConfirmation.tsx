import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle, 
  Shield, 
  Clock, 
  CreditCard,
  Calendar,
  User,
  Package,
  ArrowRight
} from 'lucide-react';
import { EscrowStatusBadge } from './EscrowStatusBadge';
import { formatAmountForDisplay } from '@/integrations/stripe/client';

interface PaymentConfirmationProps {
  booking: any;
  escrowTransaction: any;
  onViewBooking?: () => void;
  onClose?: () => void;
}

export const PaymentConfirmation: React.FC<PaymentConfirmationProps> = ({
  booking,
  escrowTransaction,
  onViewBooking,
  onClose
}) => {
  if (!booking || !escrowTransaction) {
    return null;
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ro-RO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <CheckCircle className="h-6 w-6 text-green-600" />
        </div>
        <CardTitle className="text-xl">Plată confirmată!</CardTitle>
        <CardDescription>
          Plata a fost procesată cu succes și este în escrow.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Success Alert */}
        <Alert className="border-green-200 bg-green-50">
          <Shield className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Fondurile sunt în siguranță și vor fi eliberate automat după finalizarea închirierii.
          </AlertDescription>
        </Alert>

        {/* Booking Details */}
        <div className="space-y-3">
          <h3 className="font-semibold flex items-center">
            <Package className="h-4 w-4 mr-2" />
            Detalii închiriere
          </h3>
          <div className="bg-muted rounded-lg p-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Echipament:</span>
                              <span className="font-medium">{booking.gear?.title || 'Necunoscut'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Proprietar:</span>
              <span className="font-medium">{booking.owner?.full_name || 'Necunoscut'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Perioada:</span>
              <span className="font-medium">
                {formatDate(booking.start_date)} - {formatDate(booking.end_date)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Durata:</span>
              <span className="font-medium">{booking.total_days} {booking.total_days === 1 ? 'zi' : 'zile'}</span>
            </div>
          </div>
        </div>

        {/* Payment Details */}
        <div className="space-y-3">
          <h3 className="font-semibold flex items-center">
            <CreditCard className="h-4 w-4 mr-2" />
            Detalii plată
          </h3>
          <div className="bg-muted rounded-lg p-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Închiriere:</span>
              <span>{formatAmountForDisplay(escrowTransaction.rental_amount)}</span>
            </div>
            {escrowTransaction.deposit_amount > 0 && (
              <div className="flex justify-between text-sm">
                <span>Garanție:</span>
                <span>{formatAmountForDisplay(escrowTransaction.deposit_amount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span>Taxă platformă:</span>
              <span>{formatAmountForDisplay(escrowTransaction.platform_fee)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-semibold">
              <span>Total plătit:</span>
              <span>{formatAmountForDisplay(escrowTransaction.rental_amount + escrowTransaction.deposit_amount + escrowTransaction.platform_fee)}</span>
            </div>
          </div>
        </div>

        {/* Escrow Status */}
        <div className="space-y-3">
          <h3 className="font-semibold flex items-center">
            <Shield className="h-4 w-4 mr-2" />
            Status escrow
          </h3>
          <div className="bg-muted rounded-lg p-3 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm">Status:</span>
              <EscrowStatusBadge status={escrowTransaction.escrow_status} />
            </div>
            <div className="flex justify-between text-sm">
              <span>ID tranzacție:</span>
              <span className="font-mono text-xs">{escrowTransaction.stripe_payment_intent_id.slice(-8)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Data plății:</span>
              <span>{formatDate(escrowTransaction.created_at || new Date().toISOString())}</span>
            </div>
          </div>
        </div>

        {/* Next Steps */}
        <div className="space-y-3">
          <h3 className="font-semibold flex items-center">
            <ArrowRight className="h-4 w-4 mr-2" />
            Următorii pași
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-start">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                <span className="text-xs font-medium text-blue-600">1</span>
              </div>
              <div>
                <span className="font-medium">Contactați proprietarul</span>
                <p className="text-muted-foreground">Pentru a aranja ridicarea echipamentului</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                <span className="text-xs font-medium text-blue-600">2</span>
              </div>
              <div>
                <span className="font-medium">Ridicați echipamentul</span>
                <p className="text-muted-foreground">La locația și data convenită</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                <span className="text-xs font-medium text-blue-600">3</span>
              </div>
              <div>
                <span className="font-medium">Returnați echipamentul</span>
                <p className="text-muted-foreground">Fondurile vor fi eliberate automat</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-2 pt-4">
          {onViewBooking && (
            <Button onClick={onViewBooking} className="flex-1">
              Vezi închirierea
            </Button>
          )}
          {onClose && (
            <Button variant="outline" onClick={onClose} className="flex-1">
              Închide
            </Button>
          )}
        </div>

        {/* Additional Info */}
        <div className="text-xs text-muted-foreground text-center pt-4 border-t">
          <p>O confirmare a fost trimisă pe email.</p>
          <p>Pentru asistență, contactați suportul nostru.</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default PaymentConfirmation; 
