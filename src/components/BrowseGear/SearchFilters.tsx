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
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 mb-6 sm:mb-8 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-blue-100/50 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className="p-2 sm:p-2.5 bg-blue-500 rounded-lg shadow-sm">
            <Filter className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-800">Filtrează echipamentele</h3>
            <p className="text-xs sm:text-sm text-gray-600">Găsește exact ce cauți</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6">
        {/* Search Bar */}
        <div className="mb-6 sm:mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-2 sm:mb-3">
            <Search className="h-3 w-3 sm:h-4 sm:w-4 inline mr-2 text-blue-500" />
            Caută echipament
          </label>
          <div className="relative">
            <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 sm:h-5 sm:w-5" />
            <Input
              placeholder="Canon EOS R5, Sony A7III, DJI Mavic..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 sm:pl-12 h-10 sm:h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 bg-white rounded-lg shadow-sm text-sm sm:text-base"
            />
          </div>
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 sm:mb-3">
              <MapPin className="h-3 w-3 sm:h-4 sm:w-4 inline mr-2 text-blue-500" />
              Locație
            </label>
            <LocationDetector
              onLocationChange={onLocationChange}
              currentLocation={selectedLocation === 'all' ? '' : selectedLocation}
              className="w-full"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 sm:mb-3">
              <Tag className="h-3 w-3 sm:h-4 sm:w-4 inline mr-2 text-blue-500" />
              Categorie
            </label>
            <Select value={selectedCategory} onValueChange={onCategoryChange}>
              <SelectTrigger className="h-10 sm:h-11 border-gray-200 focus:border-blue-500 bg-white rounded-lg text-sm">
                <SelectValue placeholder="Toate categoriile" />
              </SelectTrigger>
              <SelectContent className="bg-white z-50 rounded-lg shadow-xl border border-gray-200">
                <SelectItem value="all">Toate categoriile</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.slug}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sort */}
          <div className="sm:col-span-2 lg:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-2 sm:mb-3">
              <SortAsc className="h-3 w-3 sm:h-4 sm:w-4 inline mr-2 text-blue-500" />
              Sortează după
            </label>
            <Select value={sortBy} onValueChange={onSortChange}>
              <SelectTrigger className="h-10 sm:h-11 border-gray-200 focus:border-blue-500 bg-white rounded-lg text-sm">
                <SelectValue placeholder="Sortează după" />
              </SelectTrigger>
              <SelectContent className="bg-white z-50 rounded-lg shadow-xl border border-gray-200">
                <SelectItem value="relevance">Relevanță</SelectItem>
                <SelectItem value="price-low">Preț: mic la mare</SelectItem>
                <SelectItem value="price-high">Preț: mare la mic</SelectItem>
                <SelectItem value="rating">Cel mai recent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
};
