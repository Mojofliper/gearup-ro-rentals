import React, { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Camera, Filter, Loader2 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { SearchFilters } from './BrowseGear/SearchFilters';
import { GearCard } from './GearCard';
import { useAllGear } from '@/hooks/useGear';
import { RentOfferToggle } from './RentOfferToggle';
import { ErrorBoundary } from './ErrorBoundary';
import { GridSkeleton } from './LoadingSkeleton';
import { AdvancedSearchFilters, SearchFilters as AdvancedSearchFiltersType } from './BrowseGear/AdvancedSearchFilters';

export const BrowseGear: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [selectedLocation, setSelectedLocation] = useState(searchParams.get('location') || 'all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('relevance');
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedSearchFiltersType>({
    search: '',
    category: '',
    minPrice: 0,
    maxPrice: 1000,
    location: '',
    condition: [],
    rating: 0,
    availability: [],
    sortBy: 'created_at',
    sortOrder: 'desc',
    dateRange: {
      start: '',
      end: ''
    },
    features: [],
    brand: '',
    model: ''
  });

  const {
    data: gear = [],
    isLoading,
    error
  } = useAllGear();

  const handleAdvancedFiltersChange = (filters: AdvancedSearchFiltersType) => {
    setAdvancedFilters(filters);
    // Apply advanced filters to the search
    setSearchQuery(filters.search);
    setSelectedCategory(filters.category || 'all');
    setSortBy(filters.sortBy);
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
      <Header />
      
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent mb-3 sm:mb-4">
            Descoperă echipamentul perfect
          </h1>
          <p className="text-base sm:text-lg lg:text-xl text-gray-600 max-w-2xl mx-auto px-4">Găsește echipamentul de care ai nevoie pentru următorul tău proiect</p>
          <div className="mt-6 sm:mt-10">
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

          {/* Advanced Search Filters */}
          <div className="mb-4 sm:mb-6">
            <AdvancedSearchFilters 
              onFiltersChange={handleAdvancedFiltersChange}
            />
          </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-3 sm:gap-4">
          <div>
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800">
              {isLoading ? 'Se încarcă...' : `${gear.length} echipament${gear.length !== 1 ? 'e' : ''} găsit${gear.length !== 1 ? 'e' : ''}`}
            </h2>
            <p className="text-sm sm:text-base text-gray-600 mt-1">Echipament profesional de la creatori verificați</p>
          </div>
          <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-500">
            <Filter className="h-3 w-3 sm:h-4 sm:w-4" />
            <span>Filtrează rezultatele</span>
          </div>
        </div>

        {/* Content area with loading state */}
          {isLoading ? (
            <GridSkeleton count={8} columns={4} />
          ) : error ? (
            <div className="text-center py-8 sm:py-16">
            <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-12 max-w-md mx-auto">
              <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-3">Oops! Ceva nu a mers bine</h3>
              <p className="text-sm sm:text-base text-gray-600">Nu am putut încărca echipamentele. Te rugăm să încerci din nou.</p>
            </div>
            </div>
          ) : gear.length === 0 ? (
            <div className="text-center py-8 sm:py-16">
            <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-12 max-w-md mx-auto">
              <Camera className="h-12 w-12 sm:h-16 sm:w-16 text-gray-300 mx-auto mb-4 sm:mb-6" />
              <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-3">Nu am găsit echipamente</h3>
              <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">Încearcă să modifici criteriile de căutare sau explorează alte categorii</p>
                <Button 
                  onClick={() => {
            setSearchQuery('');
            setSelectedLocation('all');
            setSelectedCategory('all');
                  }} 
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white w-full sm:w-auto"
                >
                Resetează filtrele
              </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {gear.map((item: Record<string, unknown>) => (
                <GearCard 
                  key={item.id as string} 
                  gear={item}
                  onViewDetails={(gearId) => {
                    // Navigate to gear detail page
                    window.location.href = `/gear/${gearId}`;
                  }}
                  onBookNow={(gearId) => {
                    // Open booking modal or navigate to booking page
                    window.location.href = `/gear/${gearId}?book=true`;
                  }}
                />
              ))}
            </div>
          )}
      </div>

      <Footer />
      </div>
    </ErrorBoundary>
  );
};
