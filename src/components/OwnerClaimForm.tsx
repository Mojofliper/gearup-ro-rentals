import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useNotifications } from '@/hooks/useNotifications';

interface OwnerClaimFormProps {
  bookingId: string;
  onSubmitted?: () => void;
}

// Minimal claim form component (owner side)
export const OwnerClaimForm: React.FC<OwnerClaimFormProps> = ({ bookingId, onSubmitted }) => {
  const { user } = useAuth();
  const { notifyClaimSubmitted } = useNotifications();
  const [description, setDescription] = useState('');
  const [claimType, setClaimType] = useState<string>('');
  const [files, setFiles] = useState<FileList | null>(null);
  const [loading, setLoading] = useState(false);
  const [eligible, setEligible] = useState<boolean | null>(null);

  useEffect(() => {
    const checkEligibility = async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('payment_status, escrow_status')
        .eq('id', bookingId)
        .single();
      if (error) {
        console.error(error);
        setEligible(false);
        return;
      }
      setEligible(data.payment_status === 'paid' && data.escrow_status === 'held');
    };
    checkEligibility();
  }, [bookingId]);

  if (eligible === false) {
    return <p className="text-sm text-muted-foreground">Claims can only be submitted after payment and while escrow is held.</p>;
  }
  if (eligible === null) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !claimType) return;

    try {
      setLoading(true);
      const evidenceUrls: string[] = [];

      if (files && files.length > 0) {
        const uploadPromises = Array.from(files).map(async (file) => {
          const path = `${user.id}/${Date.now()}_${file.name}`;
          const { error } = await supabase.storage.from('claim-photos').upload(path, file);
          if (error) throw error;
          const { data } = supabase.storage.from('claim-photos').getPublicUrl(path);
          evidenceUrls.push(data.publicUrl);
        });
        await Promise.all(uploadPromises);
      }

      const { error: insertError } = await supabase.from('claims').insert({
        booking_id: bookingId,
        claimant_id: user.id, // Use claimant_id instead of owner_id
        claim_type: claimType, // Add required claim_type
        description,
        evidence_urls: evidenceUrls,
        claim_status: 'pending' // Set initial status
      });
      if (insertError) throw insertError;

      // Send notification about claim submission
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

      toast.success('Claim submitted successfully');
      setDescription('');
      setClaimType('');
      setFiles(null);
      onSubmitted?.();
    } catch (err: unknown) {
      console.error(err);
      toast.error('Failed to submit claim');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-2 block">Claim Type</label>
        <Select value={claimType} onValueChange={setClaimType} required>
          <SelectTrigger>
            <SelectValue placeholder="Select claim type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="damage">Damage</SelectItem>
            <SelectItem value="late_return">Late Return</SelectItem>
            <SelectItem value="missing_item">Missing Item</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div>
        <label className="text-sm font-medium mb-2 block">Description</label>
        <Textarea
          placeholder="Describe the damage or issue in detail"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          rows={4}
        />
      </div>
      
      <div>
        <label className="text-sm font-medium mb-2 block">Evidence Photos</label>
        <input 
          type="file" 
          multiple 
          accept="image/*"
          onChange={(e) => setFiles(e.target.files)} 
          className="w-full"
        />
        <p className="text-xs text-gray-500 mt-1">Upload photos as evidence (optional)</p>
      </div>
      
      <Button type="submit" disabled={loading || !claimType} className="w-full">
        {loading ? 'Submitting...' : 'Submit Claim'}
      </Button>
    </form>
  );
};

// Add default export for better compatibility
export default OwnerClaimForm; 