import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, Clock, AlertCircle, CheckCircle2, XCircle, CreditCard, Package, MessageSquare, MapPin, Calendar, DollarSign, User, Truck, Home, Loader2, ArrowLeft, Eye, Star } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserBookings } from '@/hooks/useBookings';
import { useAcceptBooking, useRejectBooking, useCompleteRental, useConfirmReturn } from '@/hooks/useBookings';
import { BookingStatusFlow } from '@/components/BookingStatusFlow';
import { PaymentModal } from '@/components/PaymentModal';
import { PickupLocationModal } from '@/components/PickupLocationModal';
import { ReviewModal } from '@/components/ReviewModal';
import { BookingFlowGuard } from '@/components/BookingFlowGuard';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useDeleteConversation } from '@/hooks/useMessages';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import OwnerClaimForm from '@/components/OwnerClaimForm';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { RenterClaimForm } from '@/components/RenterClaimForm';
import { ClaimStatusBadge } from '@/components/ClaimStatusBadge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';


export const BookingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: bookings = [], isLoading } = useUserBookings();
  const { mutate: acceptBooking, isPending: acceptingBooking } = useAcceptBooking();
  const { mutate: rejectBooking, isPending: rejectingBooking } = useRejectBooking();
  const { mutate: completeRental, isPending: completingRental } = useCompleteRental();
  const { mutate: confirmReturn, isPending: confirmingReturn } = useConfirmReturn();
  const { mutate: deleteConversation } = useDeleteConversation();
  
  const [pickupBooking, setPickupBooking] = useState<any>(null);
  const [reviewingBooking, setReviewingBooking] = useState<any>(null);
  const [paymentBooking, setPaymentBooking] = useState<any>(null);
  const [confirmationBooking, setConfirmationBooking] = useState<any>(null);
  const [confirmationType, setConfirmationType] = useState<'pickup' | 'return'>('pickup');
  const [claimBooking, setClaimBooking] = useState<any>(null);


  // Filter bookings using the actual authenticated user ID
  const userBookings = bookings.filter((b: any) => b.renter_id === user?.id);
  const ownerBookings = bookings.filter((b: any) => b.owner_id === user?.id);

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
        }
      });
    }
  };

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
          description: 'A apărut o eroare la finalizarea închirierii.',
          variant: 'destructive',
        });
      }
    });
  };

  const handleConfirmation = (booking: any, type: 'pickup' | 'return') => {
    setConfirmationBooking(booking);
    setConfirmationType(type);
  };

  const handlePaymentClick = (booking: any) => {
    setPaymentBooking(booking);
  };

  function getBookingBadges(booking: any, userId: string) {
    const badges = [];
    const status = booking.status;
    const paymentStatus = booking.payment_status;

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

  const getUserDisplayName = (userData: any) => {
    if (userData?.full_name) return userData.full_name;
    if (userData?.first_name && userData?.last_name) return `${userData.first_name} ${userData.last_name}`;
    if (userData?.email) return userData.email.split('@')[0];
    return 'Utilizator necunoscut';
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: 'RON',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 w-full max-w-full sm:max-w-4xl mx-auto px-2 sm:px-4 py-4 sm:py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/dashboard')}
            className="hover:bg-gray-100 transition-colors w-full sm:w-auto rounded-xl text-base font-semibold py-3"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Înapoi la Dashboard
          </Button>
          <h1 className="text-2xl sm:text-3xl font-bold w-full sm:w-auto text-center sm:text-left mt-2 sm:mt-0">Rezervările mele</h1>
        </div>
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="animate-spin w-8 h-8 text-muted-foreground" />
          </div>
        ) : (
          <>
            {bookings.length === 0 && (
              <div className="flex flex-col items-center justify-center text-center text-muted-foreground py-16 px-2">
                <div className="w-28 h-28 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Eye className="h-14 w-14 text-gray-400" />
                </div>
                <h3 className="text-xl font-bold mb-2">Nu ai rezervări încă</h3>
                <p className="text-gray-600 mb-4">Începe să explorezi echipamentele disponibile!</p>
                <Button className="w-full max-w-xs mx-auto rounded-xl text-base font-semibold py-3" onClick={() => navigate('/browse')}>Explorează echipamente</Button>
              </div>
            )}
            {userBookings.length > 0 && (
              <section className="mb-10">
                <h2 className="text-lg sm:text-xl font-semibold mb-4 text-center sm:text-left">Ca chiriaș</h2>
                <div className="space-y-6">
                  {userBookings.map((booking: any) => (
                    <Card key={booking.id} className="rounded-2xl shadow-md p-4 sm:p-6 transition-shadow">
                      <CardHeader className="p-0 mb-2">
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-0">
                            <div>
                            <CardTitle className="text-base sm:text-lg line-clamp-2 break-words">{booking.gear?.title || 'Echipament necunoscut'}</CardTitle>
                            <CardDescription className="text-xs sm:text-sm">
                                {format(new Date(booking.start_date), 'dd MMM yyyy')} - {format(new Date(booking.end_date), 'dd MMM yyyy')}
                              </CardDescription>
                            </div>
                            <div className="flex flex-row sm:flex-col gap-2 items-end sm:items-end justify-end">
                            <div className="flex items-center gap-1 flex-wrap">
                                {getBookingBadges(booking, user?.id)}
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
                            </div>
                          </div>
                        </CardHeader>
                      <CardContent className="p-0">
                          <div className="space-y-2">
                          <div className="text-sm text-muted-foreground truncate">
                              Proprietar: {getUserDisplayName(booking.owner) || 'Proprietar necunoscut'}
                            </div>
                          <div className="text-sm text-muted-foreground truncate">
                              Locație pickup: {booking.pickup_location || 'Nespecificat'}
                            </div>
                            <div className="text-sm font-medium text-green-600">
                              Total: {formatPrice(booking.total_amount) || 'N/A'}
                            </div>
                          <div className="flex flex-col sm:flex-row gap-2 mt-4 w-full">
                              {booking.status === 'completed' && (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => setReviewingBooking(booking)}
                                className="text-green-600 border-green-200 hover:bg-green-50 w-full sm:w-auto rounded-xl"
                                >
                                  <Star className="h-4 w-4 mr-1" />
                                  Lasă recenzie
                                </Button>
                              )}
                              {booking.status === 'returned' && (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => handleCompleteRental(booking.id)}
                                  disabled={completingRental}
                                className="text-blue-600 border-blue-200 hover:bg-blue-50 w-full sm:w-auto rounded-xl"
                                >
                                  <CheckCircle2 className="h-4 w-4 mr-1" />
                                  Finalizează
                                </Button>
                              )}
                              {(booking.status === 'confirmed' || booking.status === 'active') && user?.id === booking.renter_id && (
                                <div className="w-full">
                                  <BookingStatusFlow 
                                    booking={booking} 
                                    onStatusUpdate={() => {
                                      queryClient.invalidateQueries({ queryKey: ['bookings', 'user', user?.id] });
                                      queryClient.invalidateQueries({ queryKey: ['user-bookings'] });
                                      queryClient.invalidateQueries({ queryKey: ['user-listings'] });
                                    }} 
                                    onPaymentClick={handlePaymentClick}
                                    onSetPickupLocation={setPickupBooking}
                                  />
                                </div>
                              )}
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => navigate('/messages')}
                              className="text-gray-600 border-gray-200 hover:bg-gray-50 w-full sm:w-auto rounded-xl"
                              >
                                <MessageSquare className="h-4 w-4 mr-1" />
                                Mesaje
                              </Button>
                              {(booking.status !== 'cancelled' && user?.id === booking.renter_id) && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setClaimBooking(booking)}
                                className="text-red-600 border-red-200 hover:bg-red-50 w-full sm:w-auto rounded-xl"
                                >
                                  <AlertCircle className="h-4 w-4 mr-1" />
                                  Revendică daune
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                  ))}
                </div>
              </section>
            )}
            {ownerBookings.length > 0 && (
              <section>
                <h2 className="text-lg sm:text-xl font-semibold mb-4 text-center sm:text-left">Ca proprietar</h2>
                <div className="space-y-6">
                  {ownerBookings.map((booking: any) => (
                    <Card key={booking.id} className="rounded-2xl shadow-md p-4 sm:p-6 transition-shadow">
                      <CardHeader className="p-0 mb-2">
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-0">
                            <div>
                            <CardTitle className="text-base sm:text-lg line-clamp-2 break-words">{booking.gear?.title || 'Echipament necunoscut'}</CardTitle>
                            <CardDescription className="text-xs sm:text-sm">
                                {format(new Date(booking.start_date), 'dd MMM yyyy')} - {format(new Date(booking.end_date), 'dd MMM yyyy')}
                              </CardDescription>
                            </div>
                            <div className="flex flex-row sm:flex-col gap-2 items-end sm:items-end justify-end">
                            <div className="flex items-center gap-1 flex-wrap">
                                {getBookingBadges(booking, user?.id)}
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
                            </div>
                          </div>
                        </CardHeader>
                      <CardContent className="p-0">
                          <div className="space-y-2">
                          <div className="text-sm text-muted-foreground truncate">
                              Chiriaș: {getUserDisplayName(booking.renter) || 'Chiriaș necunoscut'}
                            </div>
                          <div className="text-sm text-muted-foreground truncate">
                              Locație pickup: {booking.pickup_location || 'Nespecificat'}
                            </div>
                            <div className="text-sm font-medium text-green-600">
                              Total: {formatPrice(booking.total_amount) || 'N/A'}
                            </div>
                          <div className="flex flex-col sm:flex-row gap-2 mt-4 w-full">
                              {booking.status === 'pending' && (
                                <>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => setPickupBooking(booking)}
                                  className="text-blue-600 border-blue-200 hover:bg-blue-50 w-full sm:w-auto rounded-xl"
                                  >
                                    <MapPin className="h-4 w-4 mr-1" />
                                    Setează locația
                                  </Button>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span>
                                          <Button 
                                            variant="default" 
                                            size="sm" 
                                            onClick={() => handleBookingAction(booking.id, 'confirmed')}
                                            disabled={acceptingBooking}
                                          className="bg-green-600 hover:bg-green-700 w-full sm:w-auto rounded-xl"
                                          >
                                            <CheckCircle className="h-4 w-4 mr-1" />
                                            Confirmă
                                          </Button>
                                        </span>
                                      </TooltipTrigger>
                                    </Tooltip>
                                  </TooltipProvider>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => handleBookingAction(booking.id, 'rejected')}
                                    disabled={acceptingBooking}
                                  className="text-red-600 border-red-200 hover:bg-red-50 w-full sm:w-auto rounded-xl"
                                  >
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Respinge
                                  </Button>
                                </>
                              )}
                              {booking.status === 'confirmed' && user?.id === booking.owner_id && (
                                <div className="w-full">
                                  <BookingStatusFlow 
                                    booking={booking} 
                                    onStatusUpdate={() => {
                                      queryClient.invalidateQueries({ queryKey: ['bookings', 'user', user?.id] });
                                      queryClient.invalidateQueries({ queryKey: ['user-bookings'] });
                                      queryClient.invalidateQueries({ queryKey: ['user-listings'] });
                                    }} 
                                    onPaymentClick={handlePaymentClick}
                                    onSetPickupLocation={setPickupBooking}
                                  />
                                </div>
                              )}
                              {booking.status === 'active' && user?.id === booking.owner_id && (
                                <div className="w-full">
                                  <BookingStatusFlow 
                                    booking={booking} 
                                    onStatusUpdate={() => {
                                      queryClient.invalidateQueries({ queryKey: ['bookings', 'user', user?.id] });
                                      queryClient.invalidateQueries({ queryKey: ['user-bookings'] });
                                      queryClient.invalidateQueries({ queryKey: ['user-listings'] });
                                    }} 
                                    onPaymentClick={handlePaymentClick}
                                    onSetPickupLocation={setPickupBooking}
                                  />
                                </div>
                              )}
                              {booking.status === 'returned' && (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => handleCompleteRental(booking.id)}
                                  disabled={completingRental}
                                className="text-blue-600 border-blue-200 hover:bg-blue-50 w-full sm:w-auto rounded-xl"
                                >
                                  <CheckCircle2 className="h-4 w-4 mr-1" />
                                  Finalizează
                                </Button>
                              )}
                              {(['confirmed', 'active', 'returned', 'completed'].includes(booking.status) && booking.payment_status === 'completed' && user?.id === booking.owner_id) && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setClaimBooking(booking)}
                                className="text-red-600 border-red-200 hover:bg-red-50 w-full sm:w-auto rounded-xl"
                                >
                                  <AlertCircle className="h-4 w-4 mr-1" />
                                  Revendică daune
                                </Button>
                              )}
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => navigate('/messages')}
                              className="text-gray-600 border-gray-200 hover:bg-gray-50 w-full sm:w-auto rounded-xl"
                              >
                                <MessageSquare className="h-4 w-4 mr-1" />
                                Mesaje
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
      <Footer />

      {/* Modals */}
      {pickupBooking && (
        <PickupLocationModal
          bookingId={pickupBooking.id}
          isOpen={!!pickupBooking}
          onClose={() => setPickupBooking(null)}
          onSaved={() => {
            setPickupBooking(null);
            queryClient.invalidateQueries({ queryKey: ['bookings', 'user', user?.id] });
          }}
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
          onClose={() => setPaymentBooking(null)}
        />
      )}

      {confirmationBooking && (
        <BookingStatusFlow
          booking={confirmationBooking}
          onStatusUpdate={() => {
            setConfirmationBooking(null);
            // Invalidate queries to trigger real-time updates
            queryClient.invalidateQueries({ queryKey: ['bookings', 'user', user?.id] });
            queryClient.invalidateQueries({ queryKey: ['user-bookings'] });
            queryClient.invalidateQueries({ queryKey: ['user-listings'] });
          }}
          onPaymentClick={handlePaymentClick}
          onSetPickupLocation={setPickupBooking}
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
                    // Invalidate queries to trigger real-time updates
                    queryClient.invalidateQueries({ queryKey: ['bookings', 'user', user?.id] });
                    queryClient.invalidateQueries({ queryKey: ['user-bookings'] });
                    queryClient.invalidateQueries({ queryKey: ['user-listings'] });
                  }}
                />
              ) : (
                <RenterClaimForm
                  bookingId={String(claimBooking.id)}
                  onSubmitted={() => {
                    setClaimBooking(null);
                    // Invalidate queries to trigger real-time updates
                    queryClient.invalidateQueries({ queryKey: ['bookings', 'user', user?.id] });
                    queryClient.invalidateQueries({ queryKey: ['user-bookings'] });
                    queryClient.invalidateQueries({ queryKey: ['user-listings'] });
                  }}
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}


    </div>
  );
};

export default BookingsPage; 