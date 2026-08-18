// Coerce any incoming value into a valid Date, or null when it isn't one.
// API payloads routinely hand us null/undefined/'' where a date is expected.
const toValidDate = (date?: Date | string | null): Date | null => {
  if (!date) return null;
  const d = typeof date === 'string' ? new Date(date) : date;
  if (!(d instanceof Date) || isNaN(d.getTime())) return null;
  return d;
};

// Format date to "Dec 8, 2025"
export const formatDate = (date?: Date | string | null): string => {
  const d = toValidDate(date);
  if (!d) return '—';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

// Format date to "08/12/2025"
export const formatDateShort = (date?: Date | string | null): string => {
  const d = toValidDate(date);
  if (!d) return '—';
  return d.toLocaleDateString('en-US');
};

// Format time to "02:30 PM"
export const formatTime = (date?: Date | string | null): string => {
  const d = toValidDate(date);
  if (!d) return '—';
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Format datetime to "Dec 8, 2025 02:30 PM"
export const formatDateTime = (date?: Date | string | null): string => {
  const d = toValidDate(date);
  if (!d) return '—';
  return `${formatDate(d)} ${formatTime(d)}`;
};

// Format relative time ("2 hours ago", "3 days ago")
export const formatRelativeTime = (date?: Date | string | null): string => {
  const d = toValidDate(date);
  if (!d) return '—';
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  }
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months} month${months > 1 ? 's' : ''} ago`;
  }
  const years = Math.floor(diffDays / 365);
  return `${years} year${years > 1 ? 's' : ''} ago`;
};

// Format currency (₹1,234.56)
export const formatCurrency = (amount?: number | string | null): string => {
  const value = Number(amount || 0);
  return `₹${(isNaN(value) ? 0 : value).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

// Format number with commas (1,234,567)
export const formatNumber = (num?: number | string | null): string => {
  const value = Number(num || 0);
  return (isNaN(value) ? 0 : value).toLocaleString('en-IN');
};

// Truncate text with ellipsis
export const truncateText = (text?: string | null, maxLength = 0): string => {
  const safe = text || '';
  if (safe.length <= maxLength) return safe;
  return `${safe.substring(0, maxLength)}...`;
};

// Capitalize first letter
export const capitalizeFirst = (text?: string | null): string => {
  const safe = text || '';
  if (!safe) return '';
  return safe.charAt(0).toUpperCase() + safe.slice(1).toLowerCase();
};

// Capitalize each word
export const capitalizeWords = (text?: string | null): string => {
  const safe = text || '';
  if (!safe) return '';
  return safe
    .split(' ')
    .map(word => capitalizeFirst(word))
    .join(' ');
};
