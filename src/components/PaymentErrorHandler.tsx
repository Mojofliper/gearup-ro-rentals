import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  CreditCard, 
  Shield,
  HelpCircle,
  ExternalLink,
  Phone
} from 'lucide-react';

interface PaymentErrorHandlerProps {
  error: {
    type: 'payment_failed' | 'owner_not_ready' | 'network_error' | 'validation_error' | 'escrow_error' | 'unknown';
    message: string;
    code?: string;
    details?: string;
  };
  onRetry?: () => void;
  onContactSupport?: () => void;
  onSetupOwner?: () => void;
  onClose?: () => void;
}

export const PaymentErrorHandler: React.FC<PaymentErrorHandlerProps> = ({
  error,
  onRetry,
  onContactSupport,
  onSetupOwner,
  onClose
}) => {
  const getErrorConfig = () => {
    switch (error.type) {
      case 'payment_failed':
        return {
          title: 'Plată eșuată',
          description: 'Plata nu a putut fi procesată. Vă rugăm să încercați din nou.',
          icon: XCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          suggestions: [
            'Verificați că datele cardului sunt corecte',
            'Asigurați-vă că aveți fonduri suficiente',
            'Încercați cu o altă metodă de plată'
          ],
          canRetry: true,
          showSupport: true
        };
      
      case 'owner_not_ready':
        return {
          title: 'Proprietarul nu este gata',
          description: 'Proprietarul echipamentului trebuie să își configureze contul de plată.',
          icon: AlertTriangle,
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          suggestions: [
            'Contactați proprietarul pentru a configura plățile',
            'Așteptați să se finalizeze configurarea',
            'Încercați cu alt echipament'
          ],
          canRetry: false,
          showSupport: false,
          showOwnerSetup: true
        };
      
      case 'network_error':
        return {
          title: 'Eroare de conexiune',
          description: 'Nu s-a putut conecta la serviciul de plăți. Verificați conexiunea la internet.',
          icon: RefreshCw,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          suggestions: [
            'Verificați conexiunea la internet',
            'Încercați din nou în câteva momente',
            'Verificați că nu aveți un firewall activ'
          ],
          canRetry: true,
          showSupport: true
        };
      
      case 'validation_error':
        return {
          title: 'Date invalide',
          description: 'Datele introduse nu sunt valide. Vă rugăm să le verificați.',
          icon: AlertTriangle,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          suggestions: [
            'Verificați că toate câmpurile sunt completate corect',
            'Asigurați-vă că suma este validă',
            'Verificați formatul datei'
          ],
          canRetry: true,
          showSupport: false
        };
      
      case 'escrow_error':
        return {
          title: 'Eroare escrow',
          description: 'Nu s-a putut crea tranzacția de escrow. Vă rugăm să încercați din nou.',
          icon: Shield,
          color: 'text-purple-600',
          bgColor: 'bg-purple-50',
          borderColor: 'border-purple-200',
          suggestions: [
            'Încercați din nou în câteva momente',
            'Verificați că toate datele sunt corecte',
            'Contactați suportul dacă problema persistă'
          ],
          canRetry: true,
          showSupport: true
        };
      
      default:
        return {
          title: 'Eroare neașteptată',
          description: 'A apărut o eroare neașteptată. Vă rugăm să încercați din nou.',
          icon: XCircle,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          suggestions: [
            'Încercați din nou',
            'Verificați că toate datele sunt corecte',
            'Contactați suportul pentru asistență'
          ],
          canRetry: true,
          showSupport: true
        };
    }
  };

  const config = getErrorConfig();
  const IconComponent = config.icon;

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className={`mx-auto w-12 h-12 ${config.bgColor} rounded-full flex items-center justify-center mb-4`}>
          <IconComponent className={`h-6 w-6 ${config.color}`} />
        </div>
        <CardTitle className="text-lg">{config.title}</CardTitle>
        <CardDescription>{config.description}</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Error Details */}
        <Alert className={`${config.borderColor} ${config.bgColor}`}>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error.message}
            {error.code && (
              <div className="mt-1 text-xs font-mono">
                Cod: {error.code}
              </div>
            )}
          </AlertDescription>
        </Alert>

        {/* Suggestions */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Sugestii:</h4>
          <ul className="space-y-1">
            {config.suggestions.map((suggestion, index) => (
              <li key={index} className="text-sm text-muted-foreground flex items-start">
                <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full mt-2 mr-2 flex-shrink-0" />
                {suggestion}
              </li>
            ))}
          </ul>
        </div>

        <Separator />

        {/* Action Buttons */}
        <div className="space-y-2">
          {config.canRetry && onRetry && (
            <Button onClick={onRetry} className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Încearcă din nou
            </Button>
          )}

          {config.showOwnerSetup && onSetupOwner && (
            <Button onClick={onSetupOwner} className="w-full">
              <CreditCard className="h-4 w-4 mr-2" />
              Configurare proprietar
            </Button>
          )}

          {config.showSupport && onContactSupport && (
            <Button variant="outline" onClick={onContactSupport} className="w-full">
              <HelpCircle className="h-4 w-4 mr-2" />
              Contactează suportul
            </Button>
          )}

          {onClose && (
            <Button variant="ghost" onClick={onClose} className="w-full">
              Închide
            </Button>
          )}
        </div>

        {/* Support Information */}
        {config.showSupport && (
          <div className="text-xs text-muted-foreground text-center pt-4 border-t">
            <p className="flex items-center justify-center">
              <Phone className="h-3 w-3 mr-1" />
              Suport: +40 123 456 789
            </p>
            <p className="mt-1">
              <a href="mailto:support@gearup.ro" className="underline">
                support@gearup.ro
              </a>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PaymentErrorHandler; 
