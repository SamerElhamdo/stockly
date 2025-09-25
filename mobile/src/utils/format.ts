export const formatDate = (value: string | Date) => {
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toLocaleDateString('ar-SY', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const formatTime = (value: string | Date) => {
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toLocaleTimeString('ar-SY', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const mergeDateTime = (value: string | Date) => `${formatDate(value)} • ${formatTime(value)}`;
