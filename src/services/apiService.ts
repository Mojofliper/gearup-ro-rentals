import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

// Type definitions
type Tables = Database['public']['Tables'];
type User = Tables['users']['Row'];
type Gear = Tables['gear']['Row'];
type Booking = Tables['bookings']['Row'];
type Payment = Tables['payments']['Row'];
type Escrow = Tables['escrow']['Row'];
type Review = Tables['reviews']['Row'];
type Claim = Tables['claims']['Row'];
type Message = Tables['messages']['Row'];
type Notification = Tables['notifications']['Row'];

// API Error handling
export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Generic API response wrapper
export interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
}

// ============================================================================
// USER MANAGEMENT API
// ============================================================================

export const userApi = {
  // Get current user
  async getCurrentUser(): Promise<ApiResponse<User>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { data: null, error: new ApiError('User not authenticated', 'AUTH_REQUIRED', 401) };
      }

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: new ApiError(error.message, 'FETCH_ERROR') };
    }
  },

  // Update user profile
  async updateProfile(userId: string, updates: Partial<User>): Promise<ApiResponse<User>> {
    try {
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: new ApiError(error.message, 'UPDATE_ERROR') };
    }
  },

  // Get dashboard overview
  async getDashboardOverview(userId: string): Promise<ApiResponse<any>> {
    try {
      // Get user's bookings count
      const { count: bookingCount } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .or(`renter_id.eq.${userId},owner_id.eq.${userId}`);

      // Get user's gear count
      const { count: gearCount } = await supabase
        .from('gear')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', userId);

      // Get recent activity
      const recentActivity = await this.getRecentActivity(userId);

      return {
        data: {
          bookingCount: bookingCount || 0,
          gearCount: gearCount || 0,
          recentActivity
        },
        error: null
      };
    } catch (error: any) {
      return { data: null, error: new ApiError(error.message, 'FETCH_ERROR') };
    }
  },

  // Get recent activity for user
  async getRecentActivity(userId: string, limit: number = 10): Promise<ApiResponse<any[]>> {
    try {
      // Get recent bookings
      const { data: recentBookings } = await supabase
        .from('bookings')
        .select(`
          id,
          status,
          created_at,
          gear_id,
          renter_id,
          owner_id
        `)
        .or(`renter_id.eq.${userId},owner_id.eq.${userId}`)
        .order('created_at', { ascending: false })
        .limit(limit);

      // Get recent reviews
      const { data: recentReviews } = await supabase
        .from('reviews')
        .select(`
          id,
          rating,
          created_at,
          gear_id,
          reviewer_id,
          reviewed_id
        `)
        .or(`reviewer_id.eq.${userId},reviewed_id.eq.${userId}`)
        .order('created_at', { ascending: false })
        .limit(limit);

      // Get recent messages
      const { data: recentMessages } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          created_at,
          sender_id,
          booking_id
        `)
        .eq('sender_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      // Combine and sort all activities
      const activities = [
        ...(recentBookings || []).map(booking => ({
          id: booking.id,
          type: 'booking',
          action: booking.status === 'pending' ? 'booking_requested' : 
                  booking.status === 'confirmed' ? 'booking_confirmed' :
                  booking.status === 'completed' ? 'booking_completed' : 'booking_updated',
          title: `Rezervare #${booking.id}`,
          description: `${booking.status === 'pending' ? 'Cerere de rezervare' : 
                        booking.status === 'confirmed' ? 'Rezervare confirmată' :
                        booking.status === 'completed' ? 'Rezervare finalizată' : 'Rezervare actualizată'}`,
          timestamp: booking.created_at,
          data: booking
        })),
        ...(recentReviews || []).map(review => ({
          id: review.id,
          type: 'review',
          action: 'review_posted',
          title: `Recenzie ${review.rating}/5`,
          description: `Recenzie ${review.rating} stele`,
          timestamp: review.created_at,
          data: review
        })),
        ...(recentMessages || []).map(message => ({
          id: message.id,
          type: 'message',
          action: 'message_sent',
          title: 'Mesaj trimis',
          description: 'Mesaj trimis',
          timestamp: message.created_at,
          data: message
        }))
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
       .slice(0, limit);

      return { data: activities, error: null };
    } catch (error: any) {
      return { data: [], error: new ApiError(error.message, 'FETCH_ERROR') };
    }
  },

  // Upload verification document
  async uploadVerificationDocument(documentData: {
    document_type: string;
    document_url: string;
  }): Promise<ApiResponse<any>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { data: null, error: new ApiError('User not authenticated', 'AUTH_REQUIRED', 401) };
      }

      const { data, error } = await supabase
        .from('users')
        .update({
          is_verified: true
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: new ApiError(error.message, 'UPLOAD_ERROR') };
    }
  },

  // Get user verification status
  async getUserVerificationStatus(userId: string): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('is_verified')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: new ApiError(error.message, 'FETCH_ERROR') };
    }
  },

  // Get my equipment (owner)
  async getMyEquipment(userId: string): Promise<ApiResponse<any[]>> {
    try {
      const { data, error } = await supabase
        .from('gear')
        .select(`
          *,
          bookings(status, renter_id, start_date, end_date),
          users!bookings!renter_id(full_name)
        `)
        .eq('owner_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: new ApiError(error.message, 'FETCH_ERROR') };
    }
  },

  // Get my bookings (renter)
  async getMyBookings(userId: string): Promise<ApiResponse<any[]>> {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          gear(title, gear_photos),
          users!owner_id(full_name)
        `)
        .eq('renter_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: new ApiError(error.message, 'FETCH_ERROR') };
    }
  },

  // Get user notification preferences
  async getUserPreferences(userId: string): Promise<ApiResponse<any>> {
    try {
      // For now, return default preferences since notification_preferences table doesn't exist
      return { 
        data: {
          email_notifications: true,
          push_notifications: true,
          booking_updates: true,
          payment_updates: true,
          message_notifications: true,
          review_notifications: true
        }, 
        error: null 
      };
    } catch (error: any) {
      return { data: null, error: new ApiError(error.message, 'FETCH_ERROR') };
    }
  },

  // Update notification preferences
  async updatePreferences(userId: string, preferences: {
    email_notifications?: boolean;
    push_notifications?: boolean;
    sms_notifications?: boolean;
    booking_updates?: boolean;
    payment_updates?: boolean;
    message_notifications?: boolean;
    review_notifications?: boolean;
    marketing_emails?: boolean;
  }): Promise<ApiResponse<any>> {
    try {
      // For now, just return success since notification_preferences table doesn't exist
      return { data: preferences, error: null };
    } catch (error: any) {
      return { data: null, error: new ApiError(error.message, 'UPDATE_ERROR') };
    }
  },
};

// ============================================================================
// GEAR MANAGEMENT API
// ============================================================================

export const gearApi = {
  // Get all available gear
  async getAvailableGear(filters?: {
    category_id?: string;
    min_price?: number;
    max_price?: number;
    location?: string;
    search?: string;
  }): Promise<ApiResponse<Gear[]>> {
    try {
      let query = supabase
        .from('gear')
        .select(`
          *,
          categories!category_id(name, description, icon),
          users!owner_id(full_name, rating, total_reviews, avatar_url),
          gear_photos(photo_url, is_primary, description)
        `)
        .eq('status', 'available');

      if (filters?.category_id) {
        query = query.eq('category_id', filters.category_id);
      }
      if (filters?.min_price) {
        query = query.gte('daily_rate', filters.min_price);
      }
      if (filters?.max_price) {
        query = query.lte('daily_rate', filters.max_price);
      }
      if (filters?.location) {
        query = query.ilike('location', `%${filters.location}%`);
      }
      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: new ApiError(error.message, 'FETCH_ERROR') };
    }
  },

  // Get single gear item
  async getGearItem(gearId: string): Promise<ApiResponse<Gear>> {
    try {
      const { data, error } = await supabase
        .from('gear')
        .select(`
          *,
          categories!category_id(name, description, icon),
          users!owner_id(full_name, rating, total_reviews, avatar_url, location),
          gear_photos(photo_url, is_primary, description),
          gear_specifications(spec_key, spec_value)
        `)
        .eq('id', gearId)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: new ApiError(error.message, 'FETCH_ERROR') };
    }
  },

  // Create gear listing
  async createGear(gearData: Omit<Gear, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<Gear>> {
    try {
      console.log('apiService.createGear called with:', gearData);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('apiService.createGear: User not authenticated');
        return { data: null, error: new ApiError('User not authenticated', 'AUTH_REQUIRED', 401) };
      }

      // console.log('apiService.createGear: User authenticated:', user.id);

      // Ensure required fields are present
      const gearToCreate = {
        ...gearData,
        owner_id: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('apiService.createGear: Final gear data to insert:', gearToCreate);

      const { data, error } = await supabase
        .from('gear')
        .insert(gearToCreate)
        .select()
        .single();

      console.log('apiService.createGear: Supabase response:', { data, error });

      if (error) {
        console.error('apiService.createGear: Supabase error:', error);
        throw error;
      }
      
      console.log('apiService.createGear: Success, returning data:', data);
      return { data, error: null };
    } catch (error: any) {
      console.error('apiService.createGear: Exception caught:', error);
      return { data: null, error: new ApiError(error.message, 'CREATE_ERROR') };
    }
  },

  // Update gear listing
  async updateGear(gearId: string, updates: Partial<Gear>): Promise<ApiResponse<Gear>> {
    try {
      const { data, error } = await supabase
        .from('gear')
        .update(updates)
        .eq('id', gearId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: new ApiError(error.message, 'UPDATE_ERROR') };
    }
  },

  // Delete gear listing
  async deleteGear(gearId: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase
        .from('gear')
        .delete()
        .eq('id', gearId);

      if (error) throw error;
      return { data: null, error: null };
    } catch (error: any) {
      return { data: null, error: new ApiError(error.message, 'DELETE_ERROR') };
    }
  },

  // Upload gear photos
  async uploadGearPhotos(gearId: string, photos: Array<{
    photo_url: string;
    is_primary?: boolean;
    description?: string;
  }>): Promise<ApiResponse<any[]>> {
    try {
      const { data, error } = await supabase
        .from('gear_photos')
        .insert(photos.map(photo => ({ gear_id: gearId, ...photo })))
        .select();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: new ApiError(error.message, 'UPLOAD_ERROR') };
    }
  },

  // Get all categories
  async getAllCategories(): Promise<ApiResponse<any[]>> {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: new ApiError(error.message, 'FETCH_ERROR') };
    }
  },

  // Get category by slug
  async getCategoryBySlug(slug: string): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('name', slug)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: new ApiError(error.message, 'FETCH_ERROR') };
    }
  },

  // Create category (admin only)
  async createCategory(categoryData: {
    name: string;
    description?: string;
    icon?: string;
  }): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase
        .from('categories')
        .insert(categoryData)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: new ApiError(error.message, 'CREATE_ERROR') };
    }
  },

  // Advanced gear search with filters
  async searchGearWithFilters(filters: {
    category_id?: string;
    min_price?: number;
    max_price?: number;
    condition?: string;
    location?: string;
    search?: string;
    limit?: number;
  }): Promise<ApiResponse<Gear[]>> {
    try {
      let query = supabase
        .from('gear')
        .select(`
          *,
          categories!category_id(name, description, icon),
          users!owner_id(full_name, rating, total_reviews, avatar_url),
          gear_photos(photo_url, is_primary, description)
        `)
        .eq('status', 'available');

      if (filters.category_id) {
        query = query.eq('category_id', filters.category_id);
      }
      if (filters.min_price) {
        query = query.gte('daily_rate', filters.min_price);
      }
      if (filters.max_price) {
        query = query.lte('daily_rate', filters.max_price);
      }
      if (filters.location) {
        query = query.ilike('location', `%${filters.location}%`);
      }
      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(filters.limit || 50);

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: new ApiError(error.message, 'FETCH_ERROR') };
    }
  },

  // Search by location
  async searchByLocation(location: string): Promise<ApiResponse<Gear[]>> {
    try {
      const { data, error } = await supabase
        .from('gear')
        .select(`
          *,
          categories!category_id(name, description, icon),
          users!owner_id(full_name, rating, total_reviews, avatar_url),
          gear_photos(photo_url, is_primary, description)
        `)
        .eq('status', 'available')
        .ilike('location', `%${location}%`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: new ApiError(error.message, 'FETCH_ERROR') };
    }
  },

  // Search by brand/model
  async searchByBrandModel(searchTerm: string): Promise<ApiResponse<Gear[]>> {
    try {
      const { data, error } = await supabase
        .from('gear')
        .select(`
          *,
          categories!category_id(name, description, icon),
          users!owner_id(full_name, rating, total_reviews, avatar_url),
          gear_photos(photo_url, is_primary, description)
        `)
        .eq('status', 'available')
        .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: new ApiError(error.message, 'FETCH_ERROR') };
    }
  },

  // Get featured gear
  async getFeaturedGear(limit: number = 10): Promise<ApiResponse<Gear[]>> {
    try {
      const { data, error } = await supabase
        .from('gear')
        .select(`
          *,
          categories!category_id(name, description, icon),
          users!owner_id(full_name, rating, total_reviews, avatar_url),
          gear_photos(photo_url, is_primary, description)
        `)
        .eq('status', 'available')
        .eq('is_featured', true)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: new ApiError(error.message, 'FETCH_ERROR') };
    }
  },

  // Get gear images
  async getGearImages(gearId: string): Promise<ApiResponse<any[]>> {
    try {
      const { data, error } = await supabase
        .from('gear_photos')
        .select('*')
        .eq('gear_id', gearId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: new ApiError(error.message, 'FETCH_ERROR') };
    }
  },

  // Delete gear image
  async deleteGearImage(gearId: string, imageId: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase
        .from('gear_images')
        .delete()
        .eq('id', imageId)
        .eq('gear_id', gearId);

      if (error) throw error;
      return { data: null, error: null };
    } catch (error: any) {
      return { data: null, error: new ApiError(error.message, 'DELETE_ERROR') };
    }
  },

  // Get reviews for a specific gear
  async getGearReviews(gearId: string): Promise<ApiResponse<Review[]>> {
    try {
      // First get all bookings for this gear
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('id')
        .eq('gear_id', gearId);

      if (bookingsError) throw bookingsError;

      if (!bookings || bookings.length === 0) {
        return { data: [], error: null };
      }

      const bookingIds = bookings.map(b => b.id);

      // Then get reviews for these bookings
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          reviewer:users!reviews_reviewer_id_fkey(full_name, avatar_url),
          reviewed:users!reviews_reviewed_id_fkey(full_name, avatar_url)
        `)
        .in('booking_id', bookingIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: new ApiError(error.message, 'FETCH_ERROR') };
    }
  },
};

