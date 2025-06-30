
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Star, MapPin, Camera, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

interface GearItem {
  id: string;
  name: string;
  category: string;
  price: number;
  image: string;
  owner: string;
  location: string;
  rating: number;
  reviews: number;
  available: boolean;
}

interface GearCardProps {
  gear: GearItem;
}

export const GearCard: React.FC<GearCardProps> = ({ gear }) => {
  return (
    <Card className="group hover:shadow-2xl transition-all duration-300 border-0 bg-white overflow-hidden">
      <div className="relative overflow-hidden">
        <img
          src={gear.image}
          alt={gear.name}
          className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-500"
        />
        <div className="absolute top-3 left-3">
          <Badge variant="secondary" className="bg-white/90 text-gray-700 shadow-sm">
            {gear.category}
          </Badge>
        </div>
        {!gear.available && (
          <div className="absolute top-3 right-3">
            <Badge variant="destructive" className="bg-red-500/90 text-white shadow-sm">
              Indisponibil
            </Badge>
          </div>
        )}
        {gear.available && (
          <div className="absolute top-3 right-3">
            <Badge className="bg-green-500/90 text-white shadow-sm">
              <Zap className="h-3 w-3 mr-1" />
              Disponibil
            </Badge>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-3">
          <h3 className="font-bold text-lg text-gray-800 group-hover:text-purple-600 transition-colors">
            {gear.name}
          </h3>
          <div className="flex items-center space-x-1 bg-yellow-50 px-2 py-1 rounded-full">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            <span className="text-xs font-medium text-yellow-700">{gear.rating}</span>
          </div>
        </div>

        <div className="flex items-center space-x-2 mb-4">
          <Avatar className="h-7 w-7 ring-2 ring-purple-100">
            <AvatarFallback className="text-xs bg-gradient-to-br from-purple-500 to-pink-500 text-white">
              {gear.owner.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm text-gray-600 font-medium">{gear.owner}</span>
        </div>

        <div className="flex items-center space-x-1 mb-4">
          <MapPin className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-600">{gear.location}</span>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <span className="text-2xl font-bold text-gray-800">{gear.price} RON</span>
            <span className="text-sm text-gray-500 ml-1">/zi</span>
          </div>
          <Link to={`/gear/${gear.id}`}>
            <Button 
              size="sm" 
              disabled={!gear.available}
              className={gear.available 
                ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg" 
                : "bg-gray-200 text-gray-500"
              }
            >
              {gear.available ? (
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
          <span>{gear.reviews} recenzii</span>
          <span className="mx-2">•</span>
          <span>Verificat</span>
        </div>
      </CardContent>
    </Card>
  );
};
