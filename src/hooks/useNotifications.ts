import { useCallback } from 'react';
import { notificationService } from '@/services/notificationService';
import { useAuth } from '@/contexts/AuthContext';

export const useNotifications = () => {
  const { user } = useAuth();

  // Booking notifications
  const notifyBookingCreated = useCallback(async (
    bookingId: string, 
    gearTitle: string, 
    ownerId: string, 
    renterId: string
  ) => {
    if (!user) return;
    await notificationService.notifyBookingCreated(bookingId, gearTitle, ownerId, renterId);
  }, [user]);

  const notifyBookingConfirmed = useCallback(async (
    bookingId: string, 
    gearTitle: string, 
    renterId: string
  ) => {
    if (!user) return;
    await notificationService.notifyBookingConfirmed(bookingId, gearTitle, renterId);
  }, [user]);

  const notifyBookingConfirmedOwner = useCallback(async (
    bookingId: string,
    gearTitle: string,
    ownerId: string
  ) => {
    if (!user) return;
    await notificationService.notifyBookingConfirmedOwner(bookingId, gearTitle, ownerId);
  }, [user]);

  const notifyBookingCancelled = useCallback(async (
    bookingId: string, 
    gearTitle: string, 
    ownerId: string, 
    renterId: string
  ) => {
    if (!user) return;
    await notificationService.notifyBookingCancelled(bookingId, gearTitle, ownerId, renterId);
  }, [user]);

  // Payment notifications
  const notifyPaymentReceived = useCallback(async (
    bookingId: string, 
    amount: number, 
    ownerId: string
  ) => {
    if (!user) return;
    await notificationService.notifyPaymentReceived(bookingId, amount, ownerId);
  }, [user]);

  const notifyPaymentCompleted = useCallback(async (
    bookingId: string, 
    amount: number, 
    renterId: string
  ) => {
    if (!user) return;
    await notificationService.notifyPaymentCompleted(bookingId, amount, renterId);
  }, [user]);

  const notifyEscrowReleased = useCallback(async (
    bookingId: string, 
    amount: number, 
    ownerId: string
  ) => {
    if (!user) return;
    await notificationService.notifyEscrowReleased(bookingId, amount, ownerId);
  }, [user]);

  // Message notifications
  const notifyNewMessage = useCallback(async (
    bookingId: string, 
    senderName: string, 
    recipientId: string
  ) => {
    if (!user) return;
    await notificationService.notifyNewMessage(bookingId, senderName, recipientId);
  }, [user]);

  // Claim notifications
  const notifyClaimSubmitted = useCallback(async (
    bookingId: string, 
    gearTitle: string, 
    ownerId: string, 
    renterId: string
  ) => {
    if (!user) return;
    await notificationService.notifyClaimSubmitted(bookingId, gearTitle, ownerId, renterId);
  }, [user]);

  const notifyClaimUpdated = useCallback(async (
    bookingId: string, 
    gearTitle: string, 
    status: string, 
    claimantId: string
  ) => {
    if (!user) return;
    await notificationService.notifyClaimUpdated(bookingId, gearTitle, status, claimantId);
  }, [user]);

  const notifyClaimResolved = useCallback(async (
    bookingId: string, 
    status: string, 
    resolution: string
  ) => {
    if (!user) return;
    await notificationService.notifyClaimResolved(bookingId, status, resolution);
  }, [user]);

  // Gear notifications
  const notifyGearAdded = useCallback(async (
    gearId: string, 
    gearTitle: string, 
    ownerId: string
  ) => {
    if (!user) return;
    await notificationService.notifyGearAdded(gearId, gearTitle, ownerId);
  }, [user]);

  const notifyGearUpdated = useCallback(async (
    gearId: string, 
    gearTitle: string, 
    ownerId: string
  ) => {
    if (!user) return;
    await notificationService.notifyGearUpdated(gearId, gearTitle, ownerId);
  }, [user]);

  const notifyGearDeleted = useCallback(async (
    gearTitle: string, 
    ownerId: string
  ) => {
    if (!user) return;
    await notificationService.notifyGearDeleted(gearTitle, ownerId);
  }, [user]);

  // Pickup/Return notifications
  const notifyPickupLocationSet = useCallback(async (
    bookingId: string, 
    gearTitle: string, 
    renterId: string
  ) => {
    if (!user) return;
    await notificationService.notifyPickupLocationSet(bookingId, gearTitle, renterId);
  }, [user]);

  const notifyPickupConfirmed = useCallback(async (
    bookingId: string, 
    gearTitle: string, 
    ownerId: string, 
    renterId: string
  ) => {
    if (!user) return;
    await notificationService.notifyPickupConfirmed(bookingId, gearTitle, ownerId, renterId);
  }, [user]);

  const notifyReturnConfirmed = useCallback(async (
    bookingId: string, 
    gearTitle: string, 
    ownerId: string, 
    renterId: string
  ) => {
    if (!user) return;
    await notificationService.notifyReturnConfirmed(bookingId, gearTitle, ownerId, renterId);
  }, [user]);

  const notifyPickupReminder = useCallback(async (
    bookingId: string, 
    gearTitle: string, 
    startDate: string, 
    renterId: string
  ) => {
    if (!user) return;
    await notificationService.notifyPickupReminder(bookingId, gearTitle, startDate, renterId);
  }, [user]);

  const notifyReturnReminder = useCallback(async (
    bookingId: string, 
    gearTitle: string, 
    endDate: string, 
    renterId: string
  ) => {
    if (!user) return;
    await notificationService.notifyReturnReminder(bookingId, gearTitle, endDate, renterId);
  }, [user]);

  // System notifications
  const notifyStripeConnectSetup = useCallback(async (
    userId: string, 
    success: boolean
  ) => {
    if (!user) return;
    await notificationService.notifyStripeConnectSetup(userId, success);
  }, [user]);

  const notifyAccountVerified = useCallback(async (userId: string) => {
    if (!user) return;
    await notificationService.notifyAccountVerified(userId);
  }, [user]);

  // Review notifications
  const notifyReviewReceived = useCallback(async (
    bookingId: string,
    gearTitle: string,
    reviewerName: string,
    reviewedId: string
  ) => {
    if (!user) return;
    await notificationService.notifyReviewReceived(bookingId, gearTitle, reviewerName, reviewedId);
  }, [user]);

  // Rental completion notifications
  const notifyRentalCompleted = useCallback(async (
    bookingId: string,
    gearTitle: string,
    ownerId: string,
    renterId: string
  ) => {
    if (!user) return;
    await notificationService.notifyRentalCompleted(bookingId, gearTitle, ownerId, renterId);
  }, [user]);

  return {
    // Booking notifications
    notifyBookingCreated,
    notifyBookingConfirmed,
    notifyBookingConfirmedOwner,
    notifyBookingCancelled,
    
    // Payment notifications
    notifyPaymentReceived,
    notifyPaymentCompleted,
    notifyEscrowReleased,
    
    // Message notifications
    notifyNewMessage,
    
    // Claim notifications
    notifyClaimSubmitted,
    notifyClaimUpdated,
    notifyClaimResolved,
    
    // Gear notifications
    notifyGearAdded,
    notifyGearUpdated,
    notifyGearDeleted,
    
    // Pickup/Return notifications
    notifyPickupLocationSet,
    notifyPickupConfirmed,
    notifyReturnConfirmed,
    notifyPickupReminder,
    notifyReturnReminder,
    
    // System notifications
    notifyStripeConnectSetup,
    notifyAccountVerified,
    
    // Review notifications
    notifyReviewReceived,
    
    // Rental completion notifications
    notifyRentalCompleted,
  };
}; 