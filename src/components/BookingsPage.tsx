import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserBookings } from '@/hooks/useBookings';
import { useAcceptBooking, useConfirmReturn } from '@/hooks/useBookings';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Loader2, CheckCircle, XCircle, MapPin, Eye, Star, CheckCircle2, ArrowLeft, CreditCard, MessageSquare, AlertCircle, DollarSign } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { PickupLocationModal } from '@/components/PickupLocationModal';
import { ReviewModal } from '@/components/ReviewModal';
import { useCompleteRental, useRejectBooking } from '@/hooks/useBookings';
import { useDeleteConversation } from '@/hooks/useMessages';
import { PaymentModal } from '@/components/PaymentModal';
import { ConfirmationSystem } from '@/components/ConfirmationSystem';
import { BookingStatusFlow } from '@/components/BookingStatusFlow';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import OwnerClaimForm from '@/components/OwnerClaimForm';
import { RenterClaimForm } from '@/components/RenterClaimForm';


export const BookingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800">Finalizat</Badge>;
      case 'active':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">În curs</Badge>;
      case 'confirmed':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Confirmat</Badge>;
      case 'pending':
        return <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-200">În așteptare</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Anulat</Badge>;
      case 'returned':
        return <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-200">Returnat</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPaymentStatusBadge = (paymentStatus: string) => {
    switch (paymentStatus) {
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800 flex items-center gap-1">
          <DollarSign className="h-3 w-3" />
          Plătit
        </Badge>;
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          În așteptare
        </Badge>;
      case 'processing':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200 flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Procesare
        </Badge>;
      case 'failed':
        return <Badge variant="destructive" className="flex items-center gap-1">
          <XCircle className="h-3 w-3" />
          Eșuat
        </Badge>;
      case 'refunded':
        return <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200 flex items-center gap-1">
          <ArrowLeft className="h-3 w-3" />
          Rambursat
        </Badge>;
      default:
        return <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200">
          {paymentStatus || 'Necunoscut'}
        </Badge>;
    }
  };

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
      <main className="flex-1 max-w-4xl mx-auto w-full px-2 sm:px-4 py-4 sm:py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/dashboard')}
            className="hover:bg-gray-100 transition-colors w-full sm:w-auto"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Înapoi la Dashboard
          </Button>
          <h1 className="text-2xl sm:text-3xl font-bold w-full sm:w-auto">Rezervările mele</h1>
        </div>
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="animate-spin w-8 h-8 text-muted-foreground" />
          </div>
        ) : (
          <>
            {bookings.length === 0 && (
              <div className="text-center text-muted-foreground py-12">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Eye className="h-12 w-12 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Nu ai rezervări încă</h3>
                <p className="text-gray-600">Începe să explorezi echipamentele disponibile!</p>
              </div>
            )}
            
            {userBookings.length > 0 && (
              <section className="mb-10">
                <h2 className="text-lg sm:text-xl font-semibold mb-4">Ca chiriaș</h2>
                <div className="space-y-4">
                  {userBookings.map((booking: any) => {
                    return (
                      <Card key={booking.id} className="hover:shadow-md transition-shadow">
                        <CardHeader>
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-0">
                            <div>
                              <CardTitle className="text-base sm:text-lg">{booking.gear?.title || 'Echipament necunoscut'}</CardTitle>
                              <CardDescription>
                                {format(new Date(booking.start_date), 'dd MMM yyyy')} - {format(new Date(booking.end_date), 'dd MMM yyyy')}
                              </CardDescription>
                            </div>
                            <div className="flex flex-row sm:flex-col gap-2 items-end sm:items-end justify-end">
                              {getStatusBadge(booking.status)}
                              {getPaymentStatusBadge(booking.payment_status)}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div className="text-sm text-muted-foreground">
                              Proprietar: {getUserDisplayName(booking.owner) || 'Proprietar necunoscut'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Locație pickup: {booking.pickup_location || 'Nespecificat'}
                            </div>
                            <div className="text-sm font-medium text-green-600">
                              Total: {formatPrice(booking.total_amount) || 'N/A'}
                            </div>
                            <div className="flex flex-wrap flex-col sm:flex-row gap-2 mt-4 w-full">
                              {booking.status === 'completed' && (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => setReviewingBooking(booking)}
                                  className="text-green-600 border-green-200 hover:bg-green-50 w-full sm:w-auto"
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
                                  className="text-blue-600 border-blue-200 hover:bg-blue-50 w-full sm:w-auto"
                                >
                                  <CheckCircle2 className="h-4 w-4 mr-1" />
                                  Finalizează
                                </Button>
                              )}
                              {(booking.status === 'confirmed' || booking.status === 'active') && user?.id === booking.renter_id && (
                                <div className="w-full">
                                  <BookingStatusFlow 
                                    booking={booking} 
                                    onStatusUpdate={() => window.location.reload()} 
                                    onPaymentClick={handlePaymentClick}
                                  />
                                </div>
                              )}
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => navigate('/messages')}
                                className="text-gray-600 border-gray-200 hover:bg-gray-50 w-full sm:w-auto"
                              >
                                <MessageSquare className="h-4 w-4 mr-1" />
                                Mesaje
                              </Button>
                              {(['confirmed', 'active', 'returned'].includes(booking.status) && booking.payment_status === 'completed' && user?.id === booking.renter_id) && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setClaimBooking(booking)}
                                  className="text-red-600 border-red-200 hover:bg-red-50 w-full sm:w-auto"
                                >
                                  <AlertCircle className="h-4 w-4 mr-1" />
                                  Revendică daune
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </section>
            )}
            
            {ownerBookings.length > 0 && (
              <section>
                <h2 className="text-lg sm:text-xl font-semibold mb-4">Ca proprietar</h2>
                <div className="space-y-4">
                  {ownerBookings.map((booking: any) => {
                    return (
                      <Card key={booking.id} className="hover:shadow-md transition-shadow">
                        <CardHeader>
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-0">
                            <div>
                              <CardTitle className="text-base sm:text-lg">{booking.gear?.title || 'Echipament necunoscut'}</CardTitle>
                              <CardDescription>
                                {format(new Date(booking.start_date), 'dd MMM yyyy')} - {format(new Date(booking.end_date), 'dd MMM yyyy')}
                              </CardDescription>
                            </div>
                            <div className="flex flex-row sm:flex-col gap-2 items-end sm:items-end justify-end">
                              {getStatusBadge(booking.status)}
                              {getPaymentStatusBadge(booking.payment_status)}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div className="text-sm text-muted-foreground">
                              Chiriaș: {getUserDisplayName(booking.renter) || 'Chiriaș necunoscut'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Locație pickup: {booking.pickup_location || 'Nespecificat'}
                            </div>
                            <div className="text-sm font-medium text-green-600">
                              Total: {formatPrice(booking.total_amount) || 'N/A'}
                            </div>
                            <div className="flex flex-wrap flex-col sm:flex-row gap-2 mt-4 w-full">
                              {booking.status === 'pending' && (
                                <>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => setPickupBooking(booking)}
                                    className="text-blue-600 border-blue-200 hover:bg-blue-50 w-full sm:w-auto"
                                  >
                                    <MapPin className="h-4 w-4 mr-1" />
                                    Setează locația
                                  </Button>
                                  <Button 
                                    variant="default" 
                                    size="sm" 
                                    onClick={() => handleBookingAction(booking.id, 'confirmed')}
                                    disabled={acceptingBooking}
                                    className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
                                  >
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Confirmă
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => handleBookingAction(booking.id, 'rejected')}
                                    disabled={acceptingBooking}
                                    className="text-red-600 border-red-200 hover:bg-red-50 w-full sm:w-auto"
                                  >
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Respinge
                                  </Button>
                                </>
                              )}
                              {booking.status === 'confirmed' && user?.id === booking.owner_id && (
                                <>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => setPickupBooking(booking)}
                                    className="text-blue-600 border-blue-200 hover:bg-blue-50 w-full sm:w-auto"
                                  >
                                    <MapPin className="h-4 w-4 mr-1" />
                                    Setează locația
                                  </Button>
                                  <div className="w-full">
                                    <BookingStatusFlow 
                                      booking={booking} 
                                      onStatusUpdate={() => window.location.reload()} 
                                      onPaymentClick={handlePaymentClick}
                                    />
                                  </div>
                                </>
                              )}
                              {booking.status === 'active' && user?.id === booking.owner_id && (
                                <div className="w-full">
                                  <BookingStatusFlow 
                                    booking={booking} 
                                    onStatusUpdate={() => window.location.reload()} 
                                    onPaymentClick={handlePaymentClick}
                                  />
                                </div>
                              )}
                              {booking.status === 'returned' && (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => handleCompleteRental(booking.id)}
                                  disabled={completingRental}
                                  className="text-blue-600 border-blue-200 hover:bg-blue-50 w-full sm:w-auto"
                                >
                                  <CheckCircle2 className="h-4 w-4 mr-1" />
                                  Finalizează
                                </Button>
                              )}
                              {(['confirmed', 'active', 'returned'].includes(booking.status) && booking.payment_status === 'completed' && user?.id === booking.owner_id) && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setClaimBooking(booking)}
                                  className="text-red-600 border-red-200 hover:bg-red-50 w-full sm:w-auto"
                                >
                                  <AlertCircle className="h-4 w-4 mr-1" />
                                  Revendică daune
                                </Button>
                              )}
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => navigate('/messages')}
                                className="text-gray-600 border-gray-200 hover:bg-gray-50 w-full sm:w-auto"
                              >
                                <MessageSquare className="h-4 w-4 mr-1" />
                                Mesaje
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
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
            // The booking data will be refreshed automatically via real-time updates
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
                  // reload bookings
                  window.location.reload();
                }}
              />
            ) : (
              <RenterClaimForm
                bookingId={String(claimBooking.id)}
                onSubmitted={() => {
                  setClaimBooking(null);
                  // reload bookings
                  window.location.reload();
                }}
              />
            )}
          </DialogContent>
        </Dialog>
      )}


    </div>
  );
};

export default BookingsPage; 