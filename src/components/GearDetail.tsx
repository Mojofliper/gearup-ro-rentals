import React, { useState, useEffect } from 'react';
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
  MapPin, MessageSquare, Calendar as CalendarIcon, ArrowLeft, Camera,
  ShoppingBag, Star, Share2, ChevronLeft, ChevronRight, Loader2, Users, Package, CheckCircle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthModal } from '@/components/AuthModal';
import { useGearById } from '@/hooks/useGear';
import { useGearReviews } from '@/hooks/useReviews';
import { toast } from '@/hooks/use-toast';
import { BookingModal } from '@/components/BookingModal';
import { ErrorBoundary } from './ErrorBoundary';
import { LoadingScreen } from '@/components/LoadingScreen';
import { format } from 'date-fns';
import { useGearUnavailableDates } from '@/hooks/useGear';

export const GearDetail: React.FC = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { data: gear, isLoading, error } = useGearById(id);
  const { data: reviewsData } = useGearReviews(id);
  const { data: unavailableDates, isLoading: unavailableLoading } = useGearUnavailableDates(id);
  const [selectedDates, setSelectedDates] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [calendarInView, setCalendarInView] = useState(true);

  useEffect(() => {
    const el = document.getElementById('date-picker');
    if (!el) return;
    const observer = new window.IntersectionObserver(
      ([entry]) => setCalendarInView(entry.isIntersecting),
      { root: null, threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (isLoading) return <LoadingScreen />;
  if (error || !gear) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <Header />
        <div className="container mx-auto px-4 py-16">
          <div className="text-center">
            <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Camera className="h-12 w-12 text-red-600" />
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
  const owner = gearWithRelations.users as { full_name?: string; location?: string; is_verified?: boolean; rating?: number; total_reviews?: number } | undefined;
  const images = (gear.gear_photos as { photo_url: string }[] | undefined)?.map((photo) => photo.photo_url) || [];
  const specifications: string[] = Array.isArray(gear.gear_specifications)
    ? (gear.gear_specifications as { spec_key: string; spec_value: string }[]).map((spec) => `${spec.spec_key}: ${spec.spec_value}`)
    : [];
  const gearLocation = (gear.pickup_location as string) || 'Necunoscut';

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

    if (user.id === gear.owner_id) {
      toast({
        title: 'Nu poți închiria propriul echipament',
        description: 'Selectează alt echipament pentru închiriere.',
        variant: 'destructive',
      });
      return;
    }

    const cartItem = {
      id: `${gear.id}-${Date.now()}`,
      gear: {
        id: gear.id,
        title: gear.title,
        price_per_day: gear.price_per_day,
        deposit_amount: gear.deposit_amount,
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
      window.dispatchEvent(new Event('cartUpdated'));

      toast({
        title: 'Adăugat în coș!',
        description: 'Echipamentul a fost adăugat în coșul de cumpărături.',
      });
    } catch (error) {
      console.error('Cart error:', error);

      if (error instanceof Error && error.name === 'QuotaExceededError') {
        try {
          localStorage.removeItem('gearup-cart');
          localStorage.setItem('gearup-cart', JSON.stringify([cartItem]));
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

    const startDate = new Date(selectedDates.from);
    const endDate = new Date(selectedDates.to);

    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    const timeDiff = endDate.getTime() - startDate.getTime();
    const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
    const days = daysDiff === 0 ? 1 : daysDiff + 1;

    return days * Number(gear.price_per_day);
  };

  const getDaysCount = () => {
    if (!selectedDates.from || !selectedDates.to) return 0;

    const startDate = new Date(selectedDates.from);
    const endDate = new Date(selectedDates.to);

    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    const timeDiff = endDate.getTime() - startDate.getTime();
    const daysDiff = timeDiff / (1000 * 60 * 60 * 24);

    return daysDiff === 0 ? 1 : daysDiff + 1;
  };

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
        {/* HERO IMAGE GALLERY */}
        <div className="relative w-full bg-black">
          {/* Floating back button (top left) */}
          <Button asChild variant="ghost" size="icon" className="absolute top-4 left-4 z-20 bg-white/80 hover:bg-white rounded-full shadow-md">
            <Link to="/browse">
              <ArrowLeft className="h-6 w-6 text-gray-700" />
            </Link>
          </Button>
          {/* Floating share button (top right) */}
          <Button variant="ghost" size="icon" className="absolute top-4 right-4 z-20 bg-white/80 hover:bg-white rounded-full shadow-md">
            <Share2 className="h-6 w-6 text-gray-700" />
          </Button>
          {/* Main image */}
          <div className="aspect-[4/3] w-full max-h-[60vh] flex items-center justify-center overflow-hidden bg-gray-100">
            {images.length > 0 ? (
              <img
                src={images[currentImageIndex]}
                alt={`${gear.title} - Imagine ${currentImageIndex + 1}`}
                className="w-full h-full object-contain object-center transition-all duration-300"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Camera className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Nu sunt imagini disponibile</p>
              </div>
            )}
            {/* Gallery navigation (desktop) */}
            {images.length > 1 && (
              <>
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/80 hover:bg-white"
                  onClick={() => setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length)}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/80 hover:bg-white"
                  onClick={() => setCurrentImageIndex((prev) => (prev + 1) % images.length)}
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </>
            )}
          </div>
          {/* Thumbnails (desktop) */}
          {images.length > 1 && (
            <div className="hidden md:flex absolute bottom-4 left-1/2 -translate-x-1/2 space-x-2 z-10">
              {images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${index === currentImageIndex ? 'border-blue-500 scale-110' : 'border-white/50 hover:border-white'}`}
                >
                  <img src={image} alt={`Thumbnail ${index + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
        {/* MAIN CONTENT GRID */}
        <main className="container mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Info & Description */}
          <div className="lg:col-span-2 space-y-8">
            {/* Title, badges, meta */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                  {(gear.categories as { name?: string })?.name || 'Echipament'}
                </Badge>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
                  {String(gear.title)}
                  {gear.status === 'available' && (
                    <span className="bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1 ml-2">
                      <CheckCircle className="h-4 w-4 text-green-500" /> Disponibil
                    </span>
                  )}
                  {gear.status !== 'available' && (
                    <span className="bg-red-100 text-red-700 text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1 ml-2">
                      Indisponibil
                    </span>
                  )}
                </h1>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-gray-600 text-sm">
                <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{String(gearLocation)}</span>
                <span className="flex items-center gap-1"><Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />{reviews.length > 0 ? `${averageRating.toFixed(1)} (${reviews.length} recenzii)` : 'Fără recenzii'}</span>
              </div>
              <div className="flex items-center gap-4 mt-2">
                <span className="text-2xl font-bold text-blue-700">{new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'RON', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Number(gear.price_per_day))}</span>
                <span className="text-gray-500 text-sm">/ zi</span>
                <span className="flex items-center gap-1 text-xs text-gray-500"><Package className="h-4 w-4" /> Depozit: <span className="font-semibold ml-1">{new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'RON', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Number(gear.deposit_amount))}</span></span>
              </div>
            </div>
            {/* Description */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Descriere</h3>
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">{String(gear.description || '')}</p>
            </div>
            {/* Specs */}
            {specifications.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Specificații</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {specifications.map((spec, index) => (
                    <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                      <Package className="h-4 w-4 text-blue-400" />
                      <span className="text-sm text-gray-600">{spec}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Owner Card */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Despre proprietar</h3>
              <Card className="bg-gray-50 border-0">
                <CardContent className="p-4 flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src="" alt={String(owner?.full_name || '')} />
                    <AvatarFallback className="text-lg bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                      {String(owner?.full_name || 'U').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-lg">{String(owner?.full_name || '')}</h4>
                      {owner?.is_verified && <CheckCircle className="h-5 w-5 text-blue-500" />}
                    </div>
                    <p className="text-gray-600 mb-2">{String(owner?.location || '')}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1"><Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />{owner?.rating?.toFixed(1) || '-'}</span>
                      <span className="flex items-center gap-1"><Users className="h-4 w-4" />{owner?.total_reviews || 0} recenzii</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            {/* Reviews */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Recenzii</h3>
              {reviews.length > 0 ? (
                <div className="space-y-4">
                  {reviews.slice(0, 3).map((review, idx) => (
                    <div key={String((review as { id?: string | number }).id) + idx} className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${i < Number((review as { rating?: number }).rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                          />
                        ))}
                        <span className="text-sm text-gray-500">
                          {format(new Date(String((review as { created_at?: string }).created_at || '')), 'dd MMM yyyy')}
                        </span>
                      </div>
                      <p className="text-gray-700">{String((review as { comment?: string }).comment || '')}</p>
                    </div>
                  ))}
                  <Button variant="ghost" size="sm" className="mt-2">Vezi toate recenziile</Button>
                </div>
              ) : (
                <p className="text-gray-500">Nu există recenzii pentru acest echipament.</p>
              )}
            </div>
          </div>
          {/* ACTION SIDEBAR (desktop) / STICKY BAR (mobile) */}
          <div className="lg:col-span-1">
            <Card className="bg-white shadow-sm border-0 lg:sticky lg:top-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-blue-600" />
                  Rezervare
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Pricing */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-2xl font-bold text-blue-600">
                      {new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'RON', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Number(gear.price_per_day))}
                    </span>
                    <span className="text-gray-500">pe zi</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Depozit</span>
                    <span className="font-medium">{new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'RON', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Number(gear.deposit_amount))}</span>
                  </div>
                </div>
                <div id="date-picker">
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
                        onSelect={range => {
                          if (range?.from && !range.to) {
                            setSelectedDates({ from: range.from, to: range.from });
                          } else if (range?.from && range?.to) {
                            setSelectedDates({ from: range.from, to: range.to });
                          } else {
                            setSelectedDates({ from: undefined, to: undefined });
                          }
                        }}
                        className="rounded-md border"
                        disabled={(date) => {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const compareDate = new Date(date);
                          compareDate.setHours(0, 0, 0, 0);
                          if (compareDate < today) return true;
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
                </div>
                {/* Total Calculation */}
                {!!selectedDates.from && !!selectedDates.to && (
                  <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Perioada</span>
                      <span className="font-medium">
                        {/* getDaysCount() and formatDaysDisplay() assumed available */}
                        {(() => {
                          const startDate = selectedDates.from;
                          const endDate = selectedDates.to;
                          if (!startDate || !endDate) return '-';
                          const s = new Date(startDate);
                          const e = new Date(endDate);
                          s.setHours(0, 0, 0, 0);
                          e.setHours(0, 0, 0, 0);
                          const daysDiff = (e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24);
                          const days = daysDiff === 0 ? 1 : daysDiff + 1;
                          return days === 1 ? '1 zi' : `${days} zile`;
                        })()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Total închiriere</span>
                      <span className="font-medium">{(() => {
                        const startDate = selectedDates.from;
                        const endDate = selectedDates.to;
                        if (!startDate || !endDate) return '-';
                        const s = new Date(startDate);
                        const e = new Date(endDate);
                        s.setHours(0, 0, 0, 0);
                        e.setHours(0, 0, 0, 0);
                        const daysDiff = (e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24);
                        const days = daysDiff === 0 ? 1 : daysDiff + 1;
                        return new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'RON', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(days * Number(gear.price_per_day));
                      })()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Depozit</span>
                      <span className="font-medium">{new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'RON', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Number(gear.deposit_amount))}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center font-semibold text-lg">
                      <span>Total de plată</span>
                      <span className="text-blue-600">{(() => {
                        const startDate = selectedDates.from;
                        const endDate = selectedDates.to;
                        if (!startDate || !endDate) return '-';
                        const s = new Date(startDate);
                        const e = new Date(endDate);
                        s.setHours(0, 0, 0, 0);
                        e.setHours(0, 0, 0, 0);
                        const daysDiff = (e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24);
                        const days = daysDiff === 0 ? 1 : daysDiff + 1;
                        const total = days * Number(gear.price_per_day) + Number(gear.deposit_amount);
                        return new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'RON', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(total);
                      })()}</span>
                    </div>
                  </div>
                )}
                {/* Action Buttons */}
                <div className="space-y-3">
                  {gear.status === 'available' ? (
                    <>
                      <Button
                        onClick={() => {
                          if (!user) setIsAuthModalOpen(true);
                          else setIsBookingModalOpen(true);
                        }}
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                        disabled={!selectedDates.from || !selectedDates.to}
                      >
                        <ShoppingBag className="h-4 w-4 mr-2" />
                        Închiriază acum
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          if (!user) setIsAuthModalOpen(true);
                          else {/* handleAddToCart logic here */}
                        }}
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
              </CardContent>
            </Card>
          </div>
        </main>
        {/* 1. Update FAB to be bottom center, more subtle */}
        {!selectedDates.from && !selectedDates.to && !calendarInView && (
          <button
            type="button"
            aria-label="Selectează perioada"
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 sm:hidden bg-white border border-blue-200 text-blue-700 shadow rounded-full p-0 h-12 w-12 flex items-center justify-center text-2xl transition-all duration-300 hover:bg-blue-50"
            onClick={() => {
              const el = document.getElementById('date-picker');
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }}
          >
            <CalendarIcon className="h-6 w-6" />
          </button>
        )}
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
            gear={{
              id: String(gear.id),
              title: String(gear.title),
              owner: { location: String(gearLocation) }
            }}
            selectedDates={(() => {
              if (!selectedDates.from) return [];
              if (!selectedDates.to) return [selectedDates.from];
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
