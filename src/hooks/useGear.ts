import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useGearApi } from './useApi';
import { Database } from '@/integrations/supabase/types';

type Gear = Database['public']['Tables']['gear']['Row'];
type GearInsert = Database['public']['Tables']['gear']['Insert'];

export const useGear = (id?: string) => {
  const { getGearItem, loading, error } = useGearApi();
  
  return useQuery({
    queryKey: ['gear', id],
    queryFn: async () => {
      if (!id) return null;
      return await getGearItem(id);
    },
    enabled: !!id,
  });
};

export const useGearList = (filters?: {
  search?: string;
  category?: string;
  location?: string;
  sortBy?: string;
}) => {
  const { getAvailableGear, loading, error } = useGearApi();
  
  return useQuery({
    queryKey: ['gear', 'list', filters],
    queryFn: async () => {
      // Transform filters to match API service format
      const apiFilters = {
        category_id: filters?.category !== 'all' ? filters?.category : undefined,
        location: filters?.location !== 'all' ? filters?.location : undefined,
        search: filters?.search,
        min_price: undefined,
        max_price: undefined,
        condition: undefined
      };
      
      const result = await getAvailableGear(apiFilters);
      
      // Apply sorting if needed (API service handles basic sorting)
      if (filters?.sortBy && result) {
        switch (filters.sortBy) {
          case 'price-low':
            return result.sort((a, b) => a.price_per_day - b.price_per_day);
          case 'price-high':
            return result.sort((a, b) => b.price_per_day - a.price_per_day);
          case 'rating':
            return result.sort((a, b) => {
              const ratingA = (a as any).users?.rating || 0;
              const ratingB = (b as any).users?.rating || 0;
              return ratingB - ratingA;
            });
          default:
            return result;
        }
      }
      
      return result || [];
    },
  });
};

export const useCreateGear = () => {
  const queryClient = useQueryClient();
  const { createGear, loading, error } = useGearApi();
  
  return useMutation({
    mutationFn: async (gear: GearInsert) => {
      return await createGear(gear);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gear'] });
    },
  });
};

export const useUpdateGear = () => {
  const queryClient = useQueryClient();
  const { updateGear, loading, error } = useGearApi();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Gear> }) => {
      return await updateGear(id, updates);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['gear'] });
      queryClient.invalidateQueries({ queryKey: ['gear', data?.id] });
    },
  });
};

export const useDeleteGear = () => {
  const queryClient = useQueryClient();
  const { deleteGear, loading, error } = useGearApi();
  
  return useMutation({
    mutationFn: async (gearId: string) => {
      return await deleteGear(gearId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gear'] });
    },
  });
};

// Categories hooks
export const useCategories = () => {
  const { getAllCategories, loading, error } = useGearApi();
  
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      return await getAllCategories();
    },
  });
};

export const useCategoryBySlug = (slug: string) => {
  const { getCategoryBySlug, loading, error } = useGearApi();
  
  return useQuery({
    queryKey: ['category', slug],
    queryFn: async () => {
      if (!slug) return null;
      return await getCategoryBySlug(slug);
    },
    enabled: !!slug,
  });
};

export const useCreateCategory = () => {
  const queryClient = useQueryClient();
  const { createCategory, loading, error } = useGearApi();
  
  return useMutation({
    mutationFn: async (categoryData: {
      name: string;
      slug: string;
      description?: string;
      icon_name?: string;
    }) => {
      return await createCategory(categoryData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
};

// Search hooks
export const useSearchGear = (filters: any) => {
  const { searchGearWithFilters, loading, error } = useGearApi();
  
  return useQuery({
    queryKey: ['search-gear', filters],
    queryFn: async () => {
      return await searchGearWithFilters(filters);
    },
    enabled: !!filters,
  });
};

export const useSearchByLocation = (location: string) => {
  const { searchByLocation, loading, error } = useGearApi();
  
  return useQuery({
    queryKey: ['search-location', location],
    queryFn: async () => {
      if (!location) return [];
      return await searchByLocation(location);
    },
    enabled: !!location,
  });
};

export const useSearchByBrandModel = (searchTerm: string) => {
  const { searchByBrandModel, loading, error } = useGearApi();
  
  return useQuery({
    queryKey: ['search-brand-model', searchTerm],
    queryFn: async () => {
      if (!searchTerm) return [];
      return await searchByBrandModel(searchTerm);
    },
    enabled: !!searchTerm,
  });
};

export const useFeaturedGear = (limit: number = 10) => {
  const { getFeaturedGear, loading, error } = useGearApi();
  
  return useQuery({
    queryKey: ['featured-gear', limit],
    queryFn: async () => {
      return await getFeaturedGear(limit);
    },
  });
};
