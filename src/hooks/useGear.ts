
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
        query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      if (filters?.category && filters.category !== 'all') {
        // Join with categories table and filter by slug
        query = query.eq('categories.slug', filters.category);
      }

      if (filters?.location && filters.location !== 'all') {
        // Join with profiles table and filter by location
        query = query.eq('profiles.location', filters.location);
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
