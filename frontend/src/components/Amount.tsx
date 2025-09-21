import React from 'react';
import { useCompany } from '../contexts/CompanyContext';
import { cn } from '../lib/utils';

interface AmountProps {
  value: number;
  className?: string;
}

export const Amount: React.FC<AmountProps> = ({ value, className }) => {
  const { formatAmountParts, profile, currencySymbols } = useCompany();
  const parts = formatAmountParts(Number(value || 0));
  const mode = profile?.price_display_mode || 'both';

  const primaryEl = (
    <span className="text-foreground font-semibold">
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


