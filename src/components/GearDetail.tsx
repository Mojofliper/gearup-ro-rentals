
import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Calendar } from '@/components/ui/calendar';
import { Separator } from '@/components/ui/separator';
import { Star, MapPin, Shield, MessageSquare, Calendar as CalendarIcon, ArrowLeft, Camera } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthModal } from '@/components/AuthModal';
import { useGear } from '@/hooks/useGear';
import { toast } from '@/hooks/use-toast';

export const GearDetail: React.FC = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { data: gear, isLoading, error } = useGear(id);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-16">
          <div className="text-center">
            <p className="text-lg">Se încarcă...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !gear) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-16">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Echipament negăsit</h2>
            <p className="text-gray-600">Ne pare rău, echipamentul căutat nu există.</p>
            <Link to="/browse" className="text-purple-600 hover:underline mt-4 inline-block">
              Înapoi la căutare
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const handleRentRequest = () => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }

    if (selectedDates.length === 0) {
      toast({
        title: 'Selectează datele',
        description: 'Te rugăm să selectezi perioada de închiriere.',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Cerere de închiriere trimisă!',
      description: 'Proprietarul va fi notificat și îți va răspunde în curând.',
    });
  };

  const handleMessage = () => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    
    toast({
      title: 'Mesaj trimis!',
      description: 'Conversația a fost inițiată cu proprietarul.',
    });
  };

  const calculateTotal = () => {
    const pricePerDay = gear.price_per_day / 100; // Convert from cents
    return selectedDates.length * pricePerDay;
  };

  const depositAmount = gear.deposit_amount ? gear.deposit_amount / 100 : 0;
  const pricePerDay = gear.price_per_day / 100;
  
  // Parse JSON fields safely
  const images = Array.isArray(gear.images) ? gear.images : 
                 (typeof gear.images === 'string' ? JSON.parse(gear.images || '[]') : []);
  const specifications = Array.isArray(gear.specifications) ? gear.specifications : 
                        (typeof gear.specifications === 'string' ? JSON.parse(gear.specifications || '[]') : []);
  const includedItems = Array.isArray(gear.included_items) ? gear.included_items : 
                       (typeof gear.included_items === 'string' ? JSON.parse(gear.included_items || '[]') : []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center space-x-2 mb-6">
          <Link to="/browse" className="flex items-center text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Înapoi la căutare
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Images & Details */}
          <div className="lg:col-span-2">
            {/* Image Gallery */}
            <div className="mb-6">
              {images.length > 0 ? (
                <>
                  <div className="relative mb-4">
                    <img
                      src={images[currentImageIndex]}
                      alt={gear.name}
                      className="w-full h-96 object-cover rounded-lg"
                    />
                    {gear.category && (
                      <Badge className="absolute top-4 left-4">{gear.category.name}</Badge>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    {images.map((image: string, index: number) => (
                      <button
                        key={index}
                        onClick={() => setCurrentImageIndex(index)}
                        className={`w-20 h-20 rounded-lg overflow-hidden border-2 ${
                          index === currentImageIndex ? 'border-primary' : 'border-transparent'
                        }`}
                      >
                        <img src={image} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="w-full h-96 bg-gray-200 rounded-lg flex items-center justify-center">
                  <Camera className="h-16 w-16 text-gray-400" />
                </div>
              )}
            </div>

            {/* Title & Rating */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold mb-2">{gear.name}</h1>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-1">
                  <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">4.9</span>
                  <span className="text-muted-foreground">(0 recenzii)</span>
                </div>
                {gear.owner?.location && (
                  <div className="flex items-center space-x-1">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{gear.owner.location}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            {gear.description && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Descriere</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">{gear.description}</p>
                </CardContent>
              </Card>
            )}

            {/* Specifications */}
            {specifications.length > 0 && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Specificații tehnice</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {specifications.map((spec: string, index: number) => (
                      <li key={index} className="flex items-center space-x-2">
                        <Camera className="h-4 w-4 text-primary" />
                        <span>{spec}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* What's Included */}
            {includedItems.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Ce este inclus</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {includedItems.map((item: string, index: number) => (
                      <li key={index} className="flex items-center space-x-2">
                        <span className="text-green-600">✓</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Booking */}
          <div className="space-y-6">
            {/* Owner Info */}
            {gear.owner && (
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback>
                        {gear.owner.full_name?.split(' ').map((n: string) => n[0]).join('') || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold">{gear.owner.full_name || 'Utilizator'}</h3>
                        {gear.owner.is_verified && (
                          <Badge variant="secondary" className="text-xs">
                            <Shield className="h-3 w-3 mr-1" />
                            Verificat
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span>4.9 (0 recenzii)</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Membru din 2024
                      </p>
                    </div>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={handleMessage}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Trimite mesaj
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Booking Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Rezervare</span>
                  <div>
                    <span className="text-2xl font-bold">{pricePerDay} RON</span>
                    <span className="text-sm text-muted-foreground">/zi</span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    <CalendarIcon className="h-4 w-4 inline mr-1" />
                    Selectează datele
                  </label>
                  <Calendar
                    mode="multiple"
                    selected={selectedDates}
                    onSelect={(dates) => setSelectedDates(dates || [])}
                    className="rounded-md border"
                  />
                </div>

                {selectedDates.length > 0 && (
                  <div className="space-y-2">
                    <Separator />
                    <div className="flex justify-between text-sm">
                      <span>{pricePerDay} RON × {selectedDates.length} zile</span>
                      <span>{calculateTotal()} RON</span>
                    </div>
                    {depositAmount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>Garanție</span>
                        <span>{depositAmount} RON</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between font-semibold">
                      <span>Total</span>
                      <span>{calculateTotal() + depositAmount} RON</span>
                    </div>
                    {depositAmount > 0 && (
                      <p className="text-xs text-muted-foreground">
                        * Garanția se returnează la finalul închirierii
                      </p>
                    )}
                  </div>
                )}

                <Button 
                  className="w-full" 
                  onClick={handleRentRequest}
                  disabled={!gear.is_available}
                >
                  {gear.is_available ? 'Solicită închirierea' : 'Indisponibil'}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  Nu vei fi taxat încă. Proprietarul trebuie să confirme disponibilitatea.
                </p>
              </CardContent>
            </Card>

            {/* Safety Info */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Shield className="h-5 w-5 text-green-600" />
                  <span className="font-medium">Siguranță GearUp</span>
                </div>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Plăți securizate prin Stripe</li>
                  <li>• Verificarea identității</li>
                  <li>• Suport 24/7</li>
                  <li>• Politică de rambursare</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Footer />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        mode={authMode}
        onSwitchMode={setAuthMode}
      />
    </div>
  );
};
