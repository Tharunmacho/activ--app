import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, Linking, Share } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {
  Notice, BottomActionBar, PALETTE, SPACE, SIZE, TYPE, BRAND, asArray, money, shortDate, errorText,
  PremiumPage, PremiumPageHeader, PremiumSection, PremiumInput, GradientButton, GradientAvatar, FadeInUp, PressableScale,
  SurfaceCard, DateTile, SeatMeter, StateView, CardSkeletons, TornEdge, ReceiptLine, GradientGlyph,
  EventTicket3D, EventCalendar3D, PREMIUM_OVERLAP,
} from '../../../ui';
import { getBookableEvent, createEventBooking, getEventBooking, getMyProfile, checkEventBooking } from '../../../services/memberApi';
import { WEBSITE_PATHS, websiteUrl } from '../../../config/website.config';
import { QrCode } from '../../admin/super/events/qr';
import { dateParts, whereOf, googleCalendarUrl, directionsUrl, shareLine, formatWhen } from './eventFormat';

/**
 * Book seats — the website's EventBookingPage (member shell), same booking
 * system as the public site, attached to the member by their token.
 *
 *   GET  /event-bookings/event/:eventId          price for THIS caller, seats left
 *   POST /event-bookings/event/:eventId/check    "already booked" before writing
 *   POST /event-bookings/event/:eventId          { name, email, phone, noOfPersons, participants, note }
 *   GET  /event-bookings/:ref                     the ticket
 *
 * No amount is ever sent. A free booking is confirmed at once; a priced one is
 * handed to checkout (PaymentCheckout, event_booking) — the payment area.
 *
 * Validation is the website's (and so the server's) rules, no stricter: name,
 * a valid email, a 10-digit mobile starting 6–9; participant rows optional,
 * but a typed email / mobile must be valid and two participant rows may not
 * repeat each other. "Already booked" answers from /check land under the
 * field they are about (`fields: { email, phone, 'participants.N.email' … }`).
 *
 * The ticket follows the website's confirmation: headline by state
 * (confirmed · cancelled · waitlist · payment not completed), the reference,
 * the online join section, calendar / share / directions, and the event and
 * booking details with the SERVER's amounts.
 */

type Person = { name: string; email: string; phone: string };
type Errors = Record<string, string>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MOBILE_RE = /^[6-9]\d{9}$/;
const nationalMobile = (value: string): string => {
  let d = String(value || '').replace(/\D/g, '');
  if (d.length > 10 && d.startsWith('91')) d = d.slice(2);
  if (d.length > 10 && d.startsWith('0')) d = d.slice(1);
  return d;
};

const open = (url?: string) => {
  if (!url) return;
  Linking.openURL(url).catch((err) => console.warn('Open link safely caught:', err));
};

function Stepper({ value, min, max, onChange }: { value: number; min: number; max: number; onChange: (n: number) => void }) {
  return (
    <View style={styles.stepper}>
      <PressableScale onPress={() => onChange(Math.max(min, value - 1))} disabled={value <= min} scaleTo={0.9} contentStyle={[styles.stepBtn, value <= min && { opacity: 0.4 }]} accessibilityRole="button" accessibilityLabel="One fewer seat">
        <Icon name="remove" size={SIZE.icon} color={PALETTE.blue} />
      </PressableScale>
      <Text style={styles.stepValue} accessibilityLiveRegion="polite">{value}</Text>
      <PressableScale onPress={() => onChange(Math.min(max, value + 1))} disabled={value >= max} scaleTo={0.9} style={value >= max ? { opacity: 0.4 } : undefined} accessibilityRole="button" accessibilityLabel="One more seat">
        <LinearGradient colors={['#1E3A8A', '#2563EB']} style={styles.stepBtnOn}>
          <Icon name="add" size={SIZE.icon} color={PALETTE.white} />
        </LinearGradient>
      </PressableScale>
    </View>
  );
}

function TicketAction({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <PressableScale onPress={onPress} style={styles.tActionWrap} contentStyle={styles.tAction} accessibilityRole="button" accessibilityLabel={label}>
      <Icon name={icon} size={18} color={PALETTE.blueDark} />
      <Text style={styles.tActionText} numberOfLines={1} maxFontSizeMultiplier={1.2}>{label}</Text>
    </PressableScale>
  );
}

