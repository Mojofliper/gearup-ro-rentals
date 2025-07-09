import { useState, useCallback } from 'react';
import { api, ApiResponse, ApiError } from '@/services/apiService';

// Generic hook for API operations
export const useApi = <T>() => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const execute = useCallback(async (apiCall: () => Promise<ApiResponse<T>>) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await apiCall();
      if (result.error) {
        setError(result.error);
        setData(null);
      } else {
        setData(result.data);
        setError(null);
      }
    } catch (err: unknown) {
      setError(new ApiError(err instanceof Error ? err.message : 'An unexpected error occurred', 'UNKNOWN_ERROR'));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, execute };
};

// User API hooks
const useUserApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const getCurrentUser = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await api.user.getCurrentUser();
      if (result.error) {
        setError(result.error);
        return null;
      }
      return result.data;
    } catch (err: unknown) {
      setError(new ApiError(err instanceof Error ? err.message : 'Failed to get user', 'FETCH_ERROR'));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateProfile = useCallback(async (userId: string, updates: Record<string, unknown>) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await api.user.updateProfile(userId, updates);
      if (result.error) {
        setError(result.error);
        return null;
      }
      return result.data;
    } catch (err: unknown) {
      setError(new ApiError(err instanceof Error ? err.message : 'Failed to update profile', 'UPDATE_ERROR'));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getDashboardOverview = useCallback(async (userId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await api.user.getDashboardOverview(userId);
      if (result.error) {
        setError(result.error);
        return null;
      }
      return result.data;
    } catch (err: unknown) {
      setError(new ApiError(err instanceof Error ? err.message : 'Failed to get dashboard', 'FETCH_ERROR'));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getUserVerificationStatus = useCallback(async (userId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await api.user.getUserVerificationStatus(userId);
      if (result.error) {
        setError(result.error);
        return null;
      }
      return result.data;
    } catch (err: unknown) {
      setError(new ApiError(err instanceof Error ? err.message : 'Failed to get verification status', 'FETCH_ERROR'));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getMyEquipment = useCallback(async (userId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await api.user.getMyEquipment(userId);
      if (result.error) {
        setError(result.error);
        return [];
      }
      return result.data || [];
    } catch (err: unknown) {
      setError(new ApiError(err instanceof Error ? err.message : 'Failed to get my equipment', 'FETCH_ERROR'));
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const getMyBookings = useCallback(async (userId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await api.user.getMyBookings(userId);
      if (result.error) {
        setError(result.error);
        return [];
      }
      return result.data || [];
    } catch (err: unknown) {
      setError(new ApiError(err instanceof Error ? err.message : 'Failed to get my bookings', 'FETCH_ERROR'));
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    getCurrentUser,
    updateProfile,
    getDashboardOverview,
    getUserVerificationStatus,
    getMyEquipment,
    getMyBookings,
    loading,
    error
  };
};

// Gear API hooks
const useGearApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const getAvailableGear = useCallback(async (filters?: Record<string, unknown>) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await api.gear.getAvailableGear(filters);
      if (result.error) {
        setError(result.error);
        return [];
      }
      return result.data || [];
    } catch (err: unknown) {
      setError(new ApiError(err instanceof Error ? err.message : 'Failed to get gear', 'FETCH_ERROR'));
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const getGearItem = useCallback(async (gearId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await api.gear.getGearItem(gearId);
      if (result.error) {
        setError(result.error);
        return null;
      }
      return result.data;
    } catch (err: unknown) {
      setError(new ApiError(err instanceof Error ? err.message : 'Failed to get gear item', 'FETCH_ERROR'));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const createGear = useCallback(async (gearData: Record<string, unknown>) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('useGearApi.createGear called with:', gearData);
      const result = await api.gear.createGear(gearData);
      console.log('useGearApi.createGear result:', result);
      
      if (result.error) {
        console.error('useGearApi.createGear error:', result.error);
        setError(result.error);
        return null;
      }
      return result.data;
    } catch (err: unknown) {
      console.error('useGearApi.createGear exception:', err);
      setError(new ApiError(err instanceof Error ? err.message : 'Failed to create gear', 'CREATE_ERROR'));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateGear = useCallback(async (gearId: string, updates: Record<string, unknown>) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await api.gear.updateGear(gearId, updates);
      if (result.error) {
        setError(result.error);
        return null;
      }
      return result.data;
    } catch (err: unknown) {
      setError(new ApiError(err instanceof Error ? err.message : 'Failed to update gear', 'UPDATE_ERROR'));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteGear = useCallback(async (gearId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await api.gear.deleteGear(gearId);
      if (result.error) {
        setError(result.error);
        throw result.error;
      }
      return true;
    } catch (err: unknown) {
      setError(new ApiError(err instanceof Error ? err.message : 'Failed to delete gear', 'DELETE_ERROR'));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getAllCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await api.gear.getAllCategories();
      if (result.error) {
        setError(result.error);
        return [];
      }
      return result.data || [];
    } catch (err: unknown) {
      setError(new ApiError(err instanceof Error ? err.message : 'Failed to get categories', 'FETCH_ERROR'));
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const getCategoryBySlug = useCallback(async (slug: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await api.gear.getCategoryBySlug(slug);
      if (result.error) {
        setError(result.error);
        return null;
      }
      return result.data;
    } catch (err: unknown) {
      setError(new ApiError(err instanceof Error ? err.message : 'Failed to get category', 'FETCH_ERROR'));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const createCategory = useCallback(async (categoryData: Record<string, unknown>) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await api.gear.createCategory(categoryData);
      if (result.error) {
        setError(result.error);
        return null;
      }
      return result.data;
    } catch (err: unknown) {
      setError(new ApiError(err instanceof Error ? err.message : 'Failed to create category', 'CREATE_ERROR'));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const searchGearWithFilters = useCallback(async (filters: Record<string, unknown>) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await api.gear.searchGearWithFilters(filters);
      if (result.error) {
        setError(result.error);
        return [];
      }
      return result.data || [];
    } catch (err: unknown) {
      setError(new ApiError(err instanceof Error ? err.message : 'Failed to search gear', 'FETCH_ERROR'));
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const searchByLocation = useCallback(async (location: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await api.gear.searchByLocation(location);
      if (result.error) {
        setError(result.error);
        return [];
      }
      return result.data || [];
    } catch (err: unknown) {
      setError(new ApiError(err instanceof Error ? err.message : 'Failed to search by location', 'FETCH_ERROR'));
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const searchByBrandModel = useCallback(async (searchTerm: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await api.gear.searchByBrandModel(searchTerm);
      if (result.error) {
        setError(result.error);
        return [];
      }
      return result.data || [];
    } catch (err: unknown) {
      setError(new ApiError(err instanceof Error ? err.message : 'Failed to search by brand/model', 'FETCH_ERROR'));
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const getFeaturedGear = useCallback(async (limit: number = 10) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await api.gear.getFeaturedGear(limit);
      if (result.error) {
        setError(result.error);
        return [];
      }
      return result.data || [];
    } catch (err: unknown) {
      setError(new ApiError(err instanceof Error ? err.message : 'Failed to get featured gear', 'FETCH_ERROR'));
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    getAvailableGear,
    getGearItem,
    createGear,
    updateGear,
    deleteGear,
    getAllCategories,
    getCategoryBySlug,
    createCategory,
    searchGearWithFilters,
    searchByLocation,
    searchByBrandModel,
    getFeaturedGear,
    loading,
    error
  };
};

// Booking API hooks
const useBookingApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const createBooking = useCallback(async (bookingData: Record<string, unknown>) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await api.booking.createBooking(bookingData);
      if (result.error) {
        setError(result.error);
        throw result.error;
      }
      return result.data;
    } catch (err: unknown) {
      const error = err instanceof ApiError ? err : new ApiError(err instanceof Error ? err.message : 'Failed to create booking', 'CREATE_ERROR');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const acceptBooking = useCallback(async (bookingId: string, pickupLocation: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await api.booking.acceptBooking(bookingId, pickupLocation);
      if (result.error) {
        setError(result.error);
        throw result.error;
      }
      return result.data;
    } catch (err: unknown) {
      const error = err instanceof ApiError ? err : new ApiError(err instanceof Error ? err.message : 'Failed to accept booking', 'UPDATE_ERROR');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const rejectBooking = useCallback(async (bookingId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await api.booking.rejectBooking(bookingId);
      if (result.error) {
        setError(result.error);
        throw result.error;
      }
      return result.data;
    } catch (err: unknown) {
      const error = err instanceof ApiError ? err : new ApiError(err instanceof Error ? err.message : 'Failed to reject booking', 'UPDATE_ERROR');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const getRentalDashboard = useCallback(async (bookingId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await api.booking.getRentalDashboard(bookingId);
      if (result.error) {
        setError(result.error);
        return null;
      }
      return result.data;
    } catch (err: unknown) {
      setError(new ApiError(err instanceof Error ? err.message : 'Failed to get rental dashboard', 'FETCH_ERROR'));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const confirmReturn = useCallback(async (bookingId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await api.booking.confirmReturn(bookingId);
      if (result.error) {
        setError(result.error);
        return null;
      }
      return result.data;
    } catch (err: unknown) {
      setError(new ApiError(err instanceof Error ? err.message : 'Failed to confirm return', 'UPDATE_ERROR'));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const completeReturn = useCallback(async (bookingId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await api.booking.completeReturn(bookingId);
      if (result.error) {
        setError(result.error);
        return null;
      }
      return result.data;
    } catch (err: unknown) {
      setError(new ApiError(err instanceof Error ? err.message : 'Failed to complete return', 'UPDATE_ERROR'));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getUserBookings = useCallback(async (userId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await api.booking.getUserBookings(userId);
      if (result.error) {
        setError(result.error);
        return [];
      }
      return result.data || [];
    } catch (err: unknown) {
      setError(new ApiError(err instanceof Error ? err.message : 'Failed to get user bookings', 'FETCH_ERROR'));
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const updateBooking = useCallback(async (bookingId: string, updates: Record<string, unknown>) => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.booking.updateBooking(bookingId, updates);
      if (result.error) {
        setError(result.error);
        return null;
      }
      return result.data;
    } catch (err: unknown) {
      setError(new ApiError(err instanceof Error ? err.message : 'Failed to update booking', 'UPDATE_ERROR'));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateBookingStatus = useCallback(async (bookingId: string, status: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await api.booking.updateBookingStatus(bookingId, status);
      if (result.error) {
        setError(result.error);
        return null;
      }
      return result.data;
    } catch (err: unknown) {
      setError(new ApiError(err instanceof Error ? err.message : 'Failed to update booking status', 'UPDATE_ERROR'));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const completeRental = useCallback(async (bookingId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await api.booking.completeRental(bookingId);
      if (result.error) {
        setError(result.error);
        return null;
      }
      return result.data;
    } catch (err: unknown) {
      setError(new ApiError(err instanceof Error ? err.message : 'Failed to complete rental', 'COMPLETION_ERROR'));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    createBooking,
    acceptBooking,
    rejectBooking,
    getRentalDashboard,
    confirmReturn,
    completeReturn,
    getUserBookings,
    updateBooking,
    updateBookingStatus,
    completeRental,
    loading,
    error
  };
};

// Payment API hooks
const usePaymentApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const createPaymentIntent = useCallback(async (bookingId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await api.payment.createPaymentIntent(bookingId);
      if (result.error) {
        setError(result.error);
        return null;
      }
      return result.data;
    } catch (err: unknown) {
      setError(new ApiError(err instanceof Error ? err.message : 'Failed to create payment intent', 'PAYMENT_ERROR'));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getTransactionDetails = useCallback(async (bookingId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await api.payment.getTransactionDetails(bookingId);
      if (result.error) {
        setError(result.error);
        return null;
      }
      return result.data;
    } catch (err: unknown) {
      setError(new ApiError(err instanceof Error ? err.message : 'Failed to get transaction details', 'FETCH_ERROR'));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getEscrowStatus = useCallback(async (bookingId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await api.payment.getEscrowStatus(bookingId);
      if (result.error) {
        setError(result.error);
        return null;
      }
      return result.data;
    } catch (err: unknown) {
      setError(new ApiError(err instanceof Error ? err.message : 'Failed to get escrow status', 'FETCH_ERROR'));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const createConnectedAccount = useCallback(async (ownerId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await api.payment.createConnectedAccount(ownerId);
      if (result.error) {
        setError(result.error);
        return null;
      }
      return result.data;
    } catch (err: unknown) {
      setError(new ApiError(err instanceof Error ? err.message : 'Failed to create connected account', 'CONNECT_ERROR'));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getConnectedAccountStatus = useCallback(async (ownerId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await api.payment.getConnectedAccountStatus(ownerId);
      if (result.error) {
        setError(result.error);
        return null;
      }
      return result.data;
    } catch (err: unknown) {
      setError(new ApiError(err instanceof Error ? err.message : 'Failed to get connected account status', 'FETCH_ERROR'));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const releaseEscrowFunds = useCallback(async (releaseData: Record<string, unknown>) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await api.payment.releaseEscrowFunds(releaseData);
      if (result.error) {
        setError(result.error);
        return null;
      }
      return result.data;
    } catch (err: unknown) {
      setError(new ApiError(err instanceof Error ? err.message : 'Failed to release escrow funds', 'ESCROW_ERROR'));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const processRefund = useCallback(async (transactionId: string, refundAmount: number, reason: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await api.payment.processRefund(transactionId, refundAmount, reason);
      if (result.error) {
        setError(result.error);
        return null;
      }
      return result.data;
    } catch (err: unknown) {
      setError(new ApiError(err instanceof Error ? err.message : 'Failed to process refund', 'REFUND_ERROR'));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    createPaymentIntent,
    getTransactionDetails,
    getEscrowStatus,
    createConnectedAccount,
    getConnectedAccountStatus,
    releaseEscrowFunds,
    processRefund,
    loading,
    error
  };
};

// Messaging API hooks
const useMessagingApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const sendMessage = useCallback(async (bookingId: string, content: string, messageType: 'text' | 'image' | 'system' = 'text') => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await api.messaging.sendMessage(bookingId, content, messageType);
      if (result.error) {
        setError(result.error);
        return null;
      }
      return result.data;
    } catch (err: unknown) {
      setError(new ApiError(err instanceof Error ? err.message : 'Failed to send message', 'SEND_ERROR'));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getBookingMessages = useCallback(async (bookingId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await api.messaging.getBookingMessages(bookingId);
      if (result.error) {
        setError(result.error);
        return [];
      }
      return result.data || [];
    } catch (err: unknown) {
      setError(new ApiError(err instanceof Error ? err.message : 'Failed to get messages', 'FETCH_ERROR'));
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const getUserConversations = useCallback(async (userId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await api.messaging.getUserConversations(userId);
      if (result.error) {
        setError(result.error);
        return [];
      }
      return result.data || [];
    } catch (err: unknown) {
      setError(new ApiError(err instanceof Error ? err.message : 'Failed to get conversations', 'FETCH_ERROR'));
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const createConversation = useCallback(async (conversationData: Record<string, unknown>) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await api.messaging.createConversation(conversationData);
      if (result.error) {
        setError(result.error);
        return null;
      }
      return result.data;
    } catch (err: unknown) {
      setError(new ApiError(err instanceof Error ? err.message : 'Failed to create conversation', 'CREATE_ERROR'));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getUnreadMessageCount = useCallback(async (userId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await api.messaging.getUnreadMessageCount(userId);
      if (result.error) {
        setError(result.error);
        return 0;
      }
      return result.data || 0;
    } catch (err: unknown) {
      setError(new ApiError(err instanceof Error ? err.message : 'Failed to get unread count', 'FETCH_ERROR'));
      return 0;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteConversation = useCallback(async (bookingId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await api.messaging.deleteConversation(bookingId);
      if (result.error) {
        setError(result.error);
        return false;
      }
      return true;
    } catch (err: unknown) {
      setError(new ApiError(err instanceof Error ? err.message : 'Failed to delete conversation', 'DELETE_ERROR'));
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    sendMessage,
    getBookingMessages,
    getUserConversations,
    createConversation,
    getUnreadMessageCount,
    deleteConversation,
    loading,
    error
  };
};

// Review API hooks
const useReviewApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const createReview = useCallback(async (reviewData: Record<string, unknown>) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await api.review.createReview(reviewData);
      if (result.error) {
        setError(result.error);
        return null;
      }
      return result.data;
    } catch (err: unknown) {
      setError(new ApiError(err instanceof Error ? err.message : 'Failed to create review', 'CREATE_ERROR'));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getGearReviews = useCallback(async (gearId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await api.review.getGearReviews(gearId);
      if (result.error) {
        setError(result.error);
        return [];
      }
      return result.data || [];
    } catch (err: unknown) {
      setError(new ApiError(err instanceof Error ? err.message : 'Failed to get gear reviews', 'FETCH_ERROR'));
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const updateReview = useCallback(async (reviewId: string, updates: Record<string, unknown>) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await api.review.updateReview(reviewId, updates);
      if (result.error) {
        setError(result.error);
        return null;
      }
      return result.data;
    } catch (err: unknown) {
      setError(new ApiError(err instanceof Error ? err.message : 'Failed to update review', 'UPDATE_ERROR'));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteReview = useCallback(async (reviewId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await api.review.deleteReview(reviewId);
      if (result.error) {
        setError(result.error);
        return false;
      }
      return true;
    } catch (err: unknown) {
      setError(new ApiError(err instanceof Error ? err.message : 'Failed to delete review', 'DELETE_ERROR'));
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const getUserReviews = useCallback(async (userId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await api.review.getUserReviews(userId);
      if (result.error) {
        setError(result.error);
        return [];
      }
      return result.data || [];
    } catch (err: unknown) {
      setError(new ApiError(err instanceof Error ? err.message : 'Failed to get user reviews', 'FETCH_ERROR'));
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const getUserRatingStats = useCallback(async (userId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await api.review.getUserRatingStats(userId);
      if (result.error) {
        setError(result.error);
        return null;
      }
      return result.data;
    } catch (err: unknown) {
      setError(new ApiError(err instanceof Error ? err.message : 'Failed to get user rating stats', 'FETCH_ERROR'));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    createReview,
    getGearReviews,
    updateReview,
    deleteReview,
    getUserReviews,
    getUserRatingStats,
    loading,
    error
  };
};

// Claims API hooks
const useClaimsApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const createClaim = useCallback(async (claimData: Record<string, unknown>) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await api.claims.createClaim(claimData);
      if (result.error) {
        setError(result.error);
        return null;
      }
      return result.data;
    } catch (err: unknown) {
      setError(new ApiError(err instanceof Error ? err.message : 'Failed to create claim', 'CREATE_ERROR'));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getBookingClaims = useCallback(async (bookingId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await api.claims.getBookingClaims(bookingId);
      if (result.error) {
        setError(result.error);
        return [];
      }
      return result.data || [];
    } catch (err: unknown) {
      setError(new ApiError(err instanceof Error ? err.message : 'Failed to get claims', 'FETCH_ERROR'));
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const updateClaimStatus = useCallback(async (claimId: string, updates: Record<string, unknown>) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await api.claims.updateClaimStatus(claimId, updates);
      if (result.error) {
        setError(result.error);
        return null;
      }
      return result.data;
    } catch (err: unknown) {
      setError(new ApiError(err instanceof Error ? err.message : 'Failed to update claim status', 'UPDATE_ERROR'));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const uploadEvidence = useCallback(async (claimId: string, evidenceData: Record<string, unknown>) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await api.claims.uploadEvidence(claimId, evidenceData);
      if (result.error) {
        setError(result.error);
        return null;
      }
      return result.data;
    } catch (err: unknown) {
      setError(new ApiError(err instanceof Error ? err.message : 'Failed to upload evidence', 'UPLOAD_ERROR'));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getClaimEvidence = useCallback(async (claimId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await api.claims.getClaimEvidence(claimId);
      if (result.error) {
        setError(result.error);
        return [];
      }
      return result.data || [];
    } catch (err: unknown) {
      setError(new ApiError(err instanceof Error ? err.message : 'Failed to get claim evidence', 'FETCH_ERROR'));
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    createClaim,
    getBookingClaims,
    updateClaimStatus,
    uploadEvidence,
    getClaimEvidence,
    loading,
    error
  };
};

// Notification API hooks
const useNotificationApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const getUserNotifications = useCallback(async (userId: string, limit: number = 50) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await api.notification.getUserNotifications(userId, limit);
      if (result.error) {
        setError(result.error);
        return [];
      }
      return result.data || [];
    } catch (err: unknown) {
      setError(new ApiError(err instanceof Error ? err.message : 'Failed to get notifications', 'FETCH_ERROR'));
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const getUnreadCount = useCallback(async (userId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await api.notification.getUnreadCount(userId);
      if (result.error) {
        setError(result.error);
        return 0;
      }
      return result.data || 0;
    } catch (err: unknown) {
      setError(new ApiError(err instanceof Error ? err.message : 'Failed to get unread count', 'FETCH_ERROR'));
      return 0;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    getUserNotifications,
    getUnreadCount,
    loading,
    error
  };
};

// Photo API hooks
const usePhotoApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const uploadHandoverPhoto = useCallback(async (photoData: Record<string, unknown>) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await api.photo.uploadHandoverPhoto(photoData);
      if (result.error) {
        setError(result.error);
        return null;
      }
      return result.data;
    } catch (err: unknown) {
      setError(new ApiError(err instanceof Error ? err.message : 'Failed to upload photo', 'UPLOAD_ERROR'));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getHandoverPhotos = useCallback(async (bookingId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await api.photo.getHandoverPhotos(bookingId);
      if (result.error) {
        setError(result.error);
        return [];
      }
      return result.data || [];
    } catch (err: unknown) {
      setError(new ApiError(err instanceof Error ? err.message : 'Failed to get photos', 'FETCH_ERROR'));
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    uploadHandoverPhoto,
    getHandoverPhotos,
    loading,
    error
  };
};

// Export all hooks
export {
  useUserApi,
  useGearApi,
  useBookingApi,
  usePaymentApi,
  useMessagingApi,
  useReviewApi,
  useClaimsApi,
  useNotificationApi,
  usePhotoApi
}; 