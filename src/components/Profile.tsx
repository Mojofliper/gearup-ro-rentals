
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
import { useSecureGear } from '@/hooks/useSecureGear';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ConfirmationSystem } from '@/components/ConfirmationSystem';
import { Star, MapPin, Calendar, Edit, Shield, Package, AlertCircle, Eye, Settings, CheckCircle, CreditCard, Trash2 } from 'lucide-react';
import { PaymentModal } from '@/components/PaymentModal';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { PaymentService } from '@/services/paymentService';
import { supabase } from '@/integrations/supabase/client';

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
  const [deletingGearId, setDeletingGearId] = useState<string | null>(null);
  const [paymentBooking, setPaymentBooking] = useState<any>(null);
  const [paymentTransaction, setPaymentTransaction] = useState<any>(null);
  const [confirmationBooking, setConfirmationBooking] = useState<any>(null);
  const [confirmationType, setConfirmationType] = useState<'pickup' | 'return'>('pickup');

  // Query to check if user has already reviewed a booking
  const { data: bookingReviews = [] } = useQuery({
    queryKey: ['booking-reviews', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('reviews')
        .select('booking_id')
        .eq('reviewer_id', user.id);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

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
  };

  const handleConfirmation = (booking: any, type: 'pickup' | 'return') => {
    setConfirmationBooking(booking);
    setConfirmationType(type);
  };

  const handlePaymentClick = async (booking: any) => {
    try {
      // Create or get transaction for this booking
      const transaction = await PaymentService.getOrCreateTransactionForBooking(booking);
      setPaymentTransaction(transaction);
      setPaymentBooking(booking);
    } catch (error: any) {
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

  // Check if user has already reviewed a specific booking
  const hasReviewedBooking = (bookingId: string) => {
    return bookingReviews.some(review => review.booking_id === bookingId);
  };

  // Get the full avatar URL - use profile.avatar_url as the source of truth
  const fullAvatarUrl = profile?.avatar_url 
    ? profile.avatar_url.startsWith('http') 
      ? profile.avatar_url 
      : `https://wnrbxwzeshgblkfidayb.supabase.co/storage/v1/object/public/avatars/${profile.avatar_url}`
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
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Nume complet</Label>
                    <Input
                      id="full_name"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      placeholder="Numele tău complet"
                    />
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
                </div>
                <div className="flex space-x-2">
                  <Button onClick={handleSave}>Salvează</Button>
                  <Button variant="outline" onClick={() => setIsEditing(false)}>Anulează</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

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
                    <p className="text-2xl font-bold">{stats.rating || 'N/A'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Eye className="h-5 w-5 text-purple-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Vizualizări</p>
                    <p className="text-2xl font-bold">{stats.reviews}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="bookings" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="bookings">Rezervările mele</TabsTrigger>
            <TabsTrigger value="listings">Echipamentele mele</TabsTrigger>
            <TabsTrigger value="reviews">Recenziile mele</TabsTrigger>
            <TabsTrigger value="owner">Ca proprietar</TabsTrigger>
          </TabsList>

          {/* My Bookings Tab */}
          <TabsContent value="bookings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Rezervările mele</CardTitle>
              </CardHeader>
              <CardContent>
                {bookingsLoading ? (
                  <div className="text-center py-8">Se încarcă...</div>
                ) : bookings.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nu ai încă nicio rezervare.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {bookings.map((booking) => (
                      <div key={booking.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold">{booking.gear?.name}</h3>
                          {getStatusBadge(booking.status)}
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>De la: {format(new Date(booking.start_date), 'dd/MM/yyyy')}</p>
                          <p>Până la: {format(new Date(booking.end_date), 'dd/MM/yyyy')}</p>
                          <p>Total: {booking.total_amount} RON</p>
                          <p>Proprietar: {booking.owner?.full_name}</p>
                        </div>
                        <div className="flex space-x-2 mt-3">
                          {booking.status === 'confirmed' && booking.payment_status === 'pending' && (
                            <Button
                              size="sm"
                              onClick={() => handlePaymentClick(booking)}
                            >
                              <CreditCard className="h-4 w-4 mr-1" />
                              Plătește
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
                          {booking.status === 'completed' && !hasReviewedBooking(booking.id) && (
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
                  <div className="text-center py-8">Se încarcă...</div>
                ) : listings.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nu ai încă niciun echipament listat.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {listings.map((gear) => (
                      <div key={gear.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold">{gear.name}</h3>
                          <div className="flex items-center space-x-2">
                            <Badge variant={gear.is_available ? 'default' : 'secondary'}>
                              {gear.is_available ? 'Disponibil' : 'Indisponibil'}
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
                          <p>Preț: {gear.price_per_day} RON/zi</p>
                          <p>Brand: {gear.brand}</p>
                          <p>Locație: {gear.pickup_location}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* My Reviews Tab */}
          <TabsContent value="reviews" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recenziile mele</CardTitle>
              </CardHeader>
              <CardContent>
                {reviewsLoading ? (
                  <div className="text-center py-8">Se încarcă...</div>
                ) : reviews.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nu ai încă nicio recenzie.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reviews.map((review) => (
                      <div key={review.id} className="border rounded-lg p-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="flex">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${
                                  i < review.rating
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-sm text-muted-foreground">
                            pentru {review.gear?.name}
                          </span>
                        </div>
                        <p className="text-sm">{review.comment}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {format(new Date(review.created_at), 'dd/MM/yyyy')}
                        </p>
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
                  <div className="text-center py-8">Se încarcă...</div>
                ) : ownerBookings.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nu ai încă nicio rezervare pentru echipamentele tale.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {ownerBookings.map((booking) => (
                      <div key={booking.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold">{booking.gear?.name}</h3>
                          {getStatusBadge(booking.status)}
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>De la: {format(new Date(booking.start_date), 'dd/MM/yyyy')}</p>
                          <p>Până la: {format(new Date(booking.end_date), 'dd/MM/yyyy')}</p>
                          <p>Total: {booking.total_amount} RON</p>
                          <p>Închiriator: {booking.renter?.full_name}</p>
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
                              <AlertCircle className="h-4 w-4 mr-1" />
                              Respinge
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
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
          transaction={paymentTransaction}
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

      <Footer />
    </div>
  );
};
