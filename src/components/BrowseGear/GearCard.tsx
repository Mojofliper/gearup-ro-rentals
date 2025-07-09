import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Star, MapPin, Camera, Zap, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useGearReviews } from '@/hooks/useReviews';
import { useAuth } from '@/contexts/AuthContext';
import { AuthModal } from '@/components/AuthModal';
import { toast } from '@/hooks/use-toast';

interface GearCardProps {
  gear: {
    id: string;
    title: string;
    description?: string;
    price_per_day: number;
    deposit_amount?: number;
    pickup_location: string;
    status: string;
    gear_photos?: Array<{ photo_url: string }>;
    categories?: { name: string };
    users?: { 
      full_name: string; 
      rating?: number; 
      total_reviews?: number;
      is_verified?: boolean;
    };
    owner_id?: string;
  };
}

export const GearCard: React.FC<GearCardProps> = ({ gear }) => {
  const { data: reviewsData } = useGearReviews(gear.id);
  const { user } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  
  // Convert from cents to RON if price is in cents (price > 1000)
  const priceInRON = gear.price_per_day > 1000 ? gear.price_per_day / 100 : gear.price_per_day;
  
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: 'RON',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  // Calculate review stats from the reviews array
  const reviews = Array.isArray(reviewsData) ? reviewsData : [];
  const totalReviews = reviews.length;
  const averageRating = totalReviews > 0 
    ? reviews.reduce((sum, review) => sum + (review.rating as number || 0), 0) / totalReviews 
    : 0;

  const imageUrl = gear.gear_photos?.[0]?.photo_url || 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=400&h=300&fit=crop';

  const handleImageClick = () => {
    console.log('Image clicked for gear:', gear.id);
    console.log('Link URL:', `/gear/${gear.id}`);
    console.log('Navigating to:', `/gear/${gear.id}`);
    // Force navigation
    window.location.href = `/gear/${gear.id}`;
  };

  const handleAddToCart = () => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }

    // Check if user is trying to add their own gear to cart
    if (user.id === gear.users?.full_name) {
      toast({
        title: 'Nu poți închiria propriul echipament',
        description: 'Selectează alt echipament pentru închiriere.',
        variant: 'destructive',
      });
      return;
    }

    // Add to cart with default date (tomorrow)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const cartItem = {
      id: `${gear.id}-${Date.now()}`,
      gear: {
        id: gear.id,
        title: gear.title,
        price_per_day: gear.price_per_day,
        deposit_amount: gear.deposit_amount || 0,
        gear_photos: gear.gear_photos?.map(photo => ({ photo_url: photo.photo_url })) || [],
        owner: {
          id: gear.owner_id || '',
          full_name: gear.users?.full_name || '',
          location: gear.pickup_location,
          is_verified: gear.users?.is_verified || false
        }
      },
      selectedDates: [tomorrow],
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

  return (
    <>
      <Card className="group hover:shadow-2xl transition-all duration-300 border-0 bg-white overflow-hidden">
        <Link to={`/gear/${gear.id}`} className="block">
          <div className="relative overflow-hidden cursor-pointer">
            <img
              src={imageUrl}
              alt={gear.title}
              className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-500"
            />
            <div className="absolute top-3 left-3">
              <Badge variant="secondary" className="bg-white/90 text-gray-700 shadow-sm">
                {gear.categories?.name || 'Echipament'}
              </Badge>
            </div>
            {gear.status !== 'available' && (
              <div className="absolute top-3 right-3">
                <Badge variant="destructive" className="bg-red-500/90 text-white shadow-sm">
                  Indisponibil
                </Badge>
              </div>
            )}
            {gear.status === 'available' && (
              <div className="absolute top-3 right-3">
                <Badge className="bg-green-500/90 text-white shadow-sm">
                  Disponibil
                </Badge>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </Link>

        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-3">
            <h3 className="font-bold text-lg text-gray-800 group-hover:text-blue-600 transition-colors">
              {gear.title}
            </h3>
            <div className="text-xs text-gray-500">
              {totalReviews > 0 ? (
                <div className="flex items-center space-x-1">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  <span>{averageRating.toFixed(1)} ({totalReviews})</span>
                </div>
              ) : (
                'Fără recenzii'
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2 mb-4">
            <Avatar className="h-7 w-7 ring-2 ring-blue-100">
              <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                {gear.users?.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm text-gray-600 font-medium">{gear.users?.full_name}</span>
            {gear.users?.rating === 5 && (
              <Badge variant="secondary" className="text-xs">Verificat</Badge>
            )}
          </div>

          <div className="flex items-center space-x-1 mb-4">
            <MapPin className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-600">{gear.pickup_location}</span>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="text-2xl font-bold text-gray-800">{formatPrice(priceInRON)}</span>
              <span className="text-sm text-gray-500 ml-1">/zi</span>
            </div>
            <Button 
              size="sm" 
              disabled={gear.status !== 'available'}
              onClick={handleAddToCart}
              className={gear.status === 'available' 
                ? "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg" 
                : "bg-gray-200 text-gray-500"
              }
            >
              {gear.status === 'available' ? (
                <>
                  <ShoppingBag className="h-4 w-4 mr-1" />
                  Adaugă în coș
                </>
              ) : (
                'Indisponibil'
              )}
            </Button>
          </div>

          <div className="text-xs text-gray-500 mt-3 flex items-center">
            <span>Recent adăugat</span>
            <span className="mx-2">•</span>
            <span>Verificat</span>
          </div>
        </CardContent>
      </Card>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        mode={authMode}
        onSwitchMode={setAuthMode}
      />
    </>
  );
};
