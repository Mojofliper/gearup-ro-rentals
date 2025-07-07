import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Loader2, 
  CreditCard, 
  CheckCircle, 
  XCircle, 
  Info, 
  Shield,
  Banknote,
  UserCheck,
  Settings
} from 'lucide-react';
import { useEscrowPayments } from '@/hooks/useEscrowPayments';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface StripeConnectOnboardingProps {
  onComplete?: () => void;
  showAsModal?: boolean;
}

export const StripeConnectOnboarding: React.FC<StripeConnectOnboardingProps> = ({
  onComplete,
  showAsModal = false
}) => {
  const { user } = useAuth();
  const {
    loading,
    connectedAccount,
    getConnectedAccountStatus,
    setupStripeConnect,
    canReceivePayments,
    needsOnboarding
  } = useEscrowPayments();

  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    checkAccountStatus();
  }, []);

  const checkAccountStatus = async () => {
    if (!user) return;
    
    setIsChecking(true);
    try {
      await getConnectedAccountStatus();
    } catch (error) {
      console.error('Error checking account status:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleSetup = async () => {
    if (!user?.email) {
      toast.error('Email address is required for payment setup');
      return;
    }

    try {
      await setupStripeConnect(user.email, 'RO');
    } catch (error) {
      console.error('Setup error:', error);
      toast.error('Failed to setup payment account');
    }
  };

  const handleRefresh = async () => {
    await checkAccountStatus();
    if (canReceivePayments() && onComplete) {
      onComplete();
    }
  };

  if (isChecking) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Verificare status cont...</span>
        </CardContent>
      </Card>
    );
  }

  // Account is ready
  if (canReceivePayments()) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
            Cont de plată activ
          </CardTitle>
          <CardDescription>
            Contul dvs. este configurat și gata să primească plăți.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-green-200 bg-green-50">
            <Shield className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Puteți primi plăți pentru închirierea echipamentului.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Status cont:</span>
              <Badge variant="default">Activ</Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span>Plăți:</span>
              <Badge variant="default">Activate</Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span>Transferuri:</span>
              <Badge variant="default">Activate</Badge>
            </div>
          </div>

          {onComplete && (
            <Button onClick={onComplete} className="w-full">
              Continuă
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // Account needs setup or is pending
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center">
          <CreditCard className="h-5 w-5 text-blue-600 mr-2" />
          Configurare cont de plată
        </CardTitle>
        <CardDescription>
          Pentru a primi plăți pentru închirierea echipamentului, trebuie să vă configurați contul de plată.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Procesul de configurare este securizat și gestionat de Stripe, liderul mondial în procesarea plăților.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <h4 className="font-medium">Ce include configurarea:</h4>
          <div className="space-y-2">
            <div className="flex items-center text-sm">
              <UserCheck className="h-4 w-4 text-green-600 mr-2" />
              Verificare identitate
            </div>
            <div className="flex items-center text-sm">
              <Banknote className="h-4 w-4 text-green-600 mr-2" />
              Configurare cont bancar
            </div>
            <div className="flex items-center text-sm">
              <Settings className="h-4 w-4 text-green-600 mr-2" />
              Activare plăți
            </div>
          </div>
        </div>

        <Separator />

        {connectedAccount && (
          <div className="space-y-2">
            <h4 className="font-medium">Status actual:</h4>
            <div className="flex justify-between text-sm">
              <span>Status cont:</span>
              <Badge variant={connectedAccount.account_status === 'active' ? 'default' : 'secondary'}>
                {connectedAccount.account_status === 'active' ? 'Activ' : 'În procesare'}
              </Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span>Plăți:</span>
              <Badge variant={connectedAccount.charges_enabled ? 'default' : 'secondary'}>
                {connectedAccount.charges_enabled ? 'Activate' : 'În procesare'}
              </Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span>Transferuri:</span>
              <Badge variant={connectedAccount.payouts_enabled ? 'default' : 'secondary'}>
                {connectedAccount.payouts_enabled ? 'Activate' : 'În procesare'}
              </Badge>
            </div>
          </div>
        )}

        <div className="flex space-x-2">
          <Button 
            onClick={handleSetup} 
            disabled={loading}
            className="flex-1"
          >
            {loading ? <Loader2 className="animate-spin mr-2" /> : <CreditCard className="mr-2" />}
            {connectedAccount ? 'Continuă configurarea' : 'Începe configurarea'}
          </Button>
          {connectedAccount && (
            <Button 
              variant="outline" 
              onClick={handleRefresh}
              disabled={loading}
            >
              <Loader2 className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="text-xs text-muted-foreground text-center">
          Prin continuare, sunteți de acord cu{' '}
          <a href="#" className="underline">Termenii și Condițiile</a> Stripe.
        </div>
      </CardContent>
    </Card>
  );
};

export default StripeConnectOnboarding; 
