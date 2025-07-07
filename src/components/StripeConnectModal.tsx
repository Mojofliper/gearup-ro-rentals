import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CreditCard, Shield, CheckCircle, AlertTriangle } from 'lucide-react';
import { useStripeConnect } from '@/hooks/useStripeConnect';
import { toast } from '@/hooks/use-toast';

interface StripeConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StripeConnectModal: React.FC<StripeConnectModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { connectedAccount, loading, error, setupStripeConnect } = useStripeConnect();

  const handleSetup = async () => {
    try {
      await setupStripeConnect();
      toast({
        title: 'Configurare inițiată',
        description: 'Veți fi redirecționat către Stripe pentru configurarea contului.',
      });
    } catch (err: any) {
      toast({
        title: 'Eroare',
        description: err.message || 'Nu s-a putut iniția configurarea Stripe Connect.',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = () => {
    if (!connectedAccount) return null;

    switch (connectedAccount.account_status) {
      case 'active':
        return (
          <div className="flex items-center space-x-2 text-green-600">
            <CheckCircle className="h-4 w-4" />
            <span>Cont activ</span>
          </div>
        );
      case 'pending':
        return (
          <div className="flex items-center space-x-2 text-yellow-600">
            <AlertTriangle className="h-4 w-4" />
            <span>În așteptare</span>
          </div>
        );
      case 'restricted':
        return (
          <div className="flex items-center space-x-2 text-red-600">
            <AlertTriangle className="h-4 w-4" />
            <span>Restricționat</span>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Configurare Stripe Connect</DialogTitle>
          <DialogDescription>
            Configurați-vă contul de plată pentru a primi plăți pentru închirierea echipamentului.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Account Status */}
          {connectedAccount && (
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <div>Status cont: {getStatusBadge()}</div>
                  <div className="text-sm text-muted-foreground">
                    Plăți activate: {connectedAccount.charges_enabled ? 'Da' : 'Nu'}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Payouts activate: {connectedAccount.payouts_enabled ? 'Da' : 'Nu'}
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Setup Information */}
          <div className="p-3 bg-muted rounded-lg">
            <h3 className="font-semibold mb-2">Procesul de configurare:</h3>
            <ul className="text-sm space-y-1">
              <li>• Verificare identitate</li>
              <li>• Configurare cont bancar</li>
              <li>• Activare plăți</li>
              <li>• Configurare payouts</li>
            </ul>
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Benefits */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold mb-2 text-blue-800">Beneficii:</h3>
            <ul className="text-sm space-y-1 text-blue-700">
              <li>• Plăți securizate prin escrow</li>
              <li>• Transfer automat după finalizarea închirierii</li>
              <li>• Protecție împotriva fraudelor</li>
              <li>• Raportare financiară detaliată</li>
            </ul>
          </div>
        </div>

        <div className="flex space-x-2">
          {!connectedAccount ? (
            <Button 
              onClick={handleSetup} 
              disabled={loading}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin mr-2" />
                  Configurare...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2" />
                  Configurare cont plată
                </>
              )}
            </Button>
          ) : (
            <Button 
              onClick={handleSetup} 
              disabled={loading}
              variant="outline"
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin mr-2" />
                  Actualizare...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2" />
                  Actualizează configurarea
                </>
              )}
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            Închide
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 
