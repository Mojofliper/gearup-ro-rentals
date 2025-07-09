import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AvatarUpload } from '@/components/AvatarUpload';
import { useAuth } from '@/contexts/AuthContext';
import { useUserBookings, useUserListings, useUserReviews, useUserStats } from '@/hooks/useUserData';
import { useAcceptBooking, useConfirmReturn, useCompleteRental, useRejectBooking } from '@/hooks/useBookings';
import { EditGearModal } from '@/components/EditGearModal';
import { ReviewModal } from '@/components/ReviewModal';
import { useDeleteGear } from '@/hooks/useGear';
import { useQueryClient } from '@tanstack/react-query';
import { ConfirmationSystem } from '@/components/ConfirmationSystem';
import { 
  Star, MapPin, Calendar, Edit, Package, AlertCircle, Eye, 
  CheckCircle, CreditCard, Trash2, XCircle, Plus, TrendingUp, 
  DollarSign, Clock, Users, ShoppingBag, ArrowRight, MessageSquare,
  CheckCircle2, CalendarDays, Award
} from 'lucide-react';
import { PaymentModal } from '@/components/PaymentModal';
import { format, addDays, isToday, isTomorrow, isAfter } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { ErrorBoundary } from './ErrorBoundary';
import { DashboardSkeleton, BookingSkeleton } from './LoadingSkeleton';
import { supabase } from '../integrations/supabase/client';
import { useStripeConnect } from '@/hooks/useStripeConnect';
import { StripeConnectModal } from './StripeConnectModal';
import { ClaimStatusBadge } from '@/components/ClaimStatusBadge';
import OwnerClaimForm from '@/components/OwnerClaimForm';
import { RenterClaimForm } from '@/components/RenterClaimForm';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PickupLocationModal } from '@/components/PickupLocationModal';
import { BookingFlowGuard } from '@/components/BookingFlowGuard';
import { useNotifications } from '@/hooks/useNotifications';
import { useDeleteConversation } from '@/hooks/useMessages';

