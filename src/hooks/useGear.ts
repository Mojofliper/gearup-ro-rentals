import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { gearApi } from '@/services/apiService';
import { authErrorHandler } from '@/utils/authErrorHandler';
import { isSessionReady } from '@/utils/security';
import { useGearApi } from './useApi';
import { useAuthQuery, useAuthMutation } from './useAuthQuery';
import { GearData, GearUpdate } from '@/integrations/supabase/types';
import { getGearUnavailableDates } from '@/services/apiService';

export const useAllGear = () => {
  const { getAvailableGear } = useGearApi();
  
  return useQuery({
    queryKey: ['all-gear'],
    queryFn: async () => {
      return await getAvailableGear();
    },
    staleTime: 2 * 60 * 1000, // 2 minutes for gear listings
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      // Retry up to 3 times for network errors
      return failureCount < 3;
    },
    retryDelay: 1000,
  });
};

export const useGearById = (gearId: string) => {
  const { getGearItem } = useGearApi();
  
  return useQuery({
    queryKey: ['gear', gearId],
    queryFn: async () => {
      return await getGearItem(gearId);
    },
    enabled: !!gearId,
    staleTime: 5 * 60 * 1000, // 5 minutes for individual gear
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      return failureCount < 3;
    },
    retryDelay: 1000,
  });
};

export const useCreateGear = () => {
  const queryClient = useQueryClient();
  const { createGear } = useGearApi();
  
  return useMutation({
    mutationFn: async (gearData: Record<string, unknown>) => {
      // Check if session is ready before making the API call
      const sessionReady = await isSessionReady();
      if (!sessionReady) {
        throw new Error('Session not ready. Please try again.');
      }
      
      const result = await createGear(gearData);
      
      // The useGearApi.createGear returns the data directly or null on error
      if (!result) {
        throw new Error('Failed to create gear: No result returned from API');
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-gear'] });
      queryClient.invalidateQueries({ queryKey: ['user-listings'] });
    },
    onError: (error: unknown) => {
      console.error('useCreateGear error:', error);
      // Handle auth errors
      if (authErrorHandler.isAuthError(error)) {
        authErrorHandler.handleAuthError(error).catch(console.error);
      }
    },
  });
};

export const useUpdateGear = () => {
  const queryClient = useQueryClient();
  const { updateGear } = useGearApi();
  
  return useMutation({
    mutationFn: async ({ gearId, updates }: { gearId: string; updates: Record<string, unknown> }) => {
      return await updateGear(gearId, updates);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['gear', variables.gearId] });
      queryClient.invalidateQueries({ queryKey: ['all-gear'] });
      queryClient.invalidateQueries({ queryKey: ['user-listings'] });
    },
  });
};

export const useDeleteGear = () => {
  const queryClient = useQueryClient();
  const { deleteGear } = useGearApi();
  
  return useMutation({
    mutationFn: async (gearId: string) => {
      return await deleteGear(gearId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-gear'] });
      queryClient.invalidateQueries({ queryKey: ['user-listings'] });
    },
  });
};

export const useGearByCategory = (categoryId: string) => {
  const { getAvailableGear } = useGearApi();
  
  return useQuery({
    queryKey: ['gear-by-category', categoryId],
    queryFn: async () => {
      return await getAvailableGear({ category_id: categoryId });
    },
    enabled: !!categoryId,
    staleTime: 2 * 60 * 1000, // 2 minutes for category gear
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      return failureCount < 3;
    },
    retryDelay: 1000,
  });
};

export const useGearByLocation = (latitude: number, longitude: number, radius: number = 50) => {
  const { searchByLocation } = useGearApi();
  
  return useQuery({
    queryKey: ['gear-by-location', latitude, longitude, radius],
    queryFn: async () => {
      // For now, use searchByLocation with coordinates as string
      return await searchByLocation(`${latitude},${longitude}`);
    },
    enabled: !!(latitude && longitude),
    staleTime: 5 * 60 * 1000, // 5 minutes for location-based gear
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      return failureCount < 3;
    },
    retryDelay: 1000,
  });
};

export const useGearByOwner = (ownerId: string) => {
  const { getAvailableGear } = useGearApi();
  
  return useQuery({
    queryKey: ['gear-by-owner', ownerId],
    queryFn: async () => {
      return await getAvailableGear({ owner_id: ownerId });
    },
    enabled: !!ownerId,
    staleTime: 2 * 60 * 1000, // 2 minutes for owner gear
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      return failureCount < 3;
    },
    retryDelay: 1000,
  });
};

export const useSearchGear = (searchTerm: string) => {
  const { searchByBrandModel } = useGearApi();
  
  return useQuery({
    queryKey: ['search-gear', searchTerm],
    queryFn: async () => {
      return await searchByBrandModel(searchTerm);
    },
    enabled: !!searchTerm && searchTerm.length >= 2,
    staleTime: 1 * 60 * 1000, // 1 minute for search results
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      return failureCount < 3;
    },
    retryDelay: 1000,
  });
};

export const useFeaturedGear = () => {
  const { getAvailableGear } = useGearApi();
  
  return useQuery({
    queryKey: ['featured-gear'],
    queryFn: async () => {
      // Use getAvailableGear with featured filter
      return await getAvailableGear({ featured: true });
    },
    staleTime: 10 * 60 * 1000, // 10 minutes for featured gear
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      return failureCount < 3;
    },
    retryDelay: 1000,
  });
};

export const useGearAvailability = (gearId: string, startDate: string, endDate: string) => {
  const { getGearItem } = useGearApi();
  
  return useQuery({
    queryKey: ['gear-availability', gearId, startDate, endDate],
    queryFn: async () => {
      // For now, return the gear item and calculate availability client-side
      // This would need to be implemented in the API
      const gearItem = await getGearItem(gearId);
      return {
        gear: gearItem,
        available: true, // Placeholder
        conflictingBookings: [] // Placeholder
      };
    },
    enabled: !!(gearId && startDate && endDate),
    staleTime: 1 * 60 * 1000, // 1 minute for availability
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      return failureCount < 3;
    },
    retryDelay: 1000,
  });
};

export const useGearUnavailableDates = (gearId: string | undefined) => {
  return useQuery({
    queryKey: ['gear-unavailable-dates', gearId],
    queryFn: async () => {
      if (!gearId) return [];
      return await getGearUnavailableDates(gearId);
    },
    enabled: !!gearId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};