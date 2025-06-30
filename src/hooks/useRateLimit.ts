
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useRateLimit = () => {
  const [isChecking, setIsChecking] = useState(false);

  const checkRateLimit = async (actionType: string, maxActions = 10, windowMinutes = 60): Promise<boolean> => {
    setIsChecking(true);
    
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
    } finally {
      setIsChecking(false);
    }
  };

  return { checkRateLimit, isChecking };
};
