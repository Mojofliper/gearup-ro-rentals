import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type ReviewInsert = Database['public']['Tables']['reviews']['Insert'];

export const useGearReviews = (gearId?: string) => {
  return useQuery({
    queryKey: ['gear-reviews', gearId],
    queryFn: async () => {
      if (!gearId) return { reviews: [], averageRating: 0, totalReviews: 0 };
      
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          reviewer:profiles!reviews_reviewer_id_fkey(*)
        `)
        .eq('gear_id', gearId);
      
      if (error) throw error;
      
      const reviews = data || [];
      const totalReviews = reviews.length;
      const averageRating = totalReviews > 0 
        ? reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews 
        : 0;
      
      return { reviews, averageRating, totalReviews };
    },
    enabled: !!gearId,
  });
};

export const useCreateReview = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (review: ReviewInsert) => {
      const { data, error } = await supabase
        .from('reviews')
        .insert(review)
        .select(`
          *,
          reviewer:profiles!reviews_reviewer_id_fkey(*),
          reviewed:profiles!reviews_reviewed_id_fkey(*),
          gear:gear(*)
        `)
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['user-stats'] });
      queryClient.invalidateQueries({ queryKey: ['gear-reviews'] });
    },
  });
};