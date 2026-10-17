import api from './api';

export interface HistorySelection {
  view: 'reports' | 'logs';
  ids?: string[];
  filters?: Record<string, string | number | undefined>;
}
export interface HistoryDeletePreview {
  matched: number; reviewed: number; eligible: number; retained: number;
  remaining: number; truncated: boolean; ids: string[]; token: string;
  reasons: { reason: string; count: number }[];
  outsideSelection?: number;
}
export interface HistoryDeleteResult {
  removed: number; retained: number; reasons: { reason: string; count: number }[];
  alreadySubmitted?: boolean; processing?: boolean;
}
const filterKeys = {
  reports: ['from', 'to', 'campaignKey', 'group', 'channel', 'search', 'status'],
  logs: ['channel', 'status', 'event', 'search', 'delivery', 'group', 'eventId', 'bookingRef', 'from', 'to'],
};
/** A review covers the selected filters, independently of list pagination. */
export const historySelection = (selection: HistorySelection): HistorySelection => {
  if (Array.isArray(selection?.ids)) return { view: selection.view, ids: [...new Set(selection.ids.filter(id => typeof id === 'string' && !!id))] };
  const filters: Record<string, string> = {};
  for (const key of filterKeys[selection.view]) {
    const value = selection.filters?.[key];
    if (typeof value === 'string' && value) filters[key] = value;
  }
  return { view: selection.view, filters };
};
export const previewHistoryDelete = async (selection: HistorySelection): Promise<HistoryDeletePreview> => {
  const selected = historySelection(selection);
  const outsideSelection = Math.max(0, (selected.ids?.length || 0) - 500);
  const request = selected.ids ? { ...selected, ids: selected.ids.slice(0, 500) } : selected;
  const response = await api.post('/notifications/history/delete-preview', request, { timeout: 120000 });
  return { ...(response?.data?.data ?? response?.data), outsideSelection };
};
export const confirmHistoryDelete = async (preview: Pick<HistoryDeletePreview, 'ids' | 'token'>): Promise<HistoryDeleteResult> => {
  const response = await api.post('/notifications/history/delete', { ids: preview.ids, token: preview.token }, { timeout: 120000 });
  return response?.data?.data ?? response?.data;
};
