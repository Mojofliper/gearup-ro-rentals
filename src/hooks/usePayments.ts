import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PaymentService } from '@/services/paymentService';
import { CreatePaymentIntentParams } from '@/integrations/stripe/client';
import { useAuth } from '@/contexts/AuthContext';

export const useCreatePaymentIntent = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (params: CreatePaymentIntentParams) => 
      PaymentService.createPaymentIntent(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['user-bookings'] });
    },
  });
};

export const useConfirmPayment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (paymentIntentId: string) => 
      PaymentService.confirmPayment(paymentIntentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['user-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['owner-bookings'] });
    },
  });
};

export const useProcessRefund = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ 
      transactionId, 
      amount, 
      reason 
    }: { 
      transactionId: string; 
      amount: number; 
      reason: string; 
    }) => PaymentService.processRefund(transactionId, amount, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['user-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['owner-bookings'] });
    },
  });
};

export const useTransactionByBookingId = (bookingId: string) => {
  return useQuery({
    queryKey: ['transaction', bookingId],
    queryFn: () => PaymentService.getTransactionByBookingId(bookingId),
    enabled: !!bookingId,
  });
};

export const useUserTransactions = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['user-transactions', user?.id],
    queryFn: () => PaymentService.getUserTransactions(user!.id),
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