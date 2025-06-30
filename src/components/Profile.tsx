
import React, { useState } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { Star, MapPin, Camera, Calendar, Edit, Shield } from 'lucide-react';

export const Profile: React.FC = () => {
  const { user, profile, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    location: profile?.location || '',
    bio: 'Fotograf profesionist cu peste 5 ani de experiență în fotografia de nuntă și evenimente.'
  });

  if (!user || !profile) return null;

  const handleSave = () => {
    updateProfile(formData);
    setIsEditing(false);
  };

  // Mock data pentru demonstrație
  const userStats = {
    totalRentals: 12,
    totalListings: 3,
    rating: 4.9,
    reviews: 23,
    joinDate: '2022'
  };

  const recentRentals = [
    {
      id: '1',
      name: 'Canon RF 85mm f/1.2',
      owner: 'Maria Ionescu',
      dates: '15-17 Dec 2024',
      status: 'completed',
      rating: 5
    },
    {
      id: '2',
      name: 'DJI Ronin SC',
      owner: 'Alex Popescu',
      dates: '8-10 Dec 2024',
      status: 'completed',
      rating: 5
    }
  ];

  const myListings = [
    {
      id: '1',
      name: 'Sony A7 III',
      price: 120,
      bookings: 8,
      rating: 4.9,
      image: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=300&h=200&fit=crop'
    },
    {
      id: '2',
      name: 'Godox AD200 Pro',
      price: 80,
      bookings: 5,
      rating: 4.8,
      image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=300&h=200&fit=crop'
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        {/* Profile Header */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-6">
              <Avatar className="h-24 w-24">
                <AvatarFallback className="text-2xl">
                  {profile.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h1 className="text-2xl font-bold">{profile.full_name || 'Utilizator'}</h1>
                  {profile.is_verified && (
                    <Badge variant="secondary">
                      <Shield className="h-3 w-3 mr-1" />
                      Verificat
                    </Badge>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setIsEditing(!isEditing)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Editează
                  </Button>
                </div>
                
                <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-3">
                  <div className="flex items-center space-x-1">
                    <MapPin className="h-4 w-4" />
                    <span>{profile.location || 'Locație nedefinită'}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-4 w-4" />
                    <span>Membru din {userStats.joinDate}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span>{userStats.rating} ({userStats.reviews} recenzii)</span>
                  </div>
                </div>

                <p className="text-muted-foreground">
                  {formData.bio}
                </p>
              </div>
            </div>

            {isEditing && (
              <div className="mt-6 pt-6 border-t space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="full_name">Nume</Label>
                    <Input
                      id="full_name"
                      value={formData.full_name}
                      onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="location">Locație</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => setFormData({...formData, location: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="bio">Descriere</Label>
                  <textarea
                    id="bio"
                    className="w-full p-2 border rounded-md"
                    rows={3}
                    value={formData.bio}
                    onChange={(e) => setFormData({...formData, bio: e.target.value})}
                  />
                </div>
                <div className="flex space-x-2">
                  <Button onClick={handleSave}>Salvează</Button>
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    Anulează
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{userStats.totalRentals}</div>
              <div className="text-sm text-muted-foreground">Închirieri</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{userStats.totalListings}</div>
              <div className="text-sm text-muted-foreground">Echipamente oferite</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">{userStats.rating}</div>
              <div className="text-sm text-muted-foreground">Rating mediu</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{userStats.reviews}</div>
              <div className="text-sm text-muted-foreground">Recenzii</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="rentals" className="space-y-4">
          <TabsList>
            <TabsTrigger value="rentals">Închirierile mele</TabsTrigger>
            <TabsTrigger value="listings">Echipamentele mele</TabsTrigger>
            <TabsTrigger value="reviews">Recenzii</TabsTrigger>
          </TabsList>

          <TabsContent value="rentals" className="space-y-4">
            {recentRentals.map((rental) => (
              <Card key={rental.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{rental.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        De la {rental.owner} • {rental.dates}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant={rental.status === 'completed' ? 'default' : 'secondary'}>
                        {rental.status === 'completed' ? 'Finalizat' : 'În curs'}
                      </Badge>
                      {rental.rating && (
                        <div className="flex items-center space-x-1 mt-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm">{rental.rating}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="listings" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myListings.map((listing) => (
                <Card key={listing.id}>
                  <div className="relative">
                    <img
                      src={listing.image}
                      alt={listing.name}
                      className="w-full h-32 object-cover rounded-t-lg"
                    />
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-2">{listing.name}</h3>
                    <div className="flex justify-between items-center">
                      <span className="font-bold">{listing.price} RON/zi</span>
                      <div className="flex items-center space-x-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm">{listing.rating}</span>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {listing.bookings} rezervări
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="reviews" className="space-y-4">
            <div className="space-y-4">
              {[1, 2, 3].map((review) => (
                <Card key={review}>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3 mb-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>M{review}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">Maria {review}</div>
                        <div className="flex items-center space-x-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star key={star} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          ))}
                        </div>
                      </div>
                    </div>
                    <p className="text-muted-foreground">
                      Echipament de calitate excelentă și proprietar foarte amabil. Totul a decurs perfect!
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Footer />
    </div>
  );
};
