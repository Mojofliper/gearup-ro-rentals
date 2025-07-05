
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

const romanianCounties = [
  'Alba', 'Arad', 'Argeș', 'Bacău', 'Bihor', 'Bistrița-Năsăud', 'Botoșani', 'Brăila', 'Brașov', 
  'București', 'Buzău', 'Călărași', 'Caraș-Severin', 'Cluj', 'Constanța', 'Covasna', 'Dâmbovița', 
  'Dolj', 'Galați', 'Giurgiu', 'Gorj', 'Harghita', 'Hunedoara', 'Ialomița', 'Iași', 'Ilfov', 
  'Maramureș', 'Mehedinți', 'Mureș', 'Neamț', 'Olt', 'Prahova', 'Sălaj', 'Satu Mare', 'Sibiu', 
  'Suceava', 'Teleorman', 'Timiș', 'Tulcea', 'Vâlcea', 'Vaslui', 'Vrancea'
];

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
    <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-blue-100/50 mb-10 overflow-hidden">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-50 to-blue-100/50 px-8 py-6 border-b border-blue-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-500 rounded-xl shadow-lg">
              <Filter className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Filtrează echipamentele</h3>
              <p className="text-sm text-gray-600">Găsește exact ce cauți</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Filters */}
      <div className="p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
          {/* Search Bar - Takes more space */}
          <div className="lg:col-span-5">
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              <Search className="h-4 w-4 mr-2 text-blue-500" />
              Caută echipament
            </label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                placeholder="Canon EOS R5, Sony A7III, DJI Mavic..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-12 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 bg-white rounded-xl shadow-sm"
              />
            </div>
          </div>
          
          {/* Location Filter */}
          <div className="lg:col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              <MapPin className="h-4 w-4 mr-2 text-blue-500" />
              Locație
            </label>
            <LocationDetector
              onLocationChange={onLocationChange}
              currentLocation={selectedLocation === 'all' ? '' : selectedLocation}
              className="h-12 border-gray-200 focus:border-blue-500 bg-white rounded-xl shadow-sm"
            />
          </div>

          {/* Category Filter */}
          <div className="lg:col-span-4">
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              <Tag className="h-4 w-4 mr-2 text-blue-500" />
              Categorie
            </label>
            <Select value={selectedCategory} onValueChange={onCategoryChange}>
              <SelectTrigger className="h-12 border-gray-200 focus:border-blue-500 bg-white rounded-xl shadow-sm">
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
        </div>
        
        {/* Sort Section */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-100">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700 flex items-center">
              <SortAsc className="h-4 w-4 mr-2 text-blue-500" />
              Sortează după
            </label>
            <Select value={sortBy} onValueChange={onSortChange}>
              <SelectTrigger className="w-56 h-10 border-gray-200 focus:border-blue-500 bg-white rounded-lg shadow-sm">
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
          
          <div className="hidden sm:flex items-center text-xs text-gray-500 bg-blue-50 px-3 py-2 rounded-lg">
            <span className="font-medium">Tip:</span>
            <span className="ml-1">Folosește filtrele pentru rezultate mai precise</span>
          </div>
        </div>
      </div>
    </div>
  );
};
