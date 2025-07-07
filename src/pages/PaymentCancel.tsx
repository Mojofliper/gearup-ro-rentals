import React from 'react';
import { useNavigate } from 'react-router-dom';
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

export const PaymentCancel: React.FC = () => {
  const navigate = useNavigate();

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
                Ai anulat procesul de plată. Rezervarea ta nu a fost confirmată.
              </p>
              
              <Alert className="border-orange-200 bg-orange-50">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800">
                  Rezervarea va fi ștearsă automat dacă nu finalizezi plata în următoarele 30 de minute.
                </AlertDescription>
              </Alert>
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
