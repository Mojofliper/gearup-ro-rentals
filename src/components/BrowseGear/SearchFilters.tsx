
import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, MapPin, Tag, SortAsc } from 'lucide-react';
import { useCategories } from '@/hooks/useCategories';
import { LocationDetector } from '../LocationDetector';

interface SearchFiltersProps {
  searchQuery: string;
  selectedLocation: string;
  selectedCategory: string;
  sortBy: string;
  onSearchChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onSortChange: (value: string) => void;
}

export const SearchFilters: React.FC<SearchFiltersProps> = ({
  searchQuery,
  selectedLocation,
  selectedCategory,
  sortBy,
  onSearchChange,
  onLocationChange,
  onCategoryChange,
  onSortChange,
}) => {
  const { data: categories = [] } = useCategories();

  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-blue-100/60 mb-8 overflow-hidden">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-50/80 to-blue-100/60 px-6 py-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-500 rounded-lg shadow-md">
            <Filter className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-800">Filtrează echipamentele</h3>
            <p className="text-xs text-gray-600">Găsește exact ce cauți</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-6">
        {/* Primary Search Bar */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center">
            <Search className="h-4 w-4 mr-2 text-blue-500" />
            Caută echipament
          </label>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              placeholder="Canon EOS R5, Sony A7III, DJI Mavic..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-12 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 bg-white rounded-xl shadow-sm text-base"
            />
          </div>
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Location Filter */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700 flex items-center mb-3">
              <MapPin className="h-4 w-4 mr-2 text-blue-500" />
              Locație
            </label>
            <LocationDetector
              onLocationChange={onLocationChange}
              currentLocation={selectedLocation === 'all' ? '' : selectedLocation}
              className="w-full"
            />
          </div>

          {/* Category Filter */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700 flex items-center mb-3">
              <Tag className="h-4 w-4 mr-2 text-blue-500" />
              Categorie
            </label>
            <Select value={selectedCategory} onValueChange={onCategoryChange}>
              <SelectTrigger className="h-11 border-gray-200 focus:border-blue-500 bg-white rounded-lg shadow-sm">
                <SelectValue placeholder="Toate categoriile" />
              </SelectTrigger>
              <SelectContent className="bg-white z-50 rounded-xl shadow-xl border border-gray-200">
                <SelectItem value="all" className="rounded-lg">Toate categoriile</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.slug} className="rounded-lg">
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sort Filter */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700 flex items-center mb-3">
              <SortAsc className="h-4 w-4 mr-2 text-blue-500" />
              Sortează după
            </label>
            <Select value={sortBy} onValueChange={onSortChange}>
              <SelectTrigger className="h-11 border-gray-200 focus:border-blue-500 bg-white rounded-lg shadow-sm">
                <SelectValue placeholder="Sortează după" />
              </SelectTrigger>
              <SelectContent className="bg-white z-50 rounded-xl shadow-xl border border-gray-200">
                <SelectItem value="relevance" className="rounded-lg">Relevanță</SelectItem>
                <SelectItem value="price-low" className="rounded-lg">Preț: mic la mare</SelectItem>
                <SelectItem value="price-high" className="rounded-lg">Preț: mare la mic</SelectItem>
                <SelectItem value="rating" className="rounded-lg">Cel mai recent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Help Text */}
        <div className="flex justify-center">
          <div className="inline-flex items-center text-xs text-gray-500 bg-blue-50/70 px-4 py-2 rounded-full">
            <span className="font-medium text-blue-600">Tip:</span>
            <span className="ml-1">Folosește filtrele pentru rezultate mai precise</span>
          </div>
        </div>
      </div>
    </div>
  );
};
