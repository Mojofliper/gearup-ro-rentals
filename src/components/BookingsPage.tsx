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
import { Loader2, CheckCircle, XCircle, MapPin, Eye, Star, CheckCircle2, ArrowLeft, CreditCard, MessageSquare } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { PickupLocationModal } from '@/components/PickupLocationModal';
import { ReviewModal } from '@/components/ReviewModal';
import { useCompleteRental } from '@/hooks/useBookings';
import { PaymentModal } from '@/components/PaymentModal';
import { ConfirmationSystem } from '@/components/ConfirmationSystem';

export const BookingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: bookings = [], isLoading } = useUserBookings();
  const { mutate: acceptBooking, isPending: acceptingBooking } = useAcceptBooking();
  const { mutate: completeRental, isPending: completingRental } = useCompleteRental();
  const { mutate: confirmReturn, isPending: confirmingReturn } = useConfirmReturn();
  
  const [pickupBooking, setPickupBooking] = useState<any>(null);
  const [reviewingBooking, setReviewingBooking] = useState<any>(null);
  const [paymentBooking, setPaymentBooking] = useState<any>(null);
  const [confirmationBooking, setConfirmationBooking] = useState<any>(null);
  const [confirmationType, setConfirmationType] = useState<'pickup' | 'return'>('pickup');

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
      toast({
        title: 'Funcționalitate în dezvoltare',
        description: 'Respingerea rezervărilor va fi implementată în curând.',
        variant: 'destructive',
      });
    }
  };

  const handleCompleteRental = (bookingId: string) => {
    completeRental(bookingId, {
      onSuccess: () => {
        toast({
          title: 'Închiriere finalizată!',
          description: 'Închirierea a fost finalizată cu succes.',
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

  const getUserDisplayName = (userData: any) => {
    if (userData?.full_name) return userData.full_name;
    if (userData?.first_name && userData?.last_name) return `${userData.first_name} ${userData.last_name}`;
    if (userData?.email) return userData.email.split('@')[0];
    return 'Utilizator necunoscut';
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/dashboard')}
            className="hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Înapoi la Dashboard
          </Button>
          <h1 className="text-3xl font-bold">Rezervările mele</h1>
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
                <h2 className="text-xl font-semibold mb-4">Ca chiriaș</h2>
                <div className="space-y-4">
                  {userBookings.map((booking: any) => (
                    <Card key={booking.id} className="hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">{booking.gear_title}</CardTitle>
                            <CardDescription>
                              {format(new Date(booking.start_date), 'dd MMM yyyy')} - {format(new Date(booking.end_date), 'dd MMM yyyy')}
                            </CardDescription>
                          </div>
                          {getStatusBadge(booking.status)}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="text-sm text-muted-foreground">
                            Proprietar: {getUserDisplayName(booking.owner)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Locație pickup: {booking.pickup_location || 'Nespecificat'}
                          </div>
                          <div className="flex items-center gap-2 mt-4">
                            {booking.status === 'completed' && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setReviewingBooking(booking)}
                                className="text-green-600 border-green-200 hover:bg-green-50"
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
                                className="text-blue-600 border-blue-200 hover:bg-blue-50"
                              >
                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                Finalizează
                              </Button>
                            )}
                            {booking.status === 'confirmed' && (
                              <>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => handleConfirmation(booking, 'pickup')}
                                  className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Confirmă pickup
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => handlePaymentClick(booking)}
                                  className="text-green-600 border-green-200 hover:bg-green-50"
                                >
                                  <CreditCard className="h-4 w-4 mr-1" />
                                  Plătește
                                </Button>
                              </>
                            )}
                            {booking.status === 'active' && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleConfirmation(booking, 'return')}
                                className="text-purple-600 border-purple-200 hover:bg-purple-50"
                              >
                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                Confirmă returnarea
                              </Button>
                            )}
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => navigate('/messages')}
                              className="text-gray-600 border-gray-200 hover:bg-gray-50"
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
            
            {ownerBookings.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold mb-4">Ca proprietar</h2>
                <div className="space-y-4">
                  {ownerBookings.map((booking: any) => (
                    <Card key={booking.id} className="hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">{booking.gear_title}</CardTitle>
                            <CardDescription>
                              {format(new Date(booking.start_date), 'dd MMM yyyy')} - {format(new Date(booking.end_date), 'dd MMM yyyy')}
                            </CardDescription>
                          </div>
                          {getStatusBadge(booking.status)}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="text-sm text-muted-foreground">
                            Chiriaș: {getUserDisplayName(booking.renter)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Locație pickup: {booking.pickup_location || 'Nespecificat'}
                          </div>
                          <div className="flex items-center gap-2 mt-4">
                            {booking.status === 'pending' && (
                              <>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => setPickupBooking(booking)}
                                  className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                >
                                  <MapPin className="h-4 w-4 mr-1" />
                                  Setează locația
                                </Button>
                                <Button 
                                  variant="default" 
                                  size="sm" 
                                  onClick={() => handleBookingAction(booking.id, 'confirmed')}
                                  disabled={acceptingBooking}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Confirmă
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => handleBookingAction(booking.id, 'rejected')}
                                  disabled={acceptingBooking}
                                  className="text-red-600 border-red-200 hover:bg-red-50"
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Respinge
                                </Button>
                              </>
                            )}
                            {booking.status === 'confirmed' && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setPickupBooking(booking)}
                                className="text-blue-600 border-blue-200 hover:bg-blue-50"
                              >
                                <MapPin className="h-4 w-4 mr-1" />
                                Setează locația
                              </Button>
                            )}
                            {booking.status === 'returned' && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleCompleteRental(booking.id)}
                                disabled={completingRental}
                                className="text-blue-600 border-blue-200 hover:bg-blue-50"
                              >
                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                Finalizează
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
    </div>
  );
};

export default BookingsPage; 