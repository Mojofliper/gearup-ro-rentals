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
import { useUserBookings as useOwnerBookings, useAcceptBooking, useConfirmReturn } from '@/hooks/useBookings';
import { EditGearModal } from '@/components/EditGearModal';
import { ReviewModal } from '@/components/ReviewModal';
import { useDeleteGear } from '@/hooks/useGear';
import { useQueryClient } from '@tanstack/react-query';
import { ConfirmationSystem } from '@/components/ConfirmationSystem';
import { Star, MapPin, Calendar, Edit, Shield, Package, AlertCircle, Eye, Settings, CheckCircle, CreditCard, Trash2 } from 'lucide-react';
import { PaymentModal } from '@/components/PaymentModal';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { PaymentService } from '@/services/paymentService';
import { ErrorBoundary } from './ErrorBoundary';
import { ProfileSkeleton, BookingSkeleton } from './LoadingSkeleton';

export const Profile: React.FC = () => {
  const { user, profile, updateProfile } = useAuth();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState(profile?.avatar_url || '');
  const [formData, setFormData] = useState({
    first_name: profile?.first_name || '',
    last_name: profile?.last_name || '',
    location: profile?.location || '',
  });

  const { data: bookings = [], isLoading: bookingsLoading } = useUserBookings();
  const { data: listings = [], isLoading: listingsLoading } = useUserListings();
  const { data: reviews = [], isLoading: reviewsLoading } = useUserReviews();
  const { data: stats, isLoading: statsLoading } = useUserStats();
  const { data: ownerBookings = [], isLoading: ownerBookingsLoading } = useOwnerBookings();
  
  // Debug logging for ownerBookings
  console.log('ownerBookings data:', ownerBookings);
  console.log('ownerBookings loading:', ownerBookingsLoading);
  console.log('Current user ID:', user?.id);
  
  // Filter ownerBookings to only show bookings where user is the owner
  const filteredOwnerBookings = (ownerBookings as any[]).filter(booking => booking.owner_id === user?.id);
  console.log('Filtered ownerBookings (user as owner):', filteredOwnerBookings);
  
  const { mutate: acceptBooking } = useAcceptBooking();
  const { mutate: confirmReturn } = useConfirmReturn();
  const { mutate: deleteGear, isPending: deleteLoading } = useDeleteGear();
  
  const [editingGear, setEditingGear] = useState<any>(null);
  const [reviewingBooking, setReviewingBooking] = useState<any>(null);
  const [deletingGearId, setDeletingGearId] = useState<string | null>(null);
  const [paymentBooking, setPaymentBooking] = useState<any>(null);
  const [paymentTransaction, setPaymentTransaction] = useState<any>(null);
  const [confirmationBooking, setConfirmationBooking] = useState<any>(null);
  const [confirmationType, setConfirmationType] = useState<'pickup' | 'return'>('pickup');

  // Sync local state with profile data
  useEffect(() => {
    if (profile) {
      setCurrentAvatarUrl(profile.avatar_url || '');
      setFormData({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        location: profile.location || '',
      });
    }
  }, [profile]);

  if (!user || !profile) return null;

  // Type assertions for data with relations
  // Only show bookings where user is the renter in the renter tab
  const bookingsWithRelations = (bookings as any[]).filter(booking => booking.renter_id === user.id);
  const listingsWithRelations = listings as any[];
  // Map ownerBookingsWithRelations to ensure .renter and .gear fields are always present
  const ownerBookingsWithRelations = filteredOwnerBookings.map((booking) => ({
    ...booking,
    renter: booking.renter || booking["renter"] || { id: booking.renter_id, full_name: booking.renter_full_name || null },
    owner: booking.owner || booking["owner"] || { id: booking.owner_id, full_name: booking.owner_full_name || null },
    gear: booking.gear || booking["gear"] || null,
  }));
  
  // Debug logging for mapped data
  console.log('ownerBookingsWithRelations:', ownerBookingsWithRelations);
  console.log('Sample booking structure:', ownerBookingsWithRelations[0]);

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
      onError: (error: any) => {
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
                          {getStatusBadge(booking.status)}
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

          {/* My Reviews Tab */}
          <TabsContent value="reviews" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recenziile mele</CardTitle>
              </CardHeader>
              <CardContent>
                {reviewsLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <BookingSkeleton key={index} />
                    ))}
                  </div>
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
                            pentru {review.gear?.title}
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
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <BookingSkeleton key={index} />
                    ))}
                  </div>
                ) : filteredOwnerBookings.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nu ai încă nicio rezervare pentru echipamentele tale.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {ownerBookingsWithRelations.map((booking) => (
                      <div key={booking.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold">{booking.gear?.title}</h3>
                          {getStatusBadge(booking.status)}
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
    </ErrorBoundary>
  );
};
