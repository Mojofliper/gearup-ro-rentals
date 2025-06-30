
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSecureAuth } from './useSecureAuth';
import { secureApiCall, SecureApiError } from '@/utils/secureApi';
import { useRateLimit } from './useRateLimit';

export const useSecureGear = () => {
  const { requireAuth } = useSecureAuth();
  const { checkRateLimit } = useRateLimit();
  const [loading, setLoading] = useState(false);

  const createGear = async (gearData: any) => {
    return secureApiCall(
      async () => {
        requireAuth();
        
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new SecureApiError('User not found', 'USER_NOT_FOUND', 401);

        // Rate limit gear creation
        const allowed = await checkRateLimit('create_gear', 5, 60);
        if (!allowed) {
          throw new SecureApiError('Too many gear items created. Please wait.', 'RATE_LIMIT_EXCEEDED', 429);
        }

        const { data, error } = await supabase
          .from('gear')
          .insert({
            ...gearData,
            owner_id: user.id,
            price_per_day: Math.round(parseFloat(gearData.pricePerDay) * 100) // Convert to cents
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      },
      {
        requireAuth: true,
        rateLimit: {
          action: 'create_gear',
          maxActions: 5,
          windowMinutes: 60
        }
      }
    );
  };

  const updateGear = async (gearId: string, updates: any) => {
    return secureApiCall(
      async () => {
        requireAuth();
        
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new SecureApiError('User not found', 'USER_NOT_FOUND', 401);

        // Verify ownership
        const { data: existingGear, error: fetchError } = await supabase
          .from('gear')
          .select('owner_id')
          .eq('id', gearId)
          .single();

        if (fetchError) throw fetchError;
        if (existingGear.owner_id !== user.id) {
          throw new SecureApiError('Unauthorized', 'UNAUTHORIZED', 403);
        }

        const { data, error } = await supabase
          .from('gear')
          .update({
            ...updates,
            price_per_day: updates.pricePerDay ? Math.round(parseFloat(updates.pricePerDay) * 100) : undefined
          })
          .eq('id', gearId)
          .select()
          .single();

        if (error) throw error;
        return data;
      },
      { requireAuth: true }
    );
  };

  const deleteGear = async (gearId: string) => {
    return secureApiCall(
      async () => {
        requireAuth();
        
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new SecureApiError('User not found', 'USER_NOT_FOUND', 401);

        // Verify ownership
        const { data: existingGear, error: fetchError } = await supabase
          .from('gear')
          .select('owner_id')
          .eq('id', gearId)
          .single();

        if (fetchError) throw fetchError;
        if (existingGear.owner_id !== user.id) {
          throw new SecureApiError('Unauthorized', 'UNAUTHORIZED', 403);
        }

        const { error } = await supabase
          .from('gear')
          .delete()
          .eq('id', gearId);

        if (error) throw error;
        return true;
      },
      { requireAuth: true }
    );
  };

  return {
    createGear,
    updateGear,
    deleteGear,
    loading
  };
};
