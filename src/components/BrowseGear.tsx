
import React, { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Search, Filter, Star, MapPin } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';

const mockGear = [
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
  },
  // Add more mock data...
];

export const BrowseGear: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [selectedLocation, setSelectedLocation] = useState(searchParams.get('location') || 'all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('relevance');
  const [filteredGear, setFilteredGear] = useState(mockGear);

  useEffect(() => {
    let filtered = mockGear;

    if (searchQuery) {
      filtered = filtered.filter(gear =>
        gear.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        gear.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedLocation && selectedLocation !== 'all') {
      filtered = filtered.filter(gear =>
        gear.location.toLowerCase().includes(selectedLocation.toLowerCase())
      );
    }

    if (selectedCategory && selectedCategory !== 'all') {
      filtered = filtered.filter(gear => gear.category === selectedCategory);
    }

    // Sort
    if (sortBy === 'price-low') {
      filtered.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-high') {
      filtered.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'rating') {
      filtered.sort((a, b) => b.rating - a.rating);
    }

    setFilteredGear(filtered);
  }, [searchQuery, selectedLocation, selectedCategory, sortBy]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        {/* Search & Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-2">
              <Input
                placeholder="Caută echipament..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            
            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger>
                <SelectValue placeholder="Toate orașele" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toate orașele</SelectItem>
                <SelectItem value="bucuresti">București</SelectItem>
                <SelectItem value="cluj-napoca">Cluj-Napoca</SelectItem>
                <SelectItem value="timisoara">Timișoara</SelectItem>
                <SelectItem value="iasi">Iași</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Toate categoriile" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toate categoriile</SelectItem>
                <SelectItem value="Camere foto">Camere foto</SelectItem>
                <SelectItem value="Obiective">Obiective</SelectItem>
                <SelectItem value="Drone">Drone</SelectItem>
                <SelectItem value="Iluminat">Iluminat</SelectItem>
                <SelectItem value="Audio">Audio</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Sortează după" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">Relevanță</SelectItem>
                <SelectItem value="price-low">Preț: mic la mare</SelectItem>
                <SelectItem value="price-high">Preț: mare la mic</SelectItem>
                <SelectItem value="rating">Rating</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">
            {filteredGear.length} echipamente găsite
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredGear.map((gear) => (
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

        {filteredGear.length === 0 && (
          <div className="text-center py-12">
            <h3 className="text-xl font-semibold mb-2">Nu am găsit echipamente</h3>
            <p className="text-muted-foreground mb-4">Încearcă să modifici criteriile de căutare</p>
            <Button onClick={() => {
              setSearchQuery('');
              setSelectedLocation('all');
              setSelectedCategory('all');
            }}>
              Resetează filtrele
            </Button>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};
