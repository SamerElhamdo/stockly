export const formatDate = (value: string | Date | undefined | null) => {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (!(date instanceof Date) || isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('ar-SY', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const formatTime = (value: string | Date | undefined | null) => {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (!(date instanceof Date) || isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString('ar-SY', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const mergeDateTime = (value: string | Date | undefined | null) => {
  const d = formatDate(value);
  const t = formatTime(value);
  if (d === '—' && t === '—') return '—';
  if (d === '—') return t;
  if (t === '—') return d;
  return `${d} • ${t}`;
};

// Smart number formatter for prices:
// - Default to 2 decimals
// - For very small numbers (< 0.01), increase decimals up to 6 until a non-zero digit appears
// - Trim trailing zeros while keeping at least 2 decimals for numbers >= 0.01
export const formatSmartDecimal = (value: number, locale: string = 'en-US') => {
  if (!isFinite(value)) return '0.00';

  const abs = Math.abs(value);
  if (abs === 0) return (0).toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (abs < 0.01) {
    // Increase precision up to 6 to show the first significant digit
    for (let d = 3; d <= 6; d += 1) {
      const str = value.toLocaleString(locale, { minimumFractionDigits: d, maximumFractionDigits: d });
      // Check if there is any non-zero after the decimal
      const normalized = Number(value.toFixed(d));
      if (normalized !== 0) return str;
    }
    return value.toLocaleString(locale, { minimumFractionDigits: 6, maximumFractionDigits: 6 });
  }

  // >= 0.01 → two decimals
  return value.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
