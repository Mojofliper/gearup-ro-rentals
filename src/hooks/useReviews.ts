import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useReviewApi } from "./useApi";
import { useAuthQuery } from "./useAuthQuery";
import { ReviewData, ReviewUpdate } from "@/integrations/supabase/types";

export const useGearReviews = (gearId: string) => {
  const { getGearReviews } = useReviewApi();

  return useAuthQuery(
    ["gear-reviews", gearId],
    async () => {
      return await getGearReviews(gearId);
    },
    {
      enabled: !!gearId,
      staleTime: 5 * 60 * 1000, // 5 minutes for gear reviews
    },
  );
};

export const useCreateReview = () => {
  const queryClient = useQueryClient();
  const { createReview } = useReviewApi();

  return useMutation({
    mutationFn: async (reviewData: Record<string, unknown>) => {
      return await createReview(reviewData);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["gear-reviews", variables.gearId],
      });
      queryClient.invalidateQueries({ queryKey: ["user-reviews"] });
      queryClient.invalidateQueries({ queryKey: ["gear", variables.gearId] });
    },
  });
};

export const useUpdateReview = () => {
  const queryClient = useQueryClient();
  const { updateReview } = useReviewApi();

  return useMutation({
    mutationFn: async ({
      reviewId,
      updates,
    }: {
      reviewId: string;
      updates: Record<string, unknown>;
    }) => {
      return await updateReview(reviewId, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gear-reviews"] });
      queryClient.invalidateQueries({ queryKey: ["user-reviews"] });
    },
  });
};

export const useDeleteReview = () => {
  const queryClient = useQueryClient();
  const { deleteReview } = useReviewApi();

  return useMutation({
    mutationFn: async (reviewId: string) => {
      return await deleteReview(reviewId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gear-reviews"] });
      queryClient.invalidateQueries({ queryKey: ["user-reviews"] });
    },
  });
};
