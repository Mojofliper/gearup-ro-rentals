import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const ClaimTest: React.FC = () => {
  const { user } = useAuth();
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const testCreateClaim = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // First, get a booking to test with
      const { data: bookings, error: bookingError } = await supabase
        .from('bookings')
        .select('id, payment_status, escrow_status')
        .eq('owner_id', user.id)
        .limit(1);

      if (bookingError || !bookings || bookings.length === 0) {
        toast.error('No bookings found for testing');
        return;
      }

      const booking = bookings[0];
      
      // Test claim creation
      const { data, error } = await supabase
        .from('claims')
        .insert({
          booking_id: booking.id,
          claimant_id: user.id,
          claim_type: 'damage',
          description: 'Test claim for system verification',
          claim_status: 'pending'
        })
        .select()
        .single();

      if (error) {
        console.error('Claim creation error:', error);
        toast.error(`Failed to create claim: ${error.message}`);
      } else {
        console.log('Claim created successfully:', data);
        toast.success('Test claim created successfully!');
        loadClaims();
      }
    } catch (err) {
      console.error('Test error:', err);
      toast.error('Test failed');
    } finally {
      setLoading(false);
    }
  };

  const loadClaims = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('claims')
        .select('*')
        .eq('claimant_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading claims:', error);
        toast.error('Failed to load claims');
      } else {
        setClaims(data || []);
      }
    } catch (err) {
      console.error('Error:', err);
    }
  };

  useEffect(() => {
    loadClaims();
  }, [user]);

  if (!user) {
    return <div>Please log in to test claims</div>;
  }

  return (
    <div className="space-y-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle>Claims System Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={testCreateClaim} 
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Testing...' : 'Test Claim Creation'}
          </Button>
          
          <div>
            <h3 className="font-medium mb-2">Your Claims ({claims.length})</h3>
            {claims.length === 0 ? (
              <p className="text-gray-500">No claims found</p>
            ) : (
              <div className="space-y-2">
                {claims.map((claim) => (
                  <div key={claim.id} className="p-3 border rounded">
                    <p><strong>Type:</strong> {claim.claim_type}</p>
                    <p><strong>Status:</strong> {claim.claim_status}</p>
                    <p><strong>Description:</strong> {claim.description}</p>
                    <p><strong>Created:</strong> {new Date(claim.created_at).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 