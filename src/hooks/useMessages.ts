import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMessagingApi } from './useApi';
import { useAuth } from '@/contexts/AuthContext';

export const useBookingMessages = (bookingId: string) => {
  const { getBookingMessages, loading, error } = useMessagingApi();
  
  return useQuery({
    queryKey: ['messages', bookingId],
    queryFn: async () => {
      if (!bookingId) return [];
      return await getBookingMessages(bookingId);
    },
    enabled: !!bookingId,
  });
};

export const useSendMessage = () => {
  const queryClient = useQueryClient();
  const { sendMessage, loading, error } = useMessagingApi();
  
  return useMutation({
    mutationFn: async ({ bookingId, content, messageType }: {
      bookingId: string;
      content: string;
      messageType?: 'text' | 'image';
    }) => {
      return await sendMessage(bookingId, content, messageType);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['messages', variables.bookingId] });
    },
  });
};

export const useUnreadMessageCount = (bookingId: string) => {
  const { user } = useAuth();
  const { getBookingMessages, loading, error } = useMessagingApi();
  
  return useQuery({
    queryKey: ['unread-messages', bookingId, user?.id],
    queryFn: async () => {
      if (!bookingId || !user?.id) return 0;
      const messages = await getBookingMessages(bookingId);
      return messages?.filter(msg => !msg.is_read && msg.sender_id !== user.id).length || 0;
    },
    enabled: !!bookingId && !!user?.id,
  });
};

// Enhanced messaging hooks
export const useUserConversations = () => {
  const { user } = useAuth();
  const { getUserConversations, loading, error } = useMessagingApi();
  
  return useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return await getUserConversations(user.id);
    },
    enabled: !!user?.id,
  });
};

export const useCreateConversation = () => {
  const queryClient = useQueryClient();
  const { createConversation, loading, error } = useMessagingApi();
  
  return useMutation({
    mutationFn: async (conversationData: {
      booking_id: string;
      participant1_id: string;
      participant2_id: string;
    }) => {
      return await createConversation(conversationData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
};

export const useUnreadMessageCount = () => {
  const { user } = useAuth();
  const { getUnreadMessageCount, loading, error } = useMessagingApi();
  
  return useQuery({
    queryKey: ['unread-messages', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      return await getUnreadMessageCount(user.id);
    },
    enabled: !!user?.id,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}; 