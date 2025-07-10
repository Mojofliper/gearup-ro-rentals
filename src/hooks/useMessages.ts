import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMessagingApi } from "./useApi";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNotifications } from "@/hooks/useNotifications";

export const useBookingMessages = (bookingId: string) => {
  const { getBookingMessages, loading, error } = useMessagingApi();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!bookingId) return;
    const channel = supabase
      .channel("messages-" + bookingId)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `booking_id=eq.${bookingId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["messages", bookingId] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [bookingId, queryClient]);

  return useQuery({
    queryKey: ["messages", bookingId],
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
  const { notifyNewMessage } = useNotifications();

  return useMutation({
    mutationFn: async ({
      bookingId,
      content,
      messageType = "text",
    }: {
      bookingId: string;
      content: string;
      messageType?: "text" | "image" | "system";
    }) => {
      return await sendMessage(bookingId, content, messageType);
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({
        queryKey: ["messages", data?.booking_id],
      });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });

      // Send notification to the other party
      if (data && data.booking_id && data.sender_id) {
        try {
          // Get booking details to find the recipient
          const { data: booking } = await supabase
            .from("bookings")
            .select(
              "owner_id, renter_id, owner:owner_id(full_name), renter:renter_id(full_name)",
            )
            .eq("id", data.booking_id)
            .single();

          if (booking) {
            const recipientId =
              data.sender_id === booking.owner_id
                ? booking.renter_id
                : booking.owner_id;
            const senderName =
              data.sender_id === booking.owner_id
                ? (booking.owner as Record<string, unknown>)?.full_name ||
                  "Proprietar"
                : (booking.renter as Record<string, unknown>)?.full_name ||
                  "Închiriat";

            await notifyNewMessage(data.booking_id, senderName, recipientId);
          }
        } catch (notificationError) {
          console.error(
            "Error sending message notification:",
            notificationError,
          );
        }
      }
    },
  });
};

export const useUnreadMessageCountForBooking = (bookingId: string) => {
  const { user } = useAuth();
  const { getBookingMessages, loading, error } = useMessagingApi();

  return useQuery({
    queryKey: ["unread-messages", bookingId, user?.id],
    queryFn: async () => {
      if (!bookingId || !user?.id) return 0;
      const messages = await getBookingMessages(bookingId);
      return (
        messages?.filter((msg) => !msg.is_read && msg.sender_id !== user.id)
          .length || 0
      );
    },
    enabled: !!bookingId && !!user?.id,
  });
};

// Enhanced messaging hooks
export const useUserConversations = () => {
  const { user } = useAuth();
  const { getUserConversations, loading, error } = useMessagingApi();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel("conversations-" + user.id)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversations",
          filter: `participant1_id=eq.${user.id} OR participant2_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: ["conversations", user.id],
          });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  return useQuery({
    queryKey: ["conversations", user?.id],
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
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
};

export const useUnreadMessageCount = () => {
  const { user } = useAuth();
  const { getUnreadMessageCount, loading, error } = useMessagingApi();

  return useQuery({
    queryKey: ["unread-messages", user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      try {
        return await getUnreadMessageCount(user.id);
      } catch (error) {
        console.error("Error fetching unread message count:", error);
        return 0; // Return 0 on error to prevent infinite retries
      }
    },
    enabled: !!user?.id,
    refetchInterval: 60000, // Refetch every 60 seconds instead of 30
    retry: 1, // Limit retries to prevent infinite loops
    retryDelay: 2000, // Wait 2 seconds between retries
  });
};

export const useDeleteConversation = () => {
  const queryClient = useQueryClient();
  const { deleteConversation } = useMessagingApi();

  return useMutation({
    mutationFn: async (bookingId: string) => {
      return await deleteConversation(bookingId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["messages"] });
    },
  });
};