// ============================================================================
// BOOKING MANAGEMENT API
// ============================================================================

export const bookingApi = {
  // Create booking
  async createBooking(bookingData: {
    gear_id: string;
    start_date: string;
    end_date: string;
    pickup_location?: string;
    renter_notes?: string;
  }): Promise<ApiResponse<Booking>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { data: null, error: new ApiError('User not authenticated', 'AUTH_REQUIRED', 401) };
      }

      // Get gear details
      const { data: gear } = await supabase
        .from('gear')
        .select('owner_id, daily_rate, deposit_amount')
        .eq('id', bookingData.gear_id)
        .single();

      if (!gear) {
        return { data: null, error: new ApiError('Gear not found', 'RESOURCE_NOT_FOUND', 404) };
      }

      // Calculate booking details
      const startDate = new Date(bookingData.start_date);
      const endDate = new Date(bookingData.end_date);
      const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const totalAmount = gear.daily_rate * totalDays;
      const platformFee = totalAmount * 0.10; // 10% platform fee
      const ownerAmount = totalAmount - platformFee;

      const { data, error } = await supabase
        .from('bookings')
        .insert({
          gear_id: bookingData.gear_id,
          renter_id: user.id,
          owner_id: gear.owner_id,
          start_date: bookingData.start_date,
          end_date: bookingData.end_date,
          total_days: totalDays,
          daily_rate: gear.daily_rate,
          total_amount: totalAmount,
          platform_fee: platformFee,
          owner_amount: ownerAmount,
          deposit_amount: gear.deposit_amount,
          pickup_location: bookingData.pickup_location,
          pickup_instructions: bookingData.renter_notes,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: new ApiError(error.message, 'CREATE_ERROR') };
    }
  },

  // Accept booking and set pickup location
  async acceptBooking(bookingId: string, pickupLocation: string): Promise<ApiResponse<Booking>> {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .update({
          status: 'confirmed',
          pickup_location: pickupLocation
        })
        .eq('id', bookingId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: new ApiError(error.message, 'UPDATE_ERROR') };
    }
  },

  // Get rental dashboard data
  async getRentalDashboard(bookingId: string): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          gear(title, gear_photos),
          users!renter_id(full_name),
          users!owner_id(full_name),
          payments(status, amount)
        `)
        .eq('id', bookingId)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: new ApiError(error.message, 'FETCH_ERROR') };
    }
  },

  // Confirm return (renter)
  async confirmReturn(bookingId: string): Promise<ApiResponse<Booking>> {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .update({
          status: 'returned',
          return_confirmed_at: new Date().toISOString()
        })
        .eq('id', bookingId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: new ApiError(error.message, 'UPDATE_ERROR') };
    }
  },

  // Confirm return (owner)
  async completeReturn(bookingId: string): Promise<ApiResponse<Booking>> {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .update({
          status: 'completed',
          return_confirmed_at: new Date().toISOString()
        })
        .eq('id', bookingId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: new ApiError(error.message, 'UPDATE_ERROR') };
    }
  },

  async getUserBookings(userId: string): Promise<ApiResponse<Booking[]>> {
    try {
      // Fetch as renter
      const { data: asRenter, error: errorRenter } = await supabase
        .from('bookings')
        .select('*')
        .eq('renter_id', userId);

      // Fetch as owner
      const { data: asOwner, error: errorOwner } = await supabase
        .from('bookings')
        .select('*')
        .eq('owner_id', userId);

      if (errorRenter || errorOwner) throw errorRenter || errorOwner;
      
      // Combine and sort bookings
      const allBookings = [...(asRenter || []), ...(asOwner || [])];
      allBookings.sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      });

      // Fetch related data separately to avoid join issues
      const bookingIds = allBookings.map(b => b.id);
      const gearIds = [...new Set(allBookings.map(b => b.gear_id))];
      const userIds = [...new Set([
        ...allBookings.map(b => b.renter_id),
        ...allBookings.map(b => b.owner_id)
      ])];

      // Filter out falsy/invalid IDs
      const validGearIds = gearIds.filter(id => typeof id === 'string' && id.length === 36);
      const validUserIds = userIds.filter(id => typeof id === 'string' && id.length === 36);

      // Fetch gear data (avoid .in() with empty array)
      let gearData = [];
      if (validGearIds.length > 0) {
        const gearRes = await supabase
          .from('gear')
          .select('id, title, daily_rate, deposit_amount, location, status')
          .in('id', validGearIds);
        gearData = gearRes.data || [];
      }

      // Fetch user data (avoid .in() with empty array)
      let userData = [];
      if (validUserIds.length > 0) {
        const userRes = await supabase
          .from('users')
          .select('id, full_name, avatar_url, location')
          .in('id', validUserIds);
        userData = userRes.data || [];
      }

      // Map the data
      const data = allBookings.map(booking => ({
        ...booking,
        gear: gearData.find(g => g.id === booking.gear_id) || null,
        renter: userData.find(u => u.id === booking.renter_id) || null,
        owner: userData.find(u => u.id === booking.owner_id) || null,
      }));

      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: new ApiError(error.message, 'FETCH_ERROR') };
    }
  },

  // Update booking (generic)
  async updateBooking(bookingId: string, updates: Partial<Booking>): Promise<ApiResponse<Booking>> {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .update(updates)
        .eq('id', bookingId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: new ApiError(error.message, 'UPDATE_ERROR') };
    }
  }
};

// ============================================================================
// PAYMENT & ESCROW API
// ============================================================================

export const paymentApi = {
  // Create payment intent
  async createPaymentIntent(bookingId: string): Promise<ApiResponse<any>> {
    try {
      const { data: booking } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .single();

      if (!booking) {
        return { data: null, error: new ApiError('Booking not found', 'RESOURCE_NOT_FOUND', 404) };
      }

      // Call Stripe function to create payment intent
      const { data, error } = await supabase.functions.invoke('stripe-create-payment-intent', {
        body: {
          booking_id: bookingId,
          amount: booking.total_amount + booking.deposit_amount
        }
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: new ApiError(error.message, 'PAYMENT_ERROR') };
    }
  },

  // Get transaction details
  async getTransactionDetails(bookingId: string): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('booking_id', bookingId)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: new ApiError(error.message, 'FETCH_ERROR') };
    }
  },

  // Process refund
  async processRefund(transactionId: string, refundAmount: number, reason: string): Promise<ApiResponse<any>> {
    try {
      // First update the transaction record
      const { data: transactionData, error: transactionError } = await supabase
        .from('transactions')
        .update({
          refund_amount: refundAmount,
          refund_reason: reason,
          status: 'refunded'
        })
        .eq('id', transactionId)
        .select()
        .single();

      if (transactionError) throw transactionError;

      // Then call Stripe refund function
      const { data: stripeData, error: stripeError } = await supabase.functions.invoke('stripe-refund', {
        body: {
          transaction_id: transactionId,
          refund_amount: refundAmount,
          reason: reason
        }
      });

      if (stripeError) throw stripeError;
      return { data: { ...transactionData, stripe_refund: stripeData }, error: null };
    } catch (error: any) {
      return { data: null, error: new ApiError(error.message, 'REFUND_ERROR') };
    }
  },

  // Get escrow status
  async getEscrowStatus(bookingId: string): Promise<ApiResponse<any>> {
    try {
      // First try to get escrow transaction
      const { data: escrowTransaction, error: escrowError } = await supabase
        .from('escrow_transactions')
        .select('*')
        .eq('booking_id', bookingId)
        .single();

      if (!escrowError && escrowTransaction) {
        return { data: escrowTransaction, error: null };
      }

      // Fallback to transaction data if escrow doesn't exist
      const { data: transactionData, error: transactionError } = await supabase
        .from('transactions')
        .select('*')
        .eq('booking_id', bookingId)
        .single();

      if (transactionError) throw transactionError;
      
      // Transform transaction data to escrow format
      const escrowData = {
        booking_id: bookingId,
        transaction_id: transactionData.id,
        status: transactionData.status,
        rental_amount: transactionData.rental_amount,
        deposit_amount: transactionData.deposit_amount,
        platform_fee: transactionData.platform_fee,
        total_amount: transactionData.amount,
        is_escrow_active: transactionData.status === 'completed' || transactionData.status === 'processing'
      };
      
      return { data: escrowData, error: null };
    } catch (error: any) {
      return { data: null, error: new ApiError(error.message, 'FETCH_ERROR') };
    }
  },

  // Create Stripe Connect account
  async createConnectedAccount(ownerId: string): Promise<ApiResponse<any>> {
    try {
      // Call Stripe Connect edge function
      const { data, error } = await supabase.functions.invoke('stripe-connect-setup', {
        body: { owner_id: ownerId }
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: new ApiError(error.message, 'CONNECT_ERROR') };
    }
  },

  // Get connected account status
  async getConnectedAccountStatus(ownerId: string): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase
        .from('connected_accounts')
        .select('*')
        .eq('owner_id', ownerId)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: new ApiError(error.message, 'FETCH_ERROR') };
    }
  },

  // Release escrow funds
  async releaseEscrowFunds(releaseData: {
    transaction_id: string;
    booking_id: string;
    release_type: 'automatic' | 'manual';
    rental_amount: number;
    deposit_amount: number;
  }): Promise<ApiResponse<any>> {
    try {
      // Call escrow release edge function
      const { data, error } = await supabase.functions.invoke('escrow-release', {
        body: releaseData
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: new ApiError(error.message, 'ESCROW_ERROR') };
    }
  },
};

// ============================================================================
// MESSAGING API
// ============================================================================

export const messagingApi = {
  // Send message
  async sendMessage(bookingId: string, content: string, messageType: 'text' | 'image' = 'text'): Promise<ApiResponse<Message>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { data: null, error: new ApiError('User not authenticated', 'AUTH_REQUIRED', 401) };
      }

      const { data, error } = await supabase
        .from('messages')
        .insert({
          booking_id: bookingId,
          sender_id: user.id,
          message_type: messageType,
          content: content
        })
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: new ApiError(error.message, 'SEND_ERROR') };
    }
  },

  // Get booking messages
  async getBookingMessages(bookingId: string): Promise<ApiResponse<Message[]>> {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          users!sender_id(full_name, avatar_url)
        `)
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: new ApiError(error.message, 'FETCH_ERROR') };
    }
  },

  // Mark message as read
  async markMessageAsRead(messageId: string): Promise<ApiResponse<Message>> {
    try {
      const { data, error } = await supabase
        .from('messages')
        .update({
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('id', messageId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: new ApiError(error.message, 'UPDATE_ERROR') };
    }
  },

  // Get user conversations
  async getUserConversations(userId: string): Promise<ApiResponse<any[]>> {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          bookings(gear(title), users!renter_id(full_name), users!owner_id(full_name)),
          messages(content, created_at, is_read)
        `)
        .or(`participant1_id.eq.${userId},participant2_id.eq.${userId}`)
        .order('last_message_at', { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: new ApiError(error.message, 'FETCH_ERROR') };
    }
  },

  // Create conversation
  async createConversation(conversationData: {
    booking_id: string;
    participant1_id: string;
    participant2_id: string;
  }): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          booking_id: conversationData.booking_id,
          participant1_id: conversationData.participant1_id,
          participant2_id: conversationData.participant2_id,
          last_message_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: new ApiError(error.message, 'CREATE_ERROR') };
    }
  },

  // Get unread message count
  async getUnreadMessageCount(userId: string): Promise<ApiResponse<number>> {
    try {
      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .or(`conversations.participant1_id.eq.${userId},conversations.participant2_id.eq.${userId}`)
        .eq('is_read', false)
        .neq('sender_id', userId);

      if (error) throw error;
      return { data: count || 0, error: null };
    } catch (error: any) {
      return { data: null, error: new ApiError(error.message, 'FETCH_ERROR') };
    }
  },
};

// ============================================================================
// REVIEWS API
// ============================================================================

export const reviewApi = {
  // Create review
  async createReview(reviewData: {
    booking_id: string;
    reviewed_id: string;
    gear_id: string;
    rating: number;
    comment: string;
  }): Promise<ApiResponse<Review>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { data: null, error: new ApiError('User not authenticated', 'AUTH_REQUIRED', 401) };
      }

      const { data, error } = await supabase
        .from('reviews')
        .insert({
          booking_id: reviewData.booking_id,
          reviewer_id: user.id,
          reviewed_id: reviewData.reviewed_id,
          gear_id: reviewData.gear_id,
          rating: reviewData.rating,
          comment: reviewData.comment
        })
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: new ApiError(error.message, 'CREATE_ERROR') };
    }
  },

  // Get gear reviews
  async getGearReviews(gearId: string): Promise<ApiResponse<Review[]>> {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          reviewer:users!reviews_reviewer_id_fkey(full_name, avatar_url),
          reviewed:users!reviews_reviewed_id_fkey(full_name, avatar_url),
          booking:bookings!reviews_booking_id_fkey(
            gear:gear!bookings_gear_id_fkey(title, gear_photos)
          )
        `)
        .eq('booking.gear.id', gearId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: new ApiError(error.message, 'FETCH_ERROR') };
    }
  },

  // Get user reviews
  async getUserReviews(userId: string): Promise<ApiResponse<Review[]>> {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          reviewer:users!reviews_reviewer_id_fkey(full_name, avatar_url),
          reviewed:users!reviews_reviewed_id_fkey(full_name, avatar_url),
          booking:bookings!reviews_booking_id_fkey(
            gear:gear!bookings_gear_id_fkey(title, gear_photos)
          )
        `)
        .or(`reviewer_id.eq.${userId},reviewed_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: new ApiError(error.message, 'FETCH_ERROR') };
    }
  },

  // Get user rating and review count
  async getUserRatingStats(userId: string): Promise<ApiResponse<{ rating: number; totalReviews: number }>> {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('rating')
        .eq('reviewed_id', userId);

      if (error) throw error;
      
      const reviews = data || [];
      const totalReviews = reviews.length;
      const averageRating = totalReviews > 0 
        ? reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews 
        : 0;
      
      return { 
        data: { rating: averageRating, totalReviews }, 
        error: null 
      };
    } catch (error: any) {
      return { data: null, error: new ApiError(error.message, 'FETCH_ERROR') };
    }
  },

  // Update review
  async updateReview(reviewId: string, updates: {
    rating?: number;
    comment?: string;
  }): Promise<ApiResponse<Review>> {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .update(updates)
        .eq('id', reviewId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: new ApiError(error.message, 'UPDATE_ERROR') };
    }
  },
};

// ============================================================================
// CLAIMS API
// ============================================================================

export const claimsApi = {
  // Create claim
  async createClaim(claimData: {
    booking_id: string;
    claim_type: string;
    description: string;
    requested_amount?: number;
  }): Promise<ApiResponse<Claim>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { data: null, error: new ApiError('User not authenticated', 'AUTH_REQUIRED', 401) };
      }

      const { data, error } = await supabase
        .from('claims')
        .insert({
          booking_id: claimData.booking_id,
          claimant_id: user.id,
          claim_type: claimData.claim_type,
          description: claimData.description,
          requested_amount: claimData.requested_amount
        })
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: new ApiError(error.message, 'CREATE_ERROR') };
    }
  },

  // Get claims for booking
  async getBookingClaims(bookingId: string): Promise<ApiResponse<Claim[]>> {
    try {
      const { data, error } = await supabase
        .from('claims')
        .select(`
          *,
          users!claimant_id(full_name, avatar_url),
          claim_photos(*)
        `)
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: new ApiError(error.message, 'FETCH_ERROR') };
    }
  },

  // Update claim status (admin)
  async updateClaimStatus(claimId: string, updates: {
    status: string;
    resolution?: string;
    deposit_penalty?: number;
    admin_id?: string;
  }): Promise<ApiResponse<Claim>> {
    try {
      const { data, error } = await supabase
        .from('claims')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', claimId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: new ApiError(error.message, 'UPDATE_ERROR') };
    }
  },

  // Upload claim evidence
  async uploadEvidence(claimId: string, evidenceData: {
    evidence_type: string;
    evidence_url: string;
    description?: string;
  }): Promise<ApiResponse<any>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { data: null, error: new ApiError('User not authenticated', 'AUTH_REQUIRED', 401) };
      }

      const { data, error } = await supabase
        .from('claim_photos')
        .insert({
          claim_id: claimId,
          photo_url: evidenceData.evidence_url,
          description: evidenceData.description
        })
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: new ApiError(error.message, 'UPLOAD_ERROR') };
    }
  },

  // Get claim evidence
  async getClaimEvidence(claimId: string): Promise<ApiResponse<any[]>> {
    try {
      const { data, error } = await supabase
        .from('claim_photos')
        .select('*')
        .eq('claim_id', claimId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: new ApiError(error.message, 'FETCH_ERROR') };
    }
  },
};

