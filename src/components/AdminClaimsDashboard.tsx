import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useNotifications } from '@/hooks/useNotifications';

interface Claim {
  id: string;
  booking_id: string;
  claimant_id: string;
  owner_id?: string;
  renter_id?: string;
  description?: string;
  evidence_urls?: string[];
  claim_status: string;
}

export const AdminClaimsDashboard: React.FC = () => {
  const { user } = useAuth();
  const { notifyClaimResolved } = useNotifications();
  const [claims, setClaims] = useState<Claim[]>([]);

  const fetchClaims = async () => {
    const { data, error } = await supabase.from('claims').select('*').eq('claim_status', 'pending');
    if (error) console.error(error);
    else setClaims(data || []);
  };

  useEffect(() => {
    fetchClaims();
  }, []);

  const handleDecision = async (claimId: string, approve: boolean) => {
    const { error } = await supabase
      .from('claims')
      .update({ claim_status: approve ? 'approved' : 'rejected' })
      .eq('id', claimId);
    if (error) {
      toast.error('Eroare la actualizarea revendicării');
      console.error(error);
      return;
    }

    // Send notification about claim resolution
    try {
      const claim = claims.find(c => c.id === claimId);
      if (claim) {
        await notifyClaimResolved(
          claim.booking_id,
          approve ? 'approved' : 'rejected',
          approve ? 'Reclamarea a fost aprobată' : 'Reclamarea a fost respinsă'
        );
      }
    } catch (notificationError) {
      console.error('Error sending claim resolution notification:', notificationError);
    }

    // Broadcast status change
    await fetch('/functions/v1/claim-status-broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ booking_id: claims.find(c => c.id === claimId)?.booking_id, claim_status: approve ? 'approved' : 'rejected' }),
    });

    // Get claim details to determine who filed it
    try {
      const claim = claims.find(c => c.id === claimId);
      if (claim) {
        const bookingId = claim.booking_id;
        
        // Get the booking to determine who filed the claim
        const { data: bookingData } = await supabase
          .from('bookings')
          .select('owner_id, renter_id')
          .eq('id', bookingId)
          .single();

        if (bookingData) {
          // Determine who filed the claim by checking claimant_id against owner_id and renter_id
          const isOwnerClaim = claim.claimant_id === bookingData.owner_id;
          const isRenterClaim = claim.claimant_id === bookingData.renter_id;
          
          // Determine the correct release type based on who filed and admin decision
          let releaseType: string;
          
          if (isOwnerClaim) {
            // Owner filed the claim
            releaseType = approve ? 'claim_owner' : 'claim_denied';
          } else if (isRenterClaim) {
            // Renter filed the claim
            releaseType = approve ? 'claim_renter' : 'claim_owner';
          } else {
            // Fallback: use the old logic if claimant_id doesn't match either
            console.warn('Claimant ID does not match owner or renter ID, using fallback logic');
            releaseType = approve ? 'claim_owner' : 'claim_denied';
          }

          console.log(`Claim resolution: ${isOwnerClaim ? 'Owner' : isRenterClaim ? 'Renter' : 'Unknown'} filed claim, Admin ${approve ? 'approved' : 'rejected'}, Release type: ${releaseType}`);

          // Trigger escrow release accordingly
          await fetch('/functions/v1/escrow-release', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              booking_id: bookingId,
              release_type: releaseType,
            }),
          });
        }
      }
    } catch (escrowError) {
      console.error('Error determining claim release type:', escrowError);
      toast.error('Eroare la determinarea tipului de eliberare');
    }

    toast.success('Status revendicare actualizat');
    fetchClaims();
  };

  if (!user) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Pending Claims</h2>
      {claims.map((claim) => (
        <div key={claim.id} className="border p-4 rounded">
          <p className="mb-2">{claim.description}</p>
          {claim.evidence_urls?.map((url: string) => (
            <img key={url} src={url} alt="evidence" className="h-32 mb-2" />
          ))}
          <div className="flex gap-2">
            <Button onClick={() => handleDecision(claim.id, true)}>Approve</Button>
            <Button variant="outline" onClick={() => handleDecision(claim.id, false)}>Reject</Button>
          </div>
        </div>
      ))}
    </div>
  );
}; 