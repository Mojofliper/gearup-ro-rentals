
import React, { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Camera, Filter } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { SearchFilters } from './BrowseGear/SearchFilters';
import { GearCard } from './BrowseGear/GearCard';

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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
            Descoperă echipamentul perfect
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Găsește echipamentul de care ai nevoie pentru următorul tău proiect creativ
          </p>
        </div>

        <SearchFilters
          searchQuery={searchQuery}
          selectedLocation={selectedLocation}
          selectedCategory={selectedCategory}
          sortBy={sortBy}
          onSearchChange={setSearchQuery}
          onLocationChange={setSelectedLocation}
          onCategoryChange={setSelectedCategory}
          onSortChange={setSortBy}
        />

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              {filteredGear.length} echipamente găsite
            </h2>
            <p className="text-gray-600 mt-1">Echipament profesional de la creatori verificați</p>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <Filter className="h-4 w-4" />
            <span>Filtrează rezultatele</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredGear.map((gear) => (
            <GearCard key={gear.id} gear={gear} />
          ))}
        </div>

        {filteredGear.length === 0 && (
          <div className="text-center py-16">
            <div className="bg-white rounded-2xl shadow-xl p-12 max-w-md mx-auto">
              <Camera className="h-16 w-16 text-gray-300 mx-auto mb-6" />
              <h3 className="text-2xl font-bold text-gray-800 mb-3">Nu am găsit echipamente</h3>
              <p className="text-gray-600 mb-6">Încearcă să modifici criteriile de căutare sau explorează alte categorii</p>
              <Button 
                onClick={() => {
                  setSearchQuery('');
                  setSelectedLocation('all');
                  setSelectedCategory('all');
                }}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
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
