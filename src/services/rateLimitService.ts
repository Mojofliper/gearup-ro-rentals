import { supabase } from "@/integrations/supabase/client";

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
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
    this.configs.set("booking_create", {
      maxRequests: 5,
      windowMs: 60 * 60 * 1000, // 1 hour
    });

    // Message sending: 20 per hour
    this.configs.set("message_send", {
      maxRequests: 20,
      windowMs: 60 * 60 * 1000, // 1 hour
    });

    // Gear listing: 3 per day
    this.configs.set("gear_create", {
      maxRequests: 3,
      windowMs: 24 * 60 * 60 * 1000, // 24 hours
    });

    // Review submission: 10 per day
    this.configs.set("review_submit", {
      maxRequests: 10,
      windowMs: 24 * 60 * 60 * 1000, // 24 hours
    });

    // Payment attempts: 10 per hour
    this.configs.set("payment_attempt", {
      maxRequests: 10,
      windowMs: 60 * 60 * 1000, // 1 hour
    });

    // Login attempts: 5 per 15 minutes
    this.configs.set("login_attempt", {
      maxRequests: 5,
      windowMs: 15 * 60 * 1000, // 15 minutes
    });

    // API requests: 100 per hour
    this.configs.set("api_request", {
      maxRequests: 100,
      windowMs: 60 * 60 * 1000, // 1 hour
    });

    // Photo uploads: 20 per hour
    this.configs.set("photo_upload", {
      maxRequests: 20,
      windowMs: 60 * 60 * 1000, // 1 hour
    });

    // Claim submissions: 3 per day
    this.configs.set("claim_submit", {
      maxRequests: 3,
      windowMs: 24 * 60 * 60 * 1000, // 24 hours
    });
  }

  async checkRateLimit(
    userId: string,
    action: string,
    customConfig?: RateLimitConfig,
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

      const now = new Date();
      const windowStart = new Date(now.getTime() - config.windowMs);

      // Get current rate limit data for this user and action
      const { data: rateLimitData, error } = await supabase
        .from("rate_limits")
        .select("*")
        .eq("user_id", userId)
        .eq("action_type", action)
        .gte("window_start", windowStart.toISOString())
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error checking rate limit:", error);
        return {
          allowed: true, // Allow on error
          remaining: -1,
          resetTime: now.getTime() + config.windowMs,
        };
      }

      let currentCount = 1;
      let windowStartTime = now;

      if (rateLimitData) {
        // Window is still active, increment count
        currentCount = rateLimitData.action_count + 1;
        windowStartTime = new Date(rateLimitData.window_start);
      }

      const allowed = currentCount <= config.maxRequests;
      const remaining = Math.max(0, config.maxRequests - currentCount);
      const resetTime = windowStartTime.getTime() + config.windowMs;

      // Update rate limit data
      await this.updateRateLimitData(
        userId,
        action,
        currentCount,
        windowStartTime,
        allowed,
      );

      return {
        allowed,
        remaining,
        resetTime,
        retryAfter: allowed
          ? undefined
          : Math.ceil((resetTime - now.getTime()) / 1000),
      };
    } catch (error) {
      console.error("Error in rate limit check:", error);
      return {
        allowed: true, // Allow on error
        remaining: -1,
        resetTime: Date.now(),
      };
    }
  }

  private async updateRateLimitData(
    userId: string,
    actionType: string,
    count: number,
    windowStart: Date,
    allowed: boolean,
  ): Promise<void> {
    try {
      const windowEnd = new Date(
        windowStart.getTime() + this.configs.get(actionType)?.windowMs ||
          3600000,
      );

      const { error } = await supabase.from("rate_limits").upsert(
        {
          user_id: userId,
          action_type: actionType,
          action_count: count,
          window_start: windowStart.toISOString(),
          window_end: windowEnd.toISOString(),
          created_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,action_type",
        },
      );

      if (error) {
        console.error("Error updating rate limit data:", error);
      }
    } catch (error) {
      console.error("Error updating rate limit data:", error);
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
      const { error } = await supabase
        .from("rate_limits")
        .delete()
        .eq("user_id", userId)
        .eq("action_type", action);

      if (error) {
        console.error("Error resetting rate limit:", error);
      }
    } catch (error) {
      console.error("Error resetting rate limit:", error);
    }
  }

  // Utility methods for common rate limit checks
  async checkBookingCreation(userId: string): Promise<RateLimitResult> {
    return this.checkRateLimit(userId, "booking_create");
  }

  async checkMessageSending(userId: string): Promise<RateLimitResult> {
    return this.checkRateLimit(userId, "message_send");
  }

  async checkGearCreation(userId: string): Promise<RateLimitResult> {
    return this.checkRateLimit(userId, "gear_create");
  }

  async checkReviewSubmission(userId: string): Promise<RateLimitResult> {
    return this.checkRateLimit(userId, "review_submit");
  }

  async checkPaymentAttempt(userId: string): Promise<RateLimitResult> {
    return this.checkRateLimit(userId, "payment_attempt");
  }

  async checkLoginAttempt(identifier: string): Promise<RateLimitResult> {
    return this.checkRateLimit(identifier, "login_attempt");
  }

  async checkApiRequest(userId: string): Promise<RateLimitResult> {
    return this.checkRateLimit(userId, "api_request");
  }

  async checkPhotoUpload(userId: string): Promise<RateLimitResult> {
    return this.checkRateLimit(userId, "photo_upload");
  }

  async checkClaimSubmission(userId: string): Promise<RateLimitResult> {
    return this.checkRateLimit(userId, "claim_submit");
  }
}

// Create singleton instance
const rateLimitService = new RateLimitService();

// Higher-order function to wrap API calls with rate limiting
export function withRateLimit(action: string) {
  return function <T extends unknown[], R>(
    target: (...args: T) => Promise<R>,
  ): (...args: T) => Promise<R> {
    return async (...args: T): Promise<R> => {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      const result = await rateLimitService.checkRateLimit(user.id, action);
      if (!result.allowed) {
        throw new Error(
          `Rate limit exceeded for ${action}. Try again in ${result.retryAfter} seconds.`,
        );
      }

      return target(...args);
    };
  };
}

// Hook for React components
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

  return { checkLimit, isLimited, getRemaining, reset };
};

export default rateLimitService;
