import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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
    if (!user) return;

    try {
      setLoading(true);
      const evidenceUrls: string[] = [];

      if (files && files.length > 0) {
        const uploadPromises = Array.from(files).map(async (file) => {
          const path = `${user.id}/${Date.now()}_${file.name}`;
          const { error } = await supabase.storage.from('claim_evidence').upload(path, file);
          if (error) throw error;
          const { data } = supabase.storage.from('claim_evidence').getPublicUrl(path);
          evidenceUrls.push(data.publicUrl);
        });
        await Promise.all(uploadPromises);
      }

      const { error: insertError } = await supabase.from('claims').insert({
        booking_id: bookingId,
        owner_id: user.id,
        renter_id: null,
        description,
        evidence_urls: evidenceUrls,
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
          await notifyClaimSubmitted(
            bookingId,
            (booking.gear as Record<string, unknown>)?.title || 'Echipament',
            booking.owner_id,
            booking.renter_id
          );
        }
      } catch (notificationError) {
        console.error('Error sending claim notification:', notificationError);
      }

      toast.success('Claim submitted');
      setDescription('');
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
      <Textarea
        placeholder="Describe the damage or issue"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        required
      />
      <input type="file" multiple onChange={(e) => setFiles(e.target.files)} />
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Uploading…' : 'Submit claim'}
      </Button>
    </form>
  );
};

// Add default export for better compatibility
export default OwnerClaimForm; 