import React, { createContext, useContext, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { apiClient, endpoints } from '@/services/api-client';
import { useAuth } from './AuthContext';
import { formatSmartDecimal } from '@/utils/format';

type PriceDisplayMode = 'both' | 'primary' | 'secondary';

type CurrencyCode = 'USD' | string;

export interface CompanyProfile {
  id: number;
  company: number;
  company_name: string;
  company_code: string;
  company_email?: string | null;
  company_phone?: string | null;
  company_address?: string | null;
  logo_url?: string | null;
  return_policy?: string | null;
  payment_policy?: string | null;
  language?: 'ar' | 'en';
  navbar_message?: string | null;
  dashboard_cards?: string[];
  primary_currency?: CurrencyCode;
  secondary_currency?: CurrencyCode | null;
  secondary_per_usd?: number | null;
  price_display_mode?: PriceDisplayMode;
}

interface CompanyContextValue {
  profile: CompanyProfile | null;
  isLoading: boolean;
  formatAmount: (usdAmount: number) => string;
  formatAmountParts: (usdAmount: number) => { primary: string; secondary?: string };
  currencySymbols: Record<string, string>;
  refetchProfile?: () => void;
}

const CompanyContext = createContext<CompanyContextValue | undefined>(undefined);

const DEFAULT_SYMBOLS: Record<string, string> = {
  USD: '$',
  SYP: 'ل.س',
  SAR: 'ر.س',
  TRY: '₺',
  AED: 'د.إ',
  EUR: '€',
  LBP: 'ل.ل',
};

export const CompanyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const { data: profile, isLoading, refetch } = useQuery<CompanyProfile>({
    queryKey: ['company-profile'],
    queryFn: async () => {
      const res = await apiClient.get(endpoints.companyProfile);
      return res.data as CompanyProfile;
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  const value = useMemo<CompanyContextValue>(() => {
    const sym = DEFAULT_SYMBOLS;
    const priceMode: PriceDisplayMode = profile?.price_display_mode || 'both';
    const secondaryCode = profile?.secondary_currency || undefined;
    const rate = Number(profile?.secondary_per_usd || 0);

    const formatPrimary = (n: number) => `${sym.USD || '$'} ${formatSmartDecimal(n, 'en-US')}`;

    const formatSecondary = (n: number) => {
      if (!secondaryCode || !rate || rate <= 0) return undefined;
      const converted = n * rate;
      const symbol = sym[secondaryCode] || secondaryCode;
      return `${symbol} ${formatSmartDecimal(converted, 'en-US')}`;
    };

    const formatAmountParts = (usdAmount: number) => {
      const primary = formatPrimary(usdAmount);
      const secondary = formatSecondary(usdAmount);
      return { primary, secondary };
    };

    const formatAmount = (usdAmount: number) => {
      const { primary, secondary } = formatAmountParts(usdAmount);
      if (priceMode === 'primary') return primary;
      if (priceMode === 'secondary') return secondary || primary;
      if (secondary) return `${primary} | ${secondary}`;
      return primary;
    };

    return {
      profile: profile || null,
      isLoading,
      formatAmount,
      formatAmountParts,
      currencySymbols: sym,
      refetchProfile: refetch,
    };
  }, [profile, isLoading, refetch]);

  return <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>;
};

export const useCompany = () => {
  const ctx = useContext(CompanyContext);
  if (!ctx) throw new Error('useCompany must be used within CompanyProvider');
  return ctx;
};
