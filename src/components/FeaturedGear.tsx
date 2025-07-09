import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ConversationModal } from '@/components/ConversationModal';
import { MapPin, Search, MessageSquare, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAllGear } from '@/hooks/useGear';
import { useGearReviews } from '@/hooks/useReviews';
import { useAuth } from '@/contexts/AuthContext';

// Component for individual featured gear card
const FeaturedGearCard: React.FC<{ gear: Record<string, unknown>; onStartConversation: (gear: Record<string, unknown>) => void }> = ({ gear, onStartConversation }) => {
  const { data: reviewsData } = useGearReviews(gear.id as string);
  const { user } = useAuth();
  
  // Safely parse images from Json type
  const images = Array.isArray(gear.gear_photos) ? (gear.gear_photos as unknown as string[]) : [];
  const firstImage = images.length > 0 ? images[0] : 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=400&h=300&fit=crop';
  const ownerName = (gear.owner as Record<string, string>)?.full_name || 'Utilizator';
  const ownerLocation = (gear.owner as Record<string, string>)?.location || 'România';
  const categoryName = (gear.category as Record<string, string>)?.name || 'Echipament';
  
  // Convert price from cents to RON
          const priceInRON = (gear.price_per_day as number) / 100; // Price is already in RON
  
  // Get full avatar URL
  const ownerAvatar = (gear.owner as Record<string, string>)?.avatar_url 
    ? (gear.owner as Record<string, string>).avatar_url.startsWith('http') 
      ? (gear.owner as Record<string, string>).avatar_url 
      : `https://wnrbxwzeshgblkfidayb.supabase.co/storage/v1/object/public/avatars/${(gear.owner as Record<string, string>).avatar_url}`
    : '';

  return (
    <Card className="group hover:shadow-lg transition-shadow">
      <div className="relative">
        <Link to={`/gear/${gear.id}`}>
          <img
            src={firstImage}
            alt={gear.title as string}
            className="w-full h-48 object-cover rounded-t-lg cursor-pointer"
          />
        </Link>
        <div className="absolute top-3 left-3">
          <Badge variant="secondary">{categoryName}</Badge>
        </div>
        {(gear.status as string) !== 'available' && (
          <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
            <Badge variant="secondary" className="text-white bg-red-600">
              Indisponibil
            </Badge>
          </div>
        )}
      </div>

      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-lg">{gear.title as string}</h3>
          <div className="text-xs text-muted-foreground">
            {reviewsData && reviewsData.length > 0 ? (
              <div className="flex items-center space-x-1">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                <span>
                  {(reviewsData.reduce((sum: number, review: Record<string, unknown>) => sum + (review.rating as number || 0), 0) / reviewsData.length).toFixed(1)} 
                  ({reviewsData.length})
                </span>
              </div>
            ) : (
              'Fără recenzii'
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2 mb-3">
          <Avatar className="h-6 w-6">
            <AvatarImage src={ownerAvatar} />
            <AvatarFallback className="text-xs">
              {(ownerName.split(' ').map(n => n[0]).join(''))}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm text-muted-foreground">{ownerName}</span>
        </div>

        <div className="flex items-center space-x-1 mb-3">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{ownerLocation}</span>
        </div>

        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-2xl font-bold">{priceInRON} RON</span>
            <span className="text-sm text-muted-foreground">/zi</span>
          </div>
        </div>

        <div className="flex space-x-2">
          <Link to={`/gear/${gear.id}`} className="flex-1">
            <Button 
              size="sm" 
              disabled={(gear.status as string) !== 'available'}
              className={`w-full ${((gear.status as string) === 'available' ? "btn-creative shadow-md hover:shadow-lg transition-all duration-300" : "")}`}
              variant={(gear.status as string) === 'available' ? "default" : "secondary"}
            >
              {(gear.status as string) === 'available' ? '🚀 Închiriază' : '❌ Indisponibil'}
            </Button>
          </Link>
          
          {user && (gear.owner_id as string) !== user.id && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onStartConversation(gear)}
              className="px-3"
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export const FeaturedGear: React.FC = () => {
  const { data: gearList, isLoading, error } = useAllGear();
  const { user } = useAuth();
  const [conversationModal, setConversationModal] = useState<{
    isOpen: boolean;
    gearId: string;
    ownerId: string;
    gearName: string;
    ownerName: string;
    ownerAvatar?: string;
  }>({
    isOpen: false,
    gearId: '',
    ownerId: '',
    gearName: '',
    ownerName: '',
    ownerAvatar: ''
  });

  // Get first 4 items for featured section
  const featuredGear = gearList?.slice(0, 4) || [];

  const handleStartConversation = (gear: Record<string, unknown>) => {
    if (!user) {
      // Handle unauthenticated user
      return;
    }

    const ownerName = (gear.owner as Record<string, string>)?.full_name || 'Utilizator';
    const ownerAvatar = (gear.owner as Record<string, string>)?.avatar_url 
      ? (gear.owner as Record<string, string>).avatar_url.startsWith('http') 
        ? (gear.owner as Record<string, string>).avatar_url 
        : `https://wnrbxwzeshgblkfidayb.supabase.co/storage/v1/object/public/avatars/${(gear.owner as Record<string, string>).avatar_url}`
      : '';

    setConversationModal({
      isOpen: true,
      gearId: gear.id as string,
      ownerId: gear.owner_id as string,
      gearName: gear.title as string,
      ownerName,
      ownerAvatar
    });
  };

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
          {featuredGear.map((gear) => (
            <FeaturedGearCard key={gear.id as string} gear={gear} onStartConversation={handleStartConversation} />
          ))}
        </div>

        <div className="text-center mt-12">
          <Link to="/browse">
            <Button size="lg" className="btn-creative shadow-lg hover:shadow-xl transition-all duration-300 px-8 py-3">
              <Search className="h-5 w-5 mr-2" />
              Explorează toate echipamentele
            </Button>
          </Link>
        </div>
      </div>

      <ConversationModal
        isOpen={conversationModal.isOpen}
        onClose={() => setConversationModal({ ...conversationModal, isOpen: false })}
        gearId={conversationModal.gearId}
        ownerId={conversationModal.ownerId}
        gearName={conversationModal.gearName}
        ownerName={conversationModal.ownerName}
        ownerAvatar={conversationModal.ownerAvatar}
      />
    </section>
  );
};
