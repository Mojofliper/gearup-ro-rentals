import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { 
  Loader2, AlertTriangle, CheckCircle, XCircle, Eye, 
  Clock, ShieldCheck, DollarSign, Calendar
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';

interface Claim {
  id: string;
  booking_id: string;
  claimant_id: string;
  owner_id?: string;
  renter_id?: string;
  claim_type: string;
  claim_status: string;
  description: string;
  amount_requested?: number;
  evidence_photos?: any;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  claimant?: {
    full_name?: string;
    email?: string;
  };
  booking?: {
    total_amount?: number;
    start_date?: string;
    end_date?: string;
  };
}

export const ClaimsPanel: React.FC = () => {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'under_review' | 'approved' | 'rejected'>('all');

  const loadClaims = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('claims')
        .select(`
          *,
          claimant:users!claims_claimant_id_fkey(full_name, email),
          booking:bookings!claims_booking_id_fkey(total_amount, start_date, end_date)
        `)
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('claim_status', filter);
      }

      const { data, error } = await query;

      if (error) {
        console.log('Claims table not available:', error);
        setClaims([]);
        return;
      }

      setClaims(data || []);
    } catch (error) {
      console.error('Error loading claims:', error);
      toast.error('Eroare la încărcarea reclamațiilor');
      setClaims([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClaims();
  }, [filter]);

  const updateClaimStatus = async (claimId: string, status: 'approved' | 'rejected' | 'under_review') => {
    try {
      const { error } = await supabase
        .from('claims')
        .update({ claim_status: status })
        .eq('id', claimId);

      if (error) {
        console.error('Error updating claim status:', error);
        toast.error('Eroare la actualizarea reclamației');
        return;
      }

      // Broadcast status change
      await fetch('/functions/v1/claim-status-broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          booking_id: claims.find(c => c.id === claimId)?.booking_id, 
          claim_status: status 
        }),
      });

      // Only trigger escrow release for APPROVED claims
      if (status === 'approved') {
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
              
              // Determine the correct release type based on who filed the claim
              let releaseType: string;
              
              if (isOwnerClaim) {
                // Owner filed the claim and it was approved
                releaseType = 'claim_owner';
              } else if (isRenterClaim) {
                // Renter filed the claim and it was approved
                releaseType = 'claim_renter_approved';
              } else {
                // Fallback: use the old logic if claimant_id doesn't match either
                console.warn('Claimant ID does not match owner or renter ID, using fallback logic');
                releaseType = 'claim_owner';
              }

              console.log(`Claim approved: ${isOwnerClaim ? 'Owner' : isRenterClaim ? 'Renter' : 'Unknown'} filed claim, Release type: ${releaseType}`);

              // Call escrow release function with correct release type
              const response = await fetch('https://wnrbxwzeshgblkfidayb.supabase.co/functions/v1/escrow-release', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
                },
                body: JSON.stringify({
                  booking_id: claim.booking_id,
                  release_type: releaseType,
                }),
              });

              if (!response.ok) {
                console.error('Escrow release failed:', await response.text());
                toast.error('Eroare la eliberarea fondurilor din escrow');
              } else {
                console.log('Escrow release successful');
              }
            }
          }
        } catch (escrowError) {
          console.error('Error triggering escrow release:', escrowError);
          toast.error('Eroare la eliberarea fondurilor din escrow');
        }
      }
      // If claim is rejected, no escrow release - funds stay in escrow for normal rental flow

      // Broadcast status change
      await fetch('/functions/v1/claim-status-broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          booking_id: claims.find(c => c.id === claimId)?.booking_id, 
          claim_status: status 
        }),
      });

      // Get claim details to determine who filed it and trigger escrow release
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
              releaseType = status === 'approved' ? 'claim_owner' : 'claim_denied';
            } else if (isRenterClaim) {
              // Renter filed the claim
              releaseType = status === 'approved' ? 'claim_renter_approved' : 'claim_owner';
            } else {
              // Fallback: use the old logic if claimant_id doesn't match either
              console.warn('Claimant ID does not match owner or renter ID, using fallback logic');
              releaseType = status === 'approved' ? 'claim_owner' : 'claim_denied';
            }

            console.log(`Claim resolution: ${isOwnerClaim ? 'Owner' : isRenterClaim ? 'Renter' : 'Unknown'} filed claim, Admin ${status}, Release type: ${releaseType}`);

            // Call escrow release function with correct release type
            const response = await fetch('https://wnrbxwzeshgblkfidayb.supabase.co/functions/v1/escrow-release', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
              },
              body: JSON.stringify({
                booking_id: claim.booking_id,
                release_type: releaseType,
              }),
            });

            if (!response.ok) {
              console.error('Escrow release failed:', await response.text());
              toast.error('Eroare la eliberarea fondurilor din escrow');
            } else {
              console.log('Escrow release successful');
            }
          }
        }
      } catch (escrowError) {
        console.error('Error triggering escrow release:', escrowError);
        toast.error('Eroare la eliberarea fondurilor din escrow');
      }

      toast.success(`Reclamația a fost ${status === 'approved' ? 'aprobată' : status === 'rejected' ? 'respinsă' : 'actualizată'} cu succes`);
      loadClaims();
    } catch (error) {
      console.error('Error in updateClaimStatus:', error);
      toast.error('Eroare la actualizarea reclamației');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'În așteptare', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      under_review: { label: 'În revizuire', color: 'bg-blue-100 text-blue-800', icon: Eye },
      approved: { label: 'Aprobată', color: 'bg-green-100 text-green-800', icon: CheckCircle },
      rejected: { label: 'Respinsă', color: 'bg-red-100 text-red-800', icon: XCircle },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge className={config.color}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const getClaimTypeLabel = (type: string) => {
    const typeLabels = {
      damage: 'Daune',
      late_return: 'Întârziere returnare',
      missing_item: 'Element lipsă',
      other: 'Altele'
    };
    return typeLabels[type as keyof typeof typeLabels] || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Se încarcă reclamațiile...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gestionare Reclamații</h2>
          <p className="text-gray-600">Administrează reclamațiile și dispute</p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            Toate ({claims.length})
          </Button>
          <Button
            variant={filter === 'pending' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('pending')}
          >
            În așteptare
          </Button>
          <Button
            variant={filter === 'under_review' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('under_review')}
          >
            În revizuire
          </Button>
        </div>
      </div>

      {claims.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nu există reclamații</h3>
            <p className="text-gray-600">Nu s-au găsit reclamații cu criteriile selectate.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {claims.map((claim) => (
            <Card key={claim.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <ShieldCheck className="h-5 w-5 text-blue-600" />
                    <div>
                      <CardTitle className="text-lg">
                        {getClaimTypeLabel(claim.claim_type)}
                      </CardTitle>
                      <p className="text-sm text-gray-600">
                        Reclamație #{claim.id.slice(0, 8)} • {format(new Date(claim.created_at), 'dd MMMM yyyy', { locale: ro })}
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(claim.claim_status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-2">Detalii Reclamație</h4>
                    <p className="text-sm text-gray-700 mb-3">{claim.description}</p>
                    
                    {claim.amount_requested && (
                      <div className="flex items-center space-x-2 mb-2">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium">
                          Sumă solicitată: {claim.amount_requested} RON
                        </span>
                      </div>
                    )}

                    {claim.booking && (
                      <div className="flex items-center space-x-2 mb-2">
                        <Calendar className="h-4 w-4 text-blue-600" />
                        <span className="text-sm">
                          Rezervare: {claim.booking.total_amount} RON
                        </span>
                      </div>
                    )}

                    {claim.claimant && (
                      <div className="text-sm text-gray-600">
                        <p><strong>Reclamant:</strong> {claim.claimant.full_name || claim.claimant.email}</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Acțiuni</h4>
                    <div className="space-y-2">
                      {claim.claim_status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            className="w-full"
                            onClick={() => updateClaimStatus(claim.id, 'under_review')}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Marchează pentru revizuire
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full"
                            onClick={() => updateClaimStatus(claim.id, 'approved')}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Aprobă
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="w-full"
                            onClick={() => updateClaimStatus(claim.id, 'rejected')}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Respinge
                          </Button>
                        </>
                      )}

                      {claim.claim_status === 'under_review' && (
                        <>
                          <Button
                            size="sm"
                            className="w-full"
                            onClick={() => updateClaimStatus(claim.id, 'approved')}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Aprobă
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="w-full"
                            onClick={() => updateClaimStatus(claim.id, 'rejected')}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Respinge
                          </Button>
                        </>
                      )}

                      {(claim.claim_status === 'approved' || claim.claim_status === 'rejected') && (
                        <div className="text-sm text-gray-600">
                          <p><strong>Status:</strong> {claim.claim_status === 'approved' ? 'Aprobată' : 'Respinsă'}</p>
                          {claim.resolved_at && (
                            <p><strong>Rezolvată la:</strong> {format(new Date(claim.resolved_at), 'dd MMMM yyyy', { locale: ro })}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {claim.admin_notes && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <h5 className="font-medium text-sm mb-1">Note Admin:</h5>
                    <p className="text-sm text-gray-700">{claim.admin_notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}; 