import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AvatarUpload } from '@/components/AvatarUpload';
import { useAuth } from '@/contexts/AuthContext';
import { useUserBookings, useUserListings, useUserReviews, useUserStats } from '@/hooks/useUserData';
import { useAcceptBooking, useConfirmReturn, useCompleteRental, useRejectBooking } from '@/hooks/useBookings';
import { EditGearModal } from '@/components/EditGearModal';
import { ReviewModal } from '@/components/ReviewModal';
import { useDeleteGear } from '@/hooks/useGear';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { ConfirmationSystem } from '@/components/ConfirmationSystem';
import { 
  Star, MapPin, Calendar, Edit, Shield, Package, AlertCircle, Eye, Settings, 
  CheckCircle, CreditCard, Trash2, XCircle, Camera, Loader2, ExternalLink, 
  RefreshCw, Plus, TrendingUp, DollarSign, Clock, Users, ShoppingBag,
  ArrowRight, Bell, MessageSquare, FileText, Award, Zap, Activity, 
  TrendingDown, UserCheck, AlertTriangle, CheckCircle2, 
  CalendarDays, Clock4, Target, BarChart3, PieChart, LineChart
} from 'lucide-react';
import { PaymentModal } from '@/components/PaymentModal';
import { format, addDays, isToday, isTomorrow, isAfter } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { PaymentService } from '@/services/paymentService';
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
import { ReviewManagement } from '@/components/ReviewManagement';
import { PushNotificationSetup } from '@/components/PushNotificationSetup';
import { RateLimitFeedback } from '@/components/RateLimitFeedback';
import { PhotoComparison } from '@/components/PhotoComparison';
import { useNotifications } from '@/hooks/useNotifications';
import { useDeleteConversation } from '@/hooks/useMessages';

