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
import { useOwnerBookings, useUpdateBooking } from '@/hooks/useBookings';
import { EditGearModal } from '@/components/EditGearModal';
import { ReviewModal } from '@/components/ReviewModal';
<<<<<<< Updated upstream
import { useSecureGear } from '@/hooks/useSecureGear';
import { useQueryClient } from '@tanstack/react-query';
import { Star, MapPin, Calendar, Edit, Shield, Package, AlertCircle, Eye, Settings, CheckCircle, Trash2 } from 'lucide-react';
=======
import { ConfirmationSystem } from '@/components/ConfirmationSystem';
import { Star, MapPin, Calendar, Edit, Shield, Package, AlertCircle, Eye, Settings, CheckCircle, CreditCard } from 'lucide-react';
import { PaymentModal } from '@/components/PaymentModal';
>>>>>>> Stashed changes
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { PaymentService } from '@/services/paymentService';

export const Profile: React.FC = () => {
  const { user, profile, updateProfile } = useAuth();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState(profile?.avatar_url || '');
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    location: profile?.location || '',
  });

  const { data: bookings = [], isLoading: bookingsLoading } = useUserBookings();
  const { data: listings = [], isLoading: listingsLoading } = useUserListings();
  const { data: reviews = [], isLoading: reviewsLoading } = useUserReviews();
  const { data: stats, isLoading: statsLoading } = useUserStats();
  const { data: ownerBookings = [], isLoading: ownerBookingsLoading } = useOwnerBookings();
  const { mutate: updateBooking } = useUpdateBooking();
  const { deleteGear, loading: deleteLoading } = useSecureGear();
  
  const [editingGear, setEditingGear] = useState<any>(null);
  const [reviewingBooking, setReviewingBooking] = useState<any>(null);
<<<<<<< Updated upstream
  const [deletingGearId, setDeletingGearId] = useState<string | null>(null);

  // Sync local state with profile data
  useEffect(() => {
    if (profile) {
      setCurrentAvatarUrl(profile.avatar_url || '');
      setFormData({
        full_name: profile.full_name || '',
        location: profile.location || '',
      });
    }
  }, [profile]);
=======
  const [paymentBooking, setPaymentBooking] = useState<any>(null);
  const [confirmationBooking, setConfirmationBooking] = useState<any>(null);
  const [confirmationType, setConfirmationType] = useState<'pickup' | 'return'>('pickup');
>>>>>>> Stashed changes

  if (!user || !profile) return null;

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
    updateBooking({
      id: bookingId,
      updates: { status }
    }, {
      onSuccess: () => {
        toast({
          title: status === 'confirmed' ? 'Rezervare acceptată!' : 'Rezervare respinsă',
          description: status === 'confirmed' 
            ? 'Închiriatorul a fost notificat despre acceptarea rezervării.'
            : 'Închiriatorul a fost notificat despre respingerea rezervării.',
        });
      },
      onError: (error: any) => {
        toast({
          title: 'Eroare',
          description: 'Nu s-a putut actualiza starea rezervării.',
          variant: 'destructive',
        });
        console.error('Booking update error:', error);
      }
    });
  };

<<<<<<< Updated upstream
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
        description: 'Echipamentul a fost șters cu succes din profilul tău.',
      });
    } catch (error: any) {
      toast({
        title: 'Eroare',
        description: 'Nu s-a putut șterge echipamentul. Te rugăm să încerci din nou.',
        variant: 'destructive',
      });
      console.error('Delete gear error:', error);
    } finally {
      setDeletingGearId(null);
    }
