import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type BookingInsert = Database['public']['Tables']['bookings']['Insert'];
type BookingUpdate = Database['public']['Tables']['bookings']['Update'];

export const useCreateBooking = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (booking: BookingInsert) => {
      const { data, error } = await supabase
        .from('bookings')
        .insert(booking)
        .select(`
          *,
          gear:gear(*),
          owner:profiles!bookings_owner_id_fkey(*),
          renter:profiles!bookings_renter_id_fkey(*)
        `)
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['owner-bookings'] });
    },
  });
};

export const useUpdateBooking = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: BookingUpdate }) => {
      const { data, error } = await supabase
        .from('bookings')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          gear:gear(*),
          owner:profiles!bookings_owner_id_fkey(*),
          renter:profiles!bookings_renter_id_fkey(*)
        `)
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['owner-bookings'] });
    },
  });
};

export const useOwnerBookings = () => {
  const { data: userData } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });
  
  return useQuery({
    queryKey: ['owner-bookings', userData?.id],
    queryFn: async () => {
      if (!userData) return [];
      
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          gear:gear(*),
          renter:profiles!bookings_renter_id_fkey(*)
        `)
        .eq('owner_id', userData.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!userData,
  });
};