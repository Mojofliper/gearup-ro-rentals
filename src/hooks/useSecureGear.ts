
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { secureApiCall, SecureApiError } from '@/utils/secureApi';

export const useSecureGear = () => {
  const [loading, setLoading] = useState(false);

  const createGear = async (gearData: any) => {
    setLoading(true);
    try {
      return await secureApiCall(
        async () => {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new SecureApiError('User not found', 'USER_NOT_FOUND', 401);

          const { data, error } = await supabase
            .from('gear')
            .insert({
              ...gearData,
              owner_id: user.id,
              price_per_day: Math.round(parseFloat(gearData.pricePerDay) * 100)
            })
            .select()
            .single();

          if (error) throw error;
          return data;
        },
        { requireAuth: true }
      );
    } finally {
      setLoading(false);
    }
  };

  const updateGear = async (gearId: string, updates: any) => {
    setLoading(true);
    try {
      return await secureApiCall(
        async () => {
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
    } finally {
      setLoading(false);
    }
  };

  const deleteGear = async (gearId: string) => {
    setLoading(true);
    try {
      return await secureApiCall(
        async () => {
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
    } finally {
      setLoading(false);
    }
  };

  return {
    createGear,
    updateGear,
    deleteGear,
    loading
  };
};
