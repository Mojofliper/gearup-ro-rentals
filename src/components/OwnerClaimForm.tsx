import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Upload, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface BookingData {
  id: string;
  owner_id: string;
  status: string;
  start_date: string;
  end_date: string;
  gear: {
    title: string;
    price_per_day: number;
    deposit_amount: number;
  };
}

interface OwnerClaimFormProps {
  bookingId: string;
  onSubmitted?: () => void;
}

export const OwnerClaimForm: React.FC<OwnerClaimFormProps> = ({ bookingId, onSubmitted }) => {
  const { user } = useAuth();
  const { notifyClaimSubmitted } = useNotifications();
  const [description, setDescription] = useState('');
  const [claimType, setClaimType] = useState<string>('');
  const [files, setFiles] = useState<FileList | null>(null);
  const [loading, setLoading] = useState(false);
  const [eligible, setEligible] = useState<boolean | null>(null);
  const [booking, setBooking] = useState<BookingData | null>(null);

  useEffect(() => {
    const checkEligibility = async () => {
      try {
        // Get booking details
        const { data: bookingData, error: bookingError } = await supabase
          .from('bookings')
          .select(`
            *,
            gear:gear!bookings_gear_id_fkey(title, price_per_day, deposit_amount)
          `)
          .eq('id', bookingId)
          .single();

        if (bookingError) {
          console.error('Error fetching booking:', bookingError);
          setEligible(false);
          return;
        }

        setBooking(bookingData);

        // Check if user is the owner
        if (bookingData.owner_id !== user?.id) {
          setEligible(false);
          return;
        }

        // Allow claims for any booking except cancelled or completed
        const isEligible = (
          bookingData.owner_id === user?.id &&
          bookingData.status !== 'cancelled' &&
          bookingData.status !== 'completed'
        );

        setEligible(isEligible);
      } catch (error) {
        console.error('Error checking eligibility:', error);
        setEligible(false);
      }
    };

    if (user && bookingId) {
      checkEligibility();
    }
  }, [bookingId, user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(e.target.files);
    }
  };

  const uploadFiles = async (): Promise<string[]> => {
    if (!files || files.length === 0) return [];

    const uploadedUrls: string[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileName = `${user?.id}/claim_${Date.now()}_${i}.${file.name.split('.').pop()}`;
      
      const { data, error } = await supabase.storage
        .from('claim-photos')
        .upload(fileName, file);

      if (error) {
        console.error('Error uploading file:', error);
        throw new Error(`Failed to upload ${file.name}`);
      }

      const { data: urlData } = supabase.storage
        .from('claim-photos')
        .getPublicUrl(fileName);

      uploadedUrls.push(urlData.publicUrl);
    }

    return uploadedUrls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !booking || !claimType || !description.trim()) {
      toast({
        title: 'Informații incomplete',
        description: 'Te rugăm să completezi toate câmpurile obligatorii.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // Upload files first
      const evidenceUrls = await uploadFiles();

      // Create claim
      const { data: claimData, error: claimError } = await supabase
        .from('claims')
        .insert({
          booking_id: bookingId,
          claimant_id: user.id,
          claim_type: claimType,
          description: description.trim(),
          evidence_urls: evidenceUrls,
          claim_status: 'pending'
        })
        .select()
        .single();

      if (claimError) {
        console.error('Error creating claim:', claimError);
        throw new Error('Failed to create claim');
      }

      // Notify admin
      try {
        // Get booking details for notification
        const { data: booking } = await supabase
          .from('bookings')
          .select('gear:gear_id(title), owner_id, renter_id')
          .eq('id', bookingId)
          .single();

        if (booking) {
          const gearData = booking.gear as unknown as Record<string, unknown>;
          const gearTitle = gearData?.title as string;
          
          await notifyClaimSubmitted(
            bookingId,
            gearTitle || 'Echipament',
            booking.owner_id,
            booking.renter_id
          );
        }
      } catch (notificationError) {
        console.error('Error sending claim notification:', notificationError);
      }

      toast({
        title: 'Revendicare trimisă!',
        description: 'Revendicarea ta a fost trimisă și va fi analizată de administrator.',
      });

      onSubmitted?.();
    } catch (error) {
      console.error('Error submitting claim:', error);
      toast({
        title: 'Eroare la trimiterea revendicării',
        description: 'A apărut o eroare. Te rugăm să încerci din nou.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (eligible === false) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Nu poți trimite o revendicare pentru această închiriere. Revendicările pot fi trimise doar pentru închirieri active sau finalizate cu plata completată.
        </AlertDescription>
      </Alert>
    );
  }

  if (eligible === null) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-500" />
          Revendicare proprietar
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Booking Info */}
          {booking && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-sm text-gray-700 mb-2">Detalii închiriere:</h4>
              <p className="text-sm text-gray-600">
                <strong>Echipament:</strong> {booking.gear?.title}<br />
                <strong>Perioada:</strong> {new Date(booking.start_date).toLocaleDateString('ro-RO')} - {new Date(booking.end_date).toLocaleDateString('ro-RO')}<br />
                <strong>Status:</strong> {booking.status}
              </p>
            </div>
          )}

          {/* Claim Type */}
          <div className="space-y-2">
            <Label htmlFor="claimType">Tipul revendicării *</Label>
            <Select value={claimType} onValueChange={setClaimType} required>
              <SelectTrigger>
                <SelectValue placeholder="Selectează tipul revendicării" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="damage">Echipament deteriorat</SelectItem>
                <SelectItem value="missing_item">Echipament lipsă</SelectItem>
                <SelectItem value="late_return">Întârziere la returnare</SelectItem>
                <SelectItem value="other">Alt motiv</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrierea problemei *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrie în detaliu problema întâlnită..."
              rows={4}
              required
            />
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="files">Dovezi foto</Label>
            <Input
              id="files"
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileChange}
              className="cursor-pointer"
            />
            <p className="text-xs text-gray-500">
              Încarcă fotografii care să dovedească problema (opțional)
            </p>
          </div>

          {/* Submit Button */}
          <Button 
            type="submit" 
            disabled={loading || !claimType || !description.trim()}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Se trimite...
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4 mr-2" />
                Trimite revendicarea
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

// Add default export for better compatibility
export default OwnerClaimForm; 