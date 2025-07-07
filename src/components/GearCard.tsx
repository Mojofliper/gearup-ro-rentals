import React from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star, MapPin, Calendar, Camera } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';

type Gear = Database['public']['Tables']['gear']['Row'] & {
  categories?: { name: string; slug: string } | null;
  gear_photos?: Array<{ photo_url: string }>;
  users?: { full_name: string; rating: number; total_reviews: number } | null;
};

interface GearCardProps {
  gear: Gear;
  onBookNow?: (gearId: string) => void;
  onViewDetails?: (gearId: string) => void;
  showOwnerInfo?: boolean;
}

export const GearCard = React.memo<GearCardProps>(({ 
  gear, 
  onBookNow, 
  onViewDetails, 
  showOwnerInfo = true 
}) => {
  const formatPrice = (price: number) => {
    // Convert from cents to RON if needed, or use as-is if already in RON
    const priceInRON = price > 1000 ? price / 100 : price; // If price is very high, assume it's in cents
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
      // Handle different image data structures
      if (typeof firstPhoto === 'string') {
        return firstPhoto;
      } else if (firstPhoto && typeof firstPhoto === 'object') {
        return firstPhoto.photo_url || firstPhoto.url || firstPhoto;
      }
    }
    return null;
  };

  const ownerName = gear.users?.full_name || 'Unknown Owner';

  const ownerRating = gear.users?.rating || 0;
  const ownerReviews = gear.users?.total_reviews || 0;

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 overflow-hidden">
      <CardHeader className="p-0">
        <div className="relative aspect-[4/3] overflow-hidden">
          {getFirstImage() ? (
            <img
              src={getFirstImage() as string}
              alt={gear.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
              <Camera className="h-12 w-12 text-gray-400" />
            </div>
          )}
          <div className="absolute top-2 left-2">
            <Badge variant="secondary" className="bg-white/90 text-gray-800">
              {gear.categories?.name || 'Equipment'}
            </Badge>
          </div>
          {gear.status !== 'available' && (
            <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
              <Badge variant="secondary" className="text-white bg-red-600">
                Indisponibil
              </Badge>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-4">
        <div className="space-y-2">
          <h3 className="font-semibold text-lg line-clamp-2 group-hover:text-blue-600 transition-colors">
            {gear.title}
          </h3>
          
          <p className="text-sm text-gray-600 line-clamp-2">
            {gear.description}
          </p>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1 text-sm text-gray-500">
              <MapPin className="h-4 w-4" />
              <span>{gear.location || 'Necunoscut'}</span>
            </div>
          </div>

          {showOwnerInfo && (
            <div className="flex items-center space-x-2 pt-2 border-t">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-xs">
                  {ownerName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{ownerName}</p>
                <div className="flex items-center space-x-1">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  <span className="text-xs text-gray-600">
                    {formatRating(ownerRating)} ({ownerReviews})
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0">
        <div className="w-full space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-blue-600">
                {formatPrice(gear.daily_rate)}
              </p>
              <p className="text-xs text-gray-500">pe zi</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">
                {formatPrice(gear.deposit_amount)}
              </p>
              <p className="text-xs text-gray-500">depozit</p>
            </div>
          </div>

          <div className="flex space-x-2">
            {onViewDetails && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => onViewDetails(gear.id)}
              >
                Vezi detalii
              </Button>
            )}
            {onBookNow && gear.status === 'available' && (
              <Button 
                onClick={() => onBookNow(gear.id)}
                className="w-full mt-2"
                size="sm"
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
