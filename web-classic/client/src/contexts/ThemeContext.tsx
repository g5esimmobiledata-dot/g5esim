// ThemeContext.tsx - Complete with Colors + Fonts Management
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';

type ThemeMode = 'light' | 'dark';
export type AdminThemeMode = 'light' | 'half-dark' | 'dark';

interface ColorTheme {
  primary: string;
  primarySecond: string;
  primaryLight: string;
  primaryDark: string;
}

interface FontTheme {
  heading: string;
  body: string;
}

interface ThemeContextType {
  // Light/Dark theme
  theme: ThemeMode;
  toggleTheme: () => void;
  isAdminRoute: boolean;
  adminTheme: AdminThemeMode;
  setAdminTheme: (theme: AdminThemeMode) => void;

  // Color theme
  colors: ColorTheme;
  updateColor: (key: keyof ColorTheme, color: string) => void;

  // Font theme
  fonts: FontTheme;
  updateFont: (key: keyof FontTheme, font: string) => void;

  // API methods - unified
  saveColorsToAPI: () => Promise<void>;
  loadColorsFromAPI: () => Promise<void>;
  resetColorsToDefault: () => void;

  // Additional methods
  saveThemeToAPI: () => Promise<void>;
  loadThemeFromAPI: () => Promise<void>;
  resetToDefaults: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const defaultColors: ColorTheme = {
  primary: '#14b8a6',
  primarySecond: '#0d9488',
  primaryLight: '#2dd4bf',
  primaryDark: '#0f766e',
};

const defaultFonts: FontTheme = {
  heading: 'Inter',
  body: 'Inter',
};

const defaultTheme: ThemeMode = 'light';

const isAdminThemeMode = (value: string | null): value is AdminThemeMode =>
  value === 'light' || value === 'half-dark' || value === 'dark';

// Available font options (Google Fonts)
export const availableFonts = [
  { value: 'Inter', label: 'Inter', category: 'Sans-serif' },
  { value: 'Roboto', label: 'Roboto', category: 'Sans-serif' },
  { value: 'Poppins', label: 'Poppins', category: 'Sans-serif' },
  { value: 'Montserrat', label: 'Montserrat', category: 'Sans-serif' },
  { value: 'Open Sans', label: 'Open Sans', category: 'Sans-serif' },
  { value: 'Lato', label: 'Lato', category: 'Sans-serif' },
  { value: 'Playfair Display', label: 'Playfair Display', category: 'Serif' },
  { value: 'Merriweather', label: 'Merriweather', category: 'Serif' },
  { value: 'Lora', label: 'Lora', category: 'Serif' },
  { value: 'Fira Code', label: 'Fira Code', category: 'Monospace' },
];

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const isAdminRoute = location.startsWith('/admin');
  const routeTheme: ThemeMode = location === '/' ? 'dark' : 'light';