export const Dashboard: React.FC = () => {
  const { user, profile, updateProfile } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Force refresh when user changes
  const dashboardKey = user?.id || 'no-user';
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
  const ownerBookingsLoading = bookingsLoading;
  
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
        // Delete the conversation after successful completion
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
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());
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
      console.log('Dashboard: User changed, invalidating all queries');
      queryClient.invalidateQueries({ queryKey: ['user-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['user-listings'] });
      queryClient.invalidateQueries({ queryKey: ['user-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['user-stats'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
      queryClient.invalidateQueries({ queryKey: ['connected-account'] });
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
    }
  }, [user?.id, queryClient]);

  // Simple URL parameter handling
  useEffect(() => {
    const success = searchParams.get('success');
    const refresh = searchParams.get('refresh');
    const accountId = searchParams.get('account_id');
    
    if (success === 'true' || refresh === 'true') {
      // Handle onboarding completion
      const handleOnboardingCompletion = async () => {
        try {
          // With the new flow, we don't have a stored account ID
          // The account is created during onboarding and we need to retrieve it
          // For now, just refresh the connected account data
          queryClient.invalidateQueries({ queryKey: ['connected-account'] });
          
          // Show success message
          toast({
            title: 'Configurare completă!',
            description: 'Contul de plată a fost configurat cu succes.',
          });
        } catch (error) {
          console.error('Error completing onboarding:', error);
          toast({
            title: 'Eroare la finalizarea configurarii',
            description: 'A apărut o eroare la finalizarea configurarii contului de plată.',
            variant: 'destructive',
          });
        }
      };
      
      handleOnboardingCompletion();
      
      // Clear URL parameters
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, queryClient, setSearchParams]);

  useEffect(() => {
    loadClaims();

    // Real-time subscription for claims using database changes
    const claimsChannel = supabase
      .channel('claims_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'claims',
          filter: `booking_id=in.(${bookings.map(b => `"${b.id}"`).join(',')})`
        },
        (payload) => {
          console.log('Dashboard: Claim update received:', payload);
          const claim = payload.new as { booking_id: string; claim_status: 'pending' | 'approved' | 'rejected' };
          if (claim) {
            setClaimStatuses(prev => ({ ...prev, [claim.booking_id]: claim.claim_status }));
          }
        }
      )
      .subscribe();

    // Real-time subscription for booking status updates using database changes
    const bookingChannel = supabase
      .channel('booking_status_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `renter_id=eq.${user?.id} OR owner_id=eq.${user?.id}`
        },
        (payload) => {
          console.log('Dashboard: Booking status update received:', payload);
          console.log('Dashboard: New status:', (payload.new as Record<string, unknown>)?.status);
          console.log('Dashboard: Old status:', (payload.old as Record<string, unknown>)?.status);
          
          // Update last update time
          setLastUpdateTime(new Date());
          
          // Refresh booking data when status changes
          queryClient.invalidateQueries({ queryKey: ['bookings', 'user', user?.id] });
          queryClient.invalidateQueries({ queryKey: ['user-bookings'] });
          queryClient.invalidateQueries({ queryKey: ['user-listings'] });
          
          // Also refresh claims when booking status changes
          loadClaims();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'escrow_transactions'
        },
        (payload) => {
          console.log('Dashboard: Escrow transaction update received:', payload);
          // Update last update time
          setLastUpdateTime(new Date());
          // Refresh booking data when escrow status changes
          queryClient.invalidateQueries({ queryKey: ['bookings', 'user', user?.id] });
          queryClient.invalidateQueries({ queryKey: ['user-bookings'] });
          queryClient.invalidateQueries({ queryKey: ['user-listings'] });
        }
      )
      .subscribe((status) => {
        console.log('Dashboard: Real-time subscription status:', status);
        setIsRealtimeConnected(status === 'SUBSCRIBED');
      });

    return () => {
      claimsChannel.unsubscribe();
      bookingChannel.unsubscribe();
    };
  }, [user, bookings, queryClient]);

  const handleManualRefresh = () => {
    console.log('Dashboard: Manual refresh triggered');
    setLastUpdateTime(new Date());
    queryClient.invalidateQueries({ queryKey: ['bookings', 'user', user?.id] });
    queryClient.invalidateQueries({ queryKey: ['user-bookings'] });
    queryClient.invalidateQueries({ queryKey: ['user-listings'] });
    loadClaims();
  };

  // Ensure auth state is fully loaded before rendering
  if (!user || !profile) {
    console.log('Dashboard: Waiting for auth state', { user: !!user, profile: !!profile });
    return <DashboardSkeleton />;
  }

  // Additional check to ensure session is ready
  if (!user.id || !profile.id) {
    console.log('Dashboard: User or profile ID missing', { userId: user?.id, profileId: profile?.id });
    return <DashboardSkeleton />;
  }

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
      onSuccess: async (data) => {
        // Send notification to renter about booking confirmation
        try {
          const booking = bookings.find(b => b.id === bookingId);
          if (booking) {
            const gear = listings.find(g => g.id === booking.gear_id);
            if (gear) {
              await notifyBookingConfirmed(bookingId, gear.title, booking.renter_id);
            }
          }
        } catch (notifError) {
          console.error('Error sending booking confirmation notification:', notifError);
        }
        
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
      rejectBooking(bookingId, {
        onSuccess: () => {
          toast({
            title: 'Rezervare respinsă!',
            description: 'Rezervarea a fost respinsă și conversația a fost ștearsă.',
          });
        },
        onError: (error: unknown) => {
          toast({
            title: 'Eroare',
            description: 'Nu s-a putut respinge rezervarea.',
            variant: 'destructive',
          });
          console.error('Booking rejection error:', error);
        }
      });
    }
  };

  const handleDeleteGear = async (gearId: string) => {
    if (!confirm('Ești sigur că vrei să ștergi acest echipament? Această acțiune nu poate fi anulată.')) {
      return;
    }

    setDeletingGearId(gearId);
    
    deleteGear(gearId, {
      onSuccess: async (data, variables, context) => {
        // Send notification about gear deletion
        try {
          const gear = listings.find(g => g.id === gearId);
          if (gear && user) {
            await notifyGearDeleted(gear.title, user.id);
          }
        } catch (notifError) {
          console.error('Error sending gear deletion notification:', notifError);
        }
        
        // Invalidate and refetch all gear-related queries to update the UI instantly
        queryClient.invalidateQueries({ queryKey: ['user-listings', user?.id] });
        queryClient.invalidateQueries({ queryKey: ['user-stats'] });
        queryClient.invalidateQueries({ queryKey: ['gear', 'list'] });
        queryClient.invalidateQueries({ queryKey: ['gear'] });
        
        toast({
          title: 'Echipament șters!',
          description: 'Echipamentul a fost șters cu succes din dashboard.',
        });
        setDeletingGearId(null);
      },
      onError: (error: unknown) => {
        let message = 'Nu s-a putut șterge echipamentul. Te rugăm să încerci din nou.';
        if (error && typeof error === 'object' && 'message' in error) {
          message = String(error.message);
        }
        toast({
          title: 'Eroare',
          description: message,
          variant: 'destructive',
        });
        console.error('Delete gear error:', error);
        setDeletingGearId(null);
      }
    });
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

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Finalizat';
      case 'active': return 'În curs';
      case 'confirmed': return 'Confirmat';
      case 'pending': return 'În așteptare';
      case 'cancelled': return 'Anulat';
      default: return status;
    }
  };

  const getUserDisplayName = (userData: any) => {
    if (userData?.full_name) return userData.full_name;
    if (userData?.first_name && userData?.last_name) return `${userData.first_name} ${userData.last_name}`;
    if (userData?.email) return userData.email.split('@')[0];
    return 'Utilizator necunoscut';
  };

  // Calculate dashboard metrics
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

  // Calculate recent activity
  const recentActivity = [
    ...userBookings.slice(0, 5).map(booking => ({
      type: 'booking' as const,
      title: `Rezervare ${String((booking.gear && typeof booking.gear === 'object' && 'title' in booking.gear) ? (booking.gear as any).title : 'Necunoscut')}`,
      description: `${format(new Date(String(booking.start_date)), 'dd MMM')} - ${format(new Date(String(booking.end_date)), 'dd MMM')}`,
      status: String(booking.status),
      date: new Date(String(booking.created_at)),
      icon: Calendar
    })),
    ...listings.slice(0, 3).map(listing => ({
      type: 'listing' as const,
      title: `Echipament adăugat: ${String(listing.title)}`,
      description: `${Number(listing.price_per_day)} RON/zi`,
      status: listing.is_available ? 'available' : 'rented',
      date: new Date(String(listing.created_at)),
      icon: Package
    }))
  ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 8);

  // Calculate earnings trend (mock data for now)
  const earningsTrend = totalEarnings > 0 ? 'up' : 'down';
  const earningsChange = totalEarnings > 0 ? '+12%' : '0%';

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <Header />
        
        <main className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
          {/* Welcome Section */}
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 w-full">
                <Avatar className="h-14 w-14 sm:h-16 sm:w-16 mx-auto sm:mx-0">
                  <AvatarImage src={currentAvatarUrl} alt={profile.full_name} />
                  <AvatarFallback className="text-lg">
                    {profile.first_name?.[0]}{profile.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="text-center sm:text-left w-full min-w-0">
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 truncate">
                    Bună, {profile.first_name}! 👋
                  </h1>
                  <p className="text-sm sm:text-base text-gray-600 truncate">
                    {profile.location} • Membru din {format(new Date(profile.created_at || Date.now()), 'MMMM yyyy')}
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="w-full sm:w-auto">
                  <Edit className="h-4 w-4 mr-2" />
                  Editează profilul
                </Button>
                <Button onClick={() => navigate('/add-gear')} className="bg-gradient-to-r from-purple-600 to-pink-600 w-full sm:w-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  Adaugă echipament
                </Button>
              </div>
            </div>
          </div>

          {/* Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
            {/* Each card uses w-full and min-w-0 to prevent overflow */}
            <Card className="bg-white shadow-sm border-0 hover:shadow-md transition-shadow w-full min-w-0">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-600">Rezervări active</p>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900">{activeBookings}</p>
                    <p className="text-xs text-gray-500">{pendingBookings} în așteptare</p>
                  </div>
                  <div className="p-2 sm:p-3 bg-blue-100 rounded-full">
                    <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-sm border-0 hover:shadow-md transition-shadow w-full min-w-0">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-600">Câștiguri totale</p>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900">{totalEarnings} RON</p>
                    <div className="flex items-center space-x-1">
                      {earningsTrend === 'up' ? (
                        <TrendingUp className="h-3 w-3 text-green-500" />
                      ) : earningsTrend === 'down' ? (
                        <TrendingDown className="h-3 w-3 text-red-500" />
                      ) : (
                        <BarChart3 className="h-3 w-3 text-gray-500" />
                      )}
                      <p className="text-xs text-gray-500">{earningsChange} față de luna trecută</p>
                    </div>
                  </div>
                  <div className="p-2 sm:p-3 bg-green-100 rounded-full">
                    <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-sm border-0 hover:shadow-md transition-shadow w-full min-w-0">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-600">Rating mediu</p>
                    <div className="flex items-center space-x-1">
                      <p className="text-xl sm:text-2xl font-bold text-gray-900">{averageRating.toFixed(1)}</p>
                      <Star className="h-4 w-4 text-yellow-400 fill-current" />
                    </div>
                    <p className="text-xs text-gray-500">{totalReviews} recenzii</p>
                  </div>
                  <div className="p-2 sm:p-3 bg-yellow-100 rounded-full">
                    <Award className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-sm border-0 hover:shadow-md transition-shadow w-full min-w-0">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-600">Echipamente</p>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900">{listings.length}</p>
                    <p className="text-xs text-gray-500">{listings.filter(l => l.is_available).length} disponibile</p>
                  </div>
                  <div className="p-2 sm:p-3 bg-purple-100 rounded-full">
                    <Package className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card className="bg-white shadow-sm border-0 mb-6 sm:mb-8">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center space-x-2 text-lg sm:text-xl">
                <Zap className="h-5 w-5 text-purple-600" />
                Acțiuni rapide
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                <Button 
                  variant="outline" 
                  className="h-auto p-3 sm:p-4 flex flex-col items-center space-y-2 hover:bg-purple-50 hover:border-purple-200 min-h-[80px] sm:min-h-[100px]"
                  onClick={() => navigate('/add-gear')}
                >
                  <Plus className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
                  <span className="text-xs sm:text-sm font-medium text-center">Adaugă echipament</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="h-auto p-3 sm:p-4 flex flex-col items-center space-y-2 hover:bg-blue-50 hover:border-blue-200 min-h-[80px] sm:min-h-[100px]"
                  onClick={() => navigate('/reviews')}
                >
                  <Star className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                  <span className="text-xs sm:text-sm font-medium text-center">Recenzii</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="h-auto p-3 sm:p-4 flex flex-col items-center space-y-2 hover:bg-blue-50 hover:border-blue-200 min-h-[80px] sm:min-h-[100px]"
                  onClick={() => navigate('/browse')}
                >
                  <ShoppingBag className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                  <span className="text-xs sm:text-sm text-center">Caută echipamente</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="h-auto p-3 sm:p-4 flex flex-col items-center space-y-2 hover:bg-green-50 hover:border-green-200 min-h-[80px] sm:min-h-[100px]"
                  onClick={() => setShowStripeOnboarding(true)}
                >
                  <CreditCard className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                  <span className="text-xs sm:text-sm text-center">Configurare plată</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="h-auto p-3 sm:p-4 flex flex-col items-center space-y-2 hover:bg-orange-50 hover:border-orange-200 min-h-[80px] sm:min-h-[100px]"
                  onClick={() => navigate('/messages')}
                >
                  <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600" />
                  <span className="text-xs sm:text-sm text-center">Mesaje</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Left Column - Recent Activity */}
            <div className="lg:col-span-2 space-y-6 sm:space-y-8">
              {/* Upcoming Bookings */}
              {upcomingBookings.length > 0 && (
                <Card className="bg-white shadow-sm border-0">
                  <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0 pb-4">
                    <CardTitle className="flex items-center space-x-2 text-lg sm:text-xl">
                      <Clock4 className="h-5 w-5 text-orange-600" />
                      Rezervări viitoare
                    </CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => navigate('/bookings')} className="w-full sm:w-auto">
                      Vezi toate <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 sm:space-y-4">
                      {upcomingBookings.slice(0, 3).map((booking) => (
                        <div key={booking.id as string} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border rounded-lg bg-orange-50 border-orange-200 space-y-3 sm:space-y-0">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-orange-100 rounded-full">
                              <CalendarDays className="h-4 w-4 text-orange-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm sm:text-base truncate">{booking.gear_title as string}</p>
                              <p className="text-xs sm:text-sm text-gray-600">
                                {format(new Date(booking.start_date as string), 'dd MMM')} - {format(new Date(booking.end_date as string), 'dd MMM')}
                              </p>
                              <p className="text-xs text-orange-600">
                                {isToday(new Date(booking.start_date as string)) ? 'Astăzi' : 
                                 isTomorrow(new Date(booking.start_date as string)) ? 'Mâine' : 
                                 `În ${Math.ceil((new Date(booking.start_date as string).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} zile`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {getStatusBadge(booking.status as string)}
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recent Bookings */}
              <Card className="bg-white shadow-sm border-0">
                <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0 pb-4">
                  <CardTitle className="flex items-center space-x-2 text-lg sm:text-xl">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    Rezervări recente
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/bookings')} className="w-full sm:w-auto">
                    Vezi toate <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </CardHeader>
                <CardContent>
                  {bookingsLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map(i => <BookingSkeleton key={i} />)}
                    </div>
                  ) : userBookings.length === 0 ? (
                    <div className="text-center py-8 sm:py-12">
                      <div className="w-20 h-20 sm:w-24 sm:h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Calendar className="h-10 w-10 sm:h-12 sm:w-12 text-blue-600" />
                      </div>
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">Nu ai rezervări încă</h3>
                      <p className="text-sm sm:text-base text-gray-600 mb-6">Începe să explorezi echipamentele disponibile și fă prima ta rezervare!</p>
                      <Button 
                        onClick={() => navigate('/browse')}
                        className="bg-gradient-to-r from-blue-600 to-purple-600 w-full sm:w-auto"
                      >
                        <ShoppingBag className="h-4 w-4 mr-2" />
                        Caută echipamente
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3 sm:space-y-4">
                      {userBookings.slice(0, 3).map((booking) => (
                        <div key={booking.id as string} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border rounded-lg hover:bg-gray-50 transition-colors space-y-3 sm:space-y-0">
                          <div className="flex items-center space-x-3 flex-1 min-w-0">
                            <div className="p-2 bg-blue-100 rounded-full">
                              <Package className="h-4 w-4 text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm sm:text-base truncate">{(booking.gear && typeof booking.gear === 'object' && 'title' in booking.gear) ? (booking.gear as any).title : 'Echipament necunoscut'}</p>
                              <p className="text-xs sm:text-sm text-gray-600">
                                {format(new Date(booking.start_date as string), 'dd MMM')} - {format(new Date(booking.end_date as string), 'dd MMM')}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {getStatusBadge(booking.status as string)}
                            {booking.status === 'completed' && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setReviewingBooking(booking)}
                                className="text-green-600 border-green-200 hover:bg-green-50 text-xs sm:text-sm"
                              >
                                <Star className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                Lasă recenzie
                              </Button>
                            )}
                            {booking.status === 'returned' && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleCompleteRental(String(booking.id))}
                                disabled={completingRental}
                                className="text-blue-600 border-blue-200 hover:bg-blue-50 text-xs sm:text-sm"
                              >
                                <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                Finalizează
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Owner Bookings - Pending Reservations */}
              {ownerBookings.filter(b => b.status === 'pending').length > 0 && (
                <Card className="bg-white shadow-sm border-0">
                  <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0 pb-4">
                    <CardTitle className="flex items-center space-x-2 text-lg sm:text-xl">
                      <AlertCircle className="h-5 w-5 text-orange-600" />
                      Rezervări în așteptare
                    </CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => navigate('/bookings')} className="w-full sm:w-auto">
                      Vezi toate <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 sm:space-y-4">
                      {ownerBookings
                        .filter(booking => booking.status === 'pending')
                        .slice(0, 3)
                        .map((booking) => (
                        <div key={booking.id as string} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border rounded-lg bg-orange-50 border-orange-200 space-y-3 sm:space-y-0">
                          <div className="flex items-center space-x-3 flex-1 min-w-0">
                            <div className="p-2 bg-orange-100 rounded-full">
                              <AlertCircle className="h-4 w-4 text-orange-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm sm:text-base truncate">{booking.gear_title as string}</p>
                              <p className="text-xs sm:text-sm text-gray-600">
                                {format(new Date(booking.start_date as string), 'dd MMM')} - {format(new Date(booking.end_date as string), 'dd MMM')}
                              </p>
                              <p className="text-xs text-orange-600">Chiriaș: {getUserDisplayName(booking.renter)}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {getStatusBadge(booking.status as string)}
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => setPickupBooking(booking)}
                              className="text-blue-600 border-blue-200 hover:bg-blue-50 text-xs sm:text-sm"
                            >
                              <MapPin className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                              Setează locația
                            </Button>
                            <Button 
                              variant="default" 
                              size="sm" 
                              onClick={() => handleBookingAction(String(booking.id), 'confirmed')}
                              disabled={acceptingBooking}
                              className="bg-green-600 hover:bg-green-700 text-xs sm:text-sm"
                            >
                              <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                              Confirmă
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleBookingAction(String(booking.id), 'rejected')}
                              disabled={acceptingBooking}
                              className="text-red-600 border-red-200 hover:bg-red-50 text-xs sm:text-sm"
                            >
                              <XCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                              Respinge
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Owner Bookings - Active/Confirmed */}
              {ownerBookings.filter(b => ['confirmed', 'active', 'returned'].includes(b.status as string)).length > 0 && (
                <Card className="bg-white shadow-sm border-0">
                  <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0 pb-4">
                    <CardTitle className="flex items-center space-x-2 text-lg sm:text-xl">
                      <Package className="h-5 w-5 text-green-600" />
                      Rezervări active
                    </CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => navigate('/bookings')} className="w-full sm:w-auto">
                      Vezi toate <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 sm:space-y-4">
                      {ownerBookings
                        .filter(booking => ['confirmed', 'active', 'returned'].includes(booking.status as string))
                        .slice(0, 3)
                        .map((booking) => (
                        <div key={booking.id as string} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border rounded-lg bg-green-50 border-green-200 space-y-3 sm:space-y-0">
                          <div className="flex items-center space-x-3 flex-1 min-w-0">
                            <div className="p-2 bg-green-100 rounded-full">
                              <Package className="h-4 w-4 text-green-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm sm:text-base truncate">{booking.gear_title as string}</p>
                              <p className="text-xs sm:text-sm text-gray-600">
                                {format(new Date(booking.start_date as string), 'dd MMM')} - {format(new Date(booking.end_date as string), 'dd MMM')}
                              </p>
                              <p className="text-xs text-green-600">Chiriaș: {getUserDisplayName(booking.renter)}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {getStatusBadge(booking.status as string)}
                            {booking.status === 'confirmed' && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setPickupBooking(booking)}
                                className="text-blue-600 border-blue-200 hover:bg-blue-50 text-xs sm:text-sm"
                              >
                                <MapPin className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                Setează locația
                              </Button>
                            )}
                            {booking.status === 'returned' && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleCompleteRental(String(booking.id))}
                                disabled={completingRental}
                                className="text-blue-600 border-blue-200 hover:bg-blue-50 text-xs sm:text-sm"
                              >
                                <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                Finalizează
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* My Listings */}
              <Card className="bg-white shadow-sm border-0">
                <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0 pb-4">
                  <CardTitle className="flex items-center space-x-2 text-lg sm:text-xl">
                    <Package className="h-5 w-5 text-purple-600" />
                    Echipamentele mele
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/my-listings')} className="w-full sm:w-auto">
                    Vezi toate <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </CardHeader>
                <CardContent>
                  {listingsLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map(i => <BookingSkeleton key={i} />)}
                    </div>
                  ) : listings.length === 0 ? (
                    <div className="text-center py-8 sm:py-12">
                      <div className="w-20 h-20 sm:w-24 sm:h-24 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Package className="h-10 w-10 sm:h-12 sm:w-12 text-purple-600" />
                      </div>
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">Nu ai echipamente încă</h3>
                      <p className="text-sm sm:text-base text-gray-600 mb-6">Adaugă primul tău echipament și începe să câștigi bani din închirieri!</p>
                      <Button 
                        onClick={() => navigate('/add-gear')}
                        className="bg-gradient-to-r from-purple-600 to-pink-600 w-full sm:w-auto"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Adaugă primul echipament
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3 sm:space-y-4">
                      {listings.slice(0, 3).map((listing) => (
                        <div key={listing.id as string} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border rounded-lg hover:bg-gray-50 transition-colors space-y-3 sm:space-y-0">
                          <div className="flex items-center space-x-3 flex-1 min-w-0">
                            <div className="p-2 bg-purple-100 rounded-full">
                              <Package className="h-4 w-4 text-purple-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm sm:text-base truncate">{listing.title as string}</p>
                              <p className="text-xs sm:text-sm text-gray-600">{listing.price_per_day as number} RON/zi</p>
                            </div>
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

            {/* Right Column - Sidebar */}
            <div className="space-y-6 sm:space-y-8">
              {/* Notifications */}
              <Card className="bg-white shadow-sm border-0">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center space-x-2 text-lg sm:text-xl">
                    <Bell className="h-5 w-5 text-red-600" />
                    Notificări
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {pendingBookings > 0 && (
                      <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                        <div className="p-2 bg-blue-100 rounded-full">
                          <AlertTriangle className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">Rezervări în așteptare</p>
                          <p className="text-xs text-gray-600">{pendingBookings} rezervări necesită atenția ta</p>
                        </div>
                      </div>
                    )}
                    
                    {!connectedAccount && (
                      <div className="flex items-center space-x-3 p-3 bg-yellow-50 rounded-lg">
                        <div className="p-2 bg-yellow-100 rounded-full">
                          <CreditCard className="h-4 w-4 text-yellow-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">Configurare plată</p>
                          <p className="text-xs text-gray-600">Configurează contul de plată pentru a primi banii</p>
                        </div>
                      </div>
                    )}
                    
                    {listings.length === 0 && (
                      <div className="flex items-center space-x-3 p-3 bg-purple-50 rounded-lg">
                        <div className="p-2 bg-purple-100 rounded-full">
                          <Package className="h-4 w-4 text-purple-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">Primul echipament</p>
                          <p className="text-xs text-gray-600">Adaugă primul tău echipament pentru a începe</p>
                        </div>
                      </div>
                    )}
                    
                    {userBookings.length === 0 && (
                      <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                        <div className="p-2 bg-blue-100 rounded-full">
                          <Calendar className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">Prima rezervare</p>
                          <p className="text-xs text-gray-600">Explorează echipamentele și fă prima rezervare</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card className="bg-white shadow-sm border-0">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center space-x-2 text-lg sm:text-xl">
                    <Activity className="h-5 w-5 text-green-600" />
                    Activitate recentă
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentActivity.slice(0, 5).map((activity, index) => (
                      <div key={index} className="flex items-start space-x-3">
                        <div className={`p-2 rounded-full ${
                          activity.type === 'booking' ? 'bg-blue-100' :
                          activity.type === 'listing' ? 'bg-purple-100' :
                          'bg-gray-100'
                        }`}>
                          <activity.icon className={`h-4 w-4 ${
                            activity.type === 'booking' ? 'text-blue-600' :
                            activity.type === 'listing' ? 'text-purple-600' :
                            'text-gray-600'
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{activity.title}</p>
                          <p className="text-xs text-gray-600">{activity.description}</p>
                          <p className="text-xs text-gray-500">{format(activity.date, 'dd MMM HH:mm')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
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
                    // reload claims list
                  }}
                />
              ) : (
                <RenterClaimForm
                  bookingId={String(claimBooking.id)}
                  onSubmitted={() => {
                    setClaimBooking(null);
                    // reload claims list
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
      </div>
    </ErrorBoundary>
  );
};
