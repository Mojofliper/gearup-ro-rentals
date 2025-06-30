
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

  return { checkRateLimit };
};
