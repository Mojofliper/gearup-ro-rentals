import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBookingApi } from './useApi';
import { useAuth } from '@/contexts/AuthContext';
import { Database } from '@/integrations/supabase/types';

type Booking = Database['public']['Tables']['bookings']['Row'];
type BookingInsert = Database['public']['Tables']['bookings']['Insert'];

export const useUserBookings = () => {
  const { user } = useAuth();
  const { getUserBookings, loading, error } = useBookingApi();
  
  return useQuery({
    queryKey: ['bookings', 'user', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return await getUserBookings(user.id);
    },
    enabled: !!user?.id,
  });
};

export const useCreateBooking = () => {
  const queryClient = useQueryClient();
  const { createBooking, loading, error } = useBookingApi();
  
  return useMutation({
    mutationFn: async (bookingData: {
      gear_id: string;
      start_date: string;
      end_date: string;
      pickup_location?: string;
      renter_notes?: string;
    }) => {
      return await createBooking(bookingData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['gear'] });
    },
  });
};

export const useAcceptBooking = () => {
  const queryClient = useQueryClient();
  const { acceptBooking, loading, error } = useBookingApi();
  
  return useMutation({
    mutationFn: async ({ bookingId, pickupLocation }: { bookingId: string; pickupLocation: string }) => {
      return await acceptBooking(bookingId, pickupLocation);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
};

export const useConfirmReturn = () => {
  const queryClient = useQueryClient();
  const { confirmReturn, loading, error } = useBookingApi();
  
  return useMutation({
    mutationFn: async (bookingId: string) => {
      return await confirmReturn(bookingId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
};

export const useCompleteReturn = () => {
  const queryClient = useQueryClient();
  const { completeReturn, loading, error } = useBookingApi();
  
  return useMutation({
    mutationFn: async (bookingId: string) => {
      return await completeReturn(bookingId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
};

export const useRentalDashboard = (bookingId: string) => {
  const { getRentalDashboard, loading, error } = useBookingApi();
  
  return useQuery({
    queryKey: ['rental-dashboard', bookingId],
    queryFn: async () => {
      if (!bookingId) return null;
      return await getRentalDashboard(bookingId);
    },
    enabled: !!bookingId,
  });
};

export const useUpdateBooking = () => {
  const queryClient = useQueryClient();
  const { updateBooking, loading, error } = useBookingApi();

  return useMutation({
    mutationFn: async ({ bookingId, updates }: { bookingId: string; updates: any }) => {
      return await updateBooking(bookingId, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
};