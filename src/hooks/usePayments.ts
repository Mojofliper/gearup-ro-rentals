import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usePaymentApi } from './useApi';
import { useAuthQuery, useAuthMutation } from './useAuthQuery';
import { PaymentData, StripeAccountData } from '@/integrations/supabase/types';

export const useCreatePaymentIntent = () => {
  const { createPaymentIntent } = usePaymentApi();
  
  return useAuthMutation(
    async (bookingId: string) => {
      return await createPaymentIntent(bookingId);
    }
  );
};

export const useGetTransactionDetails = () => {
  const { getTransactionDetails } = usePaymentApi();
  
  return useAuthQuery(
    ['transaction-details'],
    async (bookingId: string) => {
      return await getTransactionDetails(bookingId);
    },
    {
      staleTime: 2 * 60 * 1000, // 2 minutes for transaction details
    }
  );
};

export const useGetEscrowStatus = () => {
  const { getEscrowStatus } = usePaymentApi();
  
  return useAuthQuery(
    ['escrow-status'],
    async (bookingId: string) => {
      return await getEscrowStatus(bookingId);
    },
    {
      staleTime: 1 * 60 * 1000, // 1 minute for escrow status
    }
  );
};

export const useCreateConnectedAccount = () => {
  const queryClient = useQueryClient();
  const { createConnectedAccount } = usePaymentApi();
  
  return useAuthMutation(
    async (ownerId: string) => {
      return await createConnectedAccount(ownerId);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['connected-account-status'] });
      },
    }
  );
};

export const useGetConnectedAccountStatus = () => {
  const { getConnectedAccountStatus } = usePaymentApi();
  
  return useAuthQuery(
    ['connected-account-status'],
    async (ownerId: string) => {
      return await getConnectedAccountStatus(ownerId);
    },
    {
      staleTime: 10 * 60 * 1000, // 10 minutes for account status
    }
  );
};

export const useReleaseEscrowFunds = () => {
  const queryClient = useQueryClient();
  const { releaseEscrowFunds } = usePaymentApi();
  
  return useAuthMutation(
    async (releaseData: Record<string, unknown>) => {
      return await releaseEscrowFunds(releaseData);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['escrow-status'] });
        queryClient.invalidateQueries({ queryKey: ['transaction-details'] });
      },
    }
  );
};

export const useProcessRefund = () => {
  const queryClient = useQueryClient();
  const { processRefund } = usePaymentApi();
  
  return useAuthMutation(
    async ({ transactionId, refundAmount, reason }: { transactionId: string; refundAmount: number; reason: string }) => {
      return await processRefund(transactionId, refundAmount, reason);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['transaction-details'] });
        queryClient.invalidateQueries({ queryKey: ['user-bookings'] });
      },
    }
  );
};