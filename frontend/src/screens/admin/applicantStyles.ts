import { ApplicantStage } from '../../types';

/**
 * Soft-accent pairs used across the block admin screens: `tint` is the wash used
 * behind cards and pills, `solid` is the saturated colour for icons and text.
 */
export const ACCENTS = {
  indigo: { tint: '#EEF0FF', solid: '#5B5BD6' },
  blue: { tint: '#E8F1FE', solid: '#2563EB' },
  green: { tint: '#E7F6EC', solid: '#16A34A' },
  red: { tint: '#FEECEC', solid: '#DC2626' },
  amber: { tint: '#FEF4E6', solid: '#D97706' },
  slate: { tint: '#EFF1F5', solid: '#64748B' },
};

export const SURFACE = {
  background: '#F4F6FB',
  card: '#FFFFFF',
  border: '#E8EBF2',
};

const STAGE_ACCENTS: Record<ApplicantStage, { tint: string; solid: string }> = {
  pending: ACCENTS.amber,
  approved: ACCENTS.green,
  rejected: ACCENTS.red,
  // Awaiting a later tier, and rejected-by-another-tier: neither is an action
  // this dashboard owns, so both read as neutral rather than actionable.
  upstream: ACCENTS.indigo,
  closed: ACCENTS.slate,
};

export const getStageStyle = (stage?: string | null) => {
  if (!stage) return ACCENTS.slate;
  const s = String(stage).toLowerCase();
  if (s.includes('approved')) return ACCENTS.green;
  if (s.includes('reject')) return ACCENTS.red;
  if (s.includes('pending')) return ACCENTS.amber;
  if (s.includes('upstream')) return ACCENTS.indigo;
  return STAGE_ACCENTS[stage as ApplicantStage] || ACCENTS.slate;
};

export const getInitials = (fullName?: string | null): string => {
  // A default parameter only guards `undefined`; API fields arrive as `null`.
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (
    parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
  ).toUpperCase();
};

/** Renders any stored value as something safe to drop into a detail row. */
export const displayValue = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : '—';
  return String(value);
};

export const formatDate = (value?: string | null): string => {
  if (!value) return '—';
  const date = new Date(value);
  if (isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};
