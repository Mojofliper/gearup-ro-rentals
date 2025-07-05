import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Calendar, MapPin, Shield, Info } from 'lucide-react';
import { useCreateBooking } from '@/hooks/useBookings';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { calculatePlatformFee, formatAmountForDisplay } from '@/integrations/stripe/client';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  gear: any;
  selectedDates: Date[];
  pricePerDay: number;
  depositAmount: number;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  onClose,
  gear,
  selectedDates,
  pricePerDay,
  depositAmount
}) => {
  const { user } = useAuth();
  const { mutate: createBooking, isPending } = useCreateBooking();
  const [notes, setNotes] = useState('');

  const handleSubmit = () => {
    if (!user || selectedDates.length === 0) return;

    // Sort dates to get start and end
    const sortedDates = [...selectedDates].sort((a, b) => a.getTime() - b.getTime());
    const startDate = sortedDates[0];
    const endDate = sortedDates[sortedDates.length - 1];
    
    const totalDays = selectedDates.length;
    const rentalAmount = totalDays * Math.round(pricePerDay * 100); // Convert to cents
    const totalAmount = rentalAmount + (depositAmount * 100);

    createBooking({
      gear_id: gear.id,
      owner_id: gear.owner_id,
      renter_id: user.id,
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      total_days: totalDays,
      total_amount: rentalAmount,
      deposit_amount: depositAmount * 100,
      notes: notes || null,
      status: 'pending'
    }, {
      onSuccess: () => {
        toast({
          title: 'Cerere de închiriere trimisă!',
          description: 'Proprietarul va fi notificat și îți va răspunde în curând.',
        });
        onClose();
      },
      onError: (error: any) => {
        toast({
          title: 'Eroare',
          description: 'Nu s-a putut trimite cererea. Te rugăm să încerci din nou.',
          variant: 'destructive',
        });
        console.error('Booking error:', error);
      }
    });
  };

  const totalDays = selectedDates.length;
  const rentalTotal = totalDays * pricePerDay;
  const platformFee = calculatePlatformFee(rentalTotal * 100) / 100; // Convert back from cents
  const finalTotal = rentalTotal + depositAmount + platformFee;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Confirmă rezervarea</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Gear Info */}
          <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
            <div className="flex-1">
              <h3 className="font-semibold">{gear.name}</h3>
              <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span>{gear.owner?.location || 'Locație necunoscută'}</span>
              </div>
            </div>
          </div>

          {/* Date Summary */}
          <div className="flex items-center space-x-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{totalDays} {totalDays === 1 ? 'zi' : 'zile'} selectate</span>
          </div>

          {/* Pricing Breakdown */}
          <div className="space-y-2 p-3 bg-muted rounded-lg">
            <div className="flex justify-between text-sm">
              <span>{pricePerDay} RON × {totalDays} {totalDays === 1 ? 'zi' : 'zile'}</span>
              <span>{rentalTotal} RON</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Taxă platformă (13%)</span>
              <span>{platformFee.toFixed(2)} RON</span>
            </div>
            {depositAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span>Garanție (returabilă)</span>
                <span>{depositAmount} RON</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span>{finalTotal.toFixed(2)} RON</span>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              {depositAmount > 0 && (
                <p>* Garanția se returnează la finalul închirierii</p>
              )}
              <p>* Taxa platformă se aplică doar la suma de închiriere</p>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Mesaj pentru proprietar (opțional)</Label>
            <Textarea
              id="notes"
              placeholder="Detalii suplimentare despre închiriere..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1"
            />
          </div>

          {/* Safety Notice */}
          <div className="flex items-start space-x-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
            <Shield className="h-4 w-4 text-blue-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-800 dark:text-blue-200">Protecție GearUp</p>
              <p className="text-blue-700 dark:text-blue-300">
                Nu vei fi taxat până când proprietarul confirmă cererea. După confirmare, vei fi redirecționat către o plată securizată prin Stripe.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={isPending}
          >
            Anulează
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={isPending || selectedDates.length === 0}
          >
            {isPending ? 'Se trimite...' : 'Trimite cererea'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};