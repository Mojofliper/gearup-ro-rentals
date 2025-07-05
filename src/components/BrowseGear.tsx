import React, { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Camera, Filter, Loader2 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { SearchFilters } from './BrowseGear/SearchFilters';
import { GearCard } from './BrowseGear/GearCard';
import { useGearList } from '@/hooks/useGear';
import { RentOfferToggle } from './RentOfferToggle';

export const BrowseGear: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [selectedLocation, setSelectedLocation] = useState(searchParams.get('location') || 'all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('relevance');

  const { data: gear = [], isLoading, error } = useGearList({
    search: searchQuery,
    category: selectedCategory,
    location: selectedLocation,
    sortBy,
  });

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
          <div className="mt-10">
            <RentOfferToggle />
          </div>
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
              {isLoading ? 'Se încarcă...' : `${gear.length} echipament${gear.length !== 1 ? 'e' : ''} găsit${gear.length !== 1 ? 'e' : ''}`}
            </h2>
            <p className="text-gray-600 mt-1">Echipament profesional de la creatori verificați</p>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <Filter className="h-4 w-4" />
            <span>Filtrează rezultatele</span>
          </div>
        </div>

        {/* Content area with loading state */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex items-center space-x-3">
              <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
              <span className="text-lg text-gray-600">Se încarcă echipamentele...</span>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <div className="bg-white rounded-2xl shadow-xl p-12 max-w-md mx-auto">
              <h3 className="text-2xl font-bold text-gray-800 mb-3">Oops! Ceva nu a mers bine</h3>
              <p className="text-gray-600">Nu am putut încărca echipamentele. Te rugăm să încerci din nou.</p>
            </div>
          </div>
        ) : gear.length === 0 ? (
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
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {gear.map((item: any) => (
              <GearCard key={item.id} gear={item} />
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};
