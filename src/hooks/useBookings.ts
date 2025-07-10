import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBookingApi } from './useApi';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNotifications } from '@/hooks/useNotifications';
import { useDeleteConversation } from '@/hooks/useMessages';

type Booking = Record<string, unknown>;
type BookingInsert = Record<string, unknown>;

export const useUserBookings = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { getUserBookings, loading, error } = useBookingApi();
  
  const query = useQuery({
    queryKey: ['bookings', 'user', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return await getUserBookings(user.id);
    },
    enabled: !!user?.id,
    refetchInterval: 10000, // Refetch every 10 seconds as fallback
    retry: (failureCount, error) => {
      // Retry up to 3 times, but only if it's a session-related error
      if (failureCount < 3 && error?.message?.includes('401')) {
        console.log('useUserBookings (useBookings): Retrying due to 401 error, attempt:', failureCount + 1);
        return true;
      }
      return false;
    },
    retryDelay: 1000, // Wait 1 second between retries
  });

  // Set up real-time subscription for booking updates
  useEffect(() => {
    if (!user?.id) return;

    console.log('useBookings: Setting up real-time subscriptions for user:', user.id);

    const channel = supabase
      .channel('booking-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `renter_id=eq.${user.id} OR owner_id=eq.${user.id}`
        },
        (payload) => {
          console.log('useBookings: Booking update received:', payload);
          console.log('useBookings: New booking status:', (payload.new as Record<string, unknown>)?.status);
          console.log('useBookings: New payment status:', (payload.new as Record<string, unknown>)?.payment_status);
          console.log('useBookings: Old booking status:', (payload.old as Record<string, unknown>)?.status);
          console.log('useBookings: Old payment status:', (payload.old as Record<string, unknown>)?.payment_status);
          
          // Invalidate and refetch bookings when any booking changes
          queryClient.invalidateQueries({ queryKey: ['bookings', 'user', user.id] });
          // Also refresh calendar availability when booking status changes
          queryClient.invalidateQueries({ queryKey: ['gear-unavailable-dates'] });
          
          // Force refetch to ensure immediate update
          queryClient.refetchQueries({ queryKey: ['bookings', 'user', user.id] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'escrow_transactions'
        },
        (payload) => {
          console.log('useBookings: Escrow transaction update received:', payload);
          console.log('useBookings: Escrow status:', (payload.new as Record<string, unknown>)?.escrow_status);
          // Invalidate and refetch bookings when escrow status changes
          queryClient.invalidateQueries({ queryKey: ['bookings', 'user', user.id] });
          // Force refetch to ensure immediate update
          queryClient.refetchQueries({ queryKey: ['bookings', 'user', user.id] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions'
        },
        (payload) => {
          console.log('useBookings: Transaction update received:', payload);
          console.log('useBookings: Transaction status:', (payload.new as Record<string, unknown>)?.status);
          queryClient.invalidateQueries({ queryKey: ['bookings', 'user', user.id] });
          // Force refetch to ensure immediate update
          queryClient.refetchQueries({ queryKey: ['bookings', 'user', user.id] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'claims'
        },
        (payload) => {
          console.log('useBookings: Claim update received:', payload);
          console.log('useBookings: Claim status:', (payload.new as Record<string, unknown>)?.claim_status);
          queryClient.invalidateQueries({ queryKey: ['bookings', 'user', user.id] });
          // Force refetch to ensure immediate update
          queryClient.refetchQueries({ queryKey: ['bookings', 'user', user.id] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reviews'
        },
        (payload) => {
          console.log('useBookings: Review update received:', payload);
          queryClient.invalidateQueries({ queryKey: ['bookings', 'user', user.id] });
          // Force refetch to ensure immediate update
          queryClient.refetchQueries({ queryKey: ['bookings', 'user', user.id] });
        }
      )
      .subscribe((status) => {
        console.log('useBookings: Real-time subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('useBookings: Real-time subscription active');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('useBookings: Real-time subscription error');
        } else if (status === 'TIMED_OUT') {
          console.error('useBookings: Real-time subscription timed out');
        } else if (status === 'CLOSED') {
          console.log('useBookings: Real-time subscription closed');
        }
      });

    // Polling fallback - refresh every 30 seconds as backup
    const pollInterval = setInterval(() => {
      console.log('useBookings: Polling fallback - refreshing bookings');
      queryClient.invalidateQueries({ queryKey: ['bookings', 'user', user.id] });
      queryClient.refetchQueries({ queryKey: ['bookings', 'user', user.id] });
    }, 30000);

    return () => {
      console.log('useBookings: Cleaning up real-time subscriptions');
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [user?.id, queryClient]);

  return query;
};

export const useCreateBooking = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { createBooking, loading, error } = useBookingApi();
  const { notifyBookingCreated } = useNotifications();
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
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['bookings', 'user', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['gear'] });
      queryClient.invalidateQueries({ queryKey: ['gear-unavailable-dates'] }); // Refresh calendar availability
      // Send notification to owner and renter
      if (data && data.id && data.gear_id && data.owner_id && data.renter_id) {
        const gearTitle = (data.gear as { title?: string })?.title || 'Echipament';
        await notifyBookingCreated(data.id as string, gearTitle, data.owner_id as string, data.renter_id as string);
      }
    },
  });
};

export const useAcceptBooking = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { acceptBooking, loading, error } = useBookingApi();
  const { notifyBookingConfirmed, notifyBookingConfirmedOwner } = useNotifications();
  return useMutation({
    mutationFn: async ({ bookingId, pickupLocation }: { bookingId: string; pickupLocation: string }) => {
      return await acceptBooking(bookingId, pickupLocation);
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['bookings', 'user', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['gear-unavailable-dates'] }); // Refresh calendar availability
      // Send notification to renter and owner
      if (data && data.id && data.renter_id && data.owner_id) {
        const gearTitle = (data.gear as { title?: string })?.title || 'Echipament';
        await notifyBookingConfirmed(data.id as string, gearTitle, data.renter_id as string);
        await notifyBookingConfirmedOwner(data.id as string, gearTitle, data.owner_id as string);
      }
    },
  });
};

export const useRejectBooking = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { rejectBooking, loading, error } = useBookingApi();
  const { mutate: deleteConversation } = useDeleteConversation();
  return useMutation({
    mutationFn: async (bookingId: string) => {
      return await rejectBooking(bookingId);
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['bookings', 'user', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['gear-unavailable-dates'] }); // Refresh calendar availability
      
      // Delete the conversation after successful rejection
      if (data && data.id) {
        try {
          deleteConversation(data.id as string);
        } catch (error) {
          console.error('Failed to delete conversation after rejection:', error);
        }
      }
    },
  });
};

