
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Star, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';

const featuredGear = [
  {
    id: '1',
    name: 'Sony A7 III',
    category: 'Camere foto',
    price: 120,
    image: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=400&h=300&fit=crop',
    owner: 'Mihai Popescu',
    location: 'Cluj-Napoca',
    rating: 4.9,
    reviews: 23,
    available: true
  },
  {
    id: '2',
    name: 'DJI Mavic Air 2',
    category: 'Drone',
    price: 150,
    image: 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=400&h=300&fit=crop',
    owner: 'Ana Georgescu',
    location: 'București',
    rating: 5.0,
    reviews: 18,
    available: true
  },
  {
    id: '3',
    name: 'Canon RF 24-70mm f/2.8',
    category: 'Obiective',
    price: 80,
    image: 'https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=400&h=300&fit=crop',
    owner: 'Radu Ionescu',
    location: 'Timișoara',
    rating: 4.8,
    reviews: 31,
    available: false
  },
  {
    id: '4',
    name: 'Godox AD600 Pro',
    category: 'Iluminat',
    price: 100,
    image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400&h=300&fit=crop',
    owner: 'Maria Dumitrescu',
    location: 'Iași',
    rating: 4.7,
    reviews: 12,
    available: true
  }
];

export const FeaturedGear: React.FC = () => {
  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Echipamente populare</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Descoperă cele mai căutate echipamente de la creatorii români
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredGear.map((gear) => (
            <Card key={gear.id} className="group hover:shadow-lg transition-shadow">
              <div className="relative">
                <img
                  src={gear.image}
                  alt={gear.name}
                  className="w-full h-48 object-cover rounded-t-lg"
                />
                <div className="absolute top-3 left-3">
                  <Badge variant="secondary">{gear.category}</Badge>
                </div>
                {!gear.available && (
                  <div className="absolute top-3 right-3">
                    <Badge variant="destructive">Indisponibil</Badge>
                  </div>
                )}
              </div>

              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-lg">{gear.name}</h3>
                  <div className="flex items-center space-x-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-medium">{gear.rating}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 mb-3">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {gear.owner.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-muted-foreground">{gear.owner}</span>
                </div>

                <div className="flex items-center space-x-1 mb-3">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{gear.location}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-2xl font-bold">{gear.price} RON</span>
                    <span className="text-sm text-muted-foreground">/zi</span>
                  </div>
                  <Link to={`/gear/${gear.id}`}>
                    <Button size="sm" disabled={!gear.available}>
                      {gear.available ? 'Vezi detalii' : 'Indisponibil'}
                    </Button>
                  </Link>
                </div>

                <div className="text-xs text-muted-foreground mt-2">
                  {gear.reviews} recenzii
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link to="/browse">
            <Button size="lg" variant="outline">
              Vezi toate echipamentele
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};
