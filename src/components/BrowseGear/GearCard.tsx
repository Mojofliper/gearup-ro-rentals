import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Star, MapPin, Camera, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useGearReviews } from '@/hooks/useReviews';

interface GearCardProps {
  gear: {
    id: string;
    name: string;
    description?: string;
    price_per_day: number;
    images: any[];
    is_available: boolean;
    owner: {
      full_name: string;
      location: string;
      is_verified: boolean;
    };
    category?: {
      name: string;
    };
  };
}

export const GearCard: React.FC<GearCardProps> = ({ gear }) => {
  const { data: reviewsData } = useGearReviews(gear.id);
  
  // Convert price from cents to RON
  const price = Math.round(gear.price_per_day / 100);
  const imageUrl = gear.images?.[0] || 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=400&h=300&fit=crop';

  const handleImageClick = () => {
    console.log('Image clicked for gear:', gear.id);
    console.log('Link URL:', `/gear/${gear.id}`);
    console.log('Navigating to:', `/gear/${gear.id}`);
    // Force navigation
    window.location.href = `/gear/${gear.id}`;
  };

  const handleButtonClick = () => {
    console.log('Button clicked for gear:', gear.id);
    console.log('Link URL:', `/gear/${gear.id}`);
    console.log('Navigating to:', `/gear/${gear.id}`);
  };

  return (
    <Card className="group hover:shadow-2xl transition-all duration-300 border-0 bg-white overflow-hidden">
      <Link to={`/gear/${gear.id}`} className="block">
        <div className="relative overflow-hidden cursor-pointer">
          <img
            src={imageUrl}
            alt={gear.name}
            className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-500"
          />
          <div className="absolute top-3 left-3">
            <Badge variant="secondary" className="bg-white/90 text-gray-700 shadow-sm">
              {gear.category?.name || 'Echipament'}
            </Badge>
          </div>
          {!gear.is_available && (
            <div className="absolute top-3 right-3">
              <Badge variant="destructive" className="bg-red-500/90 text-white shadow-sm">
                Indisponibil
              </Badge>
            </div>
          )}
          {gear.is_available && (
            <div className="absolute top-3 right-3">
              <Badge className="bg-green-500/90 text-white shadow-sm">
                <Zap className="h-3 w-3 mr-1" />
                Disponibil
              </Badge>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </Link>

      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-3">
          <h3 className="font-bold text-lg text-gray-800 group-hover:text-purple-600 transition-colors">
            {gear.name}
          </h3>
          <div className="text-xs text-gray-500">
            {reviewsData?.totalReviews ? (
              <div className="flex items-center space-x-1">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                <span>{reviewsData.averageRating.toFixed(1)} ({reviewsData.totalReviews})</span>
              </div>
            ) : (
              'Fără recenzii'
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2 mb-4">
          <Avatar className="h-7 w-7 ring-2 ring-purple-100">
            <AvatarFallback className="text-xs bg-gradient-to-br from-purple-500 to-pink-500 text-white">
              {gear.owner.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm text-gray-600 font-medium">{gear.owner.full_name}</span>
          {gear.owner.is_verified && (
            <Badge variant="secondary" className="text-xs">Verificat</Badge>
          )}
        </div>

        <div className="flex items-center space-x-1 mb-4">
          <MapPin className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-600">{gear.owner.location}</span>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <span className="text-2xl font-bold text-gray-800">{price} RON</span>
            <span className="text-sm text-gray-500 ml-1">/zi</span>
          </div>
          <Link to={`/gear/${gear.id}`}>
            <Button 
              size="sm" 
              disabled={!gear.is_available}
              onClick={handleButtonClick}
              className={gear.is_available 
                ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg" 
                : "bg-gray-200 text-gray-500"
              }
            >
              {gear.is_available ? (
                <>
                  <Camera className="h-4 w-4 mr-1" />
                  Vezi detalii
                </>
              ) : (
                'Indisponibil'
              )}
            </Button>
          </Link>
        </div>

        <div className="text-xs text-gray-500 mt-3 flex items-center">
          <span>Recent adăugat</span>
          <span className="mx-2">•</span>
          <span>Verificat</span>
        </div>
      </CardContent>
    </Card>
  );
};
