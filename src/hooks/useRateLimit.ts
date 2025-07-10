import { supabase } from "@/integrations/supabase/client";

export const useRateLimit = () => {
  const checkRateLimit = async (
    actionType: string,
    maxActions: number = 10,
    windowMinutes: number = 60,
  ): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc("check_rate_limit", {
        action_type: actionType,
        max_actions: maxActions,
        window_minutes: windowMinutes,
      });

      if (error) {
        console.error("Rate limit check error:", error);
        return false;
      }

      return data;
    } catch (error) {
      console.error("Rate limit check failed:", error);
      return false;
    }
  };

  const getRateLimitStatus = async (actionType: string) => {
    try {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        console.error("No authenticated user for rate limit check");
        return null;
      }

      // Use the get_rate_limit_status function to get detailed status
      const { data, error } = await supabase.rpc("get_rate_limit_status", {
        action_type: actionType,
        max_actions: 10,
        window_minutes: 60,
      });

      if (error) {
        console.error("Rate limit status error:", error);
        return null;
      }

      if (!data || data.length === 0) {
        return {
          isLimited: false,
          remaining: 10,
          limit: 10,
          resetTime: Date.now() + 3600000, // 1 hour from now
          windowStart: Date.now(),
        };
      }

      const status = data[0];
      return {
        isLimited: status.is_limited,
        remaining: status.remaining,
        limit: status.limit,
        resetTime: new Date(status.reset_time).getTime(),
        windowStart: new Date(status.window_start).getTime(),
      };
    } catch (error) {
      console.error("Rate limit status failed:", error);
      return null;
    }
  };

  const resetRateLimit = async (actionType: string) => {
    try {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        console.error("No authenticated user for rate limit reset");
        return false;
      }

      // Delete rate limit records for this user and action type
      const { error } = await supabase
        .from("rate_limits")
        .delete()
        .eq("action_type", actionType)
        .eq("user_id", user.id);

      if (error) {
        console.error("Rate limit reset error:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Rate limit reset failed:", error);
      return false;
    }
  };

  return { checkRateLimit, getRateLimitStatus, resetRateLimit };
};
