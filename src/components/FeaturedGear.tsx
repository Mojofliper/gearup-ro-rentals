import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ConversationModal } from '@/components/ConversationModal';
import { MapPin, Search, MessageSquare, Star, Eye, Heart, Calendar, Camera } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAllGear } from '@/hooks/useGear';
import { useGearReviews } from '@/hooks/useReviews';
import { useAuth } from '@/contexts/AuthContext';

// Component for individual featured gear card
const FeaturedGearCard: React.FC<{ gear: Record<string, unknown>; onStartConversation: (gear: Record<string, unknown>) => void }> = ({ gear, onStartConversation }) => {
  const { data: reviewsDataRaw } = useGearReviews(gear.id as string);
  const safeReviewsData = Array.isArray(reviewsDataRaw) ? reviewsDataRaw : [];
  const { user } = useAuth();

  // Robustly extract images from gear_photos (array of objects)
  let images: string[] = [];
  if (Array.isArray(gear.gear_photos)) {
    // Supabase join may return array of objects with photo_url
    images = (gear.gear_photos as Array<{ photo_url: string } | string>)
      .map((p) => typeof p === 'string' ? p : p?.photo_url)
      .filter(Boolean);
  }
  const firstImage = images.length > 0
    ? images[0]
    : 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=400&h=300&fit=crop';

  // Robustly extract owner info (object or array)
  let owner = gear.owner;
  if (Array.isArray(owner)) owner = owner[0];
  owner = owner || (gear.users || (Array.isArray(gear.users) ? gear.users[0] : undefined)) || {};
  const ownerObj = owner as Record<string, unknown>;
  const ownerName = (ownerObj?.full_name as string) || 'Utilizator';
  const ownerLocation = (ownerObj?.location as string) || 'România';
  const ownerAvatar = ownerObj?.avatar_url
    ? (ownerObj.avatar_url as string).startsWith('http')
      ? ownerObj.avatar_url as string
      : `https://wnrbxwzeshgblkfidayb.supabase.co/storage/v1/object/public/avatars/${ownerObj.avatar_url as string}`
    : '';
  const avatarFallback = typeof ownerName === 'string' && ownerName.trim().length > 0 ? ownerName.split(' ').map((n) => n[0]).join('') : 'U';

  // Robustly extract category info (object or array)
  let category = gear.category;
  if (Array.isArray(category)) category = category[0];
  category = category || (gear.categories || (Array.isArray(gear.categories) ? gear.categories[0] : undefined)) || {};
  const categoryObj = category as Record<string, unknown>;
  const categoryName = (categoryObj?.name as string) || 'Echipament';

  // Price is already in RON
  const priceInRON = gear.price_per_day as number || 0;

  const averageRating = safeReviewsData.length > 0 
    ? (safeReviewsData.reduce((sum: number, review: Record<string, unknown>) => sum + (review.rating as number || 0), 0) / safeReviewsData.length).toFixed(1)
    : null;

  const gearTitle = typeof gear.title === 'string' ? gear.title : '';
  const gearId = typeof gear.id === 'string' ? gear.id : '';

  const safeCategoryName = typeof categoryName === 'string' ? categoryName : '';
  const safeOwnerName = typeof ownerName === 'string' ? ownerName : '';
  const safeOwnerLocation = typeof ownerLocation === 'string' ? ownerLocation : '';
  const safePriceInRON = typeof priceInRON === 'number' ? priceInRON.toString() : String(priceInRON);

  return (
    <Card className="group relative overflow-hidden bg-white hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 border-0 rounded-2xl">
      {/* Image Container */}
      <div className="relative overflow-hidden min-h-[16rem] flex items-center justify-center bg-slate-100">
        <Link to={`/gear/${gearId}`} className="block w-full h-full">
          <img
            src={firstImage}
            alt={gearTitle}
            className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-500 rounded-t-2xl"
            onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=400&h=300&fit=crop'; }}
          />
        </Link>
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        {/* Category Badge */}
        <div className="absolute top-4 left-4">
          <Badge className="bg-white/90 backdrop-blur-sm text-gray-800 border-0 font-medium px-3 py-1 rounded-full">
            {safeCategoryName}
          </Badge>
        </div>
        {/* Price Badge */}
        <div className="absolute top-4 right-4">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-3 py-1 rounded-full font-bold text-sm">
            {safePriceInRON} RON/zi
          </div>
        </div>
        {/* Status Overlay */}
        {(gear.status as string) !== 'available' && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-t-2xl flex items-center justify-center">
            <Badge className="bg-red-500 text-white border-0 px-4 py-2 rounded-full font-medium">
              Indisponibil
            </Badge>
          </div>
        )}
        {/* Quick Actions */}
        <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="flex space-x-2">
            <Button size="sm" variant="secondary" className="w-8 h-8 p-0 rounded-full bg-white/90 backdrop-blur-sm">
              <Heart className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="secondary" className="w-8 h-8 p-0 rounded-full bg-white/90 backdrop-blur-sm">
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <CardContent className="p-6">
        {/* Title and Rating */}
        <div className="flex items-start justify-between mb-3">
          <h3 className="font-bold text-lg text-slate-900 group-hover:text-blue-600 transition-colors duration-300 line-clamp-2">
            {gearTitle}
          </h3>
          {averageRating !== null && (
            <div className="flex items-center space-x-1 bg-amber-100 px-2 py-1 rounded-full">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              <span className="text-xs font-medium text-amber-800">{String(averageRating)}</span>
            </div>
          )}
        </div>

        {/* Owner Info */}
        <div className="flex items-center space-x-3 mb-4">
          <Avatar className="h-8 w-8 border-2 border-blue-100">
            <AvatarImage src={ownerAvatar} />
            <AvatarFallback className="text-xs bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
              {avatarFallback}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">{ownerName}</p>
            <div className="flex items-center space-x-1">
              <MapPin className="h-3 w-3 text-slate-400" />
              <span className="text-xs text-slate-500 truncate">{safeOwnerLocation}</span>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="flex items-center space-x-4 mb-4 text-xs text-slate-500">
          <div className="flex items-center space-x-1">
            <Calendar className="h-3 w-3" />
            <span>Disponibil</span>
          </div>
          <div className="flex items-center space-x-1">
            <Star className="h-3 w-3" />
            <span>{safeReviewsData.length} recenzii</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-2">
          <Link to={`/gear/${gearId}`} className="flex-1">
            <Button 
              size="sm" 
              disabled={(gear.status as string) !== 'available'}
              className={`w-full ${
                (gear.status as string) === 'available' 
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl" 
                  : "bg-slate-100 text-slate-500"
              } rounded-xl font-semibold transition-all duration-300`}
            >
              {(gear.status as string) === 'available' ? '🚀 Închiriază' : '❌ Indisponibil'}
            </Button>
          </Link>
          
          {user && (gear.owner_id as string) !== user.id && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onStartConversation(gear)}
              className="px-3 border-blue-200 text-blue-600 hover:bg-blue-50 rounded-xl"
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
      <section className="py-20 bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Echipamente populare
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
              Descoperă cele mai căutate echipamente de la creatorii români
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="animate-pulse bg-white rounded-2xl overflow-hidden">
                <div className="h-64 bg-slate-200"></div>
                <CardContent className="p-6">
                  <div className="h-6 bg-slate-200 rounded mb-3"></div>
                  <div className="h-4 bg-slate-200 rounded mb-4"></div>
                  <div className="h-4 bg-slate-200 rounded mb-4"></div>
                  <div className="h-10 bg-slate-200 rounded"></div>
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
      <section className="py-20 bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h2 className="text-4xl sm:text-5xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Echipamente populare
            </h2>
            <p className="text-xl text-slate-600 mb-8">A apărut o eroare la încărcarea echipamentelor</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 bg-gradient-to-br from-blue-50 to-indigo-50 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-15 animate-blob"></div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000"></div>
      
      <div className="container mx-auto px-4 relative">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Echipamente populare
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            Descoperă cele mai căutate echipamente de la creatorii români
          </p>
        </div>

        {featuredGear.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Camera className="h-12 w-12 text-blue-600" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-4">Nu există echipamente încă</h3>
            <p className="text-slate-600 mb-8 max-w-md mx-auto">
              Fii primul care adaugă echipament și ajută la construirea comunității!
            </p>
            <Button 
              onClick={() => window.location.href = '/add-gear'}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Camera className="h-5 w-5 mr-2" />
              Adaugă primul echipament
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {featuredGear.map((gear) => (
              <FeaturedGearCard 
                key={typeof gear.id === 'string' ? gear.id : ''} 
                gear={gear} 
                onStartConversation={handleStartConversation}
              />
            ))}
          </div>
        )}

        {/* View All Button */}
        <div className="text-center mt-12">
          <Button 
            onClick={() => window.location.href = '/browse'}
            variant="outline"
            size="lg"
            className="border-2 border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300 px-8 py-3 rounded-xl font-semibold transition-all duration-300"
          >
            <Search className="h-5 w-5 mr-2" />
            Vezi toate echipamentele
          </Button>
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
