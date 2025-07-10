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

function getBookingBadges(booking: any, userId: string) {
  const badges = [];
  const status = booking.status;
  const paymentStatus = booking.payment_status;
  const claim = booking.activeClaim || booking.resolvedClaim;
  const claimStatus = claim?.claim_status;

  // Cancelled
  if (status === 'cancelled') {
    badges.push(<Badge key="cancelled" variant="destructive">Anulată</Badge>);
    return badges;
  }

  // Pending (waiting for owner confirmation)
  if (status === 'pending') {
    badges.push(<Badge key="pending" variant="outline" className="bg-orange-100 text-orange-800 border-orange-200">În așteptare confirmare</Badge>);
    return badges;
  }

  // Confirmed
  if (status === 'confirmed') {
    badges.push(<Badge key="confirmed" variant="secondary" className="bg-blue-100 text-blue-800">Confirmată</Badge>);
    if (paymentStatus === 'pending') {
      badges.push(<Badge key="pay-pending" variant="outline" className="bg-orange-100 text-orange-800 border-orange-200 ml-1">În așteptare plată</Badge>);
    } else if (paymentStatus === 'completed') {
      badges.push(<Badge key="paid" variant="default" className="bg-green-100 text-green-800 ml-1">Plătit</Badge>);
    } else if (paymentStatus === 'failed') {
      badges.push(<Badge key="pay-failed" variant="destructive" className="ml-1">Plată eșuată</Badge>);
    }
    return badges;
  }

  // Active
  if (status === 'active') {
    badges.push(<Badge key="active" variant="secondary" className="bg-blue-100 text-blue-800">În curs</Badge>);
    if (paymentStatus === 'completed') {
      badges.push(<Badge key="paid" variant="default" className="bg-green-100 text-green-800 ml-1">Plătit</Badge>);
    }
    return badges;
  }

  // Returned
  if (status === 'returned') {
    badges.push(<Badge key="returned" variant="outline" className="bg-purple-100 text-purple-800 border-purple-200">Returnat</Badge>);
    if (paymentStatus === 'completed') {
      badges.push(<Badge key="paid" variant="default" className="bg-green-100 text-green-800 ml-1">Plătit</Badge>);
    }
    return badges;
  }

  // Completed
  if (status === 'completed') {
    badges.push(<Badge key="completed" variant="default" className="bg-green-100 text-green-800">Finalizată</Badge>);
  }

  return badges;
}

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
          queryClient.invalidateQueries({ queryKey: ['user-bookings', user?.id] });
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

  const getPaymentStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      completed: "default",
      failed: "destructive",
      refunded: "destructive",
      cancelled: "destructive"
    };
    return (
      <Badge variant={variants[status] || "secondary"} className="text-xs">
        {getPaymentStatusLabel(status)}
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

  const getPaymentStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'În așteptare',
      completed: 'Plătit',
      failed: 'Eșuat',
      refunded: 'Refundat',
      cancelled: 'Anulat'
    };
    return labels[status] || status;
  };

  const getUserDisplayName = (userData: any) => {
    if (!userData) return 'Necunoscut';
    if (userData.full_name) return userData.full_name;
    if (userData.first_name || userData.last_name) return `${userData.first_name || ''} ${userData.last_name || ''}`.trim();
    if (userData.email) return userData.email.split('@')[0];
    return 'Necunoscut';
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

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="bg-white">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-600">Rezervări active</p>
                    <p className="text-lg sm:text-xl font-bold text-gray-900">{activeBookings}</p>
                    <p className="text-xs text-gray-500">{pendingBookings} în așteptare</p>
                  </div>
                  <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-600">Câștiguri totale</p>
                    <p className="text-lg sm:text-xl font-bold text-gray-900">{totalEarnings} RON</p>
                    <div className="flex items-center space-x-1">
                      <TrendingUp className="h-3 w-3 text-green-500" />
                      <p className="text-xs text-gray-500">{earningsChange}</p>
                    </div>
                  </div>
                  <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-600">Rating mediu</p>
                    <div className="flex items-center space-x-1">
                      <p className="text-lg sm:text-xl font-bold text-gray-900">{averageRating.toFixed(1)}</p>
                      <Star className="h-4 w-4 text-yellow-400 fill-current" />
                    </div>
                    <p className="text-xs text-gray-500">{totalReviews} recenzii</p>
                  </div>
                  <Award className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-600">Echipamente</p>
                    <p className="text-lg sm:text-xl font-bold text-gray-900">{listings.length}</p>
                    <p className="text-xs text-gray-500">{listings.filter(l => l.is_available).length} disponibile</p>
                  </div>
                  <Package className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
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
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                <Button 
                  variant="outline" 
                  className="h-auto p-2 sm:p-3 flex flex-col items-center space-y-1 sm:space-y-2"
                  onClick={() => navigate('/add-gear')}
                >
                  <Plus className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                  <span className="text-xs sm:text-sm font-medium">Adaugă echipament</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="h-auto p-2 sm:p-3 flex flex-col items-center space-y-1 sm:space-y-2"
                  onClick={() => navigate('/browse')}
                >
                  <ShoppingBag className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                  <span className="text-xs sm:text-sm">Caută echipamente</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="h-auto p-2 sm:p-3 flex flex-col items-center space-y-1 sm:space-y-2"
                  onClick={() => setShowStripeOnboarding(true)}
                >
                  <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                  <span className="text-xs sm:text-sm">Configurare plată</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="h-auto p-2 sm:p-3 flex flex-col items-center space-y-1 sm:space-y-2"
                  onClick={() => navigate('/messages')}
                >
                  <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
                  <span className="text-xs sm:text-sm">Mesaje</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Main Content */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
            {/* Bookings Section */}
            <Card className="bg-white">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 gap-2">
                <CardTitle className="text-base sm:text-lg">Rezervări recente</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/bookings')} className="text-xs sm:text-sm">
                  Vezi toate <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 ml-1" />
                </Button>
              </CardHeader>
              <CardContent>
                {bookingsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => <BookingSkeleton key={i} />)}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Recent bookings for both renter and owner */}
                    {(() => {
                      const allBookings = [...userBookings, ...ownerBookings]
                        .sort((a, b) => new Date((b as any).created_at).getTime() - new Date((a as any).created_at).getTime())
                        .slice(0, 3);
                      
                      if (allBookings.length > 0) {
                        return allBookings.map((booking) => {
                          const isOwner = booking.owner_id === user?.id;
                          return (
                            <div key={booking.id as string} className="p-3 border rounded-lg hover:bg-gray-50">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1 mb-1">
                                    {getBookingBadges(booking, user?.id)}
                                  </div>
                                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                                    <p className="font-medium text-sm truncate">{(booking.gear as any)?.title || 'Echipament necunoscut'}</p>
                                    <Badge variant="outline" className="text-xs w-fit">
                                      {isOwner ? 'Ca proprietar' : 'Ca chiriaș'}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-gray-600">
                                    {format(new Date(booking.start_date as string), 'dd MMM yyyy')} - {format(new Date(booking.end_date as string), 'dd MMM yyyy')}
                                  </p>
                                  <p className="text-xs text-gray-600 truncate">
                                    {isOwner ? `Chiriaș: ${getUserDisplayName(booking.renter as any)}` : `Proprietar: ${getUserDisplayName(booking.owner as any)}`}
                                  </p>
                                </div>
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                                  <div className="flex items-center gap-1">
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      onClick={() => navigate('/bookings')}
                                      className="text-blue-600 border-blue-200 hover:bg-blue-50 text-xs px-2 py-1 h-7"
                                    >
                                      Vezi
                                    </Button>
                                    {/* Confirm button for owner on pending bookings */}
                                    {isOwner && booking.status === 'pending' && (
                                      <Button
                                        variant="default"
                                        size="sm"
                                        onClick={() => handleBookingAction(String(booking.id), 'confirmed')}
                                        disabled={acceptingBooking}
                                        className="bg-green-600 hover:bg-green-700 text-xs px-3 py-1 h-7"
                                      >
                                        <CheckCircle className="h-3 w-3 mr-1" />
                                        Confirmă
                                      </Button>
                                    )}
                                    {/* Claim buttons */}
                                    {(!['pending', 'cancelled'].includes(booking.status as string) && user?.id === booking.renter_id) && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setClaimBooking(booking)}
                                        className="text-red-600 border-red-200 hover:bg-red-50 text-xs px-2 py-1 h-7"
                                        title="Depune reclamare"
                                      >
                                        <AlertCircle className="h-3 w-3" />
                                      </Button>
                                    )}
                                    {(['confirmed', 'active', 'returned', 'completed'].includes(booking.status as string) && (booking.payment_status as string) === 'completed' && user?.id === booking.owner_id) && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setClaimBooking(booking)}
                                        className="text-red-600 border-red-200 hover:bg-red-50 text-xs px-2 py-1 h-7"
                                        title="Depune reclamare"
                                      >
                                        <AlertCircle className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        });
                      }
                      return null;
                    })()}

                    {/* Pending owner bookings */}
                    {ownerBookings
                      .filter(booking => booking.status === 'pending')
                      .slice(0, 2)
                      .map((booking) => (
                      <div key={booking.id as string} className="p-3 border rounded-lg bg-orange-50">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{(booking.gear as any)?.title || 'Echipament necunoscut'}</p>
                            <p className="text-xs text-gray-600 truncate">Chiriaș: {getUserDisplayName(booking.renter as any)}</p>
                            <p className="text-xs text-gray-600">
                              {format(new Date(booking.start_date as string), 'dd MMM yyyy')} - {format(new Date(booking.end_date as string), 'dd MMM yyyy')}
                            </p>
                          </div>
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                            <div className="flex items-center gap-1">
                              {getStatusBadge(booking.status as string)}
                              {(booking.activeClaim as any) && (
                                <ClaimStatusBadge 
                                  status={(booking.activeClaim as any).claim_status}
                                  claim={booking.activeClaim}
                                  booking={booking}
                                  currentUserId={user?.id}
                                />
                              )}
                              {(booking.resolvedClaim as any) && !(booking.activeClaim as any) && (
                                <ClaimStatusBadge 
                                  status={(booking.resolvedClaim as any).claim_status}
                                  claim={booking.resolvedClaim}
                                  booking={booking}
                                  currentUserId={user?.id}
                                />
                              )}
                            </div>
                            <Button 
                              variant="default" 
                              size="sm" 
                              onClick={() => handleBookingAction(String(booking.id), 'confirmed')}
                              disabled={acceptingBooking}
                              className="bg-green-600 hover:bg-green-700 text-xs px-3 py-1 h-7"
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Confirmă
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}

                    {(() => {
                      const hasBookings = [...userBookings, ...ownerBookings].length > 0;
                      const hasPendingBookings = ownerBookings.some(b => b.status === 'pending');
                      
                      if (!hasBookings && !hasPendingBookings) {
                        return (
                          <div className="text-center py-8">
                            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                            <p className="text-sm text-gray-600">Nu ai rezervări</p>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => navigate('/browse')}
                              className="mt-2"
                            >
                              Caută echipamente
                            </Button>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Listings Section */}
            <Card className="bg-white">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 gap-2">
                <CardTitle className="text-base sm:text-lg">Echipamentele mele</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/my-listings')} className="text-xs sm:text-sm">
                  Vezi toate <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 ml-1" />
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
                      <div key={listing.id as string} className="p-3 border rounded-lg hover:bg-gray-50">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{listing.title as string}</p>
                            <p className="text-xs text-gray-600">{listing.price_per_day as number} RON/zi</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={listing.is_available ? "default" : "secondary"} className="text-xs">
                              {listing.is_available ? "Disponibil" : "Închiriat"}
                            </Badge>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
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
            <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
              <DialogHeader className="mb-4">
                <DialogTitle className="text-lg sm:text-xl">Revendicare daune</DialogTitle>
                <DialogDescription className="text-sm sm:text-base">
                  {user?.id === claimBooking.owner_id 
                    ? 'Descrie daunele și încarcă dovezi foto.' 
                    : 'Descrie problema întâlnită și încarcă dovezi foto.'
                  }
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
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
              </div>
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




