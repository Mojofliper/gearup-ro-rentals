
import React, { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Search, Filter, Star, MapPin, Camera, Zap } from 'lucide-react';
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            Descoperă echipamentul perfect
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Găsește echipamentul de care ai nevoie pentru următorul tău proiect creativ
          </p>
        </div>

        {/* Search & Filters */}
        <div className="bg-white/80 backdrop-blur rounded-2xl shadow-xl p-8 mb-12 border border-white/20">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
              <Input
                placeholder="Caută echipament..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 bg-white"
              />
            </div>
            
            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger className="border-slate-200 focus:border-blue-500 bg-white">
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
              <SelectTrigger className="border-slate-200 focus:border-blue-500 bg-white">
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
              <SelectTrigger className="border-slate-200 focus:border-blue-500 bg-white">
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

        {/* Results Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">
              {filteredGear.length} echipamente găsite
            </h2>
            <p className="text-slate-600 mt-1">Echipament profesional de la creatori verificați</p>
          </div>
          <div className="flex items-center space-x-2 text-sm text-slate-500">
            <Filter className="h-4 w-4" />
            <span>Filtrează rezultatele</span>
          </div>
        </div>

        {/* Results Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredGear.map((gear) => (
            <Card key={gear.id} className="group hover:shadow-2xl transition-all duration-300 border-0 bg-white/80 backdrop-blur overflow-hidden">
              <div className="relative overflow-hidden">
                <img
                  src={gear.image}
                  alt={gear.name}
                  className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3">
                  <Badge variant="secondary" className="bg-white/90 text-slate-700 shadow-sm">
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
                  <h3 className="font-bold text-lg text-slate-800 group-hover:text-blue-600 transition-colors">
                    {gear.name}
                  </h3>
                  <div className="flex items-center space-x-1 bg-yellow-50 px-2 py-1 rounded-full">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <span className="text-xs font-medium text-yellow-700">{gear.rating}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 mb-4">
                  <Avatar className="h-7 w-7 ring-2 ring-blue-100">
                    <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                      {gear.owner.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-slate-600 font-medium">{gear.owner}</span>
                </div>

                <div className="flex items-center space-x-1 mb-4">
                  <MapPin className="h-4 w-4 text-slate-400" />
                  <span className="text-sm text-slate-600">{gear.location}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-2xl font-bold text-slate-800">{gear.price} RON</span>
                    <span className="text-sm text-slate-500 ml-1">/zi</span>
                  </div>
                  <Link to={`/gear/${gear.id}`}>
                    <Button 
                      size="sm" 
                      disabled={!gear.available}
                      className={gear.available 
                        ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg" 
                        : "bg-slate-200 text-slate-500"
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

                <div className="text-xs text-slate-500 mt-3 flex items-center">
                  <span>{gear.reviews} recenzii</span>
                  <span className="mx-2">•</span>
                  <span>Verificat</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {filteredGear.length === 0 && (
          <div className="text-center py-16">
            <div className="bg-white/80 backdrop-blur rounded-2xl shadow-xl p-12 max-w-md mx-auto">
              <Camera className="h-16 w-16 text-slate-300 mx-auto mb-6" />
              <h3 className="text-2xl font-bold text-slate-800 mb-3">Nu am găsit echipamente</h3>
              <p className="text-slate-600 mb-6">Încearcă să modifici criteriile de căutare sau explorează alte categorii</p>
              <Button 
                onClick={() => {
                  setSearchQuery('');
                  setSelectedLocation('all');
                  setSelectedCategory('all');
                }}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
              >
                Resetează filtrele
              </Button>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};
