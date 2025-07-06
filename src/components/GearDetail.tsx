import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Calendar } from '@/components/ui/calendar';
import { Separator } from '@/components/ui/separator';
import { MapPin, Shield, MessageSquare, Calendar as CalendarIcon, ArrowLeft, Camera, ShoppingBag, Star } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthModal } from '@/components/AuthModal';
import { useGear } from '@/hooks/useGear';
import { useGearReviews } from '@/hooks/useReviews';
import { toast } from '@/hooks/use-toast';
import { BookingModal } from '@/components/BookingModal';
import { ErrorBoundary } from './ErrorBoundary';
import { GearCardSkeleton } from './LoadingSkeleton';

export const GearDetail: React.FC = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { data: gear, isLoading, error } = useGear(id);
  const { data: reviewsData } = useGearReviews(id);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  console.log('GearDetail rendered with id:', id);
  console.log('Gear data:', gear);
  console.log('Loading:', isLoading);
  console.log('Error:', error);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <GearCardSkeleton />
            </div>
            <div className="space-y-6">
              <GearCardSkeleton />
              <GearCardSkeleton />
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !gear) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-16">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Echipament negăsit</h2>
            <p className="text-gray-600">Ne pare rău, echipamentul căutat nu există.</p>
            <Link to="/browse" className="text-purple-600 hover:underline mt-4 inline-block">
              Înapoi la căutare
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Type assertion for gear with relations
  const gearWithRelations = gear as any;

  // Get owner data from the correct key
  const owner = gearWithRelations.users;

  // Parse JSON fields safely
  const images = gear.gear_photos?.map((photo: any) => photo.photo_url) || [];
  const specifications = gear.gear_specifications?.map((spec: any) => `${spec.spec_key}: ${spec.spec_value}`) || [];
  const includedItems: string[] = [];

  // Use gear.location for the location display
  const gearLocation = gear.location || 'Necunoscut';

  const handleRentRequest = () => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }

    if (selectedDates.length === 0) {
      toast({
        title: 'Selectează datele',
        description: 'Te rugăm să selectezi perioada de închiriere.',
        variant: 'destructive',
      });
      return;
    }

    // Check if user is trying to rent their own gear
    if (user.id === gear.owner_id) {
      toast({
        title: 'Nu poți închiria propriul echipament',
        description: 'Selectează alt echipament pentru închiriere.',
        variant: 'destructive',
      });
      return;
    }

    setIsBookingModalOpen(true);
  };

  const handleMessage = () => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    
    toast({
      title: 'Mesaj trimis!',
      description: 'Conversația a fost inițiată cu proprietarul.',
    });
  };

  const handleAddToCart = () => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }

    if (selectedDates.length === 0) {
      toast({
        title: 'Selectează datele',
        description: 'Te rugăm să selectezi perioada de închiriere.',
        variant: 'destructive',
      });
      return;
    }

    // Check if user is trying to rent their own gear
    if (user.id === gear.owner_id) {
      toast({
        title: 'Nu poți închiria propriul echipament',
        description: 'Selectează alt echipament pentru închiriere.',
        variant: 'destructive',
      });
      return;
    }

    // Add to cart
    const cartItem = {
      id: `${gear.id}-${Date.now()}`,
      gear: {
        id: gear.id,
        title: gear.title,
        daily_rate: gear.daily_rate,
        deposit_amount: gear.deposit_amount,
        // Nu salvăm imaginea în localStorage pentru a evita QuotaExceededError
        owner: {
          id: gear.owner_id,
          full_name: owner?.full_name || 'Utilizator',
          location: owner?.location || 'România',
          is_verified: owner?.is_verified || false
        }
      },
      selectedDates: selectedDates,
      notes: ''
    };

    try {
      const existingCart = localStorage.getItem('gearup-cart');
      const cartItems = existingCart ? JSON.parse(existingCart) : [];
      cartItems.push(cartItem);
      localStorage.setItem('gearup-cart', JSON.stringify(cartItems));

      // Dispatch custom event to update cart count in header
      window.dispatchEvent(new Event('cartUpdated'));

      toast({
        title: 'Adăugat în coș!',
        description: 'Echipamentul a fost adăugat în coșul de cumpărături.',
      });
    } catch (error) {
      console.error('Cart error:', error);
      console.error('Error name:', error instanceof Error ? error.name : 'Unknown');
      console.error('Error message:', error instanceof Error ? error.message : 'Unknown');
      
      // If QuotaExceededError, clear cart and try again
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        try {
          localStorage.removeItem('gearup-cart');
          localStorage.setItem('gearup-cart', JSON.stringify([cartItem]));
          
          // Dispatch custom event to update cart count in header
          window.dispatchEvent(new Event('cartUpdated'));

          toast({
            title: 'Adăugat în coș!',
            description: 'Coșul a fost resetat și echipamentul a fost adăugat.',
          });
        } catch (retryError) {
          console.error('Retry error:', retryError);
          toast({
            title: 'Eroare la adăugarea în coș',
            description: 'Nu s-a putut adăuga în coș. Te rugăm să încerci din nou.',
            variant: 'destructive',
          });
        }
      } else {
        toast({
          title: 'Eroare la adăugarea în coș',
          description: 'Nu s-a putut adăuga în coș. Te rugăm să încerci din nou.',
          variant: 'destructive',
        });
      }
    }
  };

  const calculateTotal = () => {
    const pricePerDay = gear.daily_rate; // Already in RON
    return selectedDates.length * pricePerDay;
  };

  const depositAmount = gear.deposit_amount || 0;
  const pricePerDay = gear.daily_rate;

  return (
    <ErrorBoundary>
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center space-x-2 mb-6">
          <Link to="/browse" className="flex items-center text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Înapoi la căutare
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Images & Details */}
          <div className="lg:col-span-2">
            {/* Image Gallery */}
            <div className="mb-6">
              {images.length > 0 ? (
                <>
                  <div className="relative mb-4">
                    <img
                      src={images[currentImageIndex]}
                      alt={gear.title}
                      className="w-full h-96 object-cover rounded-lg"
                    />
                    {gearWithRelations.categories && (
                      <Badge className="absolute top-4 left-4">{gearWithRelations.categories.name}</Badge>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    {images.map((image: string, index: number) => (
                      <button
                        key={index}
                        onClick={() => setCurrentImageIndex(index)}
                        className={`w-20 h-20 rounded-lg overflow-hidden border-2 ${
                          index === currentImageIndex ? 'border-primary' : 'border-transparent'
                        }`}
                      >
                        <img src={image} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="w-full h-96 bg-gray-200 rounded-lg flex items-center justify-center">
                  <Camera className="h-16 w-16 text-gray-400" />
                </div>
              )}
            </div>

            {/* Title & Rating */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold mb-2">{gear.title}</h1>
                              <div className="flex items-center space-x-4">
                  <div className="text-muted-foreground">
                    {reviewsData?.totalReviews ? (
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center space-x-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star 
                              key={star} 
                              className={`h-4 w-4 ${star <= reviewsData.averageRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} 
                            />
                          ))}
                        </div>
                        <span>{reviewsData.averageRating.toFixed(1)} ({reviewsData.totalReviews} recenzii)</span>
                      </div>
                    ) : (
                      'Fără recenzii încă'
                    )}
                    {/* Add separator if both reviews and location exist */}
                    {gearLocation && (
                      <span className="mx-2 text-gray-400">•</span>
                    )}
                    <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span className="text-muted-foreground">{gearLocation}</span>
                    </div>
                  </div>
                </div>
            </div>

            {/* Description */}
            {gear.description && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Descriere</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">{gear.description}</p>
                </CardContent>
              </Card>
            )}

            {/* Specifications */}
            {specifications.length > 0 && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Specificații tehnice</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {specifications.map((spec: string, index: number) => (
                      <li key={index} className="flex items-center space-x-2">
                        <Camera className="h-4 w-4 text-primary" />
                        <span>{spec}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* What's Included */}
            {includedItems.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Ce este inclus</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {includedItems.map((item: string, index: number) => (
                      <li key={index} className="flex items-center space-x-2">
                        <span className="text-green-600">✓</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Reviews Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Star className="h-5 w-5" />
                  <span>Recenzii</span>
                  {reviewsData?.totalReviews && (
                    <Badge variant="secondary">
                      {reviewsData.totalReviews} recenzii
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {reviewsData?.totalReviews ? (
                  <div className="space-y-4">
                    {/* Average Rating */}
                    <div className="flex items-center space-x-2">
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-5 w-5 ${
                              star <= reviewsData.averageRating 
                                ? 'fill-yellow-400 text-yellow-400' 
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="font-semibold">
                        {reviewsData.averageRating.toFixed(1)} din 5
                      </span>
                    </div>

                    {/* Individual Reviews */}
                    <div className="space-y-4">
                      {reviewsData.reviews.map((review: any) => (
                        <div key={review.id} className="border-t pt-4">
                          <div className="flex items-start space-x-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">
                                {review.reviewer?.full_name?.split(' ').map((n: string) => n[0]).join('') || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <span className="font-medium text-sm">
                                  {review.reviewer?.full_name || 'Utilizator'}
                                </span>
                                <div className="flex">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                      key={star}
                                      className={`h-3 w-3 ${
                                        star <= review.rating 
                                          ? 'fill-yellow-400 text-yellow-400' 
                                          : 'text-gray-300'
                                      }`}
                                    />
                                  ))}
                                </div>
                              </div>
                              {review.comment && (
                                <p className="text-sm text-gray-600 mb-2">{review.comment}</p>
                              )}
                              <p className="text-xs text-gray-400">
                                {new Date(review.created_at).toLocaleDateString('ro-RO')}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Star className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p>Nu există încă recenzii pentru acest echipament.</p>
                    <p className="text-sm">Fii primul care lasă o recenzie!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Booking */}
          <div className="space-y-6">
            {/* Owner Info */}
            {owner && (
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback>
                        {owner.full_name?.split(' ').map((n: string) => n[0]).join('') || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold">{owner.full_name || 'Utilizator'}</h3>
                        {owner.is_verified && (
                          <Badge variant="secondary" className="text-xs">
                            <Shield className="h-3 w-3 mr-1" />
                            Verificat
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {reviewsData?.totalReviews ? (
                          <div className="flex items-center space-x-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span>{reviewsData.averageRating.toFixed(1)} ({reviewsData.totalReviews} recenzii)</span>
                          </div>
                        ) : (
                          'Fără recenzii încă'
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Membru din 2025
                      </p>
                    </div>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={handleMessage}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Trimite mesaj
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Booking Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Rezervare</span>
                  <div>
                    <span className="text-2xl font-bold">{pricePerDay} RON</span>
                    <span className="text-sm text-muted-foreground">/zi</span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    <CalendarIcon className="h-4 w-4 inline mr-1" />
                    Selectează datele
                  </label>
                  <Calendar
                    mode="multiple"
                    selected={selectedDates}
                    onSelect={(dates) => setSelectedDates(dates || [])}
                    className="rounded-md border"
                  />
                </div>

                {selectedDates.length > 0 && (
                  <div className="space-y-2">
                    <Separator />
                    <div className="flex justify-between text-sm">
                      <span>{pricePerDay} RON × {selectedDates.length} zile</span>
                      <span>{calculateTotal()} RON</span>
                    </div>
                    {depositAmount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>Garanție</span>
                        <span>{depositAmount} RON</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between font-semibold">
                      <span>Total</span>
                      <span>{calculateTotal() + depositAmount} RON</span>
                    </div>
                    {depositAmount > 0 && (
                      <p className="text-xs text-muted-foreground">
                        * Garanția se returnează la finalul închirierii
                      </p>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Button 
                    className="w-full" 
                    onClick={handleRentRequest}
                    disabled={gear.status !== 'available'}
                  >
                    {gear.status === 'available' ? 'Solicită închirierea' : 'Indisponibil'}
                  </Button>
                  
                  <Button 
                    variant="outline"
                    className="w-full" 
                    onClick={handleAddToCart}
                    disabled={gear.status !== 'available'}
                  >
                    <ShoppingBag className="h-4 w-4 mr-2" />
                    Adaugă în coș
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  Nu vei fi taxat încă. Proprietarul trebuie să confirme disponibilitatea.
                </p>
              </CardContent>
            </Card>

            {/* Safety Info */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Shield className="h-5 w-5 text-green-600" />
                  <span className="font-medium">Siguranță GearUp</span>
                </div>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Plăți securizate prin Stripe</li>
                  <li>• Verificarea identității</li>
                  <li>• Suport 24/7</li>
                  <li>• Politică de rambursare</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Footer />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        mode={authMode}
        onSwitchMode={setAuthMode}
      />

      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        gear={gear}
        selectedDates={selectedDates}
        pricePerDay={pricePerDay}
        depositAmount={depositAmount}
      />
    </div>
    </ErrorBoundary>
  );
};