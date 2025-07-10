import React, { useState, useMemo, useCallback } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Camera, 
  Filter, 
  Plus, 
  Search, 
  MapPin, 
  Grid3X3, 
  List, 
  SlidersHorizontal,
  X,
  Sparkles,
  TrendingUp,
  Star,
  Clock,
  Shield,
  Zap,
  Heart,
  Share2,
  Bookmark,
  Eye,
  FilterX
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { SearchFilters } from './BrowseGear/SearchFilters';
import { GearCard } from './GearCard';
import { useAllGear } from '@/hooks/useGear';
import { RentOfferToggle } from './RentOfferToggle';
import { ErrorBoundary } from './ErrorBoundary';
import { GridSkeleton } from './LoadingSkeleton';
import { AdvancedSearchFilters, SearchFilters as AdvancedSearchFiltersType } from './BrowseGear/AdvancedSearchFilters';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useCategories } from '@/hooks/useCategories';

const defaultFilters: AdvancedSearchFiltersType = {
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
  dateRange: { start: '', end: '' },
  features: [],
  brand: '',
  model: ''
};

// Copy Gear type from GearCard for local use
// (If Gear type is exported, import it instead)
type Gear = {
  id: string;
  title: string;
  description?: string;
  price_per_day: number;
  deposit_amount: number;
  status: string;
  pickup_location?: string;
  categories?: { name: string; slug: string } | null;
  gear_photos?: Array<{ photo_url: string }>;
  users?: { full_name: string; rating: number; total_reviews: number; is_verified?: boolean } | null;
  created_at?: string;
};

