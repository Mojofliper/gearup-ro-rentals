import { supabase } from "@/integrations/supabase/client";
import { createClient } from "@supabase/supabase-js";
import { PushNotificationService } from "./pushNotificationService";

// Create a service role client for notifications
const createServiceRoleClient = () => {
  const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    console.error(
      "VITE_SUPABASE_SERVICE_ROLE_KEY not found in environment variables",
    );
    return null;
  }

  return createClient(import.meta.env.VITE_SUPABASE_URL, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

export interface NotificationData {
  type:
    | "booking"
    | "payment"
    | "message"
    | "claim"
    | "gear"
    | "system"
    | "review";
  bookingId?: string;
  gearId?: string;
  amount?: number;
  senderName?: string;
  gearTitle?: string;
  action?: string;
  reviewerName?: string;
}

class NotificationService {
  private pushService: PushNotificationService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private serviceRoleClient: any;

  constructor() {
    this.pushService = new PushNotificationService();
    this.serviceRoleClient = createServiceRoleClient();
  }

  // Booking notifications
  async notifyBookingCreated(
    bookingId: string,
    gearTitle: string,
    ownerId: string,
    renterId: string,
  ) {
    const notification = {
      title: "Rezervare nouă",
      body: `Ai o rezervare nouă pentru "${gearTitle}"`,
      data: { type: "booking", bookingId, gearTitle } as NotificationData,
    };

    await this.sendToUser(ownerId, notification);
  }

  async notifyBookingConfirmed(
    bookingId: string,
    gearTitle: string,
    renterId: string,
  ) {
    const notification = {
      title: "Rezervare confirmată",
      body: `Rezervarea pentru "${gearTitle}" a fost confirmată`,
      data: { type: "booking", bookingId, gearTitle } as NotificationData,
    };

    await this.sendToUser(renterId, notification);
  }

  async notifyBookingConfirmedOwner(
    bookingId: string,
    gearTitle: string,
    ownerId: string,
  ) {
    const notification = {
      title: "Rezervare plătită",
      body: `Plata pentru rezervarea \"${gearTitle}\" a fost efectuată de către chiriaș.`,
      data: { type: "booking", bookingId, gearTitle } as NotificationData,
    };
    await this.sendToUser(ownerId, notification);
  }

  async notifyBookingCancelled(
    bookingId: string,
    gearTitle: string,
    ownerId: string,
    renterId: string,
  ) {
    const notification = {
      title: "Rezervare anulată",
      body: `Rezervarea pentru "${gearTitle}" a fost anulată`,
      data: { type: "booking", bookingId, gearTitle } as NotificationData,
    };

    await Promise.all([
      this.sendToUser(ownerId, notification),
      this.sendToUser(renterId, notification),
    ]);
  }

  // Payment notifications
  async notifyPaymentReceived(
    bookingId: string,
    amount: number,
    ownerId: string,
  ) {
    const notification = {
      title: "Plată primită",
      body: `Ai primit o plată de ${amount} RON pentru închiriere`,
      data: { type: "payment", bookingId, amount } as NotificationData,
    };

    await this.sendToUser(ownerId, notification);
  }

  async notifyPaymentCompleted(
    bookingId: string,
    amount: number,
    renterId: string,
  ) {
    const notification = {
      title: "Plată finalizată",
      body: `Plata de ${amount} RON pentru închiriere a fost finalizată cu succes`,
      data: { type: "payment", bookingId, amount } as NotificationData,
    };

    await this.sendToUser(renterId, notification);
  }

  async notifyEscrowReleased(
    bookingId: string,
    amount: number,
    ownerId: string,
  ) {
    const notification = {
      title: "Fonduri eliberate din escrow",
      body: `Fondurile de ${amount} RON au fost eliberate din escrow`,
      data: { type: "payment", bookingId, amount } as NotificationData,
    };

    await this.sendToUser(ownerId, notification);
  }

  // Message notifications
  async notifyNewMessage(
    bookingId: string,
    senderName: string,
    recipientId: string,
  ) {
    const notification = {
      title: "Mesaj nou",
      body: `Ai primit un mesaj nou de la ${senderName}`,
      data: { type: "message", bookingId, senderName } as NotificationData,
    };

    await this.sendToUser(recipientId, notification);
  }

  // Claim notifications
  async notifyClaimSubmitted(
    bookingId: string,
    gearTitle: string,
    ownerId: string,
    renterId: string,
  ) {
    const notification = {
      title: "Reclamare depusă",
      body: `O reclamare a fost depusă pentru "${gearTitle}"`,
      data: { type: "claim", bookingId, gearTitle } as NotificationData,
    };

    await Promise.all([
      this.sendToUser(ownerId, notification),
      this.sendToUser(renterId, notification),
    ]);
  }

  async notifyClaimUpdated(
    bookingId: string,
    gearTitle: string,
    status: string,
    claimantId: string,
  ) {
    const notification = {
      title: "Reclamare actualizată",
      body: `Reclamarea pentru "${gearTitle}" a fost ${status}`,
      data: {
        type: "claim",
        bookingId,
        gearTitle,
        action: status,
      } as NotificationData,
    };

    await this.sendToUser(claimantId, notification);
  }

  async notifyClaimResolved(
    bookingId: string,
    status: string,
    resolution: string,
  ) {
    const notification = {
      title:
        status === "approved" ? "Reclamare aprobată" : "Reclamare respinsă",
      body: `Reclamarea a fost ${status === "approved" ? "aprobată" : "respină"}. ${resolution}`,
      data: {
        type: "claim",
        bookingId,
        action: status,
        resolution,
      } as NotificationData,
    };

    // Get booking details to notify both parties
    try {
      const { data: booking } = await supabase
        .from("bookings")
        .select("owner_id, renter_id")
        .eq("id", bookingId)
        .single();

      if (booking) {
        await Promise.all([
          this.sendToUser(booking.owner_id, notification),
          this.sendToUser(booking.renter_id, notification),
        ]);
      }
    } catch (error) {
      console.error(
        "Error getting booking details for claim resolution notification:",
        error,
      );
    }
  }

  // Gear notifications
  async notifyGearAdded(gearId: string, gearTitle: string, ownerId: string) {
    const notification = {
      title: "Echipament adăugat",
      body: `Echipamentul "${gearTitle}" a fost adăugat cu succes`,
      data: { type: "gear", gearId, gearTitle } as NotificationData,
    };

    await this.sendToUser(ownerId, notification);
  }

  async notifyGearUpdated(gearId: string, gearTitle: string, ownerId: string) {
    const notification = {
      title: "Echipament actualizat",
      body: `Echipamentul "${gearTitle}" a fost actualizat`,
      data: { type: "gear", gearId, gearTitle } as NotificationData,
    };

    await this.sendToUser(ownerId, notification);
  }

  async notifyGearDeleted(gearTitle: string, ownerId: string) {
    const notification = {
      title: "Echipament șters",
      body: `Echipamentul "${gearTitle}" a fost șters`,
      data: { type: "gear", gearTitle } as NotificationData,
    };

    await this.sendToUser(ownerId, notification);
  }

  // Pickup/Return notifications
  async notifyPickupLocationSet(
    bookingId: string,
    gearTitle: string,
    renterId: string,
  ) {
    const notification = {
      title: "Locație pickup setată",
      body: `Locația de pickup pentru "${gearTitle}" a fost setată`,
      data: { type: "booking", bookingId, gearTitle } as NotificationData,
    };

    await this.sendToUser(renterId, notification);
  }

  async notifyPickupConfirmed(
    bookingId: string,
    gearTitle: string,
    ownerId: string,
    renterId: string,
  ) {
    const ownerNotification = {
      title: "Ridicare confirmată",
      body: `Ridicarea echipamentului "${gearTitle}" a fost confirmată de ambele părți`,
      data: {
        type: "booking",
        bookingId,
        gearTitle,
        action: "pickup_confirmed",
      } as NotificationData,
    };

    const renterNotification = {
      title: "Ridicare confirmată",
      body: `Ridicarea echipamentului "${gearTitle}" a fost confirmată de ambele părți`,
      data: {
        type: "booking",
        bookingId,
        gearTitle,
        action: "pickup_confirmed",
      } as NotificationData,
    };

    await Promise.all([
      this.sendToUser(ownerId, ownerNotification),
      this.sendToUser(renterId, renterNotification),
    ]);
  }

  async notifyReturnConfirmed(
    bookingId: string,
    gearTitle: string,
    ownerId: string,
    renterId: string,
  ) {
    const ownerNotification = {
      title: "Returnare confirmată",
      body: `Returnarea echipamentului "${gearTitle}" a fost confirmată de ambele părți`,
      data: {
        type: "booking",
        bookingId,
        gearTitle,
        action: "return_confirmed",
      } as NotificationData,
    };

    const renterNotification = {
      title: "Returnare confirmată",
      body: `Returnarea echipamentului "${gearTitle}" a fost confirmată de ambele părți`,
      data: {
        type: "booking",
        bookingId,
        gearTitle,
        action: "return_confirmed",
      } as NotificationData,
    };

    await Promise.all([
      this.sendToUser(ownerId, ownerNotification),
      this.sendToUser(renterId, renterNotification),
    ]);
  }

  async notifyPickupReminder(
    bookingId: string,
    gearTitle: string,
    startDate: string,
    renterId: string,
  ) {
    const notification = {
      title: "Reminder pickup",
      body: `Închirierea pentru "${gearTitle}" începe mâine`,
      data: { type: "booking", bookingId, gearTitle } as NotificationData,
    };

    await this.sendToUser(renterId, notification);
  }

  async notifyReturnReminder(
    bookingId: string,
    gearTitle: string,
    endDate: string,
    renterId: string,
  ) {
    const notification = {
      title: "Reminder returnare",
      body: `Închirierea pentru "${gearTitle}" se termină mâine`,
      data: { type: "booking", bookingId, gearTitle } as NotificationData,
    };

    await this.sendToUser(renterId, notification);
  }

  // System notifications
  async notifyStripeConnectSetup(userId: string, success: boolean) {
    const notification = {
      title: success ? "Cont de plată configurat" : "Eroare configurare plată",
      body: success
        ? "Contul tău de plată a fost configurat cu succes"
        : "A apărut o eroare la configurarea contului de plată",
      data: {
        type: "system",
        action: success ? "stripe_success" : "stripe_error",
      } as NotificationData,
    };

    await this.sendToUser(userId, notification);
  }

  async notifyAccountVerified(userId: string) {
    const notification = {
      title: "Cont verificat",
      body: "Contul tău a fost verificat cu succes",
      data: { type: "system", action: "account_verified" } as NotificationData,
    };

    await this.sendToUser(userId, notification);
  }

  // Review notifications
  async notifyReviewReceived(
    bookingId: string,
    gearTitle: string,
    reviewerName: string,
    reviewedId: string,
  ) {
    const notification = {
      title: "Recenzie primită",
      body: `Ai primit o recenzie de la ${reviewerName} pentru "${gearTitle}"`,
      data: {
        type: "review",
        bookingId,
        gearTitle,
        reviewerName,
      } as NotificationData,
    };

    await this.sendToUser(reviewedId, notification);
  }

  // Rental completion notifications
  async notifyRentalCompleted(
    bookingId: string,
    gearTitle: string,
    ownerId: string,
    renterId: string,
  ) {
    const ownerNotification = {
      title: "Închiriere finalizată",
      body: `Închirierea pentru "${gearTitle}" a fost finalizată cu succes`,
      data: {
        type: "booking",
        bookingId,
        gearTitle,
        action: "completed",
      } as NotificationData,
    };

    const renterNotification = {
      title: "Închiriere finalizată",
      body: `Închirierea pentru "${gearTitle}" a fost finalizată cu succes`,
      data: {
        type: "booking",
        bookingId,
        gearTitle,
        action: "completed",
      } as NotificationData,
    };

    await Promise.all([
      this.sendToUser(ownerId, ownerNotification),
      this.sendToUser(renterId, renterNotification),
    ]);
  }

  // Helper method to send notification to a user
  private async sendToUser(
    userId: string,
    notification: { title: string; body: string; data: NotificationData },
  ) {
    try {
      // Map notification type to database enum
      const getNotificationType = (type: string): string => {
        switch (type) {
          case "booking":
            return "booking_confirmed";
          case "payment":
            return "payment_received";
          case "message":
            return "admin_message";
          case "claim":
            return "claim_submitted";
          case "gear":
            return "admin_message";
          case "system":
            return "admin_message";
          case "review":
            return "admin_message";
          default:
            return "admin_message";
        }
      };

      // Try to use regular client first to ensure real-time events work
      let { error } = await supabase.from("notifications").insert({
        user_id: userId,
        title: notification.title,
        message: notification.body,
        type: getNotificationType(notification.data.type),
        data: notification.data,
        is_read: false,
      });

      // If regular client fails due to RLS, fallback to service role client
      if (error) {
        console.error("Error saving notification with regular client:", error);
        if (this.serviceRoleClient) {
          const { error: serviceError } = await this.serviceRoleClient
            .from("notifications")
            .insert({
              user_id: userId,
              title: notification.title,
              message: notification.body,
              type: getNotificationType(notification.data.type),
              data: notification.data,
              is_read: false,
            });
          
          if (serviceError) {
            console.error("Error saving notification with service role client:", serviceError);
          }
        }
      }

      // Send push notification
      const pushNotification = {
        id: crypto.randomUUID(),
        title: notification.title,
        body: notification.body,
        data: notification.data as unknown as Record<string, unknown>,
      };

      await this.pushService.sendNotificationToUser(userId, pushNotification);
    } catch (error) {
      console.error("Error sending notification:", error);
    }
  }

  // Get unread count for a user
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_read", false);

      if (error) {
        console.error("Error getting unread count:", error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error("Error getting unread count:", error);
      return 0;
    }
  }

  // Mark notification as read
  async markAsRead(notificationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId);

      if (error) {
        console.error("Error marking notification as read:", error);
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  }

  // Mark all notifications as read for a user
  async markAllAsRead(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", userId)
        .eq("is_read", false);

      if (error) {
        console.error("Error marking all notifications as read:", error);
      }
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  }
}

export const notificationService = new NotificationService();
