import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type Gear = Database['public']['Tables']['gear']['Row'];
type GearInsert = Database['public']['Tables']['gear']['Insert'];

export const useGear = (id?: string) => {
  return useQuery({
    queryKey: ['gear', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('gear')
        .select(`
          *,
          owner:profiles(*),
          category:categories(*)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
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
  return useQuery({
    queryKey: ['gear', 'list', filters],
    queryFn: async () => {
      console.log('Fetching gear with filters:', filters);
      
      let query = supabase
        .from('gear')
        .select(`
          *,
          owner:profiles(*),
          category:categories(*)
        `)
        .eq('is_available', true);

      if (filters?.search) {
        // Escape special characters for LIKE queries
        const safeSearch = filters.search.replace(/[%_]/g, '\\$&');
        query = query.or(`name.ilike.%${safeSearch}%,description.ilike.%${safeSearch}%`);
      }

      if (filters?.category && filters.category !== 'all') {
        // Filter by category using category_id directly
        const { data: categoryData } = await supabase
          .from('categories')
          .select('id')
          .eq('slug', filters.category)
          .single();
        
        if (categoryData) {
          query = query.eq('category_id', categoryData.id);
        }
      }

      if (filters?.location && filters.location !== 'all') {
        // We need to filter by the owner's location
        // First get profile IDs for the location
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id')
          .eq('location', filters.location);
        
        if (profileData && profileData.length > 0) {
          const profileIds = profileData.map(p => p.id);
          query = query.in('owner_id', profileIds);
        } else {
          // If no profiles found for this location, return empty array
          return [];
        }
      }

      if (filters?.sortBy) {
        switch (filters.sortBy) {
          case 'price-low':
            query = query.order('price_per_day', { ascending: true });
            break;
          case 'price-high':
            query = query.order('price_per_day', { ascending: false });
            break;
          case 'rating':
            query = query.order('created_at', { ascending: false });
            break;
          default:
            query = query.order('created_at', { ascending: false });
        }
      } else {
        query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query;
      
      console.log('Query result:', { data, error });
      
      if (error) {
        console.error('Query error:', error);
        throw error;
      }
      
      return data || [];
    },
  });
};

export const useCreateGear = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (gear: GearInsert) => {
      const { data, error } = await supabase
        .from('gear')
        .insert(gear)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gear'] });
    },
  });
};

export const useUpdateGear = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Gear> }) => {
      const { data, error } = await supabase
        .from('gear')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['gear'] });
      queryClient.invalidateQueries({ queryKey: ['gear', data.id] });
    },
  });
};
