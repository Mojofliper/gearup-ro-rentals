import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PaymentService } from '@/services/paymentService';
import { CreatePaymentIntentParams } from '@/integrations/stripe/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePaymentApi } from './useApi';

export const useCreatePaymentIntent = () => {
  const queryClient = useQueryClient();
  const { createPaymentIntent, loading, error } = usePaymentApi();
  
  return useMutation({
    mutationFn: async (bookingId: string) => {
      return await createPaymentIntent(bookingId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
};

export const useGetTransactionDetails = (bookingId: string) => {
  const { getTransactionDetails, loading, error } = usePaymentApi();
  
  return {
    data: null, // Will be populated by the mutation
    loading,
    error,
    refetch: async () => {
      if (!bookingId) return null;
      return await getTransactionDetails(bookingId);
    }
  };
};

export const useGetEscrowStatus = (bookingId: string) => {
  const { getEscrowStatus, loading, error } = usePaymentApi();
  
  return {
    data: null, // Will be populated by the mutation
    loading,
    error,
    refetch: async () => {
      if (!bookingId) return null;
      return await getEscrowStatus(bookingId);
    }
  };
};

export const useProcessRefund = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ transactionId, refundAmount, reason }: {
      transactionId: string;
      refundAmount: number;
      reason: string; 
    }) => {
      // Note: processRefund is not yet implemented in the API service
      // Will be added in a future update
      throw new Error('Refund processing not yet implemented');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
};

export const useBookingById = (bookingId: string) => {
  return useQuery({
    queryKey: ['booking', bookingId],
    queryFn: () => PaymentService.getBookingById(bookingId),
    enabled: !!bookingId,
  });
};

export const useUserBookings = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['user-bookings', user?.id],
    queryFn: () => PaymentService.getUserBookings(user!.id),
    enabled: !!user,
  });
};

export const usePaymentBreakdown = (rentalAmount: number, depositAmount: number) => {
  return useQuery({
    queryKey: ['payment-breakdown', rentalAmount, depositAmount],
    queryFn: () => PaymentService.calculatePaymentBreakdown(rentalAmount, depositAmount),
    enabled: rentalAmount > 0,
  });
};

// Stripe Connect hooks
export const useCreateConnectedAccount = () => {
  const queryClient = useQueryClient();
  const { createConnectedAccount, loading, error } = usePaymentApi();
  
  return useMutation({
    mutationFn: async (ownerId: string) => {
      return await createConnectedAccount(ownerId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connected-account'] });
    },
  });
};

export const useConnectedAccountStatus = (ownerId: string) => {
  const { getConnectedAccountStatus, loading, error } = usePaymentApi();
  
  return useQuery({
    queryKey: ['connected-account', ownerId],
    queryFn: async () => {
      if (!ownerId) return null;
      return await getConnectedAccountStatus(ownerId);
    },
    enabled: !!ownerId,
  });
};

export const useReleaseEscrowFunds = () => {
  const queryClient = useQueryClient();
  const { releaseEscrowFunds, loading, error } = usePaymentApi();
  
  return useMutation({
    mutationFn: async (releaseData: {
      transaction_id: string;
      booking_id: string;
      release_type: 'automatic' | 'manual';
      rental_amount: number;
      deposit_amount: number;
    }) => {
      return await releaseEscrowFunds(releaseData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escrow'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
};
