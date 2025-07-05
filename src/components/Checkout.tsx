import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Calendar, MapPin, CreditCard, Shield, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateBooking } from '@/hooks/useBookings';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface CartItem {
  id: string;
  gear: {
    id: string;
    name: string;
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
  const [currentStep, setCurrentStep] = useState<'review' | 'payment' | 'success'>('review');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'transfer'>('card');
  const [cardDetails, setCardDetails] = useState({
    number: '',
    expiry: '',
    cvc: '',
    name: ''
  });
  const [processingPayment, setProcessingPayment] = useState(false);

  const calculateItemTotal = (item: CartItem) => {
    const pricePerDay = item.gear.price_per_day / 100;
    const depositAmount = item.gear.deposit_amount / 100;
    const rentalTotal = item.selectedDates.length * pricePerDay;
    return rentalTotal + depositAmount;
  };

  const calculateCartTotal = () => {
    return cartItems.reduce((total, item) => total + calculateItemTotal(item), 0);
  };

  const calculateRentalTotal = () => {
    return cartItems.reduce((total, item) => {
      const pricePerDay = item.gear.price_per_day / 100;
      return total + (item.selectedDates.length * pricePerDay);
    }, 0);
  };

  const calculateDepositTotal = () => {
    return cartItems.reduce((total, item) => {
      const depositAmount = item.gear.deposit_amount / 100;
      return total + depositAmount;
    }, 0);
  };

  const handlePayment = async () => {
    if (!user) {
      toast({
        title: 'Eroare',
        description: 'Trebuie să fii conectat pentru a finaliza plata.',
        variant: 'destructive',
      });
      return;
    }

    setProcessingPayment(true);

    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Create bookings for all items
      const bookingPromises = cartItems.map(item => {
        const sortedDates = [...item.selectedDates].sort((a, b) => a.getTime() - b.getTime());
        const startDate = sortedDates[0];
        const endDate = sortedDates[sortedDates.length - 1];
        
        const totalDays = item.selectedDates.length;
        const rentalAmount = totalDays * Math.round(item.gear.price_per_day);
        const totalAmount = rentalAmount + item.gear.deposit_amount;

        return createBooking({
          gear_id: item.gear.id,
          owner_id: item.gear.owner.id,
          renter_id: user.id,
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          total_days: totalDays,
          total_amount: rentalAmount,
          deposit_amount: item.gear.deposit_amount,
          notes: item.notes || null,
          status: 'confirmed' // Auto-confirm for demo
        });
      });

      await Promise.all(bookingPromises);

      // Clear cart
      localStorage.removeItem('gearup-cart');
      
      // Dispatch custom event to update cart count in header
      window.dispatchEvent(new Event('cartUpdated'));
      
      setCurrentStep('success');
      
      toast({
        title: 'Plată reușită!',
        description: 'Toate rezervările au fost confirmate și plătite.',
      });

      setTimeout(() => {
        onSuccess();
        onClose();
        setCurrentStep('review');
      }, 3000);

    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: 'Eroare la plată',
        description: 'Nu s-a putut procesa plata. Te rugăm să încerci din nou.',
        variant: 'destructive',
      });
    } finally {
      setProcessingPayment(false);
    }
  };

  const validateCardDetails = () => {
    if (!cardDetails.number || !cardDetails.expiry || !cardDetails.cvc || !cardDetails.name) {
      return false;
    }
    
    // Basic validation
    if (cardDetails.number.length < 13 || cardDetails.number.length > 19) {
      return false;
    }
    
    if (!/^\d{2}\/\d{2}$/.test(cardDetails.expiry)) {
      return false;
    }
    
    if (cardDetails.cvc.length < 3 || cardDetails.cvc.length > 4) {
      return false;
    }
    
    return true;
  };

  if (currentStep === 'success') {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <div className="text-center py-8">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Plată reușită!</h2>
            <p className="text-gray-600 mb-4">
              Toate rezervările au fost confirmate și plătite cu succes.
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
                      <h4 className="font-medium text-gray-800">{item.gear.name}</h4>
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
                        {calculateItemTotal(item).toFixed(2)} RON
                      </p>
                    </div>
                  </div>
                ))}

                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Total închiriere</span>
                    <span>{calculateRentalTotal().toFixed(2)} RON</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Total garanții</span>
                    <span>{calculateDepositTotal().toFixed(2)} RON</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total</span>
                    <span>{calculateCartTotal().toFixed(2)} RON</span>
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
                    <Input value={profile?.phone || 'Nu specificat'} disabled />
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
                  <span>Metodă de plată</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="card"
                      name="payment"
                      value="card"
                      checked={paymentMethod === 'card'}
                      onChange={(e) => setPaymentMethod(e.target.value as 'card' | 'transfer')}
                    />
                    <Label htmlFor="card">Card bancar</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="transfer"
                      name="payment"
                      value="transfer"
                      checked={paymentMethod === 'transfer'}
                      onChange={(e) => setPaymentMethod(e.target.value as 'card' | 'transfer')}
                    />
                    <Label htmlFor="transfer">Transfer bancar</Label>
                  </div>
                </div>

                {paymentMethod === 'card' && (
                  <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <Label htmlFor="cardName">Nume pe card</Label>
                      <Input
                        id="cardName"
                        value={cardDetails.name}
                        onChange={(e) => setCardDetails({ ...cardDetails, name: e.target.value })}
                        placeholder="Ion Popescu"
                      />
                    </div>
                    <div>
                      <Label htmlFor="cardNumber">Număr card</Label>
                      <Input
                        id="cardNumber"
                        value={cardDetails.number}
                        onChange={(e) => setCardDetails({ ...cardDetails, number: e.target.value })}
                        placeholder="1234 5678 9012 3456"
                        maxLength={19}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="expiry">Data expirare</Label>
                        <Input
                          id="expiry"
                          value={cardDetails.expiry}
                          onChange={(e) => setCardDetails({ ...cardDetails, expiry: e.target.value })}
                          placeholder="MM/YY"
                          maxLength={5}
                        />
                      </div>
                      <div>
                        <Label htmlFor="cvc">CVC</Label>
                        <Input
                          id="cvc"
                          value={cardDetails.cvc}
                          onChange={(e) => setCardDetails({ ...cardDetails, cvc: e.target.value })}
                          placeholder="123"
                          maxLength={4}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {paymentMethod === 'transfer' && (
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-800 mb-2">Detalii transfer bancar</h4>
                    <div className="space-y-1 text-sm text-blue-700">
                      <p><strong>IBAN:</strong> RO49 AAAA 1B31 0075 9384 0000</p>
                      <p><strong>Beneficiar:</strong> GearUp Rentals SRL</p>
                      <p><strong>Suma:</strong> {calculateCartTotal().toFixed(2)} RON</p>
                      <p><strong>Referință:</strong> {user?.id?.slice(0, 8)}</p>
                    </div>
                    <p className="text-xs text-blue-600 mt-2">
                      Rezervarea va fi confirmată după primirea plății.
                    </p>
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
                    <p className="font-medium text-green-800">Plată securizată</p>
                    <p className="text-green-700">
                      Toate plățile sunt procesate prin sisteme securizate. 
                      Datele tale sunt protejate.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Button */}
            <Button
              onClick={handlePayment}
              disabled={processingPayment || (paymentMethod === 'card' && !validateCardDetails())}
              className="w-full"
              size="lg"
            >
              {processingPayment ? (
                'Se procesează plata...'
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Plătește {calculateCartTotal().toFixed(2)} RON
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