import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Search,
  Filter,
  X,
  MapPin,
  Star,
  Calendar,
  Save,
  Bookmark,
  History,
} from "lucide-react";
import { useCategories } from "@/hooks/useCategories";
import { toast } from "sonner";

interface AdvancedSearchFiltersProps {
  onFiltersChange: (filters: SearchFilters) => void;
  onSearchHistory?: (query: string) => void;
  onSaveSearch?: (search: SavedSearch) => void;
  savedSearches?: SavedSearch[];
}

export interface SearchFilters {
  search: string;
  category: string;
  minPrice: number;
  maxPrice: number;
  location: string;
  condition: string[];
  rating: number;
  availability: string[];
  sortBy: string;
  sortOrder: "asc" | "desc";
  dateRange: {
    start: string;
    end: string;
  };
  features: string[];
  brand: string;
  model: string;
}

export interface SavedSearch {
  id: string;
  name: string;
  filters: SearchFilters;
  createdAt: string;
}

export const AdvancedSearchFilters: React.FC<AdvancedSearchFiltersProps> = ({
  onFiltersChange,
  onSearchHistory,
  onSaveSearch,
  savedSearches = [],
}) => {
  const { data: categories = [] } = useCategories();
  const [filters, setFilters] = useState<SearchFilters>({
    search: "",
    category: "",
    minPrice: 0,
    maxPrice: 1000,
    location: "",
    condition: [],
    rating: 0,
    availability: [],
    sortBy: "created_at",
    sortOrder: "desc",
    dateRange: {
      start: "",
      end: "",
    },
    features: [],
    brand: "",
    model: "",
  });

  const [isExpanded, setIsExpanded] = useState(false);
  const [searchName, setSearchName] = useState("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  // Available conditions
  const conditions = [
    { value: "excellent", label: "Excelent" },
    { value: "very_good", label: "Foarte bun" },
    { value: "good", label: "Bun" },
    { value: "fair", label: "Acceptabil" },
    { value: "poor", label: "Slab" },
  ];

  // Available features
  const features = [
    { value: "warranty", label: "Garanție" },
    { value: "insurance", label: "Asigurare" },
    { value: "delivery", label: "Livrare" },
    { value: "setup", label: "Configurare" },
    { value: "support", label: "Suport tehnic" },
  ];

  // Sort options
  const sortOptions = [
    { value: "created_at", label: "Data adăugării" },
    { value: "price", label: "Preț" },
    { value: "rating", label: "Rating" },
    { value: "reviews", label: "Număr recenzii" },
    { value: "distance", label: "Distanță" },
  ];

  useEffect(() => {
    onFiltersChange(filters);
  }, [filters, onFiltersChange]);

  const handleFilterChange = (key: keyof SearchFilters, value: unknown) => {
    setFilters((prev) => ({
      ...prev,
      [key]: key === "category" && value === "all" ? "" : value,
    }));
  };

  const handleConditionToggle = (condition: string) => {
    setFilters((prev) => ({
      ...prev,
      condition: prev.condition.includes(condition)
        ? prev.condition.filter((c) => c !== condition)
        : [...prev.condition, condition],
    }));
  };

  const handleFeatureToggle = (feature: string) => {
    setFilters((prev) => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter((f) => f !== feature)
        : [...prev.features, feature],
    }));
  };

  const handleAvailabilityToggle = (availability: string) => {
    setFilters((prev) => ({
      ...prev,
      availability: prev.availability.includes(availability)
        ? prev.availability.filter((a) => a !== availability)
        : [...prev.availability, availability],
    }));
  };

  const clearFilters = () => {
    setFilters({
      search: "",
      category: "all",
      minPrice: 0,
      maxPrice: 1000,
      location: "",
      condition: [],
      rating: 0,
      availability: [],
      sortBy: "created_at",
      sortOrder: "desc",
      dateRange: {
        start: "",
        end: "",
      },
      features: [],
      brand: "",
      model: "",
    });
  };

  const saveCurrentSearch = () => {
    if (!searchName.trim()) {
      toast.error("Te rugăm să introduci un nume pentru căutarea salvată");
      return;
    }

    const savedSearch: SavedSearch = {
      id: Date.now().toString(),
      name: searchName,
      filters: { ...filters },
      createdAt: new Date().toISOString(),
    };

    onSaveSearch?.(savedSearch);
    setSearchName("");
    setShowSaveDialog(false);
    toast.success("Căutarea a fost salvată!");
  };

  const loadSavedSearch = (savedSearch: SavedSearch) => {
    setFilters(savedSearch.filters);
    toast.success(`Căutarea "${savedSearch.name}" a fost încărcată`);
  };

  const activeFiltersCount = [
    filters.search,
    filters.category && filters.category !== "all",
    filters.location,
    filters.brand,
    filters.model,
    filters.condition.length,
    filters.features.length,
    filters.availability.length,
    filters.rating > 0,
    filters.minPrice > 0 || filters.maxPrice < 1000,
    filters.dateRange.start || filters.dateRange.end,
  ].filter(Boolean).length;

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Main Search Bar */}
      <Card>
        <CardContent className="pt-4 sm:pt-6">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Caută echipament, brand, model..."
                value={filters.search}
                onChange={(e) => handleFilterChange("search", e.target.value)}
                className="pl-10 h-10 sm:h-11 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-2 text-sm"
              >
                <Filter className="h-4 w-4" />
                <span className="hidden sm:inline">Filtre</span>
                {activeFiltersCount > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
              {activeFiltersCount > 0 && (
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  className="text-sm"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Filters */}
      {isExpanded && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <span className="text-base sm:text-lg">Filtre Avansate</span>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSaveDialog(true)}
                  className="text-xs sm:text-sm"
                >
                  <Save className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  Salvează Căutarea
                </Button>
                {savedSearches.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs sm:text-sm"
                  >
                    <History className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    Căutări Salvate ({savedSearches.length})
                  </Button>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6">
            {/* Basic Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {/* Category */}
              <div>
                <Label className="text-sm">Categorie</Label>
                <Select
                  value={filters.category || "all"}
                  onValueChange={(value) =>
                    handleFilterChange("category", value)
                  }
                >
                  <SelectTrigger className="h-10 sm:h-11 text-sm">
                    <SelectValue placeholder="Toate categoriile" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toate categoriile</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Location */}
              <div>
                <Label className="text-sm">Locație</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Oraș, județ..."
                    value={filters.location}
                    onChange={(e) =>
                      handleFilterChange("location", e.target.value)
                    }
                    className="pl-10 h-10 sm:h-11 text-sm"
                  />
                </div>
              </div>

              {/* Brand */}
              <div>
                <Label className="text-sm">Brand</Label>
                <Input
                  placeholder="ex. Sony, Canon, DJI..."
                  value={filters.brand}
                  onChange={(e) => handleFilterChange("brand", e.target.value)}
                  className="h-10 sm:h-11 text-sm"
                />
              </div>

              {/* Model */}
              <div>
                <Label className="text-sm">Model</Label>
                <Input
                  placeholder="ex. A7 III, EOS R5..."
                  value={filters.model}
                  onChange={(e) => handleFilterChange("model", e.target.value)}
                  className="h-10 sm:h-11 text-sm"
                />
              </div>

              {/* Sort By */}
              <div>
                <Label className="text-sm">Sortează după</Label>
                <Select
                  value={filters.sortBy}
                  onValueChange={(value) => handleFilterChange("sortBy", value)}
                >
                  <SelectTrigger className="h-10 sm:h-11 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sortOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Sort Order */}
              <div>
                <Label className="text-sm">Ordine</Label>
                <Select
                  value={filters.sortOrder}
                  onValueChange={(value: "asc" | "desc") =>
                    handleFilterChange("sortOrder", value)
                  }
                >
                  <SelectTrigger className="h-10 sm:h-11 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">Descrescător</SelectItem>
                    <SelectItem value="asc">Crescător</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Price Range */}
            <div>
              <Label className="text-sm">Interval Preț (RON/zi)</Label>
              <div className="space-y-3 sm:space-y-4">
                <Slider
                  value={[filters.minPrice, filters.maxPrice]}
                  onValueChange={(value) => {
                    handleFilterChange("minPrice", value[0]);
                    handleFilterChange("maxPrice", value[1]);
                  }}
                  max={1000}
                  min={0}
                  step={10}
                  className="w-full"
                />
                <div className="flex justify-between text-xs sm:text-sm text-gray-600">
                  <span>{filters.minPrice} RON</span>
                  <span>{filters.maxPrice} RON</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Rating */}
            <div>
              <Label className="text-sm">Rating minim</Label>
              <div className="flex items-center space-x-2">
                <Star className="h-4 w-4 text-yellow-400" />
                <Slider
                  value={[filters.rating]}
                  onValueChange={(value) =>
                    handleFilterChange("rating", value[0])
                  }
                  max={5}
                  min={0}
                  step={0.5}
                  className="flex-1"
                />
                <span className="text-xs sm:text-sm font-medium">
                  {filters.rating} stele
                </span>
              </div>
            </div>

            <Separator />

            {/* Condition */}
            <div>
              <Label className="text-sm">Stare Echipament</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {conditions.map((condition) => (
                  <Button
                    key={condition.value}
                    variant={
                      filters.condition.includes(condition.value)
                        ? "default"
                        : "outline"
                    }
                    size="sm"
                    onClick={() => handleConditionToggle(condition.value)}
                    className="text-xs sm:text-sm"
                  >
                    {condition.label}
                  </Button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Features */}
            <div>
              <Label className="text-sm">Caracteristici</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {features.map((feature) => (
                  <Button
                    key={feature.value}
                    variant={
                      filters.features.includes(feature.value)
                        ? "default"
                        : "outline"
                    }
                    size="sm"
                    onClick={() => handleFeatureToggle(feature.value)}
                    className="text-xs sm:text-sm"
                  >
                    {feature.label}
                  </Button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Availability */}
            <div>
              <Label className="text-sm">Disponibilitate</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                <Button
                  variant={
                    filters.availability.includes("today")
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  onClick={() => handleAvailabilityToggle("today")}
                  className="text-xs sm:text-sm"
                >
                  <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  Disponibil azi
                </Button>
                <Button
                  variant={
                    filters.availability.includes("weekend")
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  onClick={() => handleAvailabilityToggle("weekend")}
                  className="text-xs sm:text-sm"
                >
                  <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  Weekend
                </Button>
                <Button
                  variant={
                    filters.availability.includes("long_term")
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  onClick={() => handleAvailabilityToggle("long_term")}
                  className="text-xs sm:text-sm"
                >
                  <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  Termen lung
                </Button>
              </div>
            </div>

            <Separator />

            {/* Date Range */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <Label className="text-sm">Data început</Label>
                <Input
                  type="date"
                  value={filters.dateRange.start}
                  onChange={(e) =>
                    handleFilterChange("dateRange", {
                      ...filters.dateRange,
                      start: e.target.value,
                    })
                  }
                  className="h-10 sm:h-11 text-sm"
                />
              </div>
              <div>
                <Label className="text-sm">Data sfârșit</Label>
                <Input
                  type="date"
                  value={filters.dateRange.end}
                  onChange={(e) =>
                    handleFilterChange("dateRange", {
                      ...filters.dateRange,
                      end: e.target.value,
                    })
                  }
                  className="h-10 sm:h-11 text-sm"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Saved Searches */}
      {savedSearches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Bookmark className="h-4 w-4" />
              Căutări Salvate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {savedSearches.map((savedSearch) => (
                <Button
                  key={savedSearch.id}
                  variant="outline"
                  size="sm"
                  onClick={() => loadSavedSearch(savedSearch)}
                  className="text-xs sm:text-sm"
                >
                  {savedSearch.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Save Search Dialog */}
      {showSaveDialog && (
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="space-y-3 sm:space-y-4">
              <div>
                <Label className="text-sm">Nume căutare</Label>
                <Input
                  placeholder="ex. Camere Sony București"
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  className="h-10 sm:h-11 text-sm"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button onClick={saveCurrentSearch} className="text-sm">
                  <Save className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  Salvează
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowSaveDialog(false)}
                  className="text-sm"
                >
                  Anulează
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