  // Light/Dark theme state
  const [theme, setTheme] = useState<ThemeMode | null>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme');
      if (stored === 'light' || stored === 'dark') return stored;
    }
    return null;
  });

  const [adminTheme, setAdminThemeState] = useState<AdminThemeMode>(() => {
    if (typeof window !== 'undefined') {
      const storedMode = localStorage.getItem('adminThemeMode');
      if (isAdminThemeMode(storedMode)) {
        return storedMode;
      }

      const legacyStored = localStorage.getItem('adminTheme');
      if (isAdminThemeMode(legacyStored)) return legacyStored;
    }
    return 'half-dark';
  });

  const activeTheme: ThemeMode = isAdminRoute
    ? adminTheme === 'light'
      ? 'light'
      : 'dark'
    : theme ?? routeTheme;

  // Color theme state
  const [colors, setColors] = useState<ColorTheme>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('customTheme');
      if (saved) {
        return JSON.parse(saved) as ColorTheme;
      }
    }
    return defaultColors;
  });

  // Font theme state
  const [fonts, setFonts] = useState<FontTheme>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('customFonts');
      if (saved) {
        return JSON.parse(saved) as FontTheme;
      }
    }
    return defaultFonts;
  });

  // Fetch Public Settings from API
  // const { data: serverSettings } = useQuery<any>({
  //   queryKey: ['/api/public/settings'],
  //   staleTime: 1000 * 60 * 10, // Cache for 10 minutes
  // });



  const { data: serverSettings } = useQuery<any>({
  queryKey: ['/api/public/settings'],
  queryFn: async () => {
    const res = await fetch('/api/public/settings');
    const json = await res.json();
    return json.data;   // important
  },
  staleTime: 1000 * 60 * 10,
});

  // Sync with Server Settings
  useEffect(() => {
    if (serverSettings) {
      const {
        theme_primary,
        theme_primary_second,
        theme_primary_light,
        theme_primary_dark,
        theme_font_heading,
        theme_font_body,
      } = serverSettings;

      if (theme_primary) {
        setColors({
          primary: theme_primary,
          primarySecond: theme_primary_second || theme_primary,
          primaryLight: theme_primary_light || theme_primary,
          primaryDark: theme_primary_dark || theme_primary,
        });
      }

      if (theme_font_heading || theme_font_body) {
        setFonts({
          heading: theme_font_heading || defaultFonts.heading,
          body: theme_font_body || defaultFonts.body,
        });
      }
    }
  }, [serverSettings]);

  // Light/Dark theme effect
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      root.classList.remove('light', 'dark', 'admin-theme-light', 'admin-theme-half-dark', 'admin-theme-dark');
      root.classList.add(activeTheme);
      if (!isAdminRoute && theme) {
        localStorage.setItem('theme', theme);
      }
      if (isAdminRoute) {
        root.classList.add(`admin-theme-${adminTheme}`);
        localStorage.setItem('adminThemeMode', adminTheme);
        localStorage.setItem('adminTheme', adminTheme);
      }
    }
  }, [activeTheme, adminTheme, isAdminRoute, theme]);

  // Color theme effect
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      root.style.setProperty('--primary-hex', colors.primary);
      root.style.setProperty('--primary-second-hex', colors.primarySecond);
      root.style.setProperty('--primary-light-hex', colors.primaryLight);
      root.style.setProperty('--primary-dark-hex', colors.primaryDark);
      localStorage.setItem('customTheme', JSON.stringify(colors));
    }
  }, [colors]);

  // Font theme effect - Load Google Fonts dynamically
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;

      // Set CSS variables
      root.style.setProperty('--font-heading', fonts.heading);
      root.style.setProperty('--font-body', fonts.body);

      // Load Google Fonts dynamically
      const uniqueFonts = Array.from(new Set([fonts.heading, fonts.body]));
      const fontFamilies = uniqueFonts.map((font) => font.replace(/ /g, '+'));
      const fontUrl = `https://fonts.googleapis.com/css2?${fontFamilies
        .map((f) => `family=${f}:wght@300;400;500;600;700;800;900`)
        .join('&')}&display=swap`;

      // Remove old font link if exists
      const existingLink = document.getElementById('google-fonts-link');
      if (existingLink) {
        existingLink.remove();
      }

      // Add new font link
      const link = document.createElement('link');
      link.id = 'google-fonts-link';
      link.rel = 'stylesheet';
      link.href = fontUrl;
      document.head.appendChild(link);

      localStorage.setItem('customFonts', JSON.stringify(fonts));
    }
  }, [fonts]);

  // Toggle light/dark theme
  const toggleTheme = () => {
    if (isAdminRoute) {
      setAdminThemeState((currentTheme) => {
        const nextTheme: AdminThemeMode =
          currentTheme === 'light' ? 'half-dark' : currentTheme === 'half-dark' ? 'dark' : 'light';
        if (typeof window !== 'undefined') {
          localStorage.setItem('adminThemeMode', nextTheme);
          localStorage.setItem('adminTheme', nextTheme);
        }
        return nextTheme;
      });
      return;
    }

    setTheme((currentTheme) => {
      const nextTheme = (currentTheme ?? activeTheme) === 'dark' ? 'light' : 'dark';
      if (typeof window !== 'undefined') {
        localStorage.setItem('theme', nextTheme);
      }
      return nextTheme;
    });
  };

  const setAdminTheme = (nextTheme: AdminThemeMode) => {
    setAdminThemeState(nextTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('adminThemeMode', nextTheme);
      localStorage.setItem('adminTheme', nextTheme);
    }
  };

  // Update single color
  const updateColor = (key: keyof ColorTheme, color: string) => {
    const newColors = { ...colors, [key]: color };
    setColors(newColors);
  };

  // Update single font
  const updateFont = (key: keyof FontTheme, font: string) => {
    const newFonts = { ...fonts, [key]: font };
    setFonts(newFonts);
  };

  // Save colors only to API (backward compatibility)
  const saveColorsToAPI = async () => {
    try {
      const response = await fetch('/api/admin/save-theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primaryHex: colors.primary,
          primarySecondHex: colors.primarySecond,
          primaryLightHex: colors.primaryLight,
          primaryDarkHex: colors.primaryDark,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save theme colors');
      }
    } catch (error) {
      throw error;
    }
  };

  // Load colors only from API (backward compatibility)
  const loadColorsFromAPI = async () => {
    try {
      const response = await fetch('/api/admin/get-theme');
      const data = await response.json();

      if (data.primaryHex) {
        const newColors: ColorTheme = {
          primary: data.primaryHex,
          primarySecond: data.primarySecondHex,
          primaryLight: data.primaryLightHex,
          primaryDark: data.primaryDarkHex,
        };
        setColors(newColors);
      }
    } catch (error) {
      throw error;
    }
  };

  // Reset colors only to defaults (backward compatibility)
  const resetColorsToDefault = () => {
    setColors(defaultColors);
  };

  // Save both colors and fonts to API
  const saveThemeToAPI = async () => {
    try {
      const response = await fetch('/api/admin/save-theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Colors
          primaryHex: colors.primary,
          primarySecondHex: colors.primarySecond,
          primaryLightHex: colors.primaryLight,
          primaryDarkHex: colors.primaryDark,
          // Fonts
          headingFont: fonts.heading,
          bodyFont: fonts.body,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save theme');
      }
    } catch (error) {
      throw error;
    }
  };

  // Load both colors and fonts from API
  const loadThemeFromAPI = async () => {
    try {
      const response = await fetch('/api/admin/get-theme');
      const data = await response.json();

      // Load colors
      if (data.primaryHex) {
        const newColors: ColorTheme = {
          primary: data.primaryHex,
          primarySecond: data.primarySecondHex,
          primaryLight: data.primaryLightHex,
          primaryDark: data.primaryDarkHex,
        };
        setColors(newColors);
      }

      // Load fonts
      if (data.headingFont && data.bodyFont) {
        const newFonts: FontTheme = {
          heading: data.headingFont,
          body: data.bodyFont,
        };
        setFonts(newFonts);
      }
    } catch (error) {
      throw error;
    }
  };

  // Reset both colors and fonts to defaults
  const resetToDefaults = () => {
    setColors(defaultColors);
    setFonts(defaultFonts);
  };

  const value: ThemeContextType = {
    // Light/Dark theme
    theme: activeTheme,
    toggleTheme,
    isAdminRoute,
    adminTheme,
    setAdminTheme,

    // Color theme
    colors,
    updateColor,

    // Font theme
    fonts,
    updateFont,

    // Backward compatible methods (colors only)
    saveColorsToAPI,
    loadColorsFromAPI,
    resetColorsToDefault,

    // New methods (colors + fonts)
    saveThemeToAPI,
    loadThemeFromAPI,
    resetToDefaults,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
