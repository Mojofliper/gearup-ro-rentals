import { supabase } from '@/integrations/supabase/client';

export const useRateLimit = () => {
  const checkRateLimit = async (
    actionType: string, 
    maxActions: number = 10, 
    windowMinutes: number = 60
  ): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc('check_rate_limit', {
        action_type: actionType,
        max_actions: maxActions,
        window_minutes: windowMinutes
      });

      if (error) {
        console.error('Rate limit check error:', error);
        return false;
      }

      return data;
    } catch (error) {
      console.error('Rate limit check failed:', error);
      return false;
    }
  };

  const getRateLimitStatus = async (actionType: string) => {
    try {
      const { data, error } = await supabase
        .from('rate_limits')
        .select('*')
        .eq('action_type', actionType)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Rate limit status error:', error);
        return null;
      }

      if (!data) {
        return {
          isLimited: false,
          remaining: 10,
          limit: 10,
          resetTime: Date.now() + 3600000, // 1 hour from now
          windowStart: Date.now()
        };
      }

      const now = Date.now();
      const windowStart = new Date(data.window_start).getTime();
      const windowEnd = windowStart + (data.window_minutes * 60 * 1000);
      const isLimited = now < windowEnd && data.action_count >= data.max_actions;
      const remaining = Math.max(0, data.max_actions - data.action_count);

      return {
        isLimited,
        remaining,
        limit: data.max_actions,
        resetTime: windowEnd,
        windowStart
      };
    } catch (error) {
      console.error('Rate limit status failed:', error);
      return null;
    }
  };

  const resetRateLimit = async (actionType: string) => {
    try {
      const { error } = await supabase
        .from('rate_limits')
        .delete()
        .eq('action_type', actionType);

      if (error) {
        console.error('Rate limit reset error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Rate limit reset failed:', error);
      return false;
    }
  };

  return { checkRateLimit, getRateLimitStatus, resetRateLimit };
};
