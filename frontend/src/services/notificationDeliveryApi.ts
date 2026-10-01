import api from './api';

/**
 * ============================================================================
 * AUTOMATION DELIVERY — did each automated email / WhatsApp message arrive?
 * ============================================================================
 *
 * The mobile twin of `website/src/services/notificationDeliveryApi.ts`: same
 * endpoints, same parameters, same defaults. Super admin only on the server.
 *
 *   GET  /notifications/logs?group=automation&…   one page + filtered counts + event list
 *   GET  /notifications/logs/booking/:ref         every message about one booking
 *   GET  /notifications/delivery-summary?bookingRefs=a,b   latest per channel, ≤200 refs
 *   POST /notifications/retry/:id                 send again — the SENTENCE is the result
 *
 * A server that predates the delivery lifecycle answers `/logs` without
 * `counts` / `events` / `effectiveStatus` and 404s the two booking routes; every
 * reader here falls back to zeros and `stateOf()` derives a badge from the
 * older `status` / `mock` fields, so the screens degrade rather than break.
 */

export type DeliveryState = 'accepted' | 'sent' | 'delivered' | 'read' | 'failed' | 'mock' | 'queued';

export interface DeliveryEvent { status: string; at: string; code?: string | number; title?: string; detail?: string }

export interface DeliveryLogRow {
  _id: string;
  event: string;
  channel: 'in_app' | 'email' | 'whatsapp' | string;
  recipient: string;
  recipientName?: string;
  sender?: string;
  replyTo?: string;
  templateId?: string;
  templatePath?: string;
  subject?: string;
  status?: 'queued' | 'sent' | 'failed' | string;
  mock?: boolean;
  provider?: string;
  providerMessageId?: string;
  lastError?: string;
  attempts?: number;
  bookingRef?: string;
  eventId?: string;
  eventTitle?: string;
  deliveryStatus?: string;
  effectiveStatus?: DeliveryState;
  statusHistory?: DeliveryEvent[];
  failureReason?: string;
  failureCode?: string | number;
  resentAs?: string;
  resendOf?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DeliveryCounts { total: number; accepted: number; sent: number; delivered: number; read: number; failed: number; mock: number }
export interface AutomationEventOption { eventId: string; title: string; count: number }
export interface AutomationPage {
  logs: DeliveryLogRow[];
  health: { sent: number; failed: number; queued: number; mock: number; total: number };
  counts: { total: number; byChannel: { email: DeliveryCounts; whatsapp: DeliveryCounts } };
  events: AutomationEventOption[];
  pagination: { page: number; limit: number; total: number; pages: number };
}
export interface AutomationFilters {
  page?: number; limit?: number; channel?: string; delivery?: string; event?: string;
  eventId?: string; bookingRef?: string; from?: string; to?: string; search?: string;
}

export interface ChannelSummary { status: DeliveryState | string; at?: string; reason?: string; count?: number }
export interface BookingDeliverySummary { email?: ChannelSummary; whatsapp?: ChannelSummary }
export interface BookingDelivery { bookingRef: string; rows: DeliveryLogRow[]; summary: BookingDeliverySummary }

const EMPTY_COUNTS: DeliveryCounts = { total: 0, accepted: 0, sent: 0, delivered: 0, read: 0, failed: 0, mock: 0 };

export const EMPTY_AUTOMATION: AutomationPage = {
  logs: [],
  health: { sent: 0, failed: 0, queued: 0, mock: 0, total: 0 },
  counts: { total: 0, byChannel: { email: { ...EMPTY_COUNTS }, whatsapp: { ...EMPTY_COUNTS } } },
  events: [],
  pagination: { page: 1, limit: 25, total: 0, pages: 1 },
};

const body = (res: any): any => {
  const d = res?.data;
  if (d && typeof d === 'object' && 'data' in d) return d.data || {};
  return d || {};
};
const clean = (p: Record<string, any> = {}) => {
  const out: Record<string, any> = {};
  Object.keys(p || {}).forEach((k) => {
    const v = p[k];
    if (v !== undefined && v !== null && v !== '') out[k] = v;
  });
  return out;
};

/** One page of the automation log, the counts for the FILTERED set, and the events that have messages. */
export const getAutomationLogs = async (filters: AutomationFilters = {}): Promise<AutomationPage> => {
  const page = body(await api.get('/notifications/logs', { params: clean({ group: 'automation', ...filters }) })) || {};
  const pg = page?.pagination || {};
  return {
    logs: Array.isArray(page?.logs) ? page.logs : [],
    health: { ...EMPTY_AUTOMATION.health, ...(page?.health || {}) },
    counts: {
      total: Number(page?.counts?.total || 0),
      byChannel: {
        email: { ...EMPTY_COUNTS, ...(page?.counts?.byChannel?.email || {}) },
        whatsapp: { ...EMPTY_COUNTS, ...(page?.counts?.byChannel?.whatsapp || {}) },
      },
    },
    events: Array.isArray(page?.events) ? page.events : [],
    pagination: {
      page: Number(pg?.page || filters.page || 1),
      limit: Number(pg?.limit || filters.limit || 25),
      total: Number(pg?.total || 0),
      pages: Math.max(1, Number(pg?.pages || 1)),
    },
  };
};

/** Every message sent about one booking — booker, participants and documents. */
export const getBookingDelivery = async (bookingRef: string): Promise<BookingDelivery> => {
  const ref = String(bookingRef || '').trim();
  const b = body(await api.get(`/notifications/logs/booking/${encodeURIComponent(ref)}`)) || {};
  return {
    bookingRef: String(b?.bookingRef || ref),
    rows: Array.isArray(b?.rows) ? b.rows : [],
    summary: b?.summary && typeof b.summary === 'object' ? b.summary : {},
  };
};

/** Latest email / WhatsApp state for up to 200 bookings, keyed by reference. ONE request per page. */
export const getDeliverySummaries = async (bookingRefs: string[]): Promise<Record<string, BookingDeliverySummary>> => {
  const refs = Array.from(new Set((bookingRefs || []).map((r) => String(r || '').trim()).filter(Boolean))).slice(0, 200);
  if (!refs.length) return {};
  const b = body(await api.get('/notifications/delivery-summary', { params: { bookingRefs: refs.join(',') } })) || {};
  return b?.summaries && typeof b.summaries === 'object' ? b.summaries : {};
};

/**
 * Send a logged message again. Returns the row AND the server's sentence —
 * "Re-sent", "Still failing: <reason>", or why it was skipped.
 */
export const resendNotification = async (id: string): Promise<{ row: DeliveryLogRow | null; message: string }> => {
  const res = await api.post(`/notifications/retry/${encodeURIComponent(String(id || ''))}`, {});
  const b = res?.data || {};
  return { row: (b?.data as DeliveryLogRow) || null, message: String(b?.message || '') };
};

/* ==========================================================================
 * DELIVERY GUARD — is email going out, and "Retry all failed"
 * (backend notifications/deliveryGuard.js; website notificationDeliveryApi.ts)
 * ========================================================================== */

export interface DeliveryGuardHealth {
  email: { ok: boolean | null; configured: boolean | null; checkedAt: string | null; error: string };
  autoRetry: { enabled: boolean; everyMinutes: number; maxTries: number; windowHours: number };
}

export interface RetryAllSummary {
  checked: number;
  retried: number;
  sent: number;
  stillFailed: number;
  skipped: number;
  permanent: number;
  waitingForEmail: number;
}

export const getDeliveryGuardHealth = async (refresh = false): Promise<DeliveryGuardHealth | null> => {
  const res = await api.get('/notifications/health', { params: refresh ? { refresh: 1 } : {} });
  const data = res?.data?.data || res?.data || null;
  return data && data.email ? (data as DeliveryGuardHealth) : null;
};

export const retryAllFailed = async (sinceHours = 168): Promise<RetryAllSummary> => {
  const res = await api.post('/notifications/retry-failed', { sinceHours }, { timeout: 180000 });
  const d = res?.data?.data || res?.data || {};
  const num = (v: unknown) => Number(v || 0);
  return {
    checked: num(d?.checked), retried: num(d?.retried), sent: num(d?.sent), stillFailed: num(d?.stillFailed),
    skipped: num(d?.skipped), permanent: num(d?.permanent), waitingForEmail: num(d?.waitingForEmail),
  };
};
