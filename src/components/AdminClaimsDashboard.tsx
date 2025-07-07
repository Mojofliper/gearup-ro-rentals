import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const AdminClaimsDashboard: React.FC = () => {
  const { user } = useAuth();
  const [claims, setClaims] = useState<any[]>([]);

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

    // Broadcast status change
    await fetch('/functions/v1/claim-status-broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ booking_id: claims.find(c => c.id === claimId)?.booking_id, claim_status: approve ? 'approved' : 'rejected' }),
    });

    // Trigger escrow release accordingly
    await fetch('/functions/v1/escrow-release', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        booking_id: claims.find(c => c.id === claimId)?.booking_id,
        release_type: approve ? 'claim_owner' : 'claim_denied',
        deposit_to_owner: approve,
      }),
    });

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