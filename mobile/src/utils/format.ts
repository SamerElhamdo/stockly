export const formatDate = (value: string | Date | undefined | null) => {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (!(date instanceof Date) || isNaN(date.getTime())) return '—';
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

export const formatTime = (value: string | Date | undefined | null) => {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (!(date instanceof Date) || isNaN(date.getTime())) return '—';
  
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${hours}:${minutes}`;
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
// - Always show exactly 2 decimals for consistency
export const formatSmartDecimal = (value: number, locale: string = 'en-US') => {
  if (!isFinite(value)) return '0.00';
  
  // Always format with exactly 2 decimals
  return value.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
