import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { 
  Loader2, AlertTriangle, CheckCircle, XCircle, 
  Clock, ShieldCheck, DollarSign, Calendar, Image, Eye
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
  evidence_photos?: string[];
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
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

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

      // Parse evidence_photos if it's a string
      const processedData = (data || []).map(claim => ({
        ...claim,
        evidence_photos: typeof claim.evidence_photos === 'string' 
          ? JSON.parse(claim.evidence_photos) 
          : claim.evidence_photos || []
      }));

      setClaims(processedData);
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

  const updateClaimStatus = async (claimId: string, status: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('claims')
        .update({ 
          claim_status: status,
          resolved_at: new Date().toISOString()
        })
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
      
      toast.success(`Reclamație ${status === 'approved' ? 'aprobată' : 'respinsă'} cu succes`);
      await loadClaims(); // Reload to get updated data
    } catch (error) {
      console.error('Error in updateClaimStatus:', error);
      toast.error('Eroare la actualizarea reclamației');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'În așteptare', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
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
      quality_issue: 'Problemă calitate',
      other: 'Altă problemă'
    };
    return typeLabels[type as keyof typeof typeLabels] || type;
  };

  const ImageGallery = ({ photos }: { photos: string[] }) => {
    if (!photos || photos.length === 0) {
      return (
        <div className="text-center py-4 text-gray-500">
          <Image className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm">Nu există imagini încărcate</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Image className="h-4 w-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">Dovezi foto ({photos.length})</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {photos.map((photo, index) => (
            <div 
              key={index} 
              className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => setSelectedImage(photo)}
            >
              <img 
                src={photo} 
                alt={`Dovada ${index + 1}`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = '/placeholder.svg';
                }}
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-10 transition-all flex items-center justify-center">
                <Eye className="h-4 w-4 text-white opacity-0 hover:opacity-100 transition-opacity" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const ImageModal = ({ image, onClose }: { image: string | null; onClose: () => void }) => {
    if (!image) return null;

    return (
      <div 
        className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div className="relative max-w-4xl max-h-full">
          <img 
            src={image} 
            alt="Dovada foto"
            className="max-w-full max-h-full object-contain rounded-lg"
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
            className="absolute top-2 right-2 rounded-full w-8 h-8 p-0"
          >
            ×
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Gestionare Reclamații</h2>
          <p className="text-gray-600 text-sm sm:text-base">Administrează reclamațiile utilizatorilor</p>
        </div>
      </div>

      {/* Filters */}
      <Card className="rounded-xl">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
              className="rounded-xl"
            >
              Toate
            </Button>
            <Button
              variant={filter === 'pending' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('pending')}
              className="rounded-xl"
            >
              În așteptare
            </Button>
            <Button
              variant={filter === 'approved' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('approved')}
              className="rounded-xl"
            >
              Aprobate
            </Button>
            <Button
              variant={filter === 'rejected' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('rejected')}
              className="rounded-xl"
            >
              Respinse
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Claims Table - Mobile Card Layout */}
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Reclamații ({claims.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center space-y-4">
                <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                <p className="text-gray-600">Se încarcă reclamațiile...</p>
              </div>
            </div>
          ) : claims.length === 0 ? (
            <div className="text-center py-12">
              <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Nu există reclamații</h3>
              <p className="text-gray-600">Nu au fost găsite reclamații cu criteriile selectate.</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reclamant</TableHead>
                      <TableHead>Tip</TableHead>
                      <TableHead>Descriere</TableHead>
                      <TableHead>Sumă</TableHead>
                      <TableHead>Dovezi</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Acțiuni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {claims.map(claim => (
                      <TableRow key={claim.id}>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <ShieldCheck className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-medium">{claim.claimant?.full_name || 'Necunoscut'}</p>
                              <p className="text-sm text-gray-500">{claim.claimant?.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{getClaimTypeLabel(claim.claim_type)}</Badge>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm max-w-xs truncate">{claim.description}</p>
                        </TableCell>
                        <TableCell>
                          {claim.amount_requested ? (
                            <div className="flex items-center space-x-1">
                              <DollarSign className="h-3 w-3 text-green-600" />
                              <span className="font-medium">{claim.amount_requested} RON</span>
                            </div>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {claim.evidence_photos && claim.evidence_photos.length > 0 ? (
                            <div className="flex items-center space-x-1">
                              <Image className="h-3 w-3 text-blue-600" />
                              <span className="text-sm">{claim.evidence_photos.length} foto</span>
                            </div>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(claim.claim_status)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3 text-gray-400" />
                            <span className="text-sm">
                              {format(new Date(claim.created_at), 'dd MMM yyyy', { locale: ro })}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {claim.claim_status === 'pending' && (
                            <div className="flex items-center space-x-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateClaimStatus(claim.id, 'approved')}
                                className="h-7 px-2 rounded-lg bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                              >
                                Aprobă
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateClaimStatus(claim.id, 'rejected')}
                                className="h-7 px-2 rounded-lg bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                              >
                                Respinge
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card Layout */}
              <div className="lg:hidden space-y-4">
                {claims.map(claim => (
                  <Card key={claim.id} className="rounded-xl">
                    <CardContent className="p-4">
                      <div className="space-y-4">
                        {/* Claimant Info */}
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <ShieldCheck className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-base">{claim.claimant?.full_name || 'Necunoscut'}</p>
                            <p className="text-sm text-gray-500">{claim.claimant?.email}</p>
                          </div>
                          {getStatusBadge(claim.claim_status)}
                        </div>

                        {/* Claim Details */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">Tip:</span>
                            <Badge variant="outline">{getClaimTypeLabel(claim.claim_type)}</Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">Sumă:</span>
                            {claim.amount_requested ? (
                              <div className="flex items-center space-x-1">
                                <DollarSign className="h-3 w-3 text-green-600" />
                                <span className="font-medium">{claim.amount_requested} RON</span>
                              </div>
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">Data:</span>
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-3 w-3 text-gray-400" />
                              <span className="text-sm">
                                {format(new Date(claim.created_at), 'dd MMM yyyy', { locale: ro })}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Description */}
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-1">Descriere:</p>
                          <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{claim.description}</p>
                        </div>

                        {/* Evidence Photos */}
                        <ImageGallery photos={claim.evidence_photos || []} />

                        {/* Actions */}
                        {claim.claim_status === 'pending' && (
                          <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateClaimStatus(claim.id, 'approved')}
                              className="flex-1 rounded-xl bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                            >
                              Aprobă
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateClaimStatus(claim.id, 'rejected')}
                              className="flex-1 rounded-xl bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                            >
                              Respinge
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Image Modal */}
      <ImageModal image={selectedImage} onClose={() => setSelectedImage(null)} />
    </div>
  );
}; 