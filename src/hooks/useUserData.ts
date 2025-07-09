import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useUserApi, useBookingApi, useGearApi, useReviewApi } from './useApi';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthQuery, useAuthMutation } from './useAuthQuery';

type Profile = Record<string, unknown>;

export const useCurrentUser = () => {
  const { getCurrentUser } = useUserApi();
  
  return useAuthQuery(
    ['current-user'],
    async () => {
      return await getCurrentUser();
    },
    {
      staleTime: 2 * 60 * 1000, // 2 minutes for user data
    }
  );
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { updateProfile } = useUserApi();
  
  return useAuthMutation(
    async (updates: Partial<Profile>) => {
      if (!user?.id) throw new Error('User not authenticated');
      return await updateProfile(user.id, updates);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['current-user'] });
        queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      },
    }
  );
};

export const useDashboardOverview = () => {
  const { user } = useAuth();
  const { getDashboardOverview } = useUserApi();
  
  return useAuthQuery(
    ['dashboard-overview', user?.id],
    async () => {
      if (!user?.id) return null;
      return await getDashboardOverview(user.id);
    },
    {
      staleTime: 2 * 60 * 1000, // 2 minutes for dashboard data
    }
  );
};

export const useUserBookings = () => {
  const { user } = useAuth();
  const { getUserBookings } = useBookingApi();
  
  return useAuthQuery(
    ['user-bookings', user?.id],
    async () => {
      if (!user) return [];
      return await getUserBookings(user.id);
    },
    {
      enabled: !!user,
      staleTime: 1 * 60 * 1000, // 1 minute for bookings
    }
  );
};

export const useUserListings = () => {
  const { user } = useAuth();
  const { getMyEquipment } = useUserApi();
  
  return useAuthQuery(
    ['user-listings', user?.id],
    async () => {
      if (!user) return [];
      const result = await getMyEquipment(user.id);
      return result || [];
    },
    {
      enabled: !!user,
      staleTime: 2 * 60 * 1000, // 2 minutes for listings
    }
  );
};

export const useUserReviews = () => {
  const { user } = useAuth();
  const { getUserReviews } = useReviewApi();
  
  return useAuthQuery(
    ['user-reviews', user?.id],
    async () => {
      if (!user) return [];
      return await getUserReviews(user.id);
    },
    {
      enabled: !!user,
      staleTime: 2 * 60 * 1000, // 2 minutes for reviews
    }
  );
};

export const useUpdateReview = () => {
  const queryClient = useQueryClient();
  const { updateReview } = useReviewApi();
  
  return useAuthMutation(
    async ({ reviewId, updates }: {
      reviewId: string;
      updates: { rating?: number; comment?: string };
    }) => {
      return await updateReview(reviewId, updates);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['user-reviews'] });
        queryClient.invalidateQueries({ queryKey: ['user-stats'] });
      },
    }
  );
};

export const useUserStats = () => {
  const { user } = useAuth();
  const { getDashboardOverview } = useUserApi();
  const { getUserRatingStats } = useReviewApi();
  
  return useAuthQuery(
    ['user-stats', user?.id],
    async () => {
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
    {
      enabled: !!user,
      staleTime: 5 * 60 * 1000, // 5 minutes for stats
    }
  );
};