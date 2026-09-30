import React, { useState } from 'react';
import { View, Text, StyleSheet, Share, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Screen, AppHeader, Card, PrimaryButton, PALETTE, SPACE, RADIUS } from '../../../ui';
import { updateCmsEvent, eventPublicUrl, errorText } from '../../../services/superApi';
import { ToggleRow, openUrl } from './superKit';
import { QrCode } from './events/qr';

/**
 * ============================================================================
 * SUPER ADMIN → EVENTS — one event's QR code (website `EventQrDialog`)
 * ============================================================================
 *
 * Opened from an event's row, and straight after an event is created
 * (`justCreated` — "Event created — QR ready"), as the website does. The code
 * encodes the event's public page (`eventPublicUrl`, slug first, the website's
 * `eventPath`), drawn by the app's own encoder at the website's error level.
 *
 * "Show this QR on the event page" writes `showQrOnPage` alone through
 * PUT /cms/events/:id — an absent field is UNTOUCHED on that path, so nothing
 * else on the event changes.
 *
 * A dedicated Stack screen rather than a popup: the Events list is a tab, and a
 * native Modal inside a tab is exactly what CLAUDE.md Rule 2 forbids.
 *
 * Not ported: the website's printable poster PNG (drawn on an HTML canvas).
 * Sharing sends the link, which opens the same page the code does.
 */

const dateLine = (startAt?: string | null) => {
  const d = startAt ? new Date(startAt) : null;
  if (!d || Number.isNaN(d.getTime())) return '';
  try {
    return `${d.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit',
    })} IST`;
  } catch {
    return d.toString();
  }
};

const SuperEventQrScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const event = route?.params?.event || {};
  const justCreated = !!route?.params?.justCreated;
  const [showOnPage, setShowOnPage] = useState<boolean>(event?.showQrOnPage !== false);
  const [busy, setBusy] = useState(false);

  const url = eventPublicUrl(event);
  const title = String(event?.title || '') || 'Untitled event';
  const when = dateLine(event?.startAt);

  const share = () => {
    Share.share({ title, message: `${title} — ${url}` }).catch(() => null);
  };

  const toggle = async (next: boolean) => {
    const id = String(event?.id || '');
    if (!id || busy) return;
    setBusy(true);
    const before = showOnPage;
    setShowOnPage(next);
    try {
      await updateCmsEvent(id, { showQrOnPage: next });
    } catch (err) {
      setShowOnPage(before);
      Alert.alert('Could not save the QR setting', errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen tone="admin">
      <AppHeader tone="admin" title={justCreated ? 'Event created — QR ready' : 'Event QR code'} subtitle={title}
        onBack={() => navigation.goBack()} />

      <Card style={s.card}>
        <Text style={s.title} numberOfLines={3}>{title}</Text>
        {when ? <Text style={s.when}>{when}</Text> : null}
        <View style={s.qrFrame}>
          <QrCode value={url} size={248} />
        </View>
        <Text style={s.caption}>Scanning opens this event&apos;s page on the phone.</Text>
        <Text style={s.url} selectable numberOfLines={3}>{url}</Text>
      </Card>

      <View style={s.actions}>
        <PrimaryButton tone="admin" icon="share" label="Share" onPress={share} />
        <PrimaryButton tone="admin" variant="outline" icon="open-in-new" label="Open the event page" onPress={() => openUrl(url)} />
      </View>

      <Card style={s.card}>
        <ToggleRow label="Show this QR on the event page" value={showOnPage} onChange={toggle} disabled={busy || !event?.id}
          hint="Visitors can scan it from a screen or projector, or download it." last />
      </Card>
    </Screen>
  );
};

const s = StyleSheet.create({
  card: { marginHorizontal: SPACE.lg, marginTop: SPACE.md, alignItems: 'stretch' },
  title: { fontSize: 18, fontWeight: '800', color: PALETTE.text, textAlign: 'center' },
  when: { fontSize: 13, color: PALETTE.textMuted, textAlign: 'center', marginTop: 4 },
  qrFrame: { alignSelf: 'center', marginTop: SPACE.lg, padding: SPACE.sm, borderRadius: RADIUS.md, borderWidth: 2, borderColor: '#DBE4FB', backgroundColor: '#FFFFFF' },
  caption: { fontSize: 13, fontWeight: '700', color: '#1E3A8A', textAlign: 'center', marginTop: SPACE.md },
  url: { fontSize: 12, color: PALETTE.textMuted, textAlign: 'center', marginTop: 4 },
  actions: { marginHorizontal: SPACE.lg, marginTop: SPACE.lg, gap: SPACE.sm },
});

export default SuperEventQrScreen;