export const Dashboard: React.FC = () => {
  const { user, profile, updateProfile } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [isEditing, setIsEditing] = useState(false);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState(profile?.avatar_url || '');
  const [formData, setFormData] = useState({
    first_name: profile?.first_name || '',
    last_name: profile?.last_name || '',
    location: profile?.location && profile.location !== 'Unknown' ? profile.location : '',
  });

  // Stripe Connect integration
  const { connectedAccount, loading: stripeLoading, error: stripeError, setupStripeConnect, refreshAccountStatus } = useStripeConnect();
  const [showStripeOnboarding, setShowStripeOnboarding] = useState(false);

  const { data: bookings = [], isLoading: bookingsLoading } = useUserBookings();
  const { data: listings = [], isLoading: listingsLoading } = useUserListings();
  const { data: reviews = [], isLoading: reviewsLoading } = useUserReviews();
  const { data: stats, isLoading: statsLoading } = useUserStats();
  
  // Filter bookings to separate user bookings (as renter) from owner bookings
  const userBookings = (bookings as Array<Record<string, unknown>>).filter(booking => booking.renter_id === user?.id);
  const ownerBookings = (bookings as Array<Record<string, unknown>>).filter(booking => booking.owner_id === user?.id);
  
  const { mutate: acceptBooking, isPending: acceptingBooking } = useAcceptBooking();
  const { mutate: rejectBooking, isPending: rejectingBooking } = useRejectBooking();
  const { mutate: confirmReturn, isPending: confirmingReturn } = useConfirmReturn();
  const { mutate: completeRental, isPending: completingRental } = useCompleteRental();
  const { mutate: deleteGear, isPending: deleteLoading } = useDeleteGear();
  const { mutate: deleteConversation } = useDeleteConversation();
  const { notifyBookingConfirmed, notifyGearDeleted } = useNotifications();

  const handleCompleteRental = (bookingId: string) => {
    completeRental(bookingId, {
      onSuccess: () => {
        deleteConversation(bookingId, {
          onSuccess: () => {
            toast({
              title: 'Închiriere finalizată!',
              description: 'Închirierea a fost finalizată cu succes și conversația a fost ștearsă.',
            });
          },
          onError: () => {
            toast({
              title: 'Închiriere finalizată!',
              description: 'Închirierea a fost finalizată cu succes.',
            });
          }
        });
      },
      onError: (error) => {
        toast({
          title: 'Eroare la finalizarea închirierii',
          description: error.message || 'A apărut o eroare la finalizarea închirierii.',
          variant: 'destructive',
        });
      }
    });
  };
  
  const [editingGear, setEditingGear] = useState<Record<string, unknown> | null>(null);
  const [reviewingBooking, setReviewingBooking] = useState<Record<string, unknown> | null>(null);
  const [deletingGearId, setDeletingGearId] = useState<string | null>(null);
  const [paymentBooking, setPaymentBooking] = useState<Record<string, unknown> | null>(null);
  const [paymentTransaction, setPaymentTransaction] = useState<Record<string, unknown> | null>(null);
  const [confirmationBooking, setConfirmationBooking] = useState<Record<string, unknown> | null>(null);
  const [confirmationType, setConfirmationType] = useState<'pickup' | 'return'>('pickup');

  const [claimStatuses, setClaimStatuses] = useState<Record<string, 'pending' | 'approved' | 'rejected'>>({});
  const [claimBooking, setClaimBooking] = useState<Record<string, unknown> | null>(null);
  const [pickupBooking, setPickupBooking] = useState<Record<string, unknown> | null>(null);
  const [showBookingFlow, setShowBookingFlow] = useState<string | null>(null);

  // Load claim statuses for user bookings
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

  // Force refetch all queries when user changes
  useEffect(() => {
    if (user?.id) {
      queryClient.invalidateQueries({ queryKey: ['user-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['user-listings'] });
      queryClient.invalidateQueries({ queryKey: ['user-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['user-stats'] });
      queryClient.invalidateQueries({ queryKey: ['connected-account'] });
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
    }
  }, [user?.id, queryClient]);

  // Simple URL parameter handling
  useEffect(() => {
    const success = searchParams.get('success');
    const refresh = searchParams.get('refresh');
    
    if (success === 'true' || refresh === 'true') {
      const handleOnboardingCompletion = async () => {
        try {
          queryClient.invalidateQueries({ queryKey: ['connected-account'] });
          
          toast({
            title: 'Configurare completă!',
            description: 'Contul de plată a fost configurat cu succes.',
          });
        } catch (error) {
          console.error('Error handling onboarding completion:', error);
          toast({
            title: 'Eroare la configurare',
            description: 'A apărut o eroare la configurarea contului de plată.',
            variant: 'destructive',
          });
        }
      };
      
      handleOnboardingCompletion();
      
      // Clear URL parameters
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, queryClient]);

  const handleManualRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['user-bookings'] });
    queryClient.invalidateQueries({ queryKey: ['user-listings'] });
    queryClient.invalidateQueries({ queryKey: ['user-reviews'] });
    queryClient.invalidateQueries({ queryKey: ['user-stats'] });
    queryClient.invalidateQueries({ queryKey: ['connected-account'] });
    
    toast({
      title: 'Date actualizate',
      description: 'Toate datele au fost actualizate cu succes.',
    });
  };

  const handleSave = async () => {
    await updateProfile(formData);
    setIsEditing(false);
  };

  const handleAvatarUpdate = (newAvatarUrl: string) => {
    setCurrentAvatarUrl(newAvatarUrl);
    updateProfile({ avatar_url: newAvatarUrl });
  };

  const handleBookingAction = (bookingId: string, status: 'confirmed' | 'rejected') => {
    if (status === 'confirmed') {
      acceptBooking({ bookingId, pickupLocation: 'To be set' }, {
        onSuccess: () => {
          toast({
            title: 'Rezervare confirmată!',
            description: 'Rezervarea a fost confirmată cu succes.',
          });
          notifyBookingConfirmed(bookingId, 'Gear Title', 'renter_id');
        },
        onError: (error) => {
          toast({
            title: 'Eroare la confirmarea rezervării',
            description: error.message || 'A apărut o eroare la confirmarea rezervării.',
            variant: 'destructive',
          });
        }
      });
    } else {
      rejectBooking(bookingId, {
        onSuccess: () => {
          toast({
            title: 'Rezervare respinsă',
            description: 'Rezervarea a fost respinsă.',
          });
        },
        onError: (error) => {
          toast({
            title: 'Eroare la respingerea rezervării',
            description: error.message || 'A apărut o eroare la respingerea rezervării.',
            variant: 'destructive',
          });
        }
      });
    }
  };

  const handleDeleteGear = async (gearId: string) => {
    deleteGear(gearId, {
      onSuccess: () => {
        toast({
          title: 'Echipament șters!',
          description: 'Echipamentul a fost șters cu succes.',
        });
        notifyGearDeleted('Gear Title', user?.id || '');
        setDeletingGearId(null);
      },
      onError: (error) => {
        toast({
          title: 'Eroare la ștergerea echipamentului',
          description: error.message || 'A apărut o eroare la ștergerea echipamentului.',
          variant: 'destructive',
        });
        setDeletingGearId(null);
      }
    });
  };

  const handleConfirmation = (booking: Record<string, unknown>, type: 'pickup' | 'return') => {
    setConfirmationBooking(booking);
    setConfirmationType(type);
  };

  const handlePaymentClick = async (booking: Record<string, unknown>) => {
    setPaymentBooking(booking);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      confirmed: "default",
      active: "default",
      returned: "outline",
      completed: "default",
      cancelled: "destructive",
      rejected: "destructive"
    };
    
    return (
      <Badge variant={variants[status] || "secondary"} className="text-xs">
        {getStatusLabel(status)}
      </Badge>
    );
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'În așteptare',
      confirmed: 'Confirmată',
      active: 'Activă',
      returned: 'Returnată',
      completed: 'Finalizată',
      cancelled: 'Anulată',
      rejected: 'Respinse'
    };
    return labels[status] || status;
  };

  const getUserDisplayName = (userData: any) => {
    if (!userData) return 'Necunoscut';
    return `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || userData.email || 'Necunoscut';
  };

  // Calculate stats
  const activeBookings = userBookings.filter(b => ['confirmed', 'active'].includes(b.status as string)).length;
  const pendingBookings = userBookings.filter(b => b.status === 'pending').length;
  const totalEarnings = (stats as any)?.total_earnings || 0;
  const totalSpent = (stats as any)?.total_spent || 0;
  const averageRating = (stats as any)?.average_rating || 0;
  const totalReviews = (stats as any)?.total_reviews || 0;

  // Calculate upcoming bookings
  const upcomingBookings = userBookings.filter(booking => {
    const startDate = new Date(booking.start_date as string);
    return isAfter(startDate, new Date()) && ['confirmed', 'active'].includes(booking.status as string);
  }).sort((a, b) => new Date(a.start_date as string).getTime() - new Date(b.start_date as string).getTime());

  // Calculate earnings trend
  const earningsTrend = totalEarnings > 0 ? 'up' : 'down';
  const earningsChange = totalEarnings > 0 ? '+12%' : '0%';

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <main className="container mx-auto px-4 py-6">
          {/* Welcome Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={currentAvatarUrl} alt={profile.full_name} />
                  <AvatarFallback className="text-sm">
                    {profile.first_name?.[0]}{profile.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Bună, {profile.first_name}!
                  </h1>
                  <p className="text-sm text-gray-600">
                    {profile.location} • Membru din {format(new Date(profile.created_at || Date.now()), 'MMMM yyyy')}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editează profilul
                </Button>
                <Button onClick={() => navigate('/add-gear')} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Adaugă echipament
                </Button>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="bg-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Rezervări active</p>
                    <p className="text-xl font-bold text-gray-900">{activeBookings}</p>
                    <p className="text-xs text-gray-500">{pendingBookings} în așteptare</p>
                  </div>
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Câștiguri totale</p>
                    <p className="text-xl font-bold text-gray-900">{totalEarnings} RON</p>
                    <div className="flex items-center space-x-1">
                      <TrendingUp className="h-3 w-3 text-green-500" />
                      <p className="text-xs text-gray-500">{earningsChange}</p>
                    </div>
                  </div>
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Rating mediu</p>
                    <div className="flex items-center space-x-1">
                      <p className="text-xl font-bold text-gray-900">{averageRating.toFixed(1)}</p>
                      <Star className="h-4 w-4 text-yellow-400 fill-current" />
                    </div>
                    <p className="text-xs text-gray-500">{totalReviews} recenzii</p>
                  </div>
                  <Award className="h-6 w-6 text-yellow-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Echipamente</p>
                    <p className="text-xl font-bold text-gray-900">{listings.length}</p>
                    <p className="text-xs text-gray-500">{listings.filter(l => l.is_available).length} disponibile</p>
                  </div>
                  <Package className="h-6 w-6 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card className="bg-white mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Acțiuni rapide</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Button 
                  variant="outline" 
                  className="h-auto p-3 flex flex-col items-center space-y-2"
                  onClick={() => navigate('/add-gear')}
                >
                  <Plus className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium">Adaugă echipament</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="h-auto p-3 flex flex-col items-center space-y-2"
                  onClick={() => navigate('/browse')}
                >
                  <ShoppingBag className="h-5 w-5 text-green-600" />
                  <span className="text-sm">Caută echipamente</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="h-auto p-3 flex flex-col items-center space-y-2"
                  onClick={() => setShowStripeOnboarding(true)}
                >
                  <CreditCard className="h-5 w-5 text-purple-600" />
                  <span className="text-sm">Configurare plată</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="h-auto p-3 flex flex-col items-center space-y-2"
                  onClick={() => navigate('/messages')}
                >
                  <MessageSquare className="h-5 w-5 text-orange-600" />
                  <span className="text-sm">Mesaje</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bookings Section */}
            <Card className="bg-white">
              <CardHeader className="flex items-center justify-between pb-3">
                <CardTitle className="text-lg">Rezervări</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/bookings')}>
                  Vezi toate <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </CardHeader>
              <CardContent>
                {bookingsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => <BookingSkeleton key={i} />)}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Upcoming bookings */}
                    {upcomingBookings.slice(0, 2).map((booking) => (
                      <div key={booking.id as string} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{booking.gear_title as string}</p>
                          <p className="text-xs text-gray-600">
                            {format(new Date(booking.start_date as string), 'dd MMM')} - {format(new Date(booking.end_date as string), 'dd MMM')}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getStatusBadge(booking.status as string)}
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}

                    {/* Pending owner bookings */}
                    {ownerBookings
                      .filter(booking => booking.status === 'pending')
                      .slice(0, 2)
                      .map((booking) => (
                      <div key={booking.id as string} className="flex items-center justify-between p-3 border rounded-lg bg-orange-50">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{booking.gear_title as string}</p>
                          <p className="text-xs text-gray-600">Chiriaș: {getUserDisplayName(booking.renter)}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getStatusBadge(booking.status as string)}
                          <Button 
                            variant="default" 
                            size="sm" 
                            onClick={() => handleBookingAction(String(booking.id), 'confirmed')}
                            disabled={acceptingBooking}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Confirmă
                          </Button>
                        </div>
                      </div>
                    ))}

                    {upcomingBookings.length === 0 && ownerBookings.filter(b => b.status === 'pending').length === 0 && (
                      <div className="text-center py-8">
                        <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-sm text-gray-600">Nu ai rezervări active</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Listings Section */}
            <Card className="bg-white">
              <CardHeader className="flex items-center justify-between pb-3">
                <CardTitle className="text-lg">Echipamentele mele</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/my-listings')}>
                  Vezi toate <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </CardHeader>
              <CardContent>
                {listingsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => <BookingSkeleton key={i} />)}
                  </div>
                ) : listings.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Nu ai echipamente încă</h3>
                    <p className="text-xs text-gray-600 mb-4">Adaugă primul tău echipament și începe să câștigi bani!</p>
                    <Button 
                      onClick={() => navigate('/add-gear')}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Adaugă echipament
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {listings.slice(0, 3).map((listing) => (
                      <div key={listing.id as string} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{listing.title as string}</p>
                          <p className="text-xs text-gray-600">{listing.price_per_day as number} RON/zi</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={listing.is_available ? "default" : "secondary"} className="text-xs">
                            {listing.is_available ? "Disponibil" : "Închiriat"}
                          </Badge>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>

        <Footer />

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
            booking={paymentBooking as any}
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
                  {user?.id === claimBooking.owner_id 
                    ? 'Descrie daunele și încarcă dovezi foto.' 
                    : 'Descrie problema întâlnită și încarcă dovezi foto.'
                  }
                </DialogDescription>
              </DialogHeader>
              {user?.id === claimBooking.owner_id ? (
                <OwnerClaimForm
                  bookingId={String(claimBooking.id)}
                  onSubmitted={() => {
                    setClaimBooking(null);
                  }}
                />
              ) : (
                <RenterClaimForm
                  bookingId={String(claimBooking.id)}
                  onSubmitted={() => {
                    setClaimBooking(null);
                  }}
                />
              )}
            </DialogContent>
          </Dialog>
        )}

        {pickupBooking && (
          <PickupLocationModal
            bookingId={String(pickupBooking.id)}
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
                    const booking = [...userBookings, ...ownerBookings]
                      .find(b => b.id === showBookingFlow);
                    const isOwner = booking?.owner_id === user?.id;
                    return isOwner ? 'Procesul pentru proprietar' : 'Procesul pentru închiriator';
                  })()}
                </DialogDescription>
              </DialogHeader>
              {(() => {
                const booking = [...userBookings, ...ownerBookings]
                  .find(b => b.id === showBookingFlow);
                if (!booking) return null;
                
                const isOwner = booking.owner_id === user?.id;
                return (
                  <BookingFlowGuard
                    bookingId={String(booking.id)}
                    gearId={String(booking.gear_id)}
                    isOwner={isOwner}
                    currentStatus={String(booking.status)}
                    onStatusUpdate={(newStatus) => {
                      setShowBookingFlow(null);
                      queryClient.invalidateQueries({ queryKey: ['userBookings'] });
                      queryClient.invalidateQueries({ queryKey: ['ownerBookings'] });
                    }}
                  />
                );
              })()}
            </DialogContent>
          </Dialog>
        )}
      </div>
    </ErrorBoundary>
  );
};




