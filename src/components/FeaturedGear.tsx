
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useGearList } from '@/hooks/useGear';

export const FeaturedGear: React.FC = () => {
  const { data: gearList, isLoading, error } = useGearList();

  // Get first 4 items for featured section
  const featuredGear = gearList?.slice(0, 4) || [];

  if (isLoading) {
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
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <div className="h-48 bg-gray-200 rounded-t-lg"></div>
                <CardContent className="p-4">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded mb-3"></div>
                  <div className="h-3 bg-gray-200 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-4">Echipamente populare</h2>
            <p className="text-muted-foreground">Nu s-au putut încărca echipamentele momentan.</p>
          </div>
        </div>
      </section>
    );
  }

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
          {featuredGear.map((gear) => {
            const images = Array.isArray(gear.images) ? gear.images : [];
            const firstImage = images.length > 0 ? images[0] : 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=400&h=300&fit=crop';
            const ownerName = gear.owner?.full_name || 'Utilizator';
            const ownerLocation = gear.owner?.location || 'România';
            const categoryName = gear.category?.name || 'Echipament';

            return (
              <Card key={gear.id} className="group hover:shadow-lg transition-shadow">
                <div className="relative">
                  <img
                    src={firstImage}
                    alt={gear.name}
                    className="w-full h-48 object-cover rounded-t-lg"
                  />
                  <div className="absolute top-3 left-3">
                    <Badge variant="secondary">{categoryName}</Badge>
                  </div>
                  {!gear.is_available && (
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
                      <span className="text-sm font-medium">4.8</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 mb-3">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={gear.owner?.avatar_url} />
                      <AvatarFallback className="text-xs">
                        {ownerName.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-muted-foreground">{ownerName}</span>
                  </div>

                  <div className="flex items-center space-x-1 mb-3">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{ownerLocation}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-2xl font-bold">{gear.price_per_day} RON</span>
                      <span className="text-sm text-muted-foreground">/zi</span>
                    </div>
                    <Link to={`/gear/${gear.id}`}>
                      <Button size="sm" disabled={!gear.is_available}>
                        {gear.is_available ? 'Vezi detalii' : 'Indisponibil'}
                      </Button>
                    </Link>
                  </div>

                  <div className="text-xs text-muted-foreground mt-2">
                    {gear.view_count || 0} vizualizări
                  </div>
                </CardContent>
              </Card>
            );
          })}
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
