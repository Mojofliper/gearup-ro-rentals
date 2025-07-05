
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
      queryClient.invalidateQueries({ queryKey: ['user-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['owner-bookings'] });
    },
  });
};

export const useProcessRefund = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ 
      bookingId, 
      amount, 
      reason 
    }: { 
      bookingId: string; 
      amount: number; 
      reason: string; 
    }) => PaymentService.processRefund(bookingId, amount, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['owner-bookings'] });
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
