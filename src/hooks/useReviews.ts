import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type ReviewInsert = Database['public']['Tables']['reviews']['Insert'];

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
    },
  });
};