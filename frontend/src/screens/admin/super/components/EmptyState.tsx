import React from 'react';
import { ConsoleState } from '../../../../ui';

interface Props {
  title: string;
  caption?: string;
  /** Kept for the callers' API; the premium state draws its own original art. */
  icon?: string;
  accentIcon?: string;
  tone?: 'default' | 'error';
  action?: string;
  onAction?: () => void;
}

/**
 * The illustrated empty / error state for the Super Admin screens — the
 * premium console's ConsoleState (an original SVG tray, or a disconnected
 * cloud for errors), behind the props these screens already pass.
 */
const EmptyState: React.FC<Props> = ({ title, caption, tone = 'default', action, onAction }) => (
  <ConsoleState kind={tone === 'error' ? 'error' : 'empty'} title={title} message={caption} action={action} onAction={onAction} />
);

export default EmptyState;
