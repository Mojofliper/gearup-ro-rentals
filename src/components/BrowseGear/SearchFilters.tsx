
import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';

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
  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 mb-8 border border-gray-100">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-2 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <Input
            placeholder="Caută echipament..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 border-gray-200 focus:border-purple-500 focus:ring-purple-500/20 bg-white"
          />
        </div>
        
        <Select value={selectedLocation} onValueChange={onLocationChange}>
          <SelectTrigger className="border-gray-200 focus:border-purple-500 bg-white">
            <SelectValue placeholder="Toate orașele" />
          </SelectTrigger>
          <SelectContent className="bg-white z-50">
            <SelectItem value="all">Toate orașele</SelectItem>
            <SelectItem value="bucuresti">București</SelectItem>
            <SelectItem value="cluj-napoca">Cluj-Napoca</SelectItem>
            <SelectItem value="timisoara">Timișoara</SelectItem>
            <SelectItem value="iasi">Iași</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedCategory} onValueChange={onCategoryChange}>
          <SelectTrigger className="border-gray-200 focus:border-purple-500 bg-white">
            <SelectValue placeholder="Toate categoriile" />
          </SelectTrigger>
          <SelectContent className="bg-white z-50">
            <SelectItem value="all">Toate categoriile</SelectItem>
            <SelectItem value="Camere foto">Camere foto</SelectItem>
            <SelectItem value="Obiective">Obiective</SelectItem>
            <SelectItem value="Drone">Drone</SelectItem>
            <SelectItem value="Iluminat">Iluminat</SelectItem>
            <SelectItem value="Audio">Audio</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="mt-4">
        <Select value={sortBy} onValueChange={onSortChange}>
          <SelectTrigger className="w-full md:w-48 border-gray-200 focus:border-purple-500 bg-white">
            <SelectValue placeholder="Sortează după" />
          </SelectTrigger>
          <SelectContent className="bg-white z-50">
            <SelectItem value="relevance">Relevanță</SelectItem>
            <SelectItem value="price-low">Preț: mic la mare</SelectItem>
            <SelectItem value="price-high">Preț: mare la mic</SelectItem>
            <SelectItem value="rating">Rating</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
