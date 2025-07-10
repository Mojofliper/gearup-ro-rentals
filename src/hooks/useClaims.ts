import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useClaimsApi } from "./useApi";
import { useAuthQuery } from "./useAuthQuery";
import { ClaimData, ClaimUpdate } from "@/integrations/supabase/types";

export const useCreateClaim = () => {
  const queryClient = useQueryClient();
  const { createClaim } = useClaimsApi();

  return useMutation({
    mutationFn: async (claimData: Record<string, unknown>) => {
      return await createClaim(claimData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-claims"] });
      queryClient.invalidateQueries({ queryKey: ["gear-claims"] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
};

export const useUpdateClaim = () => {
  const queryClient = useQueryClient();
  const { updateClaimStatus } = useClaimsApi();

  return useMutation({
    mutationFn: async ({
      claimId,
      updates,
    }: {
      claimId: string;
      updates: Record<string, unknown>;
    }) => {
      return await updateClaimStatus(claimId, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-claims"] });
      queryClient.invalidateQueries({ queryKey: ["gear-claims"] });
    },
  });
};

export const useResolveClaim = () => {
  const queryClient = useQueryClient();
  const { updateClaimStatus } = useClaimsApi();

  return useMutation({
    mutationFn: async ({
      claimId,
      resolution,
    }: {
      claimId: string;
      resolution: Record<string, unknown>;
    }) => {
      return await updateClaimStatus(claimId, resolution);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-claims"] });
      queryClient.invalidateQueries({ queryKey: ["gear-claims"] });
    },
  });
};

export const useUserClaims = () => {
  const { getBookingClaims } = useClaimsApi();

  return useAuthQuery(
    ["user-claims"],
    async () => {
      // This would need to be implemented in the API to get all user claims
      // For now, return empty array as placeholder
      return [];
    },
    {
      staleTime: 2 * 60 * 1000, // 2 minutes for user claims
    },
  );
};