export const BrowseGear: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState<AdvancedSearchFiltersType>({
    ...defaultFilters,
    search: searchParams.get('search') || '',
    location: searchParams.get('location') || 'all',
  });
  // Remove advanced filter state and logic
  // const [showAdvanced, setShowAdvanced] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [quickSearch, setQuickSearch] = useState('');

  // Explicitly type gear as Gear[]
  const { data: gear = [], isLoading, error } = useAllGear() as { data: Gear[]; isLoading: boolean; error: any };
  const { data: categories = [] } = useCategories();

  // Memoized filtered gear
  const filteredGear = useMemo(() => {
    let filtered = gear;

    // Quick search filter
    if (quickSearch.trim()) {
      const searchLower = quickSearch.toLowerCase();
      filtered = filtered.filter(item => 
        (item.title?.toLowerCase() || '').includes(searchLower) ||
        (item.description?.toLowerCase() || '').includes(searchLower) ||
        (item.categories?.name?.toLowerCase() || '').includes(searchLower)
      );
    }

    // Apply advanced filters
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(item => 
        (item.title?.toLowerCase() || '').includes(searchLower) ||
        (item.description?.toLowerCase() || '').includes(searchLower)
      );
    }

    if (filters.category && filters.category !== 'all') {
      filtered = filtered.filter(item => 
        item.categories?.slug === filters.category
      );
    }

    if (filters.minPrice > 0 || filters.maxPrice < 1000) {
      filtered = filtered.filter(item => {
        const price = typeof item.price_per_day === 'number' ? (item.price_per_day > 1000 ? item.price_per_day / 100 : item.price_per_day) : 0;
        return price >= filters.minPrice && price <= filters.maxPrice;
      });
    }

    if (filters.location && filters.location !== 'all') {
      filtered = filtered.filter(item => 
        (item.pickup_location?.toLowerCase() || '').includes(filters.location.toLowerCase())
      );
    }

    // Sort results
    switch (filters.sortBy) {
      case 'price-low':
        filtered.sort((a, b) => {
          const priceA = typeof a.price_per_day === 'number' ? (a.price_per_day > 1000 ? a.price_per_day / 100 : a.price_per_day) : 0;
          const priceB = typeof b.price_per_day === 'number' ? (b.price_per_day > 1000 ? b.price_per_day / 100 : b.price_per_day) : 0;
          return priceA - priceB;
        });
        break;
      case 'price-high':
        filtered.sort((a, b) => {
          const priceA = typeof a.price_per_day === 'number' ? (a.price_per_day > 1000 ? a.price_per_day / 100 : a.price_per_day) : 0;
          const priceB = typeof b.price_per_day === 'number' ? (b.price_per_day > 1000 ? b.price_per_day / 100 : b.price_per_day) : 0;
          return priceB - priceA;
        });
        break;
      case 'rating':
        filtered.sort((a, b) => ((b.users?.rating || 0) - (a.users?.rating || 0)));
        break;
      default:
        // Sort by created_at (newest first)
        filtered.sort((a, b) => {
          const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return dateB - dateA;
        });
    }

    return filtered;
  }, [gear, filters, quickSearch]);

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    return [
      filters.search,
      filters.category && filters.category !== 'all',
    filters.minPrice > 0 || filters.maxPrice < 1000,
      filters.location && filters.location !== 'all',
      filters.condition.length > 0,
      filters.features.length > 0,
      filters.availability.length > 0,
    filters.rating > 0,
    filters.brand,
      filters.model,
      filters.dateRange.start || filters.dateRange.end
  ].filter(Boolean).length;
  }, [filters]);

  // Handle filter changes
  const handleBasicFilterChange = useCallback((key: keyof AdvancedSearchFiltersType, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleAdvancedFiltersChange = useCallback((newFilters: AdvancedSearchFiltersType) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(defaultFilters);
    setQuickSearch('');
  }, []);

  const clearQuickSearch = useCallback(() => {
    setQuickSearch('');
  }, []);

  // Featured gear (first 4 items)
  const featuredGear = useMemo(() => filteredGear.slice(0, 4), [filteredGear]);
  const regularGear = useMemo(() => filteredGear.slice(4), [filteredGear]);

  // Mobile: sticky top bar with search and filter icon
  const MobileTopBar = () => (
    <div className="block sm:hidden sticky top-0 z-30 bg-white border-b border-gray-100 shadow-sm px-2 py-2 flex items-center gap-2">
      <div className="flex-1">
        <Input
          placeholder="Caută echipament, brand, model..."
          value={quickSearch}
          onChange={e => setQuickSearch(e.target.value)}
          className="h-11 rounded-lg text-base bg-white border border-gray-200 shadow-sm"
        />
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="ml-1"
        aria-label="Filtre avansate"
        onClick={() => setShowMobileFilters(true)}
      >
        <SlidersHorizontal className="h-6 w-6 text-blue-600" />
      </Button>
    </div>
  );

  // Mobile: filter modal
  const MobileFilterSheet = () => (
    <Sheet open={showMobileFilters} onOpenChange={setShowMobileFilters}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-2xl p-4">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5" />
            Filtre avansate
          </SheetTitle>
        </SheetHeader>
        <div className="py-2">
          <SearchFilters
            searchQuery={filters.search}
            selectedLocation={filters.location}
            selectedCategory={filters.category}
            sortBy={filters.sortBy}
            onSearchChange={v => setFilters(prev => ({ ...prev, search: v }))}
            onLocationChange={v => setFilters(prev => ({ ...prev, location: v }))}
            onCategoryChange={v => setFilters(prev => ({ ...prev, category: v }))}
            onSortChange={v => setFilters(prev => ({ ...prev, sortBy: v }))}
          />
          <div className="flex gap-3 mt-4">
            <Button variant="outline" onClick={() => setFilters(defaultFilters)} className="flex-1">
              Resetează
            </Button>
            <Button onClick={() => setShowMobileFilters(false)} className="flex-1">
              Aplică filtrele
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-gray-100">
        <Header />
        {/* Mobile: sticky top bar */}
        <MobileTopBar />
        <MobileFilterSheet />
        {/* Mobile: headline and toggle */}
        <div className="block sm:hidden px-4 pt-4 pb-2">
          <h1 className="text-xl font-bold text-gray-900 mb-2 leading-tight text-center">
            Găsește echipamentul
            <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">perfect pentru proiectul tău</span>
            </h1>
          <div className="flex flex-col gap-2 mt-4">
            <Button className="w-full text-base font-semibold bg-blue-700 hover:bg-blue-800 text-white shadow rounded-xl py-3">Închiriază echipament</Button>
            <Button variant="outline" className="w-full text-base font-semibold border-gray-300 text-blue-700 shadow rounded-xl py-3">Oferă spre închiriere</Button>
          </div>
        </div>
        {/* Desktop: hero and filters */}
        <div className="hidden sm:block relative overflow-hidden bg-white border-b border-gray-100 shadow-sm">
          <div className="relative container mx-auto px-4 py-16 lg:py-20">
            <div className="text-center max-w-4xl mx-auto">
              <h1 className="text-4xl lg:text-5xl xl:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                Găsește echipamentul
                <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  perfect pentru proiectul tău
                </span>
              </h1>
              <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
                Închiriază echipament profesional de la creatori verificați.
              </p>
              <div className="w-full max-w-3xl mx-auto mb-8">
              <SearchFilters 
                searchQuery={filters.search} 
                selectedLocation={filters.location} 
                selectedCategory={filters.category} 
                sortBy={filters.sortBy} 
                  onSearchChange={v => setFilters(prev => ({ ...prev, search: v }))} 
                  onLocationChange={v => setFilters(prev => ({ ...prev, location: v }))} 
                  onCategoryChange={v => setFilters(prev => ({ ...prev, category: v }))} 
                  onSortChange={v => setFilters(prev => ({ ...prev, sortBy: v }))} 
              />
            </div>
              <RentOfferToggle />
            </div>
          </div>
        </div>
        {/* Results */}
        <div id="gear-results" className="container mx-auto px-0 sm:px-4 py-2 sm:py-8">
          {/* Results Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 sm:mb-6 gap-4 px-2 sm:px-0">
            <div>
              <h2 className="text-lg sm:text-3xl font-bold text-gray-900 mb-2">
                {isLoading ? 'Se încarcă...' : `${filteredGear.length} echipament${filteredGear.length !== 1 ? 'e' : ''} găsit${filteredGear.length !== 1 ? 'e' : ''}`}
              </h2>
            </div>
          </div>
          {/* Content */}
          {isLoading ? (
            <GridSkeleton count={12} columns={1} />
          ) : error ? (
            <Card className="text-center py-16">
              <CardContent>
                <div className="max-w-md mx-auto">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Camera className="h-8 w-8 text-red-500" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Oops! Ceva nu a mers bine</h3>
                  <p className="text-gray-600 mb-6">Nu am putut încărca echipamentele. Te rugăm să încerci din nou.</p>
                  <Button onClick={() => window.location.reload()}>
                    Încearcă din nou
                  </Button>
              </div>
              </CardContent>
            </Card>
          ) : filteredGear.length === 0 ? (
            <Card className="text-center py-16">
              <CardContent>
                <div className="max-w-md mx-auto">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Camera className="h-8 w-8 text-gray-400" />
            </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Nu am găsit echipamente</h3>
                  <p className="text-gray-600 mb-6">
                    {quickSearch || filters.search 
                      ? 'Încearcă să modifici criteriile de căutare sau explorează alte categorii'
                      : 'Nu există echipamente disponibile momentan. Încearcă din nou mai târziu.'
                    }
                  </p>
                  <div className="flex gap-3 justify-center">
                    <Button variant="outline" onClick={() => setFilters(defaultFilters)}>
                  Resetează filtrele
                </Button>
                    <Button onClick={() => window.location.href = '/add-gear'}>
                      Adaugă echipament
                    </Button>
              </div>
            </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              {/* Mobile: show all gear in regular section */}
              <div className="block sm:hidden">
                <div className="grid grid-cols-1 gap-4">
                  {filteredGear.map((item: Gear) => (
                    <GearCard 
                      key={item.id} 
                      gear={item}
                      variant={viewMode === 'list' ? 'compact' : 'default'}
                      onViewDetails={(gearId) => {
                        window.location.href = `/gear/${gearId}`;
                      }}
                      onBookNow={(gearId) => {
                        window.location.href = `/gear/${gearId}?book=true`;
                      }}
                    />
                  ))}
                </div>
              </div>
              {/* Desktop: featured/regular split */}
              <div className="hidden sm:block">
                {/* Featured Section */}
                {featuredGear.length > 0 && (
                  <div>
                    <div className="flex items-center gap-3 mb-4 sm:mb-6 px-2 sm:px-0">
                      <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
                      <h3 className="text-lg sm:text-xl font-bold text-gray-900">Echipamente recomandate</h3>
                      <Badge variant="secondary" className="bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        Popular
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fit,minmax(420px,1fr))] gap-4 sm:gap-6">
                      {featuredGear.map((item: Gear) => (
                        <GearCard 
                          key={item.id} 
                          gear={item}
                          variant="featured"
                          onViewDetails={(gearId) => {
                            window.location.href = `/gear/${gearId}`;
                          }}
                          onBookNow={(gearId) => {
                            window.location.href = `/gear/${gearId}?book=true`;
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {/* Regular Gear Section */}
                {regularGear.length > 0 && (
                  <div>
                    {featuredGear.length > 0 && (
                      <div className="hidden sm:flex items-center gap-3 mb-4 sm:mb-6 px-2 sm:px-0">
                        <div className="w-1 h-6 bg-gradient-to-b from-gray-400 to-gray-500 rounded-full"></div>
                        <h3 className="text-lg sm:text-xl font-bold text-gray-900">Toate echipamentele</h3>
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fit,minmax(420px,1fr))] gap-4 sm:gap-6">
                      {regularGear.map((item: Gear) => (
                <GearCard 
                          key={item.id} 
                          gear={item}
                          variant={viewMode === 'list' ? 'compact' : 'default'}
                  onViewDetails={(gearId) => {
                    window.location.href = `/gear/${gearId}`;
                  }}
                  onBookNow={(gearId) => {
                    window.location.href = `/gear/${gearId}?book=true`;
                  }}
                />
              ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
          {/* Floating Add Gear Button */}
          <Button 
          className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-xl rounded-full p-0 h-14 w-14 flex items-center justify-center text-3xl transition-all duration-300 hover:scale-110"
            onClick={() => window.location.href = '/add-gear'}
            aria-label="Adaugă echipament"
          >
            <Plus className="h-8 w-8" />
          </Button>
        <Footer />
      </div>
    </ErrorBoundary>
  );
};
