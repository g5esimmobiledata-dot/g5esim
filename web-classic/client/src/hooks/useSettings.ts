import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store/store';

// ✅ Get all settings object
export const useSettings = () => {
  return useSelector((state: RootState) => state.settings);
};

// ✅ Get specific setting by key
export const useSettingByKey = <
  K extends keyof Omit<RootState['settings'], 'isLoading' | 'error' | 'lastFetched'>,
>(
  key: K,
): string => {
  return useSelector((state: RootState) => state.settings[key] || '');
};

// ✅ Loading state
export const useSettingsLoading = (): boolean => {
  return useSelector((state: RootState) => state.settings?.isLoading || false);
};

// ✅ Error state
export const useSettingsError = (): string | null => {
  return useSelector((state: RootState) => state.settings?.error || null);
};
