import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Calendar } from '@/components/ui/calendar';
import { Separator } from '@/components/ui/separator';
import { Trash2, ShoppingBag, Calendar as CalendarIcon, MapPin, Star } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface CartItem {
  id: string;
  gear: {
    id: string;
    name: string;
    price_per_day: number;
    deposit_amount: number;
    images: any[];
    owner: {
      full_name: string;
      location: string;
      is_verified: boolean;
    };
  };
  selectedDates: Date[];
  notes: string;
}

interface CartProps {
  isOpen: boolean;
  onClose: () => void;
  onCheckout: (items: CartItem[]) => void;
}

export const Cart: React.FC<CartProps> = ({ isOpen, onClose, onCheckout }) => {
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load cart items from localStorage
    const savedCart = localStorage.getItem('gearup-cart');
    if (savedCart) {
      try {
        const parsed = JSON.parse(savedCart);
        // Convert date strings back to Date objects
        const itemsWithDates = parsed.map((item: any) => ({
          ...item,
          selectedDates: item.selectedDates.map((dateStr: string) => new Date(dateStr))
        }));
        setCartItems(itemsWithDates);
      } catch (error) {
        console.error('Error parsing cart data:', error);
        setCartItems([]);
      }
    }
  }, [isOpen]);

  const removeFromCart = (itemId: string) => {
    const updatedCart = cartItems.filter(item => item.id !== itemId);
    setCartItems(updatedCart);
    localStorage.setItem('gearup-cart', JSON.stringify(updatedCart));
    
    // Dispatch custom event to update cart count in header
    window.dispatchEvent(new Event('cartUpdated'));
    
    toast({
      title: 'Eliminat din coș',
      description: 'Echipamentul a fost eliminat din coșul de cumpărături.',
    });
  };

  const updateItemDates = (itemId: string, dates: Date[]) => {
    const updatedCart = cartItems.map(item => 
      item.id === itemId ? { ...item, selectedDates: dates } : item
    );
    setCartItems(updatedCart);
    localStorage.setItem('gearup-cart', JSON.stringify(updatedCart));
  };

  const updateItemNotes = (itemId: string, notes: string) => {
    const updatedCart = cartItems.map(item => 
      item.id === itemId ? { ...item, notes } : item
    );
    setCartItems(updatedCart);
    localStorage.setItem('gearup-cart', JSON.stringify(updatedCart));
  };

  const calculateItemTotal = (item: CartItem) => {
    const pricePerDay = item.gear.price_per_day / 100;
    const depositAmount = item.gear.deposit_amount / 100;
    const rentalTotal = item.selectedDates.length * pricePerDay;
    return rentalTotal + depositAmount;
  };

  const calculateCartTotal = () => {
    return cartItems.reduce((total, item) => total + calculateItemTotal(item), 0);
  };

  const handleCheckout = () => {
    if (!user) {
      toast({
        title: 'Trebuie să fii conectat',
        description: 'Te rugăm să te conectezi pentru a finaliza comanda.',
        variant: 'destructive',
      });
      return;
    }

    if (cartItems.length === 0) {
      toast({
        title: 'Coșul este gol',
        description: 'Adaugă echipamente în coș pentru a continua.',
        variant: 'destructive',
      });
      return;
    }

    // Validate that all items have selected dates
    const itemsWithoutDates = cartItems.filter(item => item.selectedDates.length === 0);
    if (itemsWithoutDates.length > 0) {
      toast({
        title: 'Date lipsă',
        description: 'Te rugăm să selectezi datele pentru toate echipamentele.',
        variant: 'destructive',
      });
      return;
    }

    onCheckout(cartItems);
  };

  const clearCart = () => {
    setCartItems([]);
    localStorage.removeItem('gearup-cart');
    
    // Dispatch custom event to update cart count in header
    window.dispatchEvent(new Event('cartUpdated'));
    
    toast({
      title: 'Coș golit',
      description: 'Toate echipamentele au fost eliminate din coș.',
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <ShoppingBag className="h-5 w-5" />
            <span>Coșul de cumpărături ({cartItems.length})</span>
          </DialogTitle>
        </DialogHeader>

        {cartItems.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingBag className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Coșul tău este gol</h3>
            <p className="text-gray-600 mb-4">
              Adaugă echipamente în coș pentru a începe să închiriezi
            </p>
            <Button onClick={onClose} variant="outline">
              Continuă cumpărăturile
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Cart Items */}
            <div className="space-y-4">
              {cartItems.map((item) => (
                <Card key={item.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-4">
                      {/* Gear Image */}
                      <div className="w-20 h-20 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                        {item.gear.images && item.gear.images.length > 0 ? (
                          <img
                            src={item.gear.images[0]}
                            alt={item.gear.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <ShoppingBag className="h-8 w-8" />
                          </div>
                        )}
                      </div>

                      {/* Gear Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-800 mb-1">
                              {item.gear.name}
                            </h3>
                            
                            <div className="flex items-center space-x-2 mb-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs">
                                  {item.gear.owner.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm text-gray-600">{item.gear.owner.full_name}</span>
                              {item.gear.owner.is_verified && (
                                <Badge variant="secondary" className="text-xs">Verificat</Badge>
                              )}
                            </div>

                            <div className="flex items-center space-x-1 text-sm text-gray-500 mb-2">
                              <MapPin className="h-3 w-3" />
                              <span>{item.gear.owner.location}</span>
                            </div>

                            <div className="flex items-center space-x-4 mb-3">
                              <div>
                                <span className="text-lg font-bold text-gray-800">
                                  {item.gear.price_per_day / 100} RON
                                </span>
                                <span className="text-sm text-gray-500">/zi</span>
                              </div>
                              {item.gear.deposit_amount > 0 && (
                                <div>
                                  <span className="text-sm text-gray-600">Garanție: </span>
                                  <span className="text-sm font-medium">
                                    {item.gear.deposit_amount / 100} RON
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFromCart(item.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Date Selection */}
                        <div className="mb-3">
                          <label className="text-sm font-medium mb-2 block flex items-center">
                            <CalendarIcon className="h-4 w-4 mr-1" />
                            Selectează datele
                          </label>
                          <Calendar
                            mode="multiple"
                            selected={item.selectedDates}
                            onSelect={(dates) => updateItemDates(item.id, dates || [])}
                            className="rounded-md border"
                            disabled={(date) => date < new Date()}
                          />
                        </div>

                        {/* Notes */}
                        <div>
                          <label className="text-sm font-medium mb-2 block">
                            Mesaj pentru proprietar (opțional)
                          </label>
                          <textarea
                            value={item.notes}
                            onChange={(e) => updateItemNotes(item.id, e.target.value)}
                            placeholder="Detalii suplimentare despre închiriere..."
                            className="w-full p-2 border border-gray-300 rounded-md text-sm resize-none"
                            rows={2}
                          />
                        </div>

                        {/* Item Total */}
                        <div className="mt-3 pt-3 border-t">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">
                              {item.selectedDates.length} {item.selectedDates.length === 1 ? 'zi' : 'zile'}
                            </span>
                            <span className="font-semibold text-gray-800">
                              {calculateItemTotal(item).toFixed(2)} RON
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Cart Summary */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-800">Sumar comandă</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearCart}
                    className="text-red-600 hover:text-red-700"
                  >
                    Golește coșul
                  </Button>
                </div>

                <div className="space-y-2">
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        {item.gear.name} ({item.selectedDates.length} {item.selectedDates.length === 1 ? 'zi' : 'zile'})
                      </span>
                      <span>{calculateItemTotal(item).toFixed(2)} RON</span>
                    </div>
                  ))}
                  
                  <Separator />
                  
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total</span>
                    <span>{calculateCartTotal().toFixed(2)} RON</span>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <Button
                    onClick={handleCheckout}
                    className="w-full"
                    size="lg"
                  >
                    Finalizează comanda ({cartItems.length} {cartItems.length === 1 ? 'echipament' : 'echipamente'})
                  </Button>
                  
                  <Button
                    onClick={onClose}
                    variant="outline"
                    className="w-full"
                  >
                    Continuă cumpărăturile
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}; 