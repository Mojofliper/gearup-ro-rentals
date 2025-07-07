import { supabase } from '@/integrations/supabase/client';

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  keyGenerator?: (userId: string, action: string) => string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

class RateLimitService {
  private configs: Map<string, RateLimitConfig> = new Map();

  constructor() {
    this.initializeDefaultConfigs();
  }

  private initializeDefaultConfigs(): void {
    // Booking creation: 5 per hour
    this.configs.set('booking_create', {
      maxRequests: 5,
      windowMs: 60 * 60 * 1000, // 1 hour
    });

    // Message sending: 20 per hour
    this.configs.set('message_send', {
      maxRequests: 20,
      windowMs: 60 * 60 * 1000, // 1 hour
    });

    // Gear listing: 3 per day
    this.configs.set('gear_create', {
      maxRequests: 3,
      windowMs: 24 * 60 * 60 * 1000, // 24 hours
    });

    // Review submission: 10 per day
    this.configs.set('review_submit', {
      maxRequests: 10,
      windowMs: 24 * 60 * 60 * 1000, // 24 hours
    });

    // Payment attempts: 10 per hour
    this.configs.set('payment_attempt', {
      maxRequests: 10,
      windowMs: 60 * 60 * 1000, // 1 hour
    });

    // Login attempts: 5 per 15 minutes
    this.configs.set('login_attempt', {
      maxRequests: 5,
      windowMs: 15 * 60 * 1000, // 15 minutes
    });

    // API requests: 100 per hour
    this.configs.set('api_request', {
      maxRequests: 100,
      windowMs: 60 * 60 * 1000, // 1 hour
    });

    // Photo uploads: 20 per hour
    this.configs.set('photo_upload', {
      maxRequests: 20,
      windowMs: 60 * 60 * 1000, // 1 hour
    });

    // Claim submissions: 3 per day
    this.configs.set('claim_submit', {
      maxRequests: 3,
      windowMs: 24 * 60 * 60 * 1000, // 24 hours
    });
  }

  async checkRateLimit(
    userId: string,
    action: string,
    customConfig?: RateLimitConfig
  ): Promise<RateLimitResult> {
    try {
      const config = customConfig || this.configs.get(action);
      if (!config) {
        // No rate limit configured for this action
        return {
          allowed: true,
          remaining: -1,
          resetTime: Date.now(),
        };
      }

      const key = config.keyGenerator 
        ? config.keyGenerator(userId, action)
        : `${userId}:${action}`;

      const now = Date.now();
      const windowStart = now - config.windowMs;

      // Get current rate limit data
      const { data: rateLimitData, error } = await supabase
        .from('rate_limits')
        .select('*')
        .eq('key', key)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking rate limit:', error);
        return {
          allowed: true, // Allow on error
          remaining: -1,
          resetTime: now + config.windowMs,
        };
      }

      let currentCount = 0;
      let lastReset = now;

      if (rateLimitData) {
        // Check if we need to reset the window
        if (rateLimitData.last_request < windowStart) {
          // Window has expired, reset
          currentCount = 1;
          lastReset = now;
        } else {
          // Window is still active
          currentCount = rateLimitData.request_count + 1;
          lastReset = rateLimitData.last_request;
        }
      } else {
        // First request
        currentCount = 1;
        lastReset = now;
      }

      const allowed = currentCount <= config.maxRequests;
      const remaining = Math.max(0, config.maxRequests - currentCount);
      const resetTime = lastReset + config.windowMs;

      // Update rate limit data
      await this.updateRateLimitData(key, currentCount, now, allowed);

      return {
        allowed,
        remaining,
        resetTime,
        retryAfter: allowed ? undefined : Math.ceil((resetTime - now) / 1000),
      };
    } catch (error) {
      console.error('Error in rate limit check:', error);
      return {
        allowed: true, // Allow on error
        remaining: -1,
        resetTime: Date.now(),
      };
    }
  }

  private async updateRateLimitData(
    key: string,
    count: number,
    timestamp: number,
    allowed: boolean
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('rate_limits')
        .upsert({
          key,
          request_count: count,
          last_request: new Date(timestamp).toISOString(),
          blocked: !allowed,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'key'
        });

      if (error) {
        console.error('Error updating rate limit data:', error);
      }
    } catch (error) {
      console.error('Error updating rate limit data:', error);
    }
  }

  async isRateLimited(userId: string, action: string): Promise<boolean> {
    const result = await this.checkRateLimit(userId, action);
    return !result.allowed;
  }

  async getRemainingRequests(userId: string, action: string): Promise<number> {
    const result = await this.checkRateLimit(userId, action);
    return result.remaining;
  }

  async resetRateLimit(userId: string, action: string): Promise<void> {
    try {
      const key = `${userId}:${action}`;
      const { error } = await supabase
        .from('rate_limits')
        .delete()
        .eq('key', key);

      if (error) {
        console.error('Error resetting rate limit:', error);
      }
    } catch (error) {
      console.error('Error resetting rate limit:', error);
    }
  }

  // Utility methods for common rate limit checks
  async checkBookingCreation(userId: string): Promise<RateLimitResult> {
    return this.checkRateLimit(userId, 'booking_create');
  }

  async checkMessageSending(userId: string): Promise<RateLimitResult> {
    return this.checkRateLimit(userId, 'message_send');
  }

  async checkGearCreation(userId: string): Promise<RateLimitResult> {
    return this.checkRateLimit(userId, 'gear_create');
  }

  async checkReviewSubmission(userId: string): Promise<RateLimitResult> {
    return this.checkRateLimit(userId, 'review_submit');
  }

  async checkPaymentAttempt(userId: string): Promise<RateLimitResult> {
    return this.checkRateLimit(userId, 'payment_attempt');
  }

  async checkLoginAttempt(identifier: string): Promise<RateLimitResult> {
    return this.checkRateLimit(identifier, 'login_attempt');
  }

  async checkApiRequest(userId: string): Promise<RateLimitResult> {
    return this.checkRateLimit(userId, 'api_request');
  }

  async checkPhotoUpload(userId: string): Promise<RateLimitResult> {
    return this.checkRateLimit(userId, 'photo_upload');
  }

  async checkClaimSubmission(userId: string): Promise<RateLimitResult> {
    return this.checkRateLimit(userId, 'claim_submit');
  }

  // Decorator function for easy rate limiting
  static withRateLimit(action: string) {
    return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
      const method = descriptor.value;

      descriptor.value = async function (...args: any[]) {
        const rateLimitService = new RateLimitService();
        const userId = args[0]?.userId || args[0]?.user_id || 'anonymous';

        const result = await rateLimitService.checkRateLimit(userId, action);
        if (!result.allowed) {
          throw new Error(`Rate limit exceeded for ${action}. Try again in ${result.retryAfter} seconds.`);
        }

        return method.apply(this, args);
      };
    };
  }
}

export const rateLimitService = new RateLimitService();

// React Hook for rate limiting
export const useRateLimit = (action: string) => {
  const checkLimit = async (userId: string): Promise<RateLimitResult> => {
    return rateLimitService.checkRateLimit(userId, action);
  };

  const isLimited = async (userId: string): Promise<boolean> => {
    return rateLimitService.isRateLimited(userId, action);
  };

  const getRemaining = async (userId: string): Promise<number> => {
    return rateLimitService.getRemainingRequests(userId, action);
  };

  const reset = async (userId: string): Promise<void> => {
    return rateLimitService.resetRateLimit(userId, action);
  };

  return {
    checkLimit,
    isLimited,
    getRemaining,
    reset,
  };
}; 