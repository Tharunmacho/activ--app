import { ApplicantStage } from '../../types';
import { PALETTE } from '../../ui';

/**
 * Soft-accent pairs used across the block admin screens: `tint` is the wash used
 * behind cards and pills, `solid` is the saturated colour for icons and text.
 */
export const ACCENTS = {
  indigo: { tint: PALETTE.indigoSoft, solid: PALETTE.indigo },
  blue: { tint: PALETTE.blueSoft, solid: PALETTE.blue },
  green: { tint: PALETTE.successSoft, solid: PALETTE.success },
  red: { tint: PALETTE.dangerSoft, solid: PALETTE.danger },
  amber: { tint: PALETTE.warningSoft, solid: PALETTE.warningText },
  slate: { tint: PALETTE.divider, solid: PALETTE.textMuted },
};

export const SURFACE = {
  background: PALETTE.canvasAdmin,
  card: PALETTE.card,
  border: PALETTE.border,
};

/*
 * Three stages, because there are three answers.
 *
 * `upstream` and `closed` were the two an admin could see but not act on, under
 * a workflow where a file belonged to one tier at a time. Every pending file in
 * a region belongs to all three of its tiers now, so an applicant an admin can
 * see is one they can decide.
 */
const STAGE_ACCENTS: Record<ApplicantStage, { tint: string; solid: string }> = {
  pending: ACCENTS.amber,
  approved: ACCENTS.green,
  rejected: ACCENTS.red,
};

export const getStageStyle = (stage?: string | null) => {
  if (!stage) return ACCENTS.slate;
  const s = String(stage).toLowerCase();
  if (s.includes('approved')) return ACCENTS.green;
  if (s.includes('reject')) return ACCENTS.red;
  if (s.includes('pending')) return ACCENTS.amber;
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
