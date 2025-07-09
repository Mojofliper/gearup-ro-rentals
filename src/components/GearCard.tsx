import React from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Star, MapPin, Calendar, Camera, Heart, Share2, 
  Shield, Clock, TrendingUp, Award, CheckCircle
} from 'lucide-react';
// Define a more flexible Gear type that works with our current data structure
type Gear = {
  id: string;
  title: string;
  description?: string;
  price_per_day: number;
  deposit_amount: number;
  status: string;
  pickup_location?: string;
  categories?: { name: string; slug: string } | null;
  gear_photos?: Array<{ photo_url: string }>;
  users?: { full_name: string; rating: number; total_reviews: number; is_verified?: boolean } | null;
};

interface GearCardProps {
  gear: Gear;
  onBookNow?: (gearId: string) => void;
  onViewDetails?: (gearId: string) => void;
  showOwnerInfo?: boolean;
  variant?: 'default' | 'compact' | 'featured';
}

export const GearCard = React.memo<GearCardProps>(({ 
  gear, 
  onBookNow, 
  onViewDetails, 
  showOwnerInfo = true,
  variant = 'default'
}) => {
  const formatPrice = (price: number) => {
    // Convert from cents to RON if price is in cents (price > 1000)
    const priceInRON = price > 1000 ? price / 100 : price;
    
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: 'RON',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(priceInRON || 0);
  };

  const formatRating = (rating: number) => {
    return rating.toFixed(1);
  };

  const getFirstImage = () => {
    if (gear.gear_photos && Array.isArray(gear.gear_photos) && gear.gear_photos.length > 0) {
      const firstPhoto = gear.gear_photos[0];
      if (typeof firstPhoto === 'string') {
        return firstPhoto;
      } else if (firstPhoto && typeof firstPhoto === 'object') {
        return firstPhoto.photo_url || firstPhoto;
      }
    }
    return null;
  };

  const ownerName = gear.users?.full_name || 'Unknown Owner';
  const ownerRating = gear.users?.rating || 0;
  const ownerReviews = gear.users?.total_reviews || 0;
  const isOwnerVerified = gear.users?.is_verified || false;

  const isCompact = variant === 'compact';
  const isFeatured = variant === 'featured';

  return (
    <Card className={`
      group relative overflow-hidden transition-all duration-300 
      ${isFeatured ? 'ring-2 ring-purple-200 shadow-xl' : 'hover:shadow-xl'} 
      ${isCompact ? 'hover:scale-105' : 'hover:scale-[1.02]'}
      bg-white border-0 shadow-sm
    `}>
      {/* Featured Badge */}
      {isFeatured && (
        <div className="absolute top-2 sm:top-3 left-2 sm:left-3 z-10">
          <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0 text-xs">
            <Award className="h-3 w-3 mr-1" />
            Recomandat
          </Badge>
        </div>
      )}

      {/* Image Section */}
      <CardHeader className="p-0">
        <div className="relative aspect-[4/3] overflow-hidden">
          {getFirstImage() ? (
            <img
              src={getFirstImage() as string}
              alt={gear.title}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
              <Camera className="h-8 w-8 sm:h-12 sm:w-12 text-gray-400" />
            </div>
          )}
          
          {/* Overlay with actions */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-end justify-end p-2 sm:p-3">
            <div className="flex space-x-1 sm:space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <Button size="sm" variant="secondary" className="h-7 w-7 sm:h-8 sm:w-8 p-0 rounded-full">
                <Heart className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
              <Button size="sm" variant="secondary" className="h-7 w-7 sm:h-8 sm:w-8 p-0 rounded-full">
                <Share2 className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            </div>
          </div>

          {/* Status Badge */}
          <div className="absolute top-2 sm:top-3 right-2 sm:right-3">
            <Badge 
              variant={gear.status === 'available' ? "default" : "destructive"}
              className="bg-white/90 text-gray-800 font-medium text-xs"
            >
              {gear.status === 'available' ? 'Disponibil' : 'Indisponibil'}
            </Badge>
          </div>

          {/* Category Badge */}
          <div className="absolute bottom-2 sm:bottom-3 left-2 sm:left-3">
            <Badge variant="secondary" className="bg-white/90 text-gray-800 font-medium text-xs">
              {gear.categories?.name || 'Echipament'}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className={`${isCompact ? 'p-2 sm:p-3' : 'p-3 sm:p-4'}`}>
        <div className="space-y-2 sm:space-y-3">
          {/* Title and Rating */}
          <div className="space-y-1 sm:space-y-2">
            <h3 className={`font-bold line-clamp-2 group-hover:text-blue-600 transition-colors ${
              isCompact ? 'text-sm sm:text-base' : 'text-base sm:text-lg'
            }`}>
              {gear.title}
            </h3>
            
            {!isCompact && (
              <p className="text-xs sm:text-sm text-gray-600 line-clamp-2 leading-relaxed">
                {gear.description}
              </p>
            )}
          </div>

          {/* Location */}
          <div className="flex items-center space-x-1 text-xs sm:text-sm text-gray-500">
            <MapPin className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
            <span className="truncate">{gear.pickup_location || 'Necunoscut'}</span>
          </div>

          {/* Owner Info */}
          {showOwnerInfo && (
            <div className="flex items-center space-x-2 sm:space-x-3 pt-2 border-t border-gray-100">
              <Avatar className={`${isCompact ? 'h-5 w-5 sm:h-6 sm:w-6' : 'h-6 w-6 sm:h-8 sm:w-8'}`}>
                <AvatarImage src="" alt={ownerName} />
                <AvatarFallback className={`${isCompact ? 'text-xs' : 'text-xs sm:text-sm'} bg-gradient-to-br from-blue-500 to-purple-600 text-white`}>
                  {ownerName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-1">
                  <p className={`font-medium truncate ${isCompact ? 'text-xs sm:text-sm' : 'text-sm sm:text-base'}`}>
                    {ownerName}
                  </p>
                  {isOwnerVerified && (
                    <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500" />
                  )}
                </div>
                <div className="flex items-center space-x-1">
                  <Star className="h-2 w-2 sm:h-3 sm:w-3 fill-yellow-400 text-yellow-400" />
                  <span className={`text-gray-600 ${isCompact ? 'text-xs' : 'text-xs sm:text-sm'}`}>
                    {formatRating(ownerRating)} ({ownerReviews} recenzii)
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Features */}
          {!isCompact && (
            <div className="flex items-center space-x-3 sm:space-x-4 text-xs text-gray-500">
              <div className="flex items-center space-x-1">
                <Shield className="h-3 w-3" />
                <span>Asigurat</span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="h-3 w-3" />
                <span>24h răspuns</span>
              </div>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className={`${isCompact ? 'p-2 sm:p-3 pt-0' : 'p-3 sm:p-4 pt-0'}`}>
        <div className="w-full space-y-2 sm:space-y-3">
          {/* Pricing */}
          <div className="flex items-center justify-between">
            <div>
              <p className={`font-bold text-blue-600 ${isCompact ? 'text-base sm:text-lg' : 'text-lg sm:text-2xl'}`}>
                {formatPrice(gear.price_per_day)}
              </p>
              <p className="text-xs text-gray-500">pe zi</p>
            </div>
            <div className="text-right">
              <p className={`font-medium ${isCompact ? 'text-xs sm:text-sm' : 'text-sm sm:text-base'}`}>
                {formatPrice(gear.deposit_amount)}
              </p>
              <p className="text-xs text-gray-500">depozit</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
            {onViewDetails && (
              <Button
                variant="outline"
                size={isCompact ? "sm" : "default"}
                className="flex-1 hover:bg-gray-50 text-xs sm:text-sm"
                onClick={() => onViewDetails(gear.id)}
              >
                Vezi detalii
              </Button>
            )}
            {onBookNow && gear.status === 'available' && (
              <Button 
                onClick={() => onBookNow(gear.id)}
                className={`flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-xs sm:text-sm ${
                  isCompact ? 'text-sm' : ''
                }`}
                size={isCompact ? "sm" : "default"}
              >
                Închiriază acum
              </Button>
            )}
          </div>
        </div>
      </CardFooter>
    </Card>
  );
});

GearCard.displayName = 'GearCard'; 