export const useConfirmReturn = () => {
  const queryClient = useQueryClient();
  const { confirmReturn, loading, error } = useBookingApi();
  const { notifyBookingConfirmed } = useNotifications();
  return useMutation({
    mutationFn: async (bookingId: string) => {
      return await confirmReturn(bookingId);
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['gear-unavailable-dates'] }); // Refresh calendar availability
      // Optionally notify owner/renter here if needed
    },
  });
};

export const useCompleteReturn = () => {
  const queryClient = useQueryClient();
  const { completeReturn, loading, error } = useBookingApi();
  const { notifyBookingConfirmed } = useNotifications();
  return useMutation({
    mutationFn: async (bookingId: string) => {
      return await completeReturn(bookingId);
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['gear-unavailable-dates'] }); // Refresh calendar availability
      // Optionally notify owner/renter here if needed
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
    retry: (failureCount, error) => {
      // Retry up to 3 times, but only if it's a session-related error
      if (failureCount < 3 && error?.message?.includes('401')) {
        console.log('useRentalDashboard: Retrying due to 401 error, attempt:', failureCount + 1);
        return true;
      }
      return false;
    },
    retryDelay: 1000, // Wait 1 second between retries
  });
};

export const useUpdateBooking = () => {
  const queryClient = useQueryClient();
  const { updateBooking, loading, error } = useBookingApi();

  return useMutation({
    mutationFn: async ({ bookingId, updates }: { bookingId: string; updates: Record<string, unknown> }) => {
      return await updateBooking(bookingId, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['gear-unavailable-dates'] }); // Refresh calendar availability
    },
  });
};

export const useCompleteRental = () => {
  const queryClient = useQueryClient();
  const { completeRental } = useBookingApi();
  
  return useMutation({
    mutationFn: async (bookingId: string) => {
      return await completeRental(bookingId);
    },
    onSuccess: () => {
      // Invalidate all booking-related queries
      queryClient.invalidateQueries({ queryKey: ['user-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['gear-unavailable-dates'] }); // Refresh calendar availability
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
  });
};