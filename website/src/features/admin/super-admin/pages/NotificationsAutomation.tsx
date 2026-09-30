import { useCallback, useEffect, useState } from 'react';
import { Search, Loader2, ChevronLeft, ChevronRight, Mail, MessageSquare, Info } from 'lucide-react';
import { useCardTable } from '@/lib/useCardTable';
import { errorMessage } from '@/services/api';
import { ADMIN_CARD, ADMIN_INPUT } from '@/features/admin/components/AdminUI';
import {
    getAutomationLogs, EMPTY_AUTOMATION,
    type AutomationPage, type DeliveryCounts, type DeliveryLogRow,
} from '@/services/notificationDeliveryApi';
import {
    DeliveryBadge, DeliveryDetail, ResendButton, SidePanel, ChannelIcon,
    MESSAGE_TYPES, messageLabel, reasonOf, stateOf, whenLabel,
} from '@/features/admin/components/DeliveryUI';

/**
 * AUTOMATION — every message the platform sent on its own (booking
 * confirmations, reminders, documents, cancellations, membership messages) and
 * where each one got to: accepted by the provider, delivered, read, or failed
 * and why.
 *
 * The counts are for the FILTERED set, so narrowing to one event answers "how
 * many of this event's confirmations failed". The whole-log health figures
 * stay on the Delivery log view.
 */

const PAGE_SIZE = 25;

const SELECT = 'h-12 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-[1.1875rem] text-slate-700 '
    + 'outline-none transition-colors focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10';

