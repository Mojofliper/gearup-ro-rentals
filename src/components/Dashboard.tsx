import React, { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AvatarUpload } from '@/components/AvatarUpload';
import { useAuth } from '@/contexts/AuthContext';
import { useUserBookings, useUserListings, useUserReviews, useUserStats } from '@/hooks/useUserData';
import { useAcceptBooking, useConfirmReturn } from '@/hooks/useBookings';
import { EditGearModal } from '@/components/EditGearModal';
import { ReviewModal } from '@/components/ReviewModal';
import { useDeleteGear } from '@/hooks/useGear';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { ConfirmationSystem } from '@/components/ConfirmationSystem';
import { Star, MapPin, Calendar, Edit, Shield, Package, AlertCircle, Eye, Settings, CheckCircle, CreditCard, Trash2, XCircle, Camera, Loader2 } from 'lucide-react';
import { PaymentModal } from '@/components/PaymentModal';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { PaymentService } from '@/services/paymentService';
import { ErrorBoundary } from './ErrorBoundary';
import { DashboardSkeleton, BookingSkeleton } from './LoadingSkeleton';
import { supabase } from '../integrations/supabase/client';
import { useStripeConnect } from '@/hooks/useStripeConnect';
import { StripeConnectModal } from './StripeConnectModal';
import { ClaimStatusBadge } from '@/components/ClaimStatusBadge';
import { OwnerClaimForm } from '@/components/OwnerClaimForm';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PickupLocationModal } from '@/components/PickupLocationModal';
import { BookingFlowGuard } from '@/components/BookingFlowGuard';
import { ReviewManagement } from '@/components/ReviewManagement';
import { PushNotificationSetup } from '@/components/PushNotificationSetup';
import { RateLimitFeedback } from '@/components/RateLimitFeedback';
import { PhotoComparison } from '@/components/PhotoComparison';

