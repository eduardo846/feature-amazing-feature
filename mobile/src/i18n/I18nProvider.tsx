/**
 * I18nProvider — wraps the app and re-renders on locale change.
 * Also applies RTL layout direction via I18nManager.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { I18nManager, Platform } from 'react-native';
import i18n, { AppLocale, LOCALE_INFO, SUPPORTED_LOCALES } from './index';

// ─── Context shape ────────────────────────────────────────────────────────────

interface I18nContextValue {
  locale: AppLocale;
  isRtl: boolean;
  setLocale: (locale: AppLocale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  formatDate: (date: Date | number, options?: Intl.DateTimeFormatOptions) => string;
  formatDateTime: (date: Date | number) => string;
  formatCurrency: (amount: number, currency?: string) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatRelativeTime: (date: Date | number) => string;
  supportedLocales: typeof SUPPORTED_LOCALES;
  localeInfo: typeof LOCALE_INFO;
}

const I18nContext = createContext<I18nContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

interface I18nProviderProps {
  children: React.ReactNode;
  /** Override locale (useful for testing or deep-link locale switching). */
  initialLocale?: AppLocale;
}

export function I18nProvider({ children, initialLocale }: I18nProviderProps) {
  const [locale, setLocaleState] = useState<AppLocale>(() => {
    i18n.init(initialLocale);
    return i18n.locale;
  });

  // Apply RTL layout direction whenever locale changes
  useEffect(() => {
    const shouldBeRtl = LOCALE_INFO[locale].rtl;
    if (I18nManager.isRTL !== shouldBeRtl) {
      I18nManager.allowRTL(shouldBeRtl);
      I18nManager.forceRTL(shouldBeRtl);
      // On native, a reload is needed for RTL to fully take effect.
      // We log a dev warning rather than force-reloading in production.
      if (__DEV__ && Platform.OS !== 'web') {
        console.warn(
          '[i18n] RTL direction changed. Restart the app for full effect.',
        );
      }
    }
  }, [locale]);

  // Subscribe to programmatic locale changes from outside the tree
  useEffect(() => {
    const unsub = i18n.subscribe((newLocale) => {
      setLocaleState(newLocale);
    });
    return unsub;
  }, []);

  const setLocale = useCallback((newLocale: AppLocale) => {
    i18n.setLocale(newLocale);
    setLocaleState(newLocale);
  }, []);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      isRtl: LOCALE_INFO[locale].rtl,
      setLocale,
      t: (key, params) => i18n.t(key, params),
      formatDate: (date, opts) => i18n.formatDate(date, opts),
      formatDateTime: (date) => i18n.formatDateTime(date),
      formatCurrency: (amount, currency) => i18n.formatCurrency(amount, currency),
      formatNumber: (value, opts) => i18n.formatNumber(value, opts),
      formatRelativeTime: (date) => i18n.formatRelativeTime(date),
      supportedLocales: SUPPORTED_LOCALES,
      localeInfo: LOCALE_INFO,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locale, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used inside <I18nProvider>');
  }
  return ctx;
}
