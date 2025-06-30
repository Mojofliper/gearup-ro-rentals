
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useUserBookings = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['user-bookings', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          gear:gear(*),
          owner:profiles!bookings_owner_id_fkey(*)
        `)
        .eq('renter_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });
};

export const useUserListings = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['user-listings', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('gear')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });
};

export const useUserReviews = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['user-reviews', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          reviewer:profiles!reviews_reviewer_id_fkey(*),
          gear:gear(*)
        `)
        .eq('reviewed_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });
};

export const useUserStats = () => {
  const { user } = useAuth();
  
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
      
      // Get total rentals
      const { count: rentalsCount } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('renter_id', user.id);
      
      // Get total listings
      const { count: listingsCount } = await supabase
        .from('gear')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', user.id);
      
      // Get reviews count and average rating
      const { data: reviewsData } = await supabase
        .from('reviews')
        .select('rating')
        .eq('reviewed_id', user.id);
      
      const reviewsCount = reviewsData?.length || 0;
      const averageRating = reviewsCount > 0 
        ? reviewsData.reduce((sum, review) => sum + review.rating, 0) / reviewsCount 
        : 0;
      
      // Get join date from user metadata
      const joinDate = user.created_at ? new Date(user.created_at).getFullYear().toString() : new Date().getFullYear().toString();
      
      return {
        totalRentals: rentalsCount || 0,
        totalListings: listingsCount || 0,
        rating: Math.round(averageRating * 10) / 10,
        reviews: reviewsCount,
        joinDate
      };
    },
    enabled: !!user,
  });
};