// ============================================================================
// NOTIFICATIONS API
// ============================================================================

export const notificationApi = {
  // Get user notifications
  async getUserNotifications(userId: string, limit: number = 50): Promise<ApiResponse<Notification[]>> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: new ApiError(error.message, 'FETCH_ERROR') };
    }
  },

  // Mark notification as read
  async markNotificationAsRead(notificationId: string): Promise<ApiResponse<Notification>> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('id', notificationId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: new ApiError(error.message, 'UPDATE_ERROR') };
    }
  },

  // Get unread count
  async getUnreadCount(userId: string): Promise<ApiResponse<number>> {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .is('read_at', null);

      if (error) throw error;
      return { data: count || 0, error: null };
    } catch (error: any) {
      return { data: null, error: new ApiError(error.message, 'FETCH_ERROR') };
    }
  }
};

// ============================================================================
// PHOTO DOCUMENTATION API
// ============================================================================

export const photoApi = {
  // Upload handover photo
  async uploadHandoverPhoto(photoData: {
    booking_id: string;
    photo_type: 'pickup_renter' | 'pickup_owner' | 'return_renter' | 'return_owner';
    photo_url: string;
    metadata?: any;
  }): Promise<ApiResponse<any>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { data: null, error: new ApiError('User not authenticated', 'AUTH_REQUIRED', 401) };
      }

      const { data, error } = await supabase
        .from('handover_photos')
        .insert({
          booking_id: photoData.booking_id,
          uploaded_by: user.id,
          photo_type: photoData.photo_type,
          photo_url: photoData.photo_url,
          metadata: photoData.metadata
        })
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: new ApiError(error.message, 'UPLOAD_ERROR') };
    }
  },

  // Get handover photos
  async getHandoverPhotos(bookingId: string): Promise<ApiResponse<any[]>> {
    try {
      const { data, error } = await supabase
        .from('handover_photos')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: new ApiError(error.message, 'FETCH_ERROR') };
    }
  }
};

// ============================================================================
// EXPORT ALL APIs
// ============================================================================

export const api = {
  user: userApi,
  gear: gearApi,
  booking: bookingApi,
  payment: paymentApi,
  messaging: messagingApi,
  review: reviewApi,
  claims: claimsApi,
  notification: notificationApi,
  photo: photoApi
};

export default api; 