import { supabase } from "@/integrations/supabase/client";

export interface PushNotification {
  id: string;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
  actions?: NotificationAction[];
  requireInteraction?: boolean;
  silent?: boolean;
}

interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

export class PushNotificationService {
  private isSupported: boolean;
  private permission: NotificationPermission = "default";
  private subscription: PushSubscription | null = null;

  constructor() {
    this.isSupported = "Notification" in window && "serviceWorker" in navigator;
    if (this.isSupported) {
      this.permission = Notification.permission;
    }
  }

  async initialize(): Promise<boolean> {
    if (!this.isSupported) {
      console.warn("Push notifications not supported");
      return false;
    }

    try {
      // Request permission
      if (this.permission === "default") {
        this.permission = await Notification.requestPermission();
      }

      if (this.permission !== "granted") {
        console.warn("Notification permission denied");
        return false;
      }

      // Register service worker
      const registration = await navigator.serviceWorker.register("/sw.js");
      console.log("Service Worker registered:", registration);

      // Get push subscription
      this.subscription = await registration.pushManager.getSubscription();

      if (!this.subscription) {
        // Subscribe to push notifications
        this.subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(
            process.env.VITE_VAPID_PUBLIC_KEY || "",
          ),
        });
      }

      // Save subscription to database
      await this.saveSubscription();

      return true;
    } catch (error) {
      console.error("Error initializing push notifications:", error);
      return false;
    }
  }

  async saveSubscription(): Promise<void> {
    if (!this.subscription) return;

    try {
      const { error } = await supabase.from("push_subscriptions").upsert(
        {
          user_id: (await supabase.auth.getUser()).data.user?.id,
          subscription: this.subscription.toJSON(),
          created_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        },
      );

      if (error) {
        console.error("Error saving push subscription:", error);
      }
    } catch (error) {
      console.error("Error saving push subscription:", error);
    }
  }

  async showNotification(notification: PushNotification): Promise<void> {
    if (!this.isSupported || this.permission !== "granted") {
      return;
    }

    try {
      const notificationOptions: NotificationOptions = {
        body: notification.body,
        icon: notification.icon || "/favicon.ico",
        badge: notification.badge,
        tag: notification.tag,
        data: notification.data,
        requireInteraction: notification.requireInteraction,
        silent: notification.silent,
      };

      const notif = new Notification(notification.title, notificationOptions);

      // Handle notification click
      notif.onclick = (event) => {
        event.preventDefault();
        this.handleNotificationClick(notification);
        notif.close();
      };
    } catch (error) {
      console.error("Error showing notification:", error);
    }
  }

  private handleNotificationClick(notification: PushNotification): void {
    // Handle different notification types
    if (notification.data?.type === "booking") {
      window.location.href = `/dashboard?tab=bookings&booking=${notification.data.bookingId}`;
    } else if (notification.data?.type === "message") {
      window.location.href = `/messages?booking=${notification.data.bookingId}`;
    } else if (notification.data?.type === "payment") {
      window.location.href = `/dashboard?tab=financials`;
    } else if (notification.data?.type === "claim") {
      window.location.href = `/dashboard?tab=owner`;
    }
  }

  private handleNotificationAction(
    notification: PushNotification,
    action: string,
  ): void {
    // Handle notification actions
    switch (action) {
      case "view":
        this.handleNotificationClick(notification);
        break;
      case "dismiss":
        // Just close the notification
        break;
      default:
        console.log("Unknown notification action:", action);
    }
  }

  async sendNotificationToUser(
    userId: string,
    notification: PushNotification,
  ): Promise<void> {
    try {
      const { data, error } = await supabase.from("notifications").insert({
        user_id: userId,
        title: notification.title,
        body: notification.body,
        type: notification.data?.type || "general",
        data: notification.data || {},
        status: "unread",
      });

      if (error) {
        console.error("Error saving notification:", error);
      }
    } catch (error) {
      console.error("Error sending notification to user:", error);
    }
  }

  async sendNotificationToBooking(
    bookingId: string,
    notification: PushNotification,
  ): Promise<void> {
    try {
      // Get booking details to find owner and renter
      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .select("owner_id, renter_id")
        .eq("id", bookingId)
        .single();

      if (bookingError || !booking) {
        console.error("Error getting booking details:", bookingError);
        return;
      }

      // Send to both owner and renter
      await Promise.all([
        this.sendNotificationToUser(booking.owner_id, notification),
        this.sendNotificationToUser(booking.renter_id, notification),
      ]);
    } catch (error) {
      console.error("Error sending notification to booking:", error);
    }
  }

  // Utility function to convert VAPID public key
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Predefined notification templates
  static createBookingConfirmedNotification(
    bookingId: string,
    gearTitle: string,
  ): PushNotification {
    return {
      id: `booking-confirmed-${bookingId}`,
      title: "Booking Confirmed!",
      body: `Your booking for "${gearTitle}" has been confirmed.`,
      icon: "/favicon.ico",
      tag: `booking-${bookingId}`,
      data: {
        type: "booking",
        bookingId,
        action: "view",
      },
      actions: [
        {
          action: "view",
          title: "View Details",
        },
        {
          action: "dismiss",
          title: "Dismiss",
        },
      ],
    };
  }

  static createPaymentReceivedNotification(
    bookingId: string,
    amount: number,
  ): PushNotification {
    return {
      id: `payment-received-${bookingId}`,
      title: "Payment Received!",
      body: `Payment of ${amount} RON has been received for your booking.`,
      icon: "/favicon.ico",
      tag: `payment-${bookingId}`,
      data: {
        type: "payment",
        bookingId,
        amount,
      },
      actions: [
        {
          action: "view",
          title: "View Details",
        },
      ],
    };
  }

  static createNewMessageNotification(
    bookingId: string,
    senderName: string,
  ): PushNotification {
    return {
      id: `message-${bookingId}-${Date.now()}`,
      title: "New Message",
      body: `You have a new message from ${senderName}.`,
      icon: "/favicon.ico",
      tag: `message-${bookingId}`,
      data: {
        type: "message",
        bookingId,
        senderName,
      },
      actions: [
        {
          action: "view",
          title: "Reply",
        },
      ],
    };
  }

  static createClaimSubmittedNotification(
    bookingId: string,
    gearTitle: string,
  ): PushNotification {
    return {
      id: `claim-submitted-${bookingId}`,
      title: "Damage Claim Submitted",
      body: `A damage claim has been submitted for "${gearTitle}".`,
      icon: "/favicon.ico",
      tag: `claim-${bookingId}`,
      data: {
        type: "claim",
        bookingId,
        gearTitle,
      },
      actions: [
        {
          action: "view",
          title: "Review Claim",
        },
      ],
    };
  }

  static createPickupReminderNotification(
    bookingId: string,
    gearTitle: string,
    startDate: string,
  ): PushNotification {
    return {
      id: `pickup-reminder-${bookingId}`,
      title: "Pickup Reminder",
      body: `Don't forget to pick up "${gearTitle}" on ${new Date(startDate).toLocaleDateString()}.`,
      icon: "/favicon.ico",
      tag: `pickup-${bookingId}`,
      data: {
        type: "booking",
        bookingId,
        gearTitle,
        startDate,
      },
      actions: [
        {
          action: "view",
          title: "View Details",
        },
      ],
    };
  }

  static createReturnReminderNotification(
    bookingId: string,
    gearTitle: string,
    endDate: string,
  ): PushNotification {
    return {
      id: `return-reminder-${bookingId}`,
      title: "Return Reminder",
      body: `Please return "${gearTitle}" by ${new Date(endDate).toLocaleDateString()}.`,
      icon: "/favicon.ico",
      tag: `return-${bookingId}`,
      data: {
        type: "booking",
        bookingId,
        gearTitle,
        endDate,
      },
      actions: [
        {
          action: "view",
          title: "View Details",
        },
      ],
    };
  }
}

export const pushNotificationService = new PushNotificationService();