export const Dashboard: React.FC = () => {
  const { user, profile, updateProfile } = useAuth();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState(profile?.avatar_url || '');
  const [formData, setFormData] = useState({
    first_name: profile?.first_name || '',
    last_name: profile?.last_name || '',
    location: profile?.location && profile.location !== 'Unknown' ? profile.location : '',
  });

  // Stripe Connect integration
  const { connectedAccount, loading: stripeLoading, error: stripeError } = useStripeConnect();
  const [showStripeOnboarding, setShowStripeOnboarding] = useState(false);

  const { data: bookings = [], isLoading: bookingsLoading } = useUserBookings();
  const { data: listings = [], isLoading: listingsLoading } = useUserListings();
  const { data: reviews = [], isLoading: reviewsLoading } = useUserReviews();
  const { data: stats, isLoading: statsLoading } = useUserStats();
  
  // Filter bookings to separate user bookings (as renter) from owner bookings
  const userBookings = (bookings as any[]).filter(booking => booking.renter_id === user?.id);
  const ownerBookings = (bookings as any[]).filter(booking => booking.owner_id === user?.id);
  const ownerBookingsLoading = bookingsLoading;
  
  const { mutate: acceptBooking } = useAcceptBooking();
  const { mutate: confirmReturn } = useConfirmReturn();
  const { mutate: deleteGear, isPending: deleteLoading } = useDeleteGear();
  
  const [editingGear, setEditingGear] = useState<Record<string, unknown> | null>(null);
  const [reviewingBooking, setReviewingBooking] = useState<Record<string, unknown> | null>(null);
  const [deletingGearId, setDeletingGearId] = useState<string | null>(null);
  const [paymentBooking, setPaymentBooking] = useState<Record<string, unknown> | null>(null);
  const [paymentTransaction, setPaymentTransaction] = useState<Record<string, unknown> | null>(null);
  const [confirmationBooking, setConfirmationBooking] = useState<Record<string, unknown> | null>(null);
  const [confirmationType, setConfirmationType] = useState<'pickup' | 'return'>('pickup');

  const [claimStatuses, setClaimStatuses] = useState<Record<string, 'pending' | 'approved' | 'rejected'>>({});
  const [claimBooking, setClaimBooking] = useState<any | null>(null);

  const [pickupBooking, setPickupBooking] = useState<any | null>(null);
  const [showBookingFlow, setShowBookingFlow] = useState<string | null>(null);

  // Sync local state with profile data
  useEffect(() => {
    if (profile) {
      setCurrentAvatarUrl(profile.avatar_url || '');
      setFormData({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        location: profile.location && profile.location !== 'Unknown' ? profile.location : '',
      });
    }
  }, [profile]);

  // Load claim statuses for user bookings
  useEffect(() => {
    const loadClaims = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from('claims')
        .select('id, booking_id, claim_status')
        .in('booking_id', [
          ...bookings.map(b => b.id),
        ]);
      if (error) {
        console.error('Error loading claims', error);
        return;
      }
      const map: Record<string, 'pending' | 'approved' | 'rejected'> = {};
      (data || []).forEach(c => {
        map[c.booking_id] = c.claim_status;
      });
      setClaimStatuses(map);
    };
    loadClaims();

    // Realtime subscription
    const channel = supabase.channel('claims_updates');
    channel.on('broadcast', { event: 'claim_status_changed' }, payload => {
      const claim = payload.payload as { booking_id: string; claim_status: 'pending' | 'approved' | 'rejected' };
      setClaimStatuses(prev => ({ ...prev, [claim.booking_id]: claim.claim_status }));
    });
    channel.subscribe();
    return () => {
      channel.unsubscribe();
    };
  }, [user, bookings]);

  // Financial analytics data
  const { data: financialData, isLoading: financialLoading } = useQuery({
    queryKey: ['user-financials', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      try {
        // Get transactions for the user (using the correct transactions table)
        let transactionData = null;
        let transactionError = null;
        
        if (bookings.length > 0) {
          const result = await supabase
            .from('transactions')
            .select('booking_id, rental_amount, deposit_amount, platform_fee, status, created_at')
            .in('booking_id', bookings.map(b => b.id));
          
          transactionData = result.data;
          transactionError = result.error;
        }

        if (transactionError) {
          console.error('Error fetching transactions:', transactionError);
          // Return default values instead of throwing to prevent infinite retries
          return {
            totalRevenue: 0,
            totalSpent: 0,
            pendingEscrow: 0,
            transactionCount: 0,
            paymentCount: 0
          };
        }

        // Calculate totals from transactions
        const totalRevenue = transactionData?.filter(t => t.status === 'completed' && 
          // Check if user is owner of the booking
          bookings.some(b => b.id === t.booking_id && b.owner_id === user.id))
          .reduce((sum, t) => sum + (t.rental_amount || 0), 0) || 0;
        
        const totalSpent = transactionData?.filter(t => t.status === 'completed' && 
          // Check if user is renter of the booking
          bookings.some(b => b.id === t.booking_id && b.renter_id === user.id))
          .reduce((sum, t) => sum + (t.rental_amount || 0) + (t.deposit_amount || 0) + (t.platform_fee || 0), 0) || 0;
        
        const pendingEscrow = transactionData?.filter(t => t.status === 'processing' || t.status === 'pending')
          .reduce((sum, t) => sum + (t.rental_amount || 0) + (t.deposit_amount || 0), 0) || 0;

        return {
          totalRevenue,
          totalSpent,
          pendingEscrow,
          transactionCount: transactionData?.length || 0,
          paymentCount: transactionData?.filter(t => t.status === 'completed').length || 0
        };
      } catch (error) {
        console.error('Error in financial analytics query:', error);
        // Return default values to prevent infinite retries
        return {
          totalRevenue: 0,
          totalSpent: 0,
          pendingEscrow: 0,
          transactionCount: 0,
          paymentCount: 0
        };
      }
    },
    enabled: !!user,
    retry: 1, // Limit retries to prevent infinite loops
    retryDelay: 1000, // Wait 1 second between retries
  });

  if (!user || !profile) return <DashboardSkeleton />;

  // Generate actionable alerts based on Stripe Connect status
  const actionableAlerts = [];
  
  if (!connectedAccount) {
    actionableAlerts.push({
      type: 'stripe',
      message: 'Configurați-vă contul Stripe Connect pentru a primi plăți.',
      cta: 'Configurare',
      onClick: () => setShowStripeOnboarding(true),
      variant: 'warning' as const,
    });
  } else if (connectedAccount.account_status === 'connect_required') {
    actionableAlerts.push({
      type: 'stripe',
      message: 'Stripe Connect trebuie activat pentru contul tău. Contactează suportul.',
      cta: 'Contactează suportul',
      onClick: () => setShowStripeOnboarding(true),
      variant: 'destructive' as const,
    });
  } else if (connectedAccount.account_status === 'pending') {
    actionableAlerts.push({
      type: 'stripe',
      message: 'Contul Stripe Connect este în așteptare de verificare.',
      cta: 'Verifică status',
      onClick: () => setShowStripeOnboarding(true),
      variant: 'warning' as const,
    });
  } else if (connectedAccount.account_status === 'restricted') {
    actionableAlerts.push({
      type: 'stripe',
      message: 'Contul Stripe Connect este restricționat. Contactați suportul.',
      cta: 'Verifică status',
      onClick: () => setShowStripeOnboarding(true),
      variant: 'destructive' as const,
    });
  } else if (!connectedAccount.payouts_enabled) {
    actionableAlerts.push({
      type: 'stripe',
      message: 'Payouts nu sunt activate. Finalizați configurarea contului.',
      cta: 'Finalizează',
      onClick: () => setShowStripeOnboarding(true),
      variant: 'warning' as const,
    });
  }

  // Type assertions for data with relations
  // Only show bookings where user is the renter in the renter tab
  const bookingsWithRelations = (bookings as any[]).filter(booking => booking.renter_id === user.id);
  const listingsWithRelations = listings as any[];
  // Map ownerBookingsWithRelations to ensure .renter and .gear fields are always present
  const ownerBookingsWithRelations = ownerBookings.map((booking) => ({
    ...booking,
    renter: booking.renter || booking["renter"] || { id: booking.renter_id, full_name: booking.renter_full_name || null },
    owner: booking.owner || booking["owner"] || { id: booking.owner_id, full_name: booking.owner_full_name || null },
    gear: booking.gear || booking["gear"] || null,
  }));
  
  // Debug logging for mapped data
  // console.log('ownerBookingsWithRelations:', ownerBookingsWithRelations);
  // console.log('Sample booking structure:', ownerBookingsWithRelations[0]);

  const handleSave = async () => {
    await updateProfile(formData);
    setIsEditing(false);
  };

  const handleAvatarUpdate = (newAvatarUrl: string) => {
    setCurrentAvatarUrl(newAvatarUrl);
    // Extrage doar path-ul relativ dacă e URL complet
    let avatarPath = newAvatarUrl;
    if (newAvatarUrl.startsWith('http')) {
      const idx = newAvatarUrl.indexOf('/avatars/');
      if (idx !== -1) {
        avatarPath = newAvatarUrl.substring(idx + 9); // 9 = length of '/avatars/'
      }
    }
    updateProfile({ avatar_url: avatarPath });
  };

  const handleBookingAction = (bookingId: string, status: 'confirmed' | 'rejected') => {
    if (status === 'confirmed') {
      acceptBooking({ bookingId, pickupLocation: 'To be set' }, {
      onSuccess: () => {
        toast({
            title: 'Rezervare acceptată!',
            description: 'Închiriatorul a fost notificat despre acceptarea rezervării.',
        });
      },
      onError: (error: unknown) => {
        toast({
          title: 'Eroare',
          description: 'Nu s-a putut actualiza starea rezervării.',
          variant: 'destructive',
        });
        console.error('Booking update error:', error);
      }
    });
    } else {
      // For rejected bookings, we'll need to implement a reject function
      toast({
        title: 'Funcționalitate în dezvoltare',
        description: 'Respingerea rezervărilor va fi implementată în curând.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteGear = async (gearId: string) => {
    if (!confirm('Ești sigur că vrei să ștergi acest echipament? Această acțiune nu poate fi anulată.')) {
      return;
    }

    setDeletingGearId(gearId);
    
    try {
      await deleteGear(gearId);
      
      // Invalidate and refetch all gear-related queries to update the UI instantly
      // This will automatically remove the deleted item from all lists
      queryClient.invalidateQueries({ queryKey: ['user-listings', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['user-stats'] });
      queryClient.invalidateQueries({ queryKey: ['gear', 'list'] }); // Main gear list
      queryClient.invalidateQueries({ queryKey: ['gear'] }); // Individual gear queries
      
      toast({
        title: 'Echipament șters!',
        description: 'Echipamentul a fost șters cu succes din dashboard.',
      });
    } catch (error: unknown) {
      toast({
        title: 'Eroare',
        description: 'Nu s-a putut șterge echipamentul. Te rugăm să încerci din nou.',
        variant: 'destructive',
      });
      console.error('Delete gear error:', error);
    } finally {
      setDeletingGearId(null);
    }
  };

  const handleConfirmation = (booking: Record<string, unknown>, type: 'pickup' | 'return') => {
    setConfirmationBooking(booking);
    setConfirmationType(type);
  };

  const handlePaymentClick = async (booking: Record<string, unknown>) => {
    try {
      const session = await supabase.auth.getSession();
      
      // Test RLS by trying to fetch the booking first
      const { data: bookingTest, error: bookingError } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', booking.id)
        .single();
      
      const transaction = await PaymentService.getOrCreateTransactionForBooking(booking);
      setPaymentTransaction(transaction);
      setPaymentBooking(booking);
    } catch (error: unknown) {
      console.error('Error creating transaction:', error);
      toast({
        title: 'Eroare',
        description: 'Nu s-a putut inițializa plata. Te rugăm să încerci din nou.',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default">Finalizat</Badge>;
      case 'active':
        return <Badge variant="secondary">În curs</Badge>;
      case 'confirmed':
        return <Badge variant="secondary">Confirmat</Badge>;
      case 'pending':
        return <Badge variant="outline">În așteptare</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Anulat</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Get the full avatar URL - use profile.avatar_url as the source of truth
  const fullAvatarUrl = profile?.avatar_url 
    ? profile.avatar_url.startsWith('http') 
      ? profile.avatar_url 
      : `https://wnrbxwzeshgblkfidayb.supabase.co/storage/v1/object/public/avatars/${profile.avatar_url}`
    : '';

  // Get full name from first_name and last_name
  const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'User';

  return (
    <ErrorBoundary>
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        {/* Profile Header */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-6">
              <div className="flex flex-col items-center space-y-4">
                <AvatarUpload 
                  currentAvatarUrl={fullAvatarUrl}
                  onAvatarUpdate={handleAvatarUpdate}
                />
              </div>
              
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h1 className="text-2xl font-bold">{fullName}</h1>
                  {profile.is_verified && (
                    <Badge variant="secondary">
                      <Shield className="h-3 w-3 mr-1" />
                      Verificat
                    </Badge>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setIsEditing(!isEditing)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Editează
                  </Button>
                </div>
                
                <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-3">
                  <div className="flex items-center space-x-1">
                    <MapPin className="h-4 w-4" />
                    <span>{profile.location && profile.location !== 'Unknown' ? profile.location : 'Locație nedefinită'}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-4 w-4" />
                    <span>Membru din {stats?.joinDate || new Date().getFullYear()}</span>
                  </div>
                  {stats && stats.reviews > 0 && (
                    <div className="flex items-center space-x-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span>{stats.rating} ({stats.reviews} recenzii)</span>
                    </div>
                  )}
                </div>
                {/* Stripe Connect Status */}
                <div className="flex items-center space-x-2 mt-2">
                  {connectedAccount ? (
                    <>
                      <Badge variant={
                        connectedAccount.account_status === 'active' ? 'default' : 
                        connectedAccount.account_status === 'connect_required' ? 'destructive' :
                        'secondary'
                      }>
                        Stripe: {
                          connectedAccount.account_status === 'active' ? 'Activ' : 
                          connectedAccount.account_status === 'connect_required' ? 'Configurare necesară' :
                          connectedAccount.account_status
                        }
                      </Badge>
                      {connectedAccount.account_status === 'connect_required' && (
                        <Badge variant="outline">Contactează suportul</Badge>
                      )}
                      {!connectedAccount.payouts_enabled && connectedAccount.account_status !== 'connect_required' && (
                        <Badge variant="outline">Payouts dezactivate</Badge>
                      )}
                    </>
                  ) : (
                    <Badge variant="outline">Stripe: Neconfigurat</Badge>
                  )}
                </div>
              </div>
            </div>

            {isEditing && (
              <div className="mt-6 pt-6 border-t space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">Nume</Label>
                    <Input
                      id="first_name"
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      placeholder="Primul nume"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Prenume</Label>
                    <Input
                      id="last_name"
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      placeholder="Ultimul nume"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Locație</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Orașul tău"
                  />
                </div>
                <div className="flex space-x-2">
                  <Button onClick={handleSave}>Salvează</Button>
                  <Button variant="outline" onClick={() => setIsEditing(false)}>Anulează</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actionable Alerts */}
        {actionableAlerts.length > 0 && (
          <div className="mb-6 space-y-2">
            {actionableAlerts.map((alert, idx) => (
              <Card key={idx} className={`border-l-4 ${
                alert.variant === 'destructive' ? 'border-red-400 bg-red-50' : 
                alert.variant === 'warning' ? 'border-yellow-400 bg-yellow-50' : 
                'border-blue-400 bg-blue-50'
              }`}>
                <CardContent className="flex items-center justify-between p-4">
                  <span>{alert.message}</span>
                  <Button size="sm" onClick={alert.onClick}>{alert.cta}</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Package className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Echipamente</p>
                                         <p className="text-2xl font-bold">{stats.totalListings}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Rezervări</p>
                                         <p className="text-2xl font-bold">{stats.totalRentals}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Star className="h-5 w-5 text-yellow-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Rating</p>
                    <p className="text-2xl font-bold">{stats.reviews > 0 ? stats.rating : 'N/A'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Eye className="h-5 w-5 text-purple-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Recenzii</p>
                    <p className="text-2xl font-bold">{stats.reviews || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Financial Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {/* TODO: Replace with real financial data */}
          <Card><CardContent className="p-4"><div><p className="text-sm text-muted-foreground">Total câștigat</p><p className="text-2xl font-bold">0 RON</p></div></CardContent></Card>
          <Card><CardContent className="p-4"><div><p className="text-sm text-muted-foreground">În așteptare (escrow)</p><p className="text-2xl font-bold">0 RON</p></div></CardContent></Card>
          <Card><CardContent className="p-4"><div><p className="text-sm text-muted-foreground">Taxe platformă</p><p className="text-2xl font-bold">0 RON</p></div></CardContent></Card>
          <Card><CardContent className="p-4"><div><p className="text-sm text-muted-foreground">Payouts</p><p className="text-2xl font-bold">0 RON</p></div></CardContent></Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="bookings" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="bookings">Rezervările mele</TabsTrigger>
            <TabsTrigger value="listings">Echipamentele mele</TabsTrigger>
            <TabsTrigger value="owner">Ca proprietar</TabsTrigger>
            <TabsTrigger value="reviews">Recenzii</TabsTrigger>
            <TabsTrigger value="financials">Financiar</TabsTrigger>
            <TabsTrigger value="settings">Setări</TabsTrigger>
          </TabsList>

          {/* My Bookings Tab */}
          <TabsContent value="bookings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Rezervările mele</CardTitle>
              </CardHeader>
              <CardContent>
                {bookingsLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <BookingSkeleton key={index} />
                    ))}
                  </div>
                ) : bookings.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nu ai încă nicio rezervare.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {bookingsWithRelations.map((booking) => (
                      <div key={booking.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold">{booking.gear?.title}</h3>
                          <div className="flex items-center space-x-2">
                            {getStatusBadge(booking.status)}
                            <ClaimStatusBadge status={claimStatuses[booking.id]} />
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>De la: {format(new Date(booking.start_date), 'dd/MM/yyyy')}</p>
                          <p>Până la: {format(new Date(booking.end_date), 'dd/MM/yyyy')}</p>
                          <p>Total: {booking.total_amount} RON</p>
                          <p>Proprietar: {booking.owner?.full_name}</p>
                        </div>
                        <div className="flex space-x-2 mt-3">
                          {((booking.payment_status === 'pending' && booking.renter_id === user.id && booking.status !== 'cancelled') ||
                            ((!booking.payment_status || booking.payment_status === null) && booking.status === 'confirmed' && booking.renter_id === user.id)) && (
                            <Button
                              size="sm"
                              onClick={() => handlePaymentClick(booking)}
                            >
                              <CreditCard className="h-4 w-4 mr-1" />
                              Plătește
                            </Button>
                          )}
                          {booking.status === 'confirmed' && (
                            <Button 
                              size="sm" 
                              onClick={() => setShowBookingFlow(booking.id)}
                              className="flex items-center gap-2"
                            >
                              <Camera className="h-4 w-4" />
                              Continuă procesul
                            </Button>
                          )}
                          {booking.status === 'active' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleConfirmation(booking, 'pickup')}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Confirmă ridicare
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleConfirmation(booking, 'return')}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Confirmă returnare
                              </Button>
                            </>
                          )}
                          {booking.status === 'completed' && !booking.review_id && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setReviewingBooking(booking)}
                            >
                              <Star className="h-4 w-4 mr-1" />
                              Lasă o recenzie
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* My Listings Tab */}
          <TabsContent value="listings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Echipamentele mele</CardTitle>
              </CardHeader>
              <CardContent>
                {listingsLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <BookingSkeleton key={index} />
                    ))}
                  </div>
                ) : listings.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nu ai încă niciun echipament listat.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {listingsWithRelations.map((gear) => (
                      <div key={gear.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold">{gear.title}</h3>
                          <div className="flex items-center space-x-2">
                            <Badge variant={gear.status === 'available' ? 'default' : 'secondary'}>
                              {gear.status === 'available' ? 'Disponibil' : 'Indisponibil'}
                            </Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingGear(gear)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteGear(gear.id)}
                              disabled={deleteLoading && deletingGearId === gear.id}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>Preț: {gear.daily_rate} RON/zi</p>
                          <p>Garanție: {gear.deposit_amount} RON</p>
                          <p>Categorie: {gear.category_id}</p>
                          <p>Locație: {gear.location}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Owner Tab */}
          <TabsContent value="owner" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Rezervări pentru echipamentele mele</CardTitle>
              </CardHeader>
              <CardContent>
                {ownerBookingsLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <BookingSkeleton key={index} />
                    ))}
                  </div>
                ) : ownerBookings.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nu ai încă nicio rezervare pentru echipamentele tale.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {ownerBookingsWithRelations.map((booking) => (
                      <div key={booking.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold">{booking.gear?.title}</h3>
                          <div className="flex items-center space-x-2">
                            {getStatusBadge(booking.status)}
                            <ClaimStatusBadge status={claimStatuses[booking.id]} />
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>De la: {format(new Date(booking.start_date), 'dd/MM/yyyy')}</p>
                          <p>Până la: {format(new Date(booking.end_date), 'dd/MM/yyyy')}</p>
                          <p>Total: {booking.total_amount} RON</p>
                          <p>Închiriator: {booking.renter?.full_name || booking.renter_full_name || 'N/A'}</p>
                        </div>
                        {booking.status === 'pending' && (
                          <div className="flex space-x-2 mt-3">
                            <Button
                              size="sm"
                              onClick={() => handleBookingAction(booking.id, 'confirmed')}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Acceptă
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleBookingAction(booking.id, 'rejected')}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Respinge
                            </Button>
                          </div>
                        )}

                        {/* Claim damage button */}
                        {booking.payment_status === 'paid' && booking.escrow_status === 'held' && !claimStatuses[booking.id] && (
                          <div className="mt-3">
                            <Button size="sm" variant="destructive" onClick={() => setClaimBooking(booking)}>
                              Raportează daună
                            </Button>
                          </div>
                        )}

                                                  {booking.status === 'confirmed' && (
                            <div className="flex space-x-2 mt-3">
                              <Button 
                                size="sm" 
                                onClick={() => setShowBookingFlow(booking.id)}
                                className="flex items-center gap-2"
                              >
                                <Camera className="h-4 w-4" />
                                {!booking.pickup_lat ? 'Setează locație pickup' : 'Continuă procesul'}
                              </Button>
                              {!booking.pickup_lat && (
                                <Button size="sm" onClick={() => setPickupBooking(booking)}>
                                  Setează locație pickup
                                </Button>
                              )}
                            </div>
                          )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="reviews" className="space-y-4">
            <ReviewManagement />
          </TabsContent>

          {/* Financials Tab */}
          <TabsContent value="financials" className="space-y-4">
            {financialLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, index) => (
                  <BookingSkeleton key={index} />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Revenue Card */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Venit Total</CardTitle>
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{financialData?.totalRevenue || 0} RON</div>
                    <p className="text-xs text-muted-foreground">
                      Din {financialData?.transactionCount || 0} tranzacții
                    </p>
                  </CardContent>
                </Card>

                {/* Spent Card */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Cheltuieli Totale</CardTitle>
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{financialData?.totalSpent || 0} RON</div>
                    <p className="text-xs text-muted-foreground">
                      Din {financialData?.paymentCount || 0} plăți
                    </p>
                  </CardContent>
                </Card>

                {/* Pending Escrow Card */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Escrow În Așteptare</CardTitle>
                    <Shield className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{financialData?.pendingEscrow || 0} RON</div>
                    <p className="text-xs text-muted-foreground">
                      Fonduri blocate în escrow
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Stripe Connect Status */}
            <Card>
              <CardHeader>
                <CardTitle>Status Cont Stripe Connect</CardTitle>
              </CardHeader>
              <CardContent>
                {stripeLoading ? (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Se încarcă statusul...</span>
                  </div>
                ) : connectedAccount ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span>Status Cont:</span>
                      <Badge variant={connectedAccount.account_status === 'active' ? 'default' : 'secondary'}>
                        {connectedAccount.account_status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Payouts Activate:</span>
                      <Badge variant={connectedAccount.payouts_enabled ? 'default' : 'destructive'}>
                        {connectedAccount.payouts_enabled ? 'Da' : 'Nu'}
                      </Badge>
                    </div>
                    {connectedAccount.account_status !== 'active' && (
                      <Button onClick={() => setShowStripeOnboarding(true)}>
                        Finalizează Configurarea
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Nu ai încă un cont Stripe Connect configurat.
                    </p>
                    <Button onClick={() => setShowStripeOnboarding(true)}>
                      Configurează Contul Stripe
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Push Notifications */}
              <PushNotificationSetup />
              
              {/* Rate Limiting Status */}
              <Card>
                <CardHeader>
                  <CardTitle>Status Rate Limiting</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <RateLimitFeedback 
                    action="API calls" 
                    endpoint="api" 
                    showProgress={false}
                  />
                  <RateLimitFeedback 
                    action="messages" 
                    endpoint="messages" 
                    showProgress={false}
                  />
                  <RateLimitFeedback 
                    action="bookings" 
                    endpoint="bookings" 
                    showProgress={false}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Photo Documentation Tools */}
            <Card>
              <CardHeader>
                <CardTitle>Instrumente Documentare Foto</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Instrumente pentru compararea fotografiilor înainte și după închiriere pentru evaluarea daunelor.
                </p>
                <div className="p-4 border rounded-lg bg-gray-50">
                  <p className="text-sm text-gray-600">
                    Instrumentul de comparare foto va fi disponibil în timpul procesului de închiriere 
                    pentru a documenta starea echipamentului.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      {editingGear && (
        <EditGearModal
          isOpen={!!editingGear}
          gear={editingGear}
          onClose={() => setEditingGear(null)}
        />
      )}

      {reviewingBooking && (
        <ReviewModal
          isOpen={!!reviewingBooking}
          booking={reviewingBooking}
          onClose={() => setReviewingBooking(null)}
        />
      )}

      {paymentBooking && (
        <PaymentModal
          isOpen={!!paymentBooking}
          booking={paymentBooking}
          onClose={() => {
            setPaymentBooking(null);
            setPaymentTransaction(null);
          }}
        />
      )}

      {confirmationBooking && (
        <ConfirmationSystem
          isOpen={!!confirmationBooking}
          booking={confirmationBooking}
          type={confirmationType}
          onClose={() => setConfirmationBooking(null)}
        />
      )}

      {claimBooking && (
        <Dialog open={!!claimBooking} onOpenChange={() => setClaimBooking(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Revendicare daune</DialogTitle>
              <DialogDescription>
                Descrie daunele și încarcă dovezi foto.
              </DialogDescription>
            </DialogHeader>
            <OwnerClaimForm
              bookingId={claimBooking.id}
              onSubmitted={() => {
                setClaimBooking(null);
                // reload claims list
              }}
            />
          </DialogContent>
        </Dialog>
      )}

      {pickupBooking && (
        <PickupLocationModal
          bookingId={pickupBooking.id}
          isOpen={!!pickupBooking}
          onClose={() => setPickupBooking(null)}
          onSaved={() => {/* reload bookings */}}
        />
      )}

      <StripeConnectModal
        isOpen={showStripeOnboarding}
        onClose={() => setShowStripeOnboarding(false)}
      />

      {/* Booking Flow Guard Modal */}
      {showBookingFlow && (
        <Dialog open={!!showBookingFlow} onOpenChange={() => setShowBookingFlow(null)}>
          <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Procesul de închiriere</DialogTitle>
              <DialogDescription>
                {(() => {
                  const booking = [...bookingsWithRelations, ...ownerBookingsWithRelations]
                    .find(b => b.id === showBookingFlow);
                  const isOwner = booking?.owner_id === user?.id;
                  return isOwner ? 'Procesul pentru proprietar' : 'Procesul pentru închiriator';
                })()}
              </DialogDescription>
            </DialogHeader>
            {(() => {
              const booking = [...bookingsWithRelations, ...ownerBookingsWithRelations]
                .find(b => b.id === showBookingFlow);
              if (!booking) return null;
              
              const isOwner = booking.owner_id === user?.id;
              return (
                <BookingFlowGuard
                  bookingId={booking.id}
                  gearId={booking.gear_id}
                  isOwner={isOwner}
                  currentStatus={booking.status}
                  onStatusUpdate={(newStatus) => {
                    // Update local state and close modal
                    setShowBookingFlow(null);
                    // Refresh data
                    queryClient.invalidateQueries({ queryKey: ['userBookings'] });
                    queryClient.invalidateQueries({ queryKey: ['ownerBookings'] });
                  }}
                />
              );
            })()}
          </DialogContent>
        </Dialog>
      )}

      <Footer />
    </div>
    </ErrorBoundary>
  );
};