/** The confirmation, drawn as a real ticket: gradient stub, perforation, details, torn foot. */
function Ticket({ b, event, fallbackEmail, onPay, onRebook }: { b: any; event: any; fallbackEmail: string; onPay: () => void; onRebook: () => void }) {
  const payStatus = String(b?.payment?.status || '');
  const status = String(b?.status || 'active');
  const pending = payStatus === 'pending';
  /* Only a LIVE hold can still be paid; a lapsed one (`expired`) or a failed
     attempt holds no seat and is booked again (website: "You can book again"). */
  const payable = pending && status === 'active';
  // A paid hold later swept to `expired` still holds its seat (the server lists it as registered).
  const settled = (status === 'active' || (status === 'expired' && payStatus === 'paid'))
    && (payStatus === 'paid' || payStatus === 'not_required');
  const headline = settled || (!pending && status === 'active') ? 'Booking confirmed'
    : status === 'cancelled' ? 'Booking cancelled'
      : status === 'waitlist' ? 'You are on the waitlist'
        : 'Payment not completed';
  const copy = settled || (!pending && status === 'active')
    ? `We have emailed the details to ${b?.bookedBy?.email || fallbackEmail || 'you'}${b?.bookedBy?.phone ? ' and sent a WhatsApp confirmation.' : '.'}`
    : status === 'cancelled'
      ? 'This booking was cancelled by the organiser. Contact them if you have a question.'
      : status === 'waitlist'
        ? 'The event is full. No seat is held and nothing has been charged.'
        : payable
          ? 'Your seats are held until the payment is made. Pay below to confirm them.'
          : 'We have not received the payment for this booking, so no seat is held. You can book again, or pay the organiser directly.';
  const tone = settled || (!pending && status === 'active') ? ['#047857', '#10B981'] : status === 'cancelled' ? ['#991B1B', '#EF4444'] : ['#B45309', '#F59E0B'];
  const people = asArray<any>(b?.participants);
  const mode = b?.mode ?? event?.mode;
  const online = String(mode || '') === 'online';
  const merged = {
    id: event?.id, slug: event?.slug,
    title: b?.eventTitle || event?.title,
    description: event?.description,
    startAt: b?.eventStartAt || event?.startAt,
    endAt: event?.endAt,
    venue: b?.eventVenue || event?.venue,
    venueAddress: event?.venueAddress,
    venueMapUrl: b?.eventMapUrl || event?.venueMapUrl,
    mode,
    onlinePlatform: b?.onlinePlatform ?? event?.onlinePlatform,
  };
  // The public WEBSITE page — never the API host, which has no such page (404).
  const pageUrl = websiteUrl(WEBSITE_PATHS.event(String(merged.slug || merged.id || '')));
  // Website EventActions sit under every confirmation; a cancelled booking has nothing to diary.
  const actionable = status !== 'cancelled';
  const calendar = actionable ? googleCalendarUrl(merged, pageUrl) : '';
  const directions = actionable ? directionsUrl(merged) : '';
  const share = async () => {
    try {
      await Share.share({ title: merged.title || 'ACTIV event', message: `${shareLine(merged)}\n\n${pageUrl}` });
    } catch (err) {
      console.warn('Share safely caught:', err);
    }
  };
  const unit = Number(b?.unitAmount || 0);
  const total = Number(b?.totalAmount || 0);
  const seats = Number(b?.noOfPersons || people.length || 1);

  return (
    <View style={styles.ticketShadow}>
      <LinearGradient colors={['#0B1A45', '#1E3A8A', '#2563EB']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.stub}>
        <View pointerEvents="none" style={styles.stubOrb} />
        <View style={styles.stubTop}>
          <LinearGradient colors={tone} style={styles.statusDisc}>
            <Icon name={settled || (!pending && status === 'active') ? 'check' : status === 'cancelled' ? 'close' : 'schedule'} size={22} color={PALETTE.white} />
          </LinearGradient>
          <View style={styles.flexMin}>
            <Text style={styles.stubEyebrow}>ACTIV EVENT TICKET</Text>
            <Text style={styles.stubTitle} numberOfLines={2}>{headline}</Text>
          </View>
        </View>
        <Text style={styles.stubCopy}>{copy}</Text>
        <View style={styles.refBox}>
          <Text style={styles.refLabel}>YOUR BOOKING REFERENCE</Text>
          <Text style={styles.ref} selectable numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{b?.bookingRef || '—'}</Text>
          <Text style={styles.refHint}>Keep this — it is how we find your booking.</Text>
        </View>
      </LinearGradient>

      <View style={styles.perf}>
        <View style={[styles.notch, { left: -11 }]} />
        <View style={styles.perfLine} />
        <View style={[styles.notch, { right: -11 }]} />
      </View>

      <View style={styles.tBody}>
        <Text style={styles.tEvent} numberOfLines={3}>{merged.title || 'Event'}</Text>
        <View style={styles.tFacts}>
          <View style={styles.tFact}>
            <Icon name="event" size={16} color={PALETTE.blue} />
            <Text style={styles.tFactText}>{merged.startAt ? formatWhen(merged) : 'To be confirmed'}</Text>
          </View>
          <View style={styles.tFact}>
            <Icon name={online ? 'videocam' : 'place'} size={16} color={PALETTE.blue} />
            <Text style={styles.tFactText}>{online ? (merged.onlinePlatform || 'Online') : (merged.venue || 'Venue to be announced')}</Text>
          </View>
        </View>

        {/* Website parity: drawn for every online booking. The server only
            fills `onlineUrl` on a by-reference read (GET /event-bookings/:ref),
            which is the proof of booking; without it the copy says it is coming. */}
        {online ? (
          <View style={styles.online}>
            <Text style={styles.onlineHead}>REGISTER FOR THIS WEBINAR</Text>
            {b?.onlineUrl ? (
              <>
                <Text style={styles.small}>{merged.onlinePlatform ? `This event runs on ${merged.onlinePlatform}.` : 'This event is online.'}</Text>
                <GradientButton label="Complete your registration" icon="videocam" onPress={() => open(String(b.onlineUrl))} style={{ marginTop: SPACE.sm }} />
                <Text style={[styles.small, { marginTop: SPACE.sm }]} selectable numberOfLines={2}>{b.onlineUrl}</Text>
                <Text style={styles.small}>Once you register, your personal joining link is emailed to you.</Text>
              </>
            ) : (
              <Text style={styles.small}>
                {merged.onlinePlatform ? `This event runs on ${merged.onlinePlatform}. ` : 'This event is online. '}
                The registration link will be shared with you soon.
              </Text>
            )}
          </View>
        ) : null}

        {actionable ? (
          <View style={styles.tActions}>
            {calendar ? <TicketAction icon="event" label="Calendar" onPress={() => open(calendar)} /> : null}
            <TicketAction icon="share" label="Share" onPress={share} />
            {directions ? <TicketAction icon="directions" label="Directions" onPress={() => open(directions)} /> : null}
          </View>
        ) : null}

        {settled && b?.bookingRef ? (
          <View style={styles.qrRow}>
            <View style={styles.qrFrame}><QrCode value={String(b.bookingRef)} size={104} /></View>
            <View style={styles.flexMin}>
              <Text style={styles.qrTitle}>Show at the entrance</Text>
              <Text style={styles.small}>This code carries your booking reference {b.bookingRef}, so the organiser can find you in seconds.</Text>
            </View>
          </View>
        ) : null}

        <Text style={styles.tSection}>BOOKING DETAILS</Text>
        {b?.bookedBy?.name ? <ReceiptLine label="Name" value={b.bookedBy.name} /> : null}
        {b?.bookedBy?.email ? <ReceiptLine label="Email" value={b.bookedBy.email} selectable /> : null}
        {b?.bookedBy?.phone ? <ReceiptLine label="Mobile" value={b.bookedBy.phone} selectable /> : null}
        <ReceiptLine label="Price per seat" value={unit > 0 ? money(unit) : total > 0 ? money(total / Math.max(1, seats)) : 'Free'} />
        <ReceiptLine label="No. of persons" value={String(seats)} />
        <ReceiptLine label="Payment status" value={payStatus === 'paid' ? 'Paid' : payStatus === 'not_required' ? 'Not required' : 'Pending'} />
        <View style={styles.dash} />
        <ReceiptLine label="Total amount" value={total > 0 ? money(total) : 'Free'} strong />

        {people.length ? (
          <View style={styles.people}>
            <Text style={styles.tSection}>PARTICIPANTS</Text>
            {people.map((p, i) => (
              <View key={`${p?.email || p?.phone || ''}-${i}`} style={styles.personRow}>
                <GradientAvatar name={p?.name || `Participant ${i + 1}`} size={34} />
                <View style={styles.flexMin}>
                  <Text style={styles.person} numberOfLines={1}>{p?.name || `Participant ${i + 1}`}</Text>
                  {p?.email || p?.phone ? <Text style={styles.small} numberOfLines={1}>{[p?.email, p?.phone].filter(Boolean).join(' · ')}</Text> : null}
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {payable ? <GradientButton label={`Pay ${money(total)} and confirm`} icon="payment" onPress={onPay} style={{ marginTop: SPACE.lg }} /> : null}
        {!payable && !settled && status !== 'active' && status !== 'waitlist' ? (
          <GradientButton label="Book again" variant="outline" icon="replay" onPress={onRebook} style={{ marginTop: SPACE.lg }} />
        ) : null}
      </View>
      <TornEdge color={PALETTE.white} flip teeth={24} />
    </View>
  );
}

const EventBookingScreen = ({ navigation, route }: any) => {
  const eventId = String(route?.params?.eventId || '');
  const initialRef = String(route?.params?.ref || '');
  const [event, setEvent] = useState<any>(null);
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [me, setMe] = useState<Person>({ name: '', email: '', phone: '' });
  const [count, setCount] = useState(1);
  const [others, setOthers] = useState<Person[]>([]);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [errors, setErrors] = useState<Errors>({});

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      // Opened by reference alone (a payment result that lost the event id):
      // the booking names its event.
      const byRef = initialRef ? await getEventBooking(initialRef).catch(() => null) : null;
      const id = eventId || String(byRef?.eventId || '');
      const [ev, prof] = await Promise.all([
        getBookableEvent(id).catch((err) => { if (byRef) return { id }; throw err; }),
        getMyProfile().catch(() => ({})),
      ]);
      const existing = byRef;
      setEvent(ev);
      setBooking(existing);
      setMe({ name: String(prof?.fullName || ''), email: String(prof?.email || ''), phone: String(prof?.phoneNumber || '') });
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [eventId, initialRef]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Back from checkout (paid, abandoned or failed): re-read the ticket quietly
     so its state is the server's, not the one we left with. GET only. */
  const bookingRef = String(booking?.bookingRef || '');
  const focused = useRef(false);
  useFocusEffect(useCallback(() => {
    if (!focused.current) { focused.current = true; return; }
    if (!bookingRef) return;
    getEventBooking(bookingRef).then((fresh) => { if (fresh?.bookingRef) setBooking(fresh); }).catch(() => null);
  }, [bookingRef]));

  const max = Math.max(1, Number(event?.maxPerBooking || 10));
  const unit = Number(event?.amount ?? 0);
  const total = unit * count;
  useEffect(() => {
    setOthers((prev) => Array.from({ length: Math.max(0, count - 1) }, (_, i) => prev[i] || { name: '', email: '', phone: '' }));
  }, [count]);

  const clear = (key: string) => setErrors((prev) => (prev[key] ? { ...prev, [key]: '' } : prev));
  const setOther = (i: number, key: keyof Person, v: string) => {
    setOthers((prev) => prev.map((p, idx) => (idx === i ? { ...p, [key]: v } : p)));
    clear(`p${i}.${key}`);
  };

  const pay = (b: any) => navigation.navigate('PaymentCheckout', {
    orderType: 'event_booking', bookingRef: String(b?.bookingRef || ''), eventId: eventId || String(b?.eventId || ''),
  });

  /** The website's (= the server's) rules — no stricter. */
  const validate = (): Errors => {
    const found: Errors = {};
    if (!(me.name || '').trim()) found.name = 'Please enter your name';
    const email = (me.email || '').trim();
    if (!email) found.email = 'Please enter your email address';
    else if (!EMAIL_RE.test(email)) found.email = 'Enter a valid email address';
    const mobile = nationalMobile(me.phone);
    if (!mobile) found.phone = 'Please enter your mobile number';
    else if (!MOBILE_RE.test(mobile)) found.phone = 'Enter a valid 10-digit mobile number';
    if (count > max) found.count = `At most ${max} per booking`;
    const seenEmail = new Set<string>();
    const seenPhone = new Set<string>();
    (others || []).forEach((p, idx) => {
      const pe = (p?.email || '').trim().toLowerCase();
      const pp = nationalMobile(p?.phone || '');
      if (pe && !EMAIL_RE.test(pe)) found[`p${idx}.email`] = 'Enter a valid email address';
      else if (pe && seenEmail.has(pe)) found[`p${idx}.email`] = 'Use another email';
      if (pp && !MOBILE_RE.test(pp)) found[`p${idx}.phone`] = 'Enter a valid 10-digit mobile number';
      else if (pp && seenPhone.has(pp)) found[`p${idx}.phone`] = 'Use another mobile number';
      if (pe) seenEmail.add(pe);
      if (pp) seenPhone.add(pp);
    });
    return found;
  };

  /** /check answers `fields` keyed `email`, `phone`, `participants.N.email` — N counts from the booker (0). */
  const mapServerFields = (err: any): Errors => {
    const fields = err?.response?.data?.fields;
    if (!fields || typeof fields !== 'object') return {};
    const mapped: Errors = {};
    Object.entries(fields).forEach(([key, message]) => {
      const m = String(key).match(/^participants\.(\d+)\.(email|phone)$/);
      if (m) {
        const n = Number(m[1]);
        mapped[n === 0 ? m[2] : `p${n - 1}.${m[2]}`] = String(message);
      } else mapped[key] = String(message);
    });
    return mapped;
  };

  const submit = async () => {
    setFormError('');
    const found = validate();
    setErrors(found);
    if (Object.values(found).some(Boolean)) {
      setFormError('Please check the highlighted fields.');
      return;
    }
    const participants = [{ ...me }, ...others].map((p) => ({ name: (p.name || '').trim(), email: (p.email || '').trim(), phone: (p.phone || '').trim() }));
    setSubmitting(true);
    try {
      try {
        await checkEventBooking(eventId, { email: me.email.trim(), phone: me.phone.trim(), participants });
      } catch (err) {
        const fieldErrors = mapServerFields(err);
        if (Object.keys(fieldErrors).length) {
          setErrors((prev) => ({ ...prev, ...fieldErrors }));
          setFormError('Some of these details are already booked for this event.');
          return;
        }
        throw err;
      }
      const b = await createEventBooking(eventId, {
        name: me.name.trim(), email: me.email.trim().toLowerCase(), phone: me.phone.trim(),
        noOfPersons: count, participants, note: note.trim() || undefined,
      });
      setBooking(b);
      if (String(b?.payment?.status || '') === 'pending') {
        pay(b);
      } else if (b?.bookingRef) {
        // The create answer carries no joining details; the by-reference read
        // does (and is the ticket the website shows). Keep `b` if it fails.
        getEventBooking(String(b.bookingRef)).then((fresh) => { if (fresh?.bookingRef) setBooking(fresh); }).catch(() => null);
      }
    } catch (err) {
      const fieldErrors = mapServerFields(err);
      if (Object.keys(fieldErrors).length) setErrors((prev) => ({ ...prev, ...fieldErrors }));
      setFormError(errorText(err));
    } finally {
      setSubmitting(false);
    }
  };

  const d = useMemo(() => dateParts(event?.startAt), [event?.startAt]);

  const showForm = !loading && !error && !!event && !booking && !event?.closed;
  const capacity = Number(event?.capacity || 0);
  const left = typeof event?.seatsLeft === 'number' && capacity > 0 ? Number(event.seatsLeft) : null;
  const full = left !== null && left <= 0;

  return (
    <PremiumPage
      header={(
        <PremiumPageHeader
          eyebrow={booking ? 'Your booking' : 'Book Now'}
          title={booking ? 'Your ticket' : 'Book seats'}
          subtitle={booking ? 'Show this reference at the venue.' : 'Book early to avoid missing out.'}
          onBack={() => navigation.goBack()}
          art={booking ? <EventTicket3D size={88} /> : <EventCalendar3D size={88} />}
        />
      )}
      footer={showForm ? (
        <BottomActionBar note={full ? 'The event is full — nothing is charged for a waiting-list place' : total > 0 ? `Total ${money(total)} · confirmed by the server when you book` : 'Free — no payment needed'}>
          <GradientButton label={full ? 'Join the waiting list' : total > 0 ? `Book and pay ${money(total)}` : 'Confirm booking'} icon="check-circle" loading={submitting} onPress={submit} style={{ flex: 1 }} />
        </BottomActionBar>
      ) : booking && !loading ? (
        <BottomActionBar>
          <GradientButton label="Back to events" variant="outline" icon="event-note" onPress={() => navigation.navigate('MemberEvents')} style={{ flex: 1 }} />
        </BottomActionBar>
      ) : undefined}
    >
      {loading ? (
        <View style={styles.overlapBare}><CardSkeletons rows={3} /></View>
      ) : error ? (
        <FadeInUp style={styles.overlap}>
          <SurfaceCard>
            {/active membership/i.test(error) ? (
              <StateView
                compact
                art={<EventTicket3D size={64} />}
                title="Members-only event"
                message={error}
                action="Activate membership"
                actionIcon="workspace-premium"
                onAction={() => navigation.navigate('MembershipPlans')}
              />
            ) : (
              <StateView kind="error" compact title="The booking could not be loaded" message={error} onAction={load} />
            )}
          </SurfaceCard>
        </FadeInUp>
      ) : !event ? (
        <FadeInUp style={styles.overlap}>
          <SurfaceCard><StateView compact art={<EventCalendar3D size={64} />} title="Event not found" message="It may have been withdrawn." action="Back to events" onAction={() => navigation.navigate('MemberEvents')} /></SurfaceCard>
        </FadeInUp>
      ) : (
        <>
          <FadeInUp delay={60} style={styles.overlap}>
            <SurfaceCard>
              <View style={styles.evRow}>
                <DateTile date={event?.startAt} size={60} />
                <View style={styles.flexMin}>
                  <Text style={styles.evTitle} numberOfLines={3}>{event?.title || 'Event'}</Text>
                  <View style={styles.metaRow}>
                    <Icon name="schedule" size={SIZE.iconSm} color={PALETTE.textFaint} />
                    <Text style={styles.evMeta}>{event?.startAt ? `${shortDate(event.startAt)} · ${d.time}` : 'Date to be confirmed'}</Text>
                  </View>
                  {whereOf(event) ? (
                    <View style={styles.metaRow}>
                      <Icon name={String(event?.mode || '') === 'online' ? 'videocam' : 'place'} size={SIZE.iconSm} color={PALETTE.textFaint} />
                      <Text style={styles.evMeta}>{whereOf(event)}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
              {!booking ? (
                <View style={styles.priceStrip}>
                  <View style={styles.flexMin}>
                    <Text style={styles.priceStripValue}>{unit > 0 ? money(unit) : 'Free'}{unit > 0 ? <Text style={styles.small}>  per seat</Text> : null}</Text>
                    {event?.memberRateApplied && Number(event?.memberSaving) > 0 ? (
                      <Text style={styles.saveText}>Member rate — you save {money(Number(event.memberSaving))} per seat <Text style={styles.strike}>{money(Number(event?.price))}</Text></Text>
                    ) : event?.hasMemberRate && !event?.memberRateApplied && Number(event?.memberPrice) < Number(event?.price) ? (
                      <Text style={styles.memberHint} onPress={() => navigation.navigate('MembershipPlans')}>Members pay {money(Number(event.memberPrice))} — activate your membership</Text>
                    ) : null}
                  </View>
                  {event?.registrationClosesAt ? (
                    <View style={styles.closesChip}>
                      <Icon name="timer" size={13} color={PALETTE.amberDark} />
                      <Text style={styles.closesText} numberOfLines={2}>Closes {shortDate(event.registrationClosesAt)}</Text>
                    </View>
                  ) : null}
                </View>
              ) : null}
              {!booking && left !== null ? (
                left <= 0 ? (
                  <Text style={[styles.small, styles.fullText]}>This event is full — a booking now joins the waiting list and nothing is charged.</Text>
                ) : <SeatMeter capacity={capacity} left={left} style={{ marginTop: SPACE.md }} />
              ) : null}
            </SurfaceCard>
          </FadeInUp>

          {booking ? (
            <FadeInUp delay={140} style={styles.pad}>
              <Ticket
                b={booking}
                event={event}
                fallbackEmail={me.email}
                onPay={() => pay(booking)}
                onRebook={() => { setBooking(null); setErrors({}); setFormError(''); navigation.setParams({ ref: undefined }); }}
              />
            </FadeInUp>
          ) : event?.closed ? (
            <FadeInUp delay={140} style={styles.pad}>
              <SurfaceCard>
                <StateView compact art={<EventCalendar3D size={64} />} title="Bookings closed" message="Bookings for this event have closed." />
              </SurfaceCard>
            </FadeInUp>
          ) : (
            <>
              {event?.registrationNote ? (
                <FadeInUp delay={120}>
                  <Notice kind="warning" title="Please note" text={String(event.registrationNote)} style={styles.noteBox} />
                </FadeInUp>
              ) : null}

              <FadeInUp delay={160} style={{ marginTop: SPACE.lg }}>
                <PremiumSection icon="person-outline" title="Your details" subtitle="The ticket and reminders are sent here">
                  <PremiumInput
                    label="Full name" required value={me.name} error={errors.name}
                    onChangeText={(v) => { setMe({ ...me, name: v }); clear('name'); }}
                    icon="person-outline" autoCapitalize="words" autoComplete="name" textContentType="name"
                  />
                  <PremiumInput
                    label="Email" required value={me.email} error={errors.email}
                    onChangeText={(v) => { setMe({ ...me, email: v }); clear('email'); }}
                    icon="mail-outline" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email"
                  />
                  <PremiumInput
                    label="Mobile" required value={me.phone} error={errors.phone}
                    onChangeText={(v) => { setMe({ ...me, phone: v }); clear('phone'); }}
                    icon="call" keyboardType="phone-pad" textContentType="telephoneNumber" hint="10-digit mobile number"
                    style={{ marginBottom: 0 }}
                  />
                </PremiumSection>
              </FadeInUp>

              <FadeInUp delay={220}>
                <PremiumSection icon="groups" title="How many people?" subtitle={`Up to ${max} per booking`}>
                  <View style={styles.rowBetween}>
                    <View style={styles.flexMin}>
                      <Text style={styles.qtyLabel}>Seats</Text>
                      <Text style={styles.small}>{unit > 0 ? `${money(unit)} per person${event?.memberRateApplied ? ' · member rate' : ''}` : 'Free event'}</Text>
                    </View>
                    <Stepper value={count} min={1} max={max} onChange={(n) => { setCount(n); clear('count'); }} />
                  </View>
                  {errors.count ? <Text style={styles.err}>{errors.count}</Text> : null}
                  {others.map((p, i) => (
                    <View key={i} style={styles.other}>
                      <View style={styles.otherHead}>
                        <GradientGlyph icon="person-add-alt" tone="sky" size={30} />
                        <Text style={styles.otherTitle}>Participant {i + 2}</Text>
                      </View>
                      <PremiumInput placeholder="Name" value={p.name} onChangeText={(v) => setOther(i, 'name', v)} icon="person-outline" autoCapitalize="words" />
                      <PremiumInput placeholder="Email (optional)" value={p.email} error={errors[`p${i}.email`]} onChangeText={(v) => setOther(i, 'email', v)} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} icon="mail-outline" />
                      <PremiumInput placeholder="Mobile (optional)" value={p.phone} error={errors[`p${i}.phone`]} onChangeText={(v) => setOther(i, 'phone', v)} keyboardType="phone-pad" icon="call" style={{ marginBottom: 0 }} />
                    </View>
                  ))}
                  <PremiumInput
                    label="Note (optional)" value={note} onChangeText={setNote} multiline
                    placeholder="Anything the organiser should know" style={{ marginTop: SPACE.lg, marginBottom: 0 }}
                  />
                </PremiumSection>
              </FadeInUp>

              <FadeInUp delay={280} style={styles.pad}>
                <LinearGradient colors={['#0B1A45', '#1E3A8A', '#2563EB']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.totalCard}>
                  <View style={styles.rowBetween}>
                    <View style={styles.flexMin}>
                      <Text style={styles.totalEyebrow}>TOTAL</Text>
                      <Text style={styles.totalSub}>{count} {count === 1 ? 'seat' : 'seats'}{unit > 0 ? ` × ${money(unit)}` : ''}</Text>
                    </View>
                    <Text style={styles.total} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{total > 0 ? money(total) : 'Free'}</Text>
                  </View>
                  <Text style={styles.totalHint}>The final amount is confirmed by the server when you book.</Text>
                </LinearGradient>
                <Text style={styles.terms}>By continuing you agree to ACTIV's Terms &amp; Conditions and Cancellation Policy.</Text>
              </FadeInUp>

              {formError ? <Notice kind="danger" text={formError} style={styles.noteBox} /> : null}
            </>
          )}
        </>
      )}
    </PremiumPage>
  );
};

const styles = StyleSheet.create({
  flexMin: { flex: 1, minWidth: 0 },
  overlap: { marginTop: -PREMIUM_OVERLAP, marginHorizontal: SPACE.lg },
  overlapBare: { marginTop: -PREMIUM_OVERLAP },
  pad: { paddingHorizontal: SPACE.lg, marginTop: SPACE.lg },
  noteBox: { marginHorizontal: SPACE.lg, marginTop: SPACE.lg },
  evRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.md },
  evTitle: { ...TYPE.heading, fontSize: 17, lineHeight: 23, color: BRAND.navyDeep },
  metaRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.xs + 2, marginTop: SPACE.xs + 2 },
  evMeta: { ...TYPE.caption, fontSize: 13, lineHeight: 18, flexShrink: 1, minWidth: 0 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACE.md },
  qtyLabel: { ...TYPE.subheading, fontWeight: '700' },
  small: { ...TYPE.caption, marginTop: 3, flexShrink: 1 },
  err: { color: PALETTE.redDark, fontSize: 12, lineHeight: 16, fontWeight: '500', marginTop: SPACE.sm },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, padding: SPACE.xs, borderRadius: 999, backgroundColor: PALETTE.fieldBg, borderWidth: 1, borderColor: PALETTE.border },
  stepBtn: { width: SIZE.touch, height: SIZE.touch, borderRadius: SIZE.touch / 2, backgroundColor: PALETTE.blueSoft, alignItems: 'center', justifyContent: 'center' },
  stepBtnOn: { width: SIZE.touch, height: SIZE.touch, borderRadius: SIZE.touch / 2, alignItems: 'center', justifyContent: 'center' },
  stepValue: { ...TYPE.number, fontSize: 20, lineHeight: 26, minWidth: 28, textAlign: 'center' },
  other: { marginTop: SPACE.lg, paddingTop: SPACE.lg, borderTopWidth: 1, borderTopColor: PALETTE.divider },
  otherHead: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, marginBottom: SPACE.md },
  otherTitle: { ...TYPE.label, color: PALETTE.text },
  totalCard: { borderRadius: 22, padding: SPACE.lg },
  totalEyebrow: { ...TYPE.eyebrow, color: 'rgba(255,255,255,0.7)' },
  totalSub: { fontSize: 13, lineHeight: 18, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  total: { fontSize: 28, lineHeight: 34, fontWeight: '800', color: PALETTE.white, fontVariant: ['tabular-nums'], maxWidth: '60%' },
  totalHint: { fontSize: 12, lineHeight: 16, color: 'rgba(255,255,255,0.7)', marginTop: SPACE.sm },
  terms: { ...TYPE.caption, textAlign: 'center', marginTop: SPACE.md },
  priceStrip: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, marginTop: SPACE.md, paddingTop: SPACE.md, borderTopWidth: 1, borderTopColor: PALETTE.divider },
  priceStripValue: { fontSize: 18, lineHeight: 24, fontWeight: '800', color: BRAND.navy, fontVariant: ['tabular-nums'] },
  saveText: { fontSize: 12, lineHeight: 17, fontWeight: '700', color: PALETTE.green, marginTop: 2 },
  strike: { color: PALETTE.textFaint, fontWeight: '400', textDecorationLine: 'line-through' },
  memberHint: { fontSize: 12, lineHeight: 17, fontWeight: '700', color: PALETTE.amberDark, marginTop: 2 },
  closesChip: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: '45%', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: PALETTE.amberSoft },
  closesText: { fontSize: 11, lineHeight: 14, fontWeight: '700', color: PALETTE.amberDark, flexShrink: 1 },
  fullText: { marginTop: SPACE.md, fontWeight: '700', color: PALETTE.amberDark },

  ticketShadow: {
    // Transparent so the torn foot shows the canvas between its teeth; iOS
    // shadows follow the children, Android draws the paper flat.
    borderRadius: 22, backgroundColor: 'transparent', shadowColor: BRAND.shadowNavy, shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14, shadowRadius: 22,
  },
  stub: { borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: SPACE.lg, overflow: 'hidden' },
  stubOrb: { position: 'absolute', right: -50, top: -70, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,255,255,0.08)' },
  stubTop: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
  statusDisc: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)' },
  stubEyebrow: { ...TYPE.eyebrow, color: 'rgba(255,255,255,0.65)' },
  stubTitle: { fontSize: 20, lineHeight: 25, fontWeight: '800', color: PALETTE.white, marginTop: 2 },
  stubCopy: { fontSize: 13, lineHeight: 19, color: 'rgba(255,255,255,0.85)', marginTop: SPACE.md },
  refBox: { marginTop: SPACE.lg, padding: SPACE.md, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', alignItems: 'center' },
  refLabel: { ...TYPE.eyebrow, fontSize: 10, color: 'rgba(255,255,255,0.7)' },
  ref: { fontSize: 24, lineHeight: 30, fontWeight: '800', letterSpacing: 2, color: PALETTE.white, marginTop: 4, fontVariant: ['tabular-nums'] },
  refHint: { fontSize: 11, lineHeight: 15, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  perf: { height: 22, justifyContent: 'center', backgroundColor: PALETTE.white },
  perfLine: { marginHorizontal: SPACE.lg, borderTopWidth: 2, borderStyle: 'dashed', borderColor: PALETTE.borderStrong },
  notch: { position: 'absolute', top: 0, width: 22, height: 22, borderRadius: 11, backgroundColor: PALETTE.canvas },
  tBody: { paddingHorizontal: SPACE.lg, paddingBottom: SPACE.md, backgroundColor: PALETTE.white },
  tEvent: { ...TYPE.heading, fontSize: 18, lineHeight: 24, color: BRAND.navyDeep },
  tFacts: { gap: SPACE.xs + 2, marginTop: SPACE.sm },
  tFact: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.sm },
  tFactText: { ...TYPE.body, flex: 1, minWidth: 0, color: PALETTE.textSoft },
  online: { marginTop: SPACE.lg, padding: SPACE.md, borderRadius: 16, backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#A7F3D0' },
  onlineHead: { ...TYPE.eyebrow, color: PALETTE.greenDark, marginBottom: 2 },
  tActions: { flexDirection: 'row', gap: SPACE.sm, marginTop: SPACE.lg },
  tActionWrap: { flex: 1, minWidth: 0 },
  tAction: {
    minHeight: 56, alignItems: 'center', justifyContent: 'center', gap: 2, borderRadius: 16, borderWidth: 1,
    borderColor: '#C7DAFB', backgroundColor: PALETTE.blueTint, paddingHorizontal: 4,
  },
  tActionText: { fontSize: 12, lineHeight: 16, fontWeight: '700', color: PALETTE.blueDark },
  tSection: { ...TYPE.eyebrow, color: PALETTE.textFaint, marginTop: SPACE.lg, marginBottom: SPACE.xs },
  dash: { borderTopWidth: 1.5, borderStyle: 'dashed', borderColor: PALETTE.border, marginVertical: SPACE.xs },
  people: { marginTop: SPACE.xs, gap: SPACE.sm },
  qrRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, marginTop: SPACE.lg, padding: SPACE.md, borderRadius: 16, backgroundColor: PALETTE.blueTint, borderWidth: 1, borderColor: '#C7DAFB' },
  qrFrame: { padding: 4, borderRadius: 12, backgroundColor: PALETTE.white },
  qrTitle: { ...TYPE.subheading, fontWeight: '700', color: BRAND.navyDeep },
  personRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
  person: { ...TYPE.bodyStrong },
});

export default EventBookingScreen;