function ChannelCounts({ channel, counts }: { channel: 'email' | 'whatsapp'; counts: DeliveryCounts }) {
    const email = channel === 'email';
    const cells: [string, string, string, string][] = [
        ['Accepted', String(Number(counts.accepted || 0) + Number(counts.sent || 0)),
            email ? 'the mail server took it' : 'Meta took it, no delivery report yet', 'text-blue-700'],
        ['Delivered', email ? 'n/a' : String(counts.delivered || 0),
            email ? 'email has no receipts' : 'reached the phone', 'text-emerald-700'],
        ['Read', email ? 'n/a' : String(counts.read || 0), email ? 'email has no receipts' : 'opened', 'text-emerald-700'],
        ['Failed', String(counts.failed || 0), 'refused or undeliverable', 'text-rose-700'],
        ['Not sent', String(counts.mock || 0), 'no provider configured', 'text-slate-600'],
    ];
    return (
        <section className={`${ADMIN_CARD} p-4 sm:p-5 min-w-0`}>
            <div className="flex items-center gap-2">
                <span className={`w-9 h-9 rounded-xl grid place-items-center ${email ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                    {email ? <Mail className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
                </span>
                <h2 className="text-[1.3125rem] font-bold text-slate-900">{email ? 'Email' : 'WhatsApp'}</h2>
                <span className="ml-auto text-[1.125rem] text-slate-500 tabular-nums">{counts.total || 0} messages</span>
            </div>
            <div className="mt-3 grid grid-cols-3 sm:grid-cols-5 gap-2">
                {cells.map(([label, value, hint, tone]) => (
                    <div key={label} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 min-w-0" title={hint}>
                        <p className="text-[1rem] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
                        <p className={`text-[1.75rem] font-extrabold tabular-nums leading-tight ${tone}`}>{value}</p>
                        <p className="text-[0.9375rem] text-slate-400 leading-snug hidden sm:block">{hint}</p>
                    </div>
                ))}
            </div>
        </section>
    );
}

export default function NotificationsAutomation({ refreshKey = 0 }: { refreshKey?: number }) {
    const tableRef = useCardTable();
    const [data, setData] = useState<AutomationPage>(EMPTY_AUTOMATION);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [eventId, setEventId] = useState('');
    const [channel, setChannel] = useState('');
    const [delivery, setDelivery] = useState('');
    const [type, setType] = useState('');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [open, setOpen] = useState<DeliveryLogRow | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const result = await getAutomationLogs({
                page,
                limit: PAGE_SIZE,
                eventId,
                channel,
                delivery,
                event: type,
                from,
                to,
                search: search.trim().length >= 2 ? search.trim() : '',
            });
            setData(result);
            // Keep an open panel in step with a refreshed row (after a resend).
            setOpen((current) => (current ? result.logs.find((r) => r._id === current._id) || current : current));
        } catch (err) {
            setError(errorMessage(err, 'The automation log could not be loaded'));
        } finally {
            setLoading(false);
        }
    // `refreshKey` is the page header's Refresh button.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, eventId, channel, delivery, type, from, to, search, refreshKey]);

    useEffect(() => {
        const timer = setTimeout(load, 300);
        return () => clearTimeout(timer);
    }, [load]);

    // Any filter change starts again at page one.
    useEffect(() => { setPage(1); }, [eventId, channel, delivery, type, from, to, search]);

    const rows = data.logs || [];
    const pagination = data.pagination || EMPTY_AUTOMATION.pagination;
    const filtered = !!(eventId || channel || delivery || type || from || to || search.trim());

    return (
        <>
            <p className="flex items-start gap-2 text-[1.125rem] text-slate-500">
                <Info className="w-4 h-4 shrink-0 mt-1 text-slate-400" />
                <span className="min-w-0">
                    <strong className="text-slate-700">Accepted</strong> means the provider (Meta or the mail server)
                    took the message — not yet that it arrived. WhatsApp then reports <strong className="text-slate-700">sent</strong>,{' '}
                    <strong className="text-slate-700">delivered</strong> and <strong className="text-slate-700">read</strong>,
                    or <strong className="text-slate-700">failed</strong> with its reason. Email has no delivery receipts, so an
                    email can only show accepted or failed.
                </span>
            </p>

            <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
                <ChannelCounts channel="email" counts={data.counts.byChannel.email} />
                <ChannelCounts channel="whatsapp" counts={data.counts.byChannel.whatsapp} />
            </div>

            {/* ------------------------------------------------------ filters */}
            <div className={`${ADMIN_CARD} p-4 sm:p-5 space-y-3`}>
                <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search name, phone, email or booking ref"
                        className={`${ADMIN_INPUT} pl-10`}
                    />
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-6 gap-2.5">
                    <select value={eventId} onChange={(e) => setEventId(e.target.value)} aria-label="Event"
                        className={`${SELECT} col-span-2`}>
                        <option value="">Every event</option>
                        {(data.events || []).map((ev) => (
                            <option key={ev.eventId} value={ev.eventId}>
                                {ev.title || 'Untitled event'} ({ev.count || 0})
                            </option>
                        ))}
                    </select>
                    <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Message type"
                        className={`${SELECT} col-span-2 lg:col-span-1`}>
                        <option value="">Every message type</option>
                        {MESSAGE_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                    <select value={channel} onChange={(e) => setChannel(e.target.value)} aria-label="Channel" className={SELECT}>
                        <option value="">Email + WhatsApp</option>
                        <option value="email">Email</option>
                        <option value="whatsapp">WhatsApp</option>
                    </select>
                    <select value={delivery} onChange={(e) => setDelivery(e.target.value)} aria-label="Status" className={SELECT}>
                        <option value="">Every status</option>
                        <option value="accepted">Accepted</option>
                        <option value="sent">Sent</option>
                        <option value="delivered">Delivered</option>
                        <option value="read">Read</option>
                        <option value="failed">Failed</option>
                        <option value="mock">Not sent</option>
                    </select>
                    <div className="col-span-2 lg:col-span-6 grid grid-cols-2 sm:flex sm:items-center gap-2.5">
                        <label className="min-w-0 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-[1.0625rem] font-semibold text-slate-500">
                            From
                            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={`${SELECT} sm:w-auto`} />
                        </label>
                        <label className="min-w-0 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-[1.0625rem] font-semibold text-slate-500">
                            To
                            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={`${SELECT} sm:w-auto`} />
                        </label>
                        {filtered ? (
                            <button
                                type="button"
                                onClick={() => {
                                    setEventId(''); setChannel(''); setDelivery(''); setType('');
                                    setFrom(''); setTo(''); setSearch('');
                                }}
                                className="col-span-2 sm:ml-auto h-12 px-4 rounded-xl border border-slate-200 bg-white text-[1.125rem]
                                           font-semibold text-slate-600 hover:bg-slate-50"
                            >
                                Clear filters
                            </button>
                        ) : null}
                    </div>
                </div>
            </div>

            {error ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[1.1875rem] font-semibold text-rose-700 break-words">
                    {error}
                </div>
            ) : null}

            {/* -------------------------------------------------------- table */}
            <div className={`${ADMIN_CARD} overflow-hidden`}>
                <div ref={tableRef} className="overflow-x-auto card-table">
                    <table className="w-full text-left border-collapse min-w-[80rem]">
                        <thead>
                            <tr className="bg-slate-50">
                                {['Time', 'Person', 'Booking', 'Event', 'Message', 'Channel', 'Status', 'Reason', 'Tries', 'Action']
                                    .map((head) => (
                                        <th key={head} className="px-4 py-3.5 text-[1.0625rem] font-semibold uppercase tracking-wider
                                                                  text-slate-500 border-b border-slate-200 whitespace-nowrap">
                                            {head}
                                        </th>
                                    ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading && !rows.length ? (
                                <tr><td colSpan={10} className="px-4 py-14 text-center text-slate-400">
                                    <Loader2 className="w-5 h-5 animate-spin inline" />
                                </td></tr>
                            ) : null}
                            {!loading && !rows.length ? (
                                <tr><td colSpan={10} className="px-4 py-14 text-center text-[1.1875rem] font-semibold text-slate-500">
                                    {filtered ? 'No messages match those filters.' : 'No automated messages have been sent yet.'}
                                </td></tr>
                            ) : null}
                            {rows.map((row) => {
                                const reason = reasonOf(row);
                                return (
                                    <tr
                                        key={row._id}
                                        onClick={() => setOpen(row)}
                                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70 cursor-pointer align-top"
                                    >
                                        <td className="px-4 py-3 text-[1.0625rem] text-slate-500 tabular-nums whitespace-nowrap">
                                            {whenLabel(row.createdAt)}
                                        </td>
                                        <td className="px-4 py-3 max-w-[16rem]">
                                            <p className="text-[1.125rem] font-semibold text-slate-900 [overflow-wrap:anywhere]">
                                                {row.recipientName || '—'}
                                            </p>
                                            <p className="text-[1.0625rem] text-slate-500 [overflow-wrap:anywhere]">{row.recipient}</p>
                                        </td>
                                        <td className="px-4 py-3 font-mono text-[1rem] text-slate-600 whitespace-nowrap">
                                            {row.bookingRef || '—'}
                                        </td>
                                        <td className="px-4 py-3 text-[1.0625rem] text-slate-700 max-w-[14rem] [overflow-wrap:anywhere]">
                                            {row.eventTitle || '—'}
                                        </td>
                                        <td className="px-4 py-3 text-[1.0625rem] text-slate-700 max-w-[14rem] [overflow-wrap:anywhere]">
                                            {messageLabel(row.event)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="inline-flex items-center gap-1.5 text-[1.0625rem] text-slate-700 whitespace-nowrap">
                                                <ChannelIcon channel={row.channel} />
                                                {row.channel === 'whatsapp' ? 'WhatsApp' : 'Email'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3"><DeliveryBadge state={stateOf(row)} /></td>
                                        <td className="px-4 py-3 text-[1.0625rem] text-rose-700 max-w-[18rem] [overflow-wrap:anywhere]">
                                            {reason ? (reason.length > 120 ? `${reason.slice(0, 119)}…` : reason) : <span className="text-slate-300">—</span>}
                                        </td>
                                        <td className="px-4 py-3 text-[1.0625rem] text-slate-500 tabular-nums">{row.attempts || 1}</td>
                                        <td className="px-4 py-3">
                                            <ResendButton row={row} onDone={load} />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-slate-200 px-4 py-3.5">
                    <p className="text-[1.0625rem] sm:text-[1.1875rem] text-slate-500">
                        {pagination.total
                            ? `Showing ${(pagination.page - 1) * pagination.limit + 1} to ${Math.min(pagination.page * pagination.limit, pagination.total)} of ${pagination.total}`
                            : 'No entries'}
                    </p>
                    {pagination.pages > 1 ? (
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={pagination.page <= 1 || loading}
                                aria-label="Previous page"
                                className="h-10 w-10 inline-flex items-center justify-center rounded-xl border border-slate-200
                                           text-slate-600 disabled:opacity-40 hover:bg-slate-50"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="text-[1.125rem] font-semibold text-slate-600 tabular-nums">
                                {pagination.page} / {pagination.pages}
                            </span>
                            <button
                                type="button"
                                onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                                disabled={pagination.page >= pagination.pages || loading}
                                aria-label="Next page"
                                className="h-10 w-10 inline-flex items-center justify-center rounded-xl border border-slate-200
                                           text-slate-600 disabled:opacity-40 hover:bg-slate-50"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    ) : null}
                </div>
            </div>

            {open ? (
                <SidePanel
                    title={messageLabel(open.event)}
                    subtitle={[open.recipientName, open.recipient].filter(Boolean).join(' · ')}
                    onClose={() => setOpen(null)}
                    footer={<div className="flex justify-end"><ResendButton row={open} size="md" onDone={load} /></div>}
                >
                    <DeliveryDetail row={open} />
                </SidePanel>
            ) : null}
        </>
    );
}
