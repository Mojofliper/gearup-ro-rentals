import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar } from '@/components/ui/calendar';
import { Separator } from '@/components/ui/separator';
import { 
  MapPin, Shield, MessageSquare, Calendar as CalendarIcon, ArrowLeft, Camera, 
  ShoppingBag, Star, Heart, Share2, Clock, Award, CheckCircle, 
  TrendingUp, Users, Package, CreditCard, AlertCircle, ChevronLeft, ChevronRight, Loader2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthModal } from '@/components/AuthModal';
import { useGearById } from '@/hooks/useGear';
import { useGearReviews } from '@/hooks/useReviews';
import { toast } from '@/hooks/use-toast';
import { BookingModal } from '@/components/BookingModal';
import { ErrorBoundary } from './ErrorBoundary';
import { GearCardSkeleton } from './LoadingSkeleton';
import { format } from 'date-fns';
import { useGearUnavailableDates } from '@/hooks/useGear';

export const GearDetail: React.FC = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { data: gear, isLoading, error } = useGearById(id);
  const { data: reviewsData } = useGearReviews(id);
  const { data: unavailableDates, isLoading: unavailableLoading } = useGearUnavailableDates(id);
  // Calendar state
  const [selectedDates, setSelectedDates] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <Header />
        <div className="container mx-auto px-4 py-8">
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <Header />
        <div className="container mx-auto px-4 py-16">
          <div className="text-center">
            <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="h-12 w-12 text-red-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-800 mb-4">Echipament negăsit</h2>
            <p className="text-gray-600 mb-8">Ne pare rău, echipamentul căutat nu există sau a fost șters.</p>
            <Button asChild className="bg-gradient-to-r from-blue-600 to-purple-600">
              <Link to="/browse">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Înapoi la căutare
              </Link>
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Type assertion for gear with relations
  const gearWithRelations = gear as Record<string, unknown>;

  // Get owner data from the correct key
  const owner = gearWithRelations.users as { full_name?: string; location?: string; is_verified?: boolean; rating?: number; total_reviews?: number } | undefined;

  // Parse JSON fields safely
  const images = (gear.gear_photos as { photo_url: string }[] | undefined)?.map((photo) => photo.photo_url) || [];
  const specifications: string[] = Array.isArray(gear.gear_specifications)
    ? (gear.gear_specifications as { spec_key: string; spec_value: string }[]).map((spec) => `${spec.spec_key}: ${spec.spec_value}`)
    : [];
  const includedItems: string[] = [];

  // Use gear.pickup_location for the location display
  const gearLocation = gear.pickup_location || 'Necunoscut';

  const handleRentRequest = () => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }

    if (!selectedDates.from || !selectedDates.to) {
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

    if (!selectedDates.from || !selectedDates.to) {
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
        price_per_day: gear.price_per_day,
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
            description: 'Echipamentul a fost adăugat în coșul de cumpărături.',
          });
        } catch (retryError) {
          console.error('Retry error:', retryError);
          toast({
            title: 'Eroare la adăugarea în coș',
            description: 'Nu s-a putut adăuga echipamentul în coș. Încearcă din nou.',
            variant: 'destructive',
          });
        }
      } else {
        toast({
          title: 'Eroare la adăugarea în coș',
          description: 'Nu s-a putut adăuga echipamentul în coș. Încearcă din nou.',
          variant: 'destructive',
        });
      }
    }
  };

  const calculateTotal = () => {
    if (!selectedDates.from || !selectedDates.to) return 0;
    
    // Calculate days more reliably
    const startDate = new Date(selectedDates.from);
    const endDate = new Date(selectedDates.to);
    
    // Set both dates to midnight for accurate comparison
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);
    
    // Calculate the difference in days
    const timeDiff = endDate.getTime() - startDate.getTime();
    const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
    
    // For single-day bookings (same start and end date), count as 1 day
    // For multi-day bookings, count the actual difference + 1 (inclusive)
    const days = daysDiff === 0 ? 1 : daysDiff + 1;
    
    return days * Number(gear.price_per_day);
  };

  // Helper function to get the number of days for display
  const getDaysCount = () => {
    if (!selectedDates.from || !selectedDates.to) return 0;
    
    const startDate = new Date(selectedDates.from);
    const endDate = new Date(selectedDates.to);
    
    // Set both dates to midnight for accurate comparison
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);
    
    // Calculate the difference in days
    const timeDiff = endDate.getTime() - startDate.getTime();
    const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
    
    // For single-day bookings (same start and end date), count as 1 day
    // For multi-day bookings, count the actual difference + 1 (inclusive)
    return daysDiff === 0 ? 1 : daysDiff + 1;
  };

  // Helper function to format days display
  const formatDaysDisplay = (days: number) => {
    return days === 1 ? '1 zi' : `${days} zile`;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: 'RON',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatRating = (rating: number) => {
    return rating.toFixed(1);
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const reviews = reviewsData || [];
  const averageRating = reviews.length > 0 
    ? reviews.reduce((acc, review) => acc + (review.rating as number), 0) / reviews.length 
    : 0;

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <Header />
        
        <main className="container mx-auto px-4 py-8">
          {/* Breadcrumb */}
          <div className="mb-6">
            <Button variant="ghost" asChild className="text-gray-600 hover:text-gray-900">
              <Link to="/browse">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Înapoi la căutare
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Image Gallery */}
              <Card className="bg-white shadow-sm border-0 overflow-hidden">
                <CardContent className="p-0">
                  <div className="relative aspect-[4/3] bg-gray-100">
                    {images.length > 0 ? (
                      <>
                        <img
                          src={images[currentImageIndex]}
                          alt={`${gear.title} - Imagine ${currentImageIndex + 1}`}
                          className="w-full h-full object-cover"
                        />
                        
                        {/* Navigation Arrows */}
                        {images.length > 1 && (
                          <>
                            <Button
                              variant="secondary"
                              size="sm"
                              className="absolute left-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/80 hover:bg-white"
                              onClick={prevImage}
                            >
                              <ChevronLeft className="h-5 w-5" />
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              className="absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/80 hover:bg-white"
                              onClick={nextImage}
                            >
                              <ChevronRight className="h-5 w-5" />
                            </Button>
                          </>
                        )}

                        {/* Image Counter */}
                        {images.length > 1 && (
                          <div className="absolute bottom-4 right-4 bg-black/60 text-white px-3 py-1 rounded-full text-sm">
                            {currentImageIndex + 1} / {images.length}
                          </div>
                        )}

                        {/* Thumbnail Navigation */}
                        {images.length > 1 && (
                          <div className="absolute bottom-4 left-4 flex space-x-2">
                            {images.map((image, index) => (
                              <button
                                key={index}
                                onClick={() => setCurrentImageIndex(index)}
                                className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                                  index === currentImageIndex 
                                    ? 'border-blue-500 scale-110' 
                                    : 'border-white/50 hover:border-white'
                                }`}
                              >
                                <img
                                  src={image}
                                  alt={`Thumbnail ${index + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="text-center">
                          <Camera className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-500">Nu sunt imagini disponibile</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Gear Information */}
              <Card className="bg-white shadow-sm border-0">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                          {(gear.categories as { name?: string })?.name || 'Echipament'}
                        </Badge>
                        <Badge variant={gear.status === 'available' ? "default" : "destructive"}>
                          {gear.status === 'available' ? 'Disponibil' : 'Indisponibil'}
                        </Badge>
                      </div>
                      <h1 className="text-3xl font-bold text-gray-900">{gear.title}</h1>
                      <div className="flex items-center space-x-4 text-gray-600">
                        <div className="flex items-center space-x-1">
                          <MapPin className="h-4 w-4" />
                          <span>{gearLocation}</span>
                        </div>
                        {reviews.length > 0 && (
                          <div className="flex items-center space-x-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span>{formatRating(averageRating)} ({reviews.length} recenzii)</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" className="h-10 w-10 p-0 rounded-full">
                        <Heart className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" className="h-10 w-10 p-0 rounded-full">
                        <Share2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Descriere</h3>
                    <p className="text-gray-700 leading-relaxed">{gear.description as string}</p>
                  </div>

                  {/* Features */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Caracteristici</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                        <Shield className="h-5 w-5 text-green-600" />
                        <span className="text-sm font-medium">Asigurat</span>
                      </div>
                      <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                        <Clock className="h-5 w-5 text-blue-600" />
                        <span className="text-sm font-medium">24h răspuns</span>
                      </div>
                      <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                        <CheckCircle className="h-5 w-5 text-purple-600" />
                        <span className="text-sm font-medium">Verificat</span>
                      </div>
                    </div>
                  </div>

                  {/* Specifications */}
                  {specifications.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Specificații</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {specifications.map((spec, index) => (
                          <div key={index} className="flex justify-between p-3 bg-gray-50 rounded-lg">
                            <span className="text-sm text-gray-600">{spec}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Owner Information */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Despre proprietar</h3>
                    <Card className="bg-gray-50 border-0">
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-4">
                          <Avatar className="h-16 w-16">
                            <AvatarImage src="" alt={owner?.full_name as string} />
                            <AvatarFallback className="text-lg bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                              {(owner?.full_name as string)?.charAt(0)?.toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <h4 className="font-semibold text-lg">{owner?.full_name as string}</h4>
                              {owner?.is_verified && (
                                <CheckCircle className="h-5 w-5 text-blue-500" />
                              )}
                            </div>
                            <p className="text-gray-600 mb-2">{owner?.location as string}</p>
                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                              <div className="flex items-center space-x-1">
                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                <span>{formatRating(owner?.rating as number)}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Users className="h-4 w-4" />
                                <span>{owner?.total_reviews as number} recenzii</span>
                              </div>
                            </div>
                          </div>
                          <Button variant="outline" onClick={handleMessage}>
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Mesaj
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Reviews */}
                  {reviews.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Recenzii</h3>
                      <div className="space-y-4">
                        {reviews.slice(0, 3).map((review) => (
                          <div key={String((review as { id?: string | number }).id)} className="p-4 border rounded-lg">
                            <div className="flex items-center space-x-2 mb-2">
                              {[...Array(5)].map((_, i) => (
                                <Star 
                                  key={i} 
                                  className={`h-4 w-4 ${i < Number((review as { rating?: number }).rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                                />
                              ))}
                              <span className="text-sm text-gray-500">
                                {format(new Date(String((review as { created_at?: string }).created_at)), 'dd MMM yyyy')}
                              </span>
                            </div>
                            <p className="text-gray-700">{String((review as { comment?: string }).comment)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Booking Sidebar */}
            <div className="space-y-6">
              {/* Booking Card */}
              <Card className="bg-white shadow-sm border-0 sticky top-8">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <CalendarIcon className="h-5 w-5 text-blue-600" />
                    Rezervare
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Pricing */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-2xl font-bold text-blue-600">
                        {formatPrice(Number(gear.price_per_day))}
                      </span>
                      <span className="text-gray-500">pe zi</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Depozit</span>
                      <span className="font-medium">{formatPrice(Number(gear.deposit_amount))}</span>
                    </div>
                  </div>

                  {/* Date Selection */}
                  <div>
                    <h4 className="font-medium mb-3">Selectează perioada</h4>
                    {unavailableLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="animate-spin h-6 w-6 text-blue-500" />
                        <span className="ml-2 text-blue-500">Se încarcă datele...</span>
                      </div>
                    ) : (
                      <Calendar
                        mode="range"
                        selected={selectedDates}
                        onSelect={range => setSelectedDates({ from: range?.from, to: range?.to })}
                        className="rounded-md border"
                        disabled={(date) => {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const compareDate = new Date(date);
                          compareDate.setHours(0, 0, 0, 0);
                          // Disable past dates
                          if (compareDate < today) return true;
                          // Disable unavailable dates
                          if (unavailableDates && unavailableDates.some((d) => {
                            const dDate = new Date(d.unavailable_date);
                            dDate.setHours(0, 0, 0, 0);
                            return dDate.getTime() === compareDate.getTime();
                          })) return true;
                          return false;
                        }}
                      />
                    )}
                  </div>

                  {/* Total Calculation */}
                  {!!selectedDates.from && !!selectedDates.to && (
                    <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Perioada</span>
                        <span className="font-medium">
                          {formatDaysDisplay(getDaysCount())}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Total închiriere</span>
                        <span className="font-medium">{formatPrice(Number(calculateTotal()))}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Depozit</span>
                        <span className="font-medium">{formatPrice(Number(gear.deposit_amount))}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between items-center font-semibold text-lg">
                        <span>Total de plată</span>
                        <span className="text-blue-600">{formatPrice(Number(calculateTotal()) + Number(gear.deposit_amount))}</span>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="space-y-3">
                    {gear.status === 'available' ? (
                      <>
                        <Button 
                          onClick={handleRentRequest}
                          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                          disabled={!selectedDates.from || !selectedDates.to}
                        >
                          <ShoppingBag className="h-4 w-4 mr-2" />
                          Închiriază acum
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={handleAddToCart}
                          className="w-full"
                          disabled={!selectedDates.from || !selectedDates.to}
                        >
                          <Package className="h-4 w-4 mr-2" />
                          Adaugă în coș
                        </Button>
                      </>
                    ) : (
                      <Button variant="outline" className="w-full" disabled>
                        Indisponibil
                      </Button>
                    )}
                  </div>

                  {/* Trust Indicators */}
                  <div className="space-y-3 pt-4 border-t">
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Shield className="h-4 w-4 text-green-600" />
                      <span>Plată securizată</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Clock className="h-4 w-4 text-blue-600" />
                      <span>Răspuns în 24h</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Award className="h-4 w-4 text-purple-600" />
                      <span>Echipament verificat</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Similar Gear */}
              <Card className="bg-white shadow-sm border-0">
                <CardHeader>
                  <CardTitle className="text-lg">Echipamente similare</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Nu sunt echipamente similare disponibile</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>

        <Footer />

        {/* Modals */}
        <AuthModal 
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          mode={authMode}
          onSwitchMode={setAuthMode}
        />

        {isBookingModalOpen && (
          <BookingModal
            isOpen={isBookingModalOpen}
            onClose={() => setIsBookingModalOpen(false)}
            gear={gear}
            selectedDates={(() => {
              if (!selectedDates.from) return [];
              if (!selectedDates.to) return [selectedDates.from];
              // Generate all dates in range
              const dates = [];
              let d = new Date(selectedDates.from);
              while (d <= selectedDates.to) {
                dates.push(new Date(d));
                d.setDate(d.getDate() + 1);
              }
              return dates;
            })()}
            pricePerDay={Number(gear.price_per_day)}
            depositAmount={Number(gear.deposit_amount)}
          />
        )}
      </div>
    </ErrorBoundary>
  );
};
