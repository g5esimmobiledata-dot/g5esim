import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { setSettings, setLoading, setError } from '@/redux/slice/settingsSlice';
import { SettingsResponse } from '@/types/types';
import { useAppDispatch } from '@/redux/store/store';

export const useSettingsSync = () => {
  const dispatch = useAppDispatch();

  const {
    data: settingsResponse,
    isLoading,
    error,
    refetch,
  } = useQuery<SettingsResponse>({
    queryKey: ['/api/admin/settings'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Sync to Redux when data changes
  useEffect(() => {
    if (settingsResponse?.success && settingsResponse?.data) {
      dispatch(setSettings(settingsResponse.data));
    }
  }, [settingsResponse, dispatch]);

  // Sync loading state
  useEffect(() => {
    dispatch(setLoading(isLoading));
  }, [isLoading, dispatch]);

  // Sync error state
  useEffect(() => {
    if (error) {
      dispatch(setError((error as Error).message || 'Failed to fetch settings'));
    }
  }, [error, dispatch]);

  return { settingsResponse, isLoading, error, refetch };
};
