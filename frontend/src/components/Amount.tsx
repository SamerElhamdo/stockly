import React from 'react';
import { useCompany } from '../contexts/CompanyContext';
import { cn } from '../lib/utils';

interface AmountProps {
  value: number;
  className?: string;
  tone?: 'success' | 'destructive' | 'muted';
  digits?: number;
}

export const Amount: React.FC<AmountProps> = ({ value, className, tone, digits }) => {
  const { formatAmountParts, profile, currencySymbols } = useCompany();
  const useCustomDigits = typeof digits === 'number';
  const rate = Number(profile?.secondary_per_usd || 0);
  const secCode = profile?.secondary_currency || undefined;
  const primarySymbol = currencySymbols.USD || '$';

  const primaryStr = useCustomDigits
    ? `${primarySymbol} ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })}`
    : undefined;
  const secondaryStr = useCustomDigits && secCode && rate > 0
    ? `${(currencySymbols[secCode] || secCode)} ${(Number(value || 0) * rate).toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })}`
    : undefined;

  const parts = useCustomDigits
    ? { primary: primaryStr as string, secondary: secondaryStr }
    : formatAmountParts(Number(value || 0));
  const mode = profile?.price_display_mode || 'both';
  const primaryColorClass = tone === 'success' ? 'text-success' : tone === 'destructive' ? 'text-destructive' : 'text-foreground';

  const primaryEl = (
    <span className={`${primaryColorClass} font-semibold`}>
      {parts.primary}
    </span>
  );
  const secondaryEl = parts.secondary ? (
    <span className="text-xs text-muted-foreground">{parts.secondary}</span>
  ) : null;

  return (
    <span className={cn('inline-flex items-baseline gap-1', className)}>
      {(mode === 'primary' || (mode === 'both' && parts.primary)) && primaryEl}
      {(mode === 'both' && secondaryEl) && <span className="text-muted-foreground">•</span>}
      {(mode === 'secondary' && secondaryEl) || (mode === 'both' && secondaryEl)}
    </span>
  );
};


