
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
import { toast } from '@/hooks/use-toast';

export const GearDetail: React.FC = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  // Mock data - în aplicația reală ar veni din API
  const gear = {
    id: '1',
    name: 'Sony A7 III',
    category: 'Camere foto',
    price: 120,
    images: [
      'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=800&h=600&fit=crop'
    ],
    owner: {
      name: 'Mihai Popescu',
      avatar: '',
      rating: 4.9,
      reviews: 23,
      verified: true,
      memberSince: '2022'
    },
    location: 'Cluj-Napoca',
    rating: 4.9,
    reviews: 23,
    available: true,
    description: 'Camera foto mirrorless full-frame de înaltă calitate, perfectă pentru fotografia profesională și video 4K. Include încărcător, baterie suplimentară și geantă de transport.',
    specifications: [
      'Sensor: Full-frame 24.2MP',
      'ISO: 100-51200 (expandabil până la 204800)',
      'Video: 4K/30p, Full HD/120p',
      'Stabilizare: 5 axe în corp',
      'Ecran: Touchscreen 3" rabatabil',
      'Conectivitate: Wi-Fi, Bluetooth, USB-C'
    ],
    included: [
      'Camera Sony A7 III',
      'Obiectiv kit 28-70mm',
      'Baterie suplimentară',
      'Încărcător',
      'Geantă de transport',
      'Card SD 64GB'
    ],
    depositAmount: 500,
    unavailableDates: [
      new Date(2024, 11, 15),
      new Date(2024, 11, 16),
      new Date(2024, 11, 20)
    ]
  };

  const [currentImageIndex, setCurrentImageIndex] = useState(0);

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
    return selectedDates.length * gear.price;
  };

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
              <div className="relative mb-4">
                <img
                  src={gear.images[currentImageIndex]}
                  alt={gear.name}
                  className="w-full h-96 object-cover rounded-lg"
                />
                <Badge className="absolute top-4 left-4">{gear.category}</Badge>
              </div>
              <div className="flex space-x-2">
                {gear.images.map((image, index) => (
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
            </div>

            {/* Title & Rating */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold mb-2">{gear.name}</h1>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-1">
                  <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">{gear.rating}</span>
                  <span className="text-muted-foreground">({gear.reviews} recenzii)</span>
                </div>
                <div className="flex items-center space-x-1">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{gear.location}</span>
                </div>
              </div>
            </div>

            {/* Description */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Descriere</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">{gear.description}</p>
              </CardContent>
            </Card>

            {/* Specifications */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Specificații tehnice</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {gear.specifications.map((spec, index) => (
                    <li key={index} className="flex items-center space-x-2">
                      <Camera className="h-4 w-4 text-primary" />
                      <span>{spec}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* What's Included */}
            <Card>
              <CardHeader>
                <CardTitle>Ce este inclus</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {gear.included.map((item, index) => (
                    <li key={index} className="flex items-center space-x-2">
                      <span className="text-green-600">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Booking */}
          <div className="space-y-6">
            {/* Owner Info */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback>
                      {gear.owner.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-semibold">{gear.owner.name}</h3>
                      {gear.owner.verified && (
                        <Badge variant="secondary" className="text-xs">
                          <Shield className="h-3 w-3 mr-1" />
                          Verificat
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span>{gear.owner.rating} ({gear.owner.reviews} recenzii)</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Membru din {gear.owner.memberSince}
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

            {/* Booking Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Rezervare</span>
                  <div>
                    <span className="text-2xl font-bold">{gear.price} RON</span>
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
                    disabled={gear.unavailableDates}
                    className="rounded-md border"
                  />
                </div>

                {selectedDates.length > 0 && (
                  <div className="space-y-2">
                    <Separator />
                    <div className="flex justify-between text-sm">
                      <span>{gear.price} RON × {selectedDates.length} zile</span>
                      <span>{calculateTotal()} RON</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Garanție</span>
                      <span>{gear.depositAmount} RON</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-semibold">
                      <span>Total</span>
                      <span>{calculateTotal() + gear.depositAmount} RON</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      * Garanția se returnează la finalul închirierii
                    </p>
                  </div>
                )}

                <Button 
                  className="w-full" 
                  onClick={handleRentRequest}
                  disabled={!gear.available}
                >
                  {gear.available ? 'Solicită închirierea' : 'Indisponibil'}
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
