import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useClaimsApi } from './useApi';

// Enhanced claims hooks
export const useUpdateClaimStatus = () => {
  const queryClient = useQueryClient();
  const { updateClaimStatus, loading, error } = useClaimsApi();
  
  return useMutation({
    mutationFn: async ({ claimId, updates }: {
      claimId: string;
      updates: {
        status: string;
        resolution?: string;
        deposit_penalty?: number;
        admin_id?: string;
      };
    }) => {
      return await updateClaimStatus(claimId, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claims'] });
    },
  });
};

export const useUploadEvidence = () => {
  const queryClient = useQueryClient();
  const { uploadEvidence, loading, error } = useClaimsApi();
  
  return useMutation({
    mutationFn: async ({ claimId, evidenceData }: {
      claimId: string;
      evidenceData: {
        evidence_type: string;
        evidence_url: string;
        description?: string;
      };
    }) => {
      return await uploadEvidence(claimId, evidenceData);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['claim-evidence', variables.claimId] });
    },
  });
};

export const useClaimEvidence = (claimId: string) => {
  const { getClaimEvidence, loading, error } = useClaimsApi();
  
  return useQuery({
    queryKey: ['claim-evidence', claimId],
    queryFn: async () => {
      if (!claimId) return [];
      return await getClaimEvidence(claimId);
    },
    enabled: !!claimId,
  });
}; 