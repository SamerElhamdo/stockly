import React, { createContext, useContext, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient, endpoints, getAccessToken } from '../lib/api';

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
  primary_currency?: 'USD';
  secondary_currency?: string | null;
  secondary_per_usd?: number | null;
  price_display_mode?: 'both' | 'primary' | 'secondary';
}

type CompanyContextValue = {
  profile: CompanyProfile | null;
  isLoading: boolean;
  formatAmount: (usdAmount: number) => string;
  formatAmountParts: (usdAmount: number) => { primary: string; secondary?: string };
  currencySymbols: Record<string, string>;
};

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
  const { data: profile, isLoading } = useQuery<CompanyProfile>({
    queryKey: ['company-profile'],
    queryFn: async () => {
      const res = await apiClient.get(endpoints.companyProfile);
      return res.data as CompanyProfile;
    },
    staleTime: 5 * 60 * 1000,
    enabled: Boolean(getAccessToken()) && (typeof window === 'undefined' ? true : !window.location.pathname.startsWith('/auth')),
  });

  const value = useMemo<CompanyContextValue>(() => {
    const sym = DEFAULT_SYMBOLS;
    const priceMode = profile?.price_display_mode || 'both';
    const secCode = profile?.secondary_currency || undefined;
    const rate = Number(profile?.secondary_per_usd || 0);

    const formatPrimary = (n: number) => `${sym.USD || '$'} ${n.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 })}`;
    const formatSecondary = (n: number) => {
      if (!secCode || !rate || rate <= 0) return undefined;
      const converted = n * rate;
      const symbol = sym[secCode] || secCode;
      return `${symbol} ${converted.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
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
      if (secondary) return `${primary} • ${secondary}`;
      return primary;
    };

    return {
      profile: profile || null,
      isLoading,
      formatAmount,
      formatAmountParts,
      currencySymbols: sym,
    };
  }, [profile, isLoading]);

  return <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>;
};

export const useCompany = () => {
  const ctx = useContext(CompanyContext);
  if (!ctx) throw new Error('useCompany must be used within CompanyProvider');
  return ctx;
};