=======
  const handleConfirmation = (booking: any, type: 'pickup' | 'return') => {
    setConfirmationBooking(booking);
    setConfirmationType(type);
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
  // Get the full avatar URL - use profile.avatar_url as the source of truth
  const fullAvatarUrl = profile?.avatar_url 
    ? profile.avatar_url.startsWith('http') 
      ? profile.avatar_url 
      : `https://wnrbxwzeshgblkfidayb.supabase.co/storage/v1/object/public/avatars/${profile.avatar_url}`
=======


  // Get the full avatar URL
  const fullAvatarUrl = currentAvatarUrl 
    ? currentAvatarUrl.startsWith('http') 
      ? currentAvatarUrl 
      : `https://wnrbxwzeshgblkfidayb.supabase.co/storage/v1/object/public/avatars/${currentAvatarUrl}`
>>>>>>> Stashed changes
    : '';

  return (
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
                  <h1 className="text-2xl font-bold">{profile.full_name || 'Utilizator'}</h1>
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
                    <span>{profile.location || 'Locație nedefinită'}</span>
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
              </div>
            </div>

            {isEditing && (
              <div className="mt-6 pt-6 border-t space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="full_name">Nume</Label>
                    <Input
                      id="full_name"
                      value={formData.full_name}
                      onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="location">Locație</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => setFormData({...formData, location: e.target.value})}
                    />
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button onClick={handleSave}>Salvează</Button>
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    Anulează
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {statsLoading ? '...' : stats?.totalRentals || 0}
              </div>
              <div className="text-sm text-muted-foreground">Închirieri</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {statsLoading ? '...' : stats?.totalListings || 0}
              </div>
              <div className="text-sm text-muted-foreground">Echipamente oferite</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {statsLoading ? '...' : stats?.rating || 0}
              </div>
              <div className="text-sm text-muted-foreground">Rating mediu</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">
                {statsLoading ? '...' : stats?.reviews || 0}
              </div>
              <div className="text-sm text-muted-foreground">Recenzii</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="rentals" className="space-y-4">
          <TabsList>
            <TabsTrigger value="rentals">Închirierile mele</TabsTrigger>
            <TabsTrigger value="bookings">Rezervări primite</TabsTrigger>
            <TabsTrigger value="listings">Echipamentele mele</TabsTrigger>
            <TabsTrigger value="reviews">Recenzii</TabsTrigger>
          </TabsList>

          <TabsContent value="rentals" className="space-y-4">
            {bookingsLoading ? (
              <div className="text-center py-8">Se încarcă...</div>
            ) : bookings.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nu ai încă închirieri</h3>
                  <p className="text-muted-foreground">
                    Explorează echipamentele disponibile și fă prima ta rezervare!
                  </p>
                </CardContent>
              </Card>
            ) : (
              bookings.map((booking) => (
                <Card key={booking.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{booking.gear?.name || 'Echipament necunoscut'}</h3>
                        <p className="text-sm text-muted-foreground">
                          De la {booking.owner?.full_name || 'Proprietar necunoscut'} • {format(new Date(booking.start_date), 'dd MMM yyyy')} - {format(new Date(booking.end_date), 'dd MMM yyyy')}
                        </p>
                        <p className="text-sm font-medium mt-1">
                          Total: {booking.total_amount ? (booking.total_amount / 100).toFixed(2) : '0'} RON
                        </p>
                        {/* Debug info - remove this later */}
                        <p className="text-xs text-gray-400 mt-1">
                          Debug: Status={booking.status}, Payment={booking.payment_status || 'null'}
                        </p>
                      </div>
<<<<<<< Updated upstream
                      <div className="text-right space-y-2">
                        {getStatusBadge(booking.status || 'pending')}
                        {booking.status === 'confirmed' && (
                          <Button
                            size="sm"
                            onClick={() => handlePayClick(booking)}
                            className="w-full"
                          >
                            <CreditCard className="h-3 w-3 mr-1" />
                            Plătește
                          </Button>
                        )}
                        {booking.status === 'completed' && !reviews.some(r => r.booking_id === booking.id) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setReviewingBooking(booking)}
                            className="w-full"
                          >
                            <Star className="h-3 w-3 mr-1" />
                            Lasă recenzie
                          </Button>
                        )}
                      </div>
=======
                     <div className="text-right space-y-2">
                                               {/* Show combined status for better UX */}
                        <div className="flex flex-col items-end space-y-1">
                       {getStatusBadge(booking.status || 'pending')}
                          {booking.payment_status !== 'paid' && (
                            <Badge variant="outline" className="text-xs">
                              {booking.payment_status === 'pending' || !booking.payment_status ? 'Plată în așteptare' : 
                               booking.payment_status === 'failed' ? 'Plată eșuată' : 
                               booking.payment_status === 'refunded' ? 'Rambursat' : 'Plată necunoscută'}
                            </Badge>
                          )}
                        </div>
                        
                        {/* Payment button for confirmed bookings - show if payment is not paid */}
                        {booking.status === 'confirmed' && (booking.payment_status === 'pending' || !booking.payment_status || booking.payment_status !== 'paid') && (
                          <Button
                            size="sm"
                            onClick={() => setPaymentBooking(booking)}
                            className="w-full"
                          >
                            <CreditCard className="h-3 w-3 mr-1" />
                            Plătește
                          </Button>
                        )}
                       
                       {/* Return confirmation for active bookings */}
                       {booking.status === 'active' && (
                         <Button
                           variant="outline"
                           size="sm"
                           onClick={() => handleConfirmation(booking, 'return')}
                           className="w-full"
                         >
                           <CheckCircle className="h-3 w-3 mr-1" />
                           Confirmă returnarea
                         </Button>
                       )}
                       
                       {/* Review button for completed bookings */}
                       {booking.status === 'completed' && !reviews.some(r => r.booking_id === booking.id) && (
                         <Button
                           variant="outline"
                           size="sm"
                           onClick={() => setReviewingBooking(booking)}
                           className="w-full"
                         >
                           <Star className="h-3 w-3 mr-1" />
                           Lasă recenzie
                         </Button>
                       )}
                     </div>
>>>>>>> Stashed changes
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="bookings" className="space-y-4">
            {ownerBookingsLoading ? (
              <div className="text-center py-8">Se încarcă...</div>
            ) : ownerBookings.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nu ai încă rezervări</h3>
                  <p className="text-muted-foreground">
                    Rezervările pentru echipamentele tale vor apărea aici.
                  </p>
                </CardContent>
              </Card>
            ) : (
              ownerBookings.map((booking) => (
                <Card key={booking.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{booking.gear?.name || 'Echipament necunoscut'}</h3>
                        <p className="text-sm text-muted-foreground">
                          Închiriat de {booking.renter?.full_name || 'Utilizator necunoscut'} • {format(new Date(booking.start_date), 'dd MMM yyyy')} - {format(new Date(booking.end_date), 'dd MMM yyyy')}
                        </p>
                        <p className="text-sm font-medium mt-1">
                          Total: {booking.total_amount ? (booking.total_amount / 100).toFixed(2) : '0'} RON
                        </p>
                      </div>
                      <div className="text-right space-y-2">
                        {/* Show combined status for better UX */}
                        <div className="flex flex-col items-end space-y-1">
                        {getStatusBadge(booking.status || 'pending')}
<<<<<<< Updated upstream
=======
                          {booking.payment_status !== 'paid' && (
                            <Badge variant="outline" className="text-xs">
                              {booking.payment_status === 'pending' ? 'Plată în așteptare' : 
                               booking.payment_status === 'failed' ? 'Plată eșuată' : 
                               booking.payment_status === 'refunded' ? 'Rambursat' : 'Plată necunoscută'}
                            </Badge>
                          )}
                        </div>
                        
                        {/* Action buttons for pending bookings */}
>>>>>>> Stashed changes
                        {booking.status === 'pending' && (
                          <div className="space-y-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleBookingAction(booking.id, 'rejected')}
                            >
                              Respinge
                            </Button>
                            <Button 
                              size="sm"
                              onClick={() => handleBookingAction(booking.id, 'confirmed')}
                            >
                              Acceptă
                            </Button>
                          </div>
                        )}
<<<<<<< Updated upstream
=======
                        
                        {/* Pickup confirmation for confirmed bookings */}
                        {booking.status === 'confirmed' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleConfirmation(booking, 'pickup')}
                            className="w-full"
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Confirmă ridicarea
                          </Button>
                        )}
>>>>>>> Stashed changes
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="listings" className="space-y-4">
            {listingsLoading ? (
              <div className="text-center py-8">Se încarcă...</div>
            ) : listings.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nu ai încă echipamente listate</h3>
                  <p className="text-muted-foreground mb-4">
                    Adaugă primul tău echipament și începe să câștigi bani!
                  </p>
                  <Button>Adaugă echipament</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {listings.map((listing) => (
                  <Card key={listing.id}>
                    <div className="relative">
                      {listing.images && Array.isArray(listing.images) && listing.images.length > 0 ? (
                        <img
                          src={listing.images[0] as string}
                          alt={listing.name}
                          className="w-full h-32 object-cover rounded-t-lg"
                        />
                      ) : (
                        <div className="w-full h-32 bg-muted rounded-t-lg flex items-center justify-center">
                          <Package className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                      {!listing.is_available && (
                        <div className="absolute top-2 right-2">
                          <Badge variant="destructive">Indisponibil</Badge>
                        </div>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold mb-2">{listing.name}</h3>
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-bold">
                          {listing.price_per_day ? (listing.price_per_day / 100).toFixed(2) : '0'} RON/zi
                        </span>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingGear(listing)}
                          >
                            <Settings className="h-3 w-3 mr-1" />
                            Editează
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteGear(listing.id)}
                            disabled={deleteLoading && deletingGearId === listing.id}
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            {deleteLoading && deletingGearId === listing.id ? 'Se șterge...' : 'Șterge'}
                          </Button>
                          <Badge variant={listing.is_available ? "default" : "secondary"}>
                            {listing.is_available ? 'Disponibil' : 'Indisponibil'}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-1">
                            <Eye className="h-3 w-3" />
                            <span>{listing.view_count || 0}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="reviews" className="space-y-4">
            {reviewsLoading ? (
              <div className="text-center py-8">Se încarcă...</div>
            ) : reviews.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Star className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nu ai încă recenzii</h3>
                  <p className="text-muted-foreground">
                    Recenziile vor apărea aici după ce completezi rezervări.
                  </p>
                </CardContent>
              </Card>
            ) : (
              reviews.map((review) => (
                <Card key={review.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3 mb-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {review.reviewer?.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{review.reviewer?.full_name || 'Utilizator anonim'}</div>
                        <div className="flex items-center space-x-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star 
                              key={star} 
                              className={`h-4 w-4 ${star <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} 
                            />
                          ))}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(review.created_at), 'dd MMM yyyy')}
                        </div>
                      </div>
                    </div>
                    {review.comment && (
                      <p className="text-muted-foreground">{review.comment}</p>
                    )}
                    {review.gear && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Pentru: {review.gear.name}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Footer />

      {/* Modals */}
      {editingGear && (
        <EditGearModal
          isOpen={!!editingGear}
          onClose={() => setEditingGear(null)}
          gear={editingGear}
        />
      )}

      {reviewingBooking && (
        <ReviewModal
          isOpen={!!reviewingBooking}
          onClose={() => setReviewingBooking(null)}
          booking={reviewingBooking}
        />
      )}
<<<<<<< Updated upstream
=======

      {paymentBooking && (
        <PaymentModal
          isOpen={!!paymentBooking}
          onClose={() => setPaymentBooking(null)}
          booking={paymentBooking}
          onPaymentSuccess={() => {
            setPaymentBooking(null);
            // Refresh the page or invalidate queries
            window.location.reload();
          }}
        />
      )}

      {confirmationBooking && (
        <ConfirmationSystem
          isOpen={!!confirmationBooking}
          onClose={() => setConfirmationBooking(null)}
          booking={confirmationBooking}
          type={confirmationType}
        />
      )}
>>>>>>> Stashed changes
    </div>
  );
};
