import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUserApi, useBookingApi, useGearApi, useReviewApi } from './useApi';
import { useAuth } from '@/contexts/AuthContext';
import { Database } from '@/integrations/supabase/types';

type Profile = Database['public']['Tables']['profiles']['Row'];

export const useCurrentUser = () => {
  const { getCurrentUser, loading, error } = useUserApi();
  
  return useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      return await getCurrentUser();
    },
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { updateProfile, loading, error } = useUserApi();
  
  return useMutation({
    mutationFn: async (updates: Partial<Profile>) => {
      if (!user?.id) throw new Error('User not authenticated');
      return await updateProfile(user.id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
    },
  });
};

export const useDashboardOverview = () => {
  const { user } = useAuth();
  const { getDashboardOverview, loading, error } = useUserApi();
  
  return useQuery({
    queryKey: ['dashboard-overview', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      return await getDashboardOverview(user.id);
    },
    enabled: !!user?.id,
  });
};

// Note: uploadVerificationDocument is not yet implemented in the API service
// Will be added in a future update

export const useUserBookings = () => {
  const { user } = useAuth();
  const { getUserBookings, loading, error } = useBookingApi();
  
  return useQuery({
    queryKey: ['user-bookings', user?.id],
    queryFn: async () => {
      if (!user) return [];
      return await getUserBookings(user.id);
    },
    enabled: !!user,
  });
};

export const useUserListings = () => {
  const { user } = useAuth();
  const { getAvailableGear, loading, error } = useGearApi();
  
  return useQuery({
    queryKey: ['user-listings', user?.id],
    queryFn: async () => {
      if (!user) return [];
      // Filter gear by owner_id - this would need to be added to the API service
      const allGear = await getAvailableGear();
      return allGear?.filter(gear => gear.owner_id === user.id) || [];
    },
    enabled: !!user,
  });
};

export const useUserReviews = () => {
  const { user } = useAuth();
  const { getUserReviews, loading, error } = useReviewApi();
  
  return useQuery({
    queryKey: ['user-reviews', user?.id],
    queryFn: async () => {
      if (!user) return [];
      return await getUserReviews(user.id);
    },
    enabled: !!user,
  });
};

export const useUpdateReview = () => {
  const queryClient = useQueryClient();
  const { updateReview, loading, error } = useReviewApi();
  
  return useMutation({
    mutationFn: async ({ reviewId, updates }: {
      reviewId: string;
      updates: { rating?: number; comment?: string };
    }) => {
      return await updateReview(reviewId, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['user-stats'] });
    },
  });
};

export const useUserStats = () => {
  const { user } = useAuth();
  const { getDashboardOverview, loading, error } = useUserApi();
  const { getUserRatingStats } = useReviewApi();
  
  return useQuery({
    queryKey: ['user-stats', user?.id],
    queryFn: async () => {
      if (!user) return {
        totalRentals: 0,
        totalListings: 0,
        rating: 0,
        reviews: 0,
        joinDate: new Date().getFullYear().toString()
      };
      
      const [dashboardData, ratingStats] = await Promise.all([
        getDashboardOverview(user.id),
        getUserRatingStats(user.id)
      ]);
      
      return {
        totalRentals: dashboardData?.bookingCount || 0,
        totalListings: dashboardData?.gearCount || 0,
        rating: ratingStats?.rating || 0,
        reviews: ratingStats?.totalReviews || 0,
        joinDate: user.created_at ? new Date(user.created_at).getFullYear().toString() : new Date().getFullYear().toString()
      };
    },
    enabled: !!user,
  });
};
