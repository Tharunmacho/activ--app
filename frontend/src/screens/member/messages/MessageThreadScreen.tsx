import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Linking, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { launchImageLibrary } from 'react-native-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Notice, PALETTE, SPACE, SIZE, TYPE, asArray,
  PremiumTopBar, GradientAvatar, GradientGlyph, CardSkeletons, StateView, ArtBadge, ChatBubbles3D, PressableScale,
  PREMIUM_GRADIENTS, BRAND, FitImage } from '../../../ui';
import { getThread, sendMessage, markConversationRead, uploadMessageImage } from '../../../services/memberApi';
import { resolveMediaUrl } from '../../../config/api.config';
import { memberFacing, OPENERS, EMOJI, timeOf } from './messageCopy';

/**
 * One conversation — website `MemberInbox` thread pane.
 *
 *   GET  /messages/:id (oldest→newest, paged with `before`), re-read quietly every 10 s
 *   POST /messages/:id { body, attachmentUrl }     POST /messages/:id/read
 *   POST /messages/attachment (field `image`) → { url } — upload first, then send
 *
 * Website parity: the openers ("What is it about?" on an empty thread; a
 * "Start with" chip row on a live one, only while the box is empty), the
 * curated emoji grid inserted at the cursor, the chosen picture PREVIEWED with
 * an optional caption before it goes, the placeholder that changes with the
 * state, and plumbing errors never shown to a member.
 *
 * Premium: a fixed brand bar (tap the name for their directory card), day
 * separators, grouped bubbles — yours on the navy→blue gradient, theirs white
 * and lifted — and a composer that rides above the keyboard (Android resizes
 * natively; iOS lifts through the KeyboardAvoidingView around the body).
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const dayKey = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toDateString();
};

/** "Today", "Yesterday", "Monday", "12 Sep 2026". */
const dayLabel = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((start(new Date()) - start(d)) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days > 1 && days < 7) return WEEKDAYS[d.getDay()];
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

type Row =
  | { kind: 'day'; key: string; label: string }
  | { kind: 'msg'; key: string; m: any; tail: boolean };

function DaySeparator({ label }: { label: string }) {
  return (
    <View style={styles.dayRow} accessibilityRole="header">
      <View style={styles.dayLine} />
      <View style={styles.dayPill}><Text style={styles.dayText} maxFontSizeMultiplier={1.2}>{label}</Text></View>
      <View style={styles.dayLine} />
    </View>
  );
}

function Bubble({ m, tail }: { m: any; tail: boolean }) {
  const mine = !!m?.mine;
  const img = m?.attachmentUrl ? resolveMediaUrl(m.attachmentUrl) : '';
  const openImage = () => {
    try { Linking.openURL(img).catch(() => null); } catch { /* nothing to open */ }
  };
  const content = (
    <>
      {img ? (
        <TouchableOpacity activeOpacity={0.9} onPress={openImage} accessibilityRole="imagebutton" accessibilityLabel="Open picture">
          <FitImage uri={img} style={[styles.img, !m?.body && { marginBottom: SPACE.xs }]} />
        </TouchableOpacity>
      ) : null}
      {m?.body ? <Text style={[styles.body, mine && { color: PALETTE.white }]} selectable>{m.body}</Text> : null}
      <View style={styles.metaRow}>
        <Text style={[styles.meta, mine && { color: 'rgba(255,255,255,0.78)' }]}>{timeOf(m?.at)}</Text>
        {mine ? (
          <Icon
            name={m?.readAt ? 'done-all' : 'done'}
            size={14}
            color={m?.readAt ? '#A7F3D0' : 'rgba(255,255,255,0.78)'}
            accessibilityLabel={m?.readAt ? 'Read' : 'Sent'}
          />
        ) : null}
      </View>
    </>
  );
  const shape = mine
    ? [styles.bubble, tail && { borderBottomRightRadius: 6 }]
    : [styles.bubble, tail && { borderBottomLeftRadius: 6 }];
  return (
    <View style={[styles.bubbleRow, mine ? styles.right : styles.left, tail ? styles.tailGap : styles.groupGap]}>
      {mine ? (
        <View style={[styles.mineShadow, shape]}>
          <LinearGradient colors={PREMIUM_GRADIENTS.memberButton} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.bubbleFill, tail && { borderBottomRightRadius: 6 }, styles.bubblePad]}>
            {content}
          </LinearGradient>
        </View>
      ) : (
        <View style={[styles.theirs, shape, styles.bubblePad]}>{content}</View>
      )}
    </View>
  );
}

type Picture = { uri: string; type: string; name: string };

const MessageThreadScreen = ({ navigation, route }: any) => {
  const conversationId = String(route?.params?.conversationId || '');
  const [messages, setMessages] = useState<any[]>([]);
  const [other, setOther] = useState<any>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [older, setOlder] = useState(false);
  const [error, setError] = useState('');
  const [text, setText] = useState('');
  const [picture, setPicture] = useState<Picture | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [selection, setSelection] = useState<{ start: number; end: number }>({ start: 0, end: 0 });
  const listRef = useRef<FlatList>(null);
  const focused = useRef(false);
  // The composer is the screen's bottom edge — pad it past the home indicator.
  const insets = useSafeAreaInsets();
  const composerBottom = Math.max(Number(insets?.bottom || 0), SPACE.md);

  const load = useCallback(async (quiet = false) => {
    if (!conversationId) return;
    if (!quiet) { setLoading(true); setError(''); }
    try {
      const res = await getThread(conversationId);
      const list = asArray<any>(res?.messages);
      // A quiet poll only ever grows the thread — it never drops "load earlier" pages.
      setMessages((prev) => (quiet && prev.length > list.length ? prev : list));
      if (!quiet) setHasMore(!!res?.hasMore);
      setOther(res?.conversation?.withMember || null);
      markConversationRead(conversationId);
    } catch (err) {
      if (!quiet) setError(memberFacing(err, 'Could not open this conversation'));
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => { load(); }, [load]);

  useFocusEffect(useCallback(() => {
    focused.current = true;
    return () => { focused.current = false; };
  }, []));

  // The website re-reads the open thread every 10 s.
  useEffect(() => {
    const timer = setInterval(() => { if (focused.current && !sending) load(true); }, 10000);
    return () => clearInterval(timer);
  }, [load, sending]);

  const loadOlder = async () => {
    if (!hasMore || older || !messages.length) return;
    setOlder(true);
    try {
      const res = await getThread(conversationId, String(messages[0]?.at || ''));
      setMessages((prev) => [...asArray<any>(res?.messages), ...prev]);
      setHasMore(!!res?.hasMore);
    } catch { /* keep what is shown */ } finally {
      setOlder(false);
    }
  };

  const peerName = String(other?.fullName || route?.params?.name || 'Member');
  const firstName = peerName.split(' ').filter(Boolean)[0] || 'there';
  const peerWhere = other?.organizationName || [other?.block, other?.district, other?.state].filter(Boolean).join(', ');
  const peerId = String(other?.id || '');
  const peerPhoto = other?.photoUrl ? resolveMediaUrl(other.photoUrl) : '';

  /** Messages interleaved with day separators; the last of a run from one sender carries the tail. */
  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    const list = asArray<any>(messages);
    let lastDay = '';
    list.forEach((m, i) => {
      const key = dayKey(m?.at);
      if (key && key !== lastDay) {
        out.push({ kind: 'day', key: `day-${key}`, label: dayLabel(m?.at) });
        lastDay = key;
      }
      const next = list[i + 1];
      const tail = !next || !!next?.mine !== !!m?.mine || dayKey(next?.at) !== key;
      out.push({ kind: 'msg', key: String(m?.id || m?._id || `m-${i}`), m, tail });
    });
    return out;
  }, [messages]);

  const submit = async () => {
    const body = (text || '').trim();
    // A picture alone is a message; one with neither is nothing at all.
    if ((!body && !picture) || sending) return;
    setSending(true);
    setSendError('');
    try {
      let url = '';
      if (picture) {
        const up = await uploadMessageImage(picture.uri, picture.type, picture.name);
        url = String(up?.url || '');
        if (!url) throw new Error('The picture could not be uploaded');
      }
      const msg = await sendMessage(conversationId, body, url);
      setText('');
      setPicture(null);
      if (msg && (msg.id || msg.body || msg.attachmentUrl)) setMessages((prev) => [...prev, msg]);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    } catch (err) {
      setSendError(memberFacing(err, 'That message could not be sent'));
    } finally {
      setSending(false);
    }
  };

  const pickPicture = () => {
    try {
      if (typeof launchImageLibrary !== 'function') return;
      launchImageLibrary({ mediaType: 'photo', quality: 0.8, maxWidth: 1600, maxHeight: 1600 }, (res) => {
        const asset = res?.assets?.[0];
        if (!asset?.uri || res?.didCancel) return;
        setPicture({ uri: asset.uri, type: asset.type || 'image/jpeg', name: asset.fileName || 'photo.jpg' });
        setEmojiOpen(false);
      });
    } catch (err) {
      console.warn('Native module call safely caught:', err);
    }
  };

  const insertEmoji = (mark: string) => {
    const current = text || '';
    const at = Math.min(selection.start, current.length);
    const to = Math.min(selection.end, current.length);
    const next = current.slice(0, at) + mark + current.slice(to);
    setText(next);
    const caret = at + mark.length;
    setSelection({ start: caret, end: caret });
    setEmojiOpen(false);
  };

  const applyOpener = (tpl: string) => {
    const next = String(tpl || '').replace('{name}', firstName);
    setText(next);
    setSelection({ start: next.length, end: next.length });
  };

  const draftEmpty = !(text || '').trim();
  const cannotSend = sending || (draftEmpty && !picture);
  const placeholder = picture
    ? 'Add a caption, or send the picture on its own…'
    : messages.length === 0
      ? 'Write about your business — what you make, what you need…'
      : `Message ${firstName === 'there' ? 'member' : firstName}…`;

  const topBar = (
    <PremiumTopBar
      title={peerName}
      subtitle={peerWhere || 'ACTIV member'}
      onBack={() => navigation.goBack()}
      leading={<GradientAvatar name={peerName} uri={peerPhoto || undefined} size={42} />}
      onTitlePress={peerId ? () => navigation.navigate('DirectoryProfile', { id: peerId, name: peerName }) : undefined}
      right={peerId ? (
        <TouchableOpacity
          onPress={() => navigation.navigate('DirectoryProfile', { id: peerId, name: peerName })}
          style={styles.barBtn}
          accessibilityRole="button"
          accessibilityLabel={`View ${firstName}'s profile`}
        >
          <Icon name="badge" size={20} color={PALETTE.white} />
        </TouchableOpacity>
      ) : undefined}
    />
  );

  const body = loading ? <CardSkeletons rows={5} variant="bubble" style={{ paddingTop: SPACE.lg }} /> : error ? (
    <StateView kind="error" title="Could not open this conversation" message={error} onAction={() => load()} />
  ) : (
    <>
      <FlatList
        ref={listRef}
        data={rows}
        keyExtractor={(r, i) => String(r?.key || i)}
        renderItem={({ item }) => (item.kind === 'day'
          ? <DaySeparator label={item.label} />
          : <Bubble m={item.m} tail={item.tail} />)}
        onContentSizeChange={() => { if (!older) listRef.current?.scrollToEnd({ animated: false }); }}
        ListHeaderComponent={hasMore ? (
          <TouchableOpacity onPress={loadOlder} style={styles.older} accessibilityRole="button">
            {older ? <ActivityIndicator color={PALETTE.blue} /> : (
              <>
                <Icon name="history" size={16} color={PALETTE.blue} />
                <Text style={styles.olderText}>Load earlier messages</Text>
              </>
            )}
          </TouchableOpacity>
        ) : null}
        ListEmptyComponent={(
          <View style={styles.emptyWrap}>
            <ArtBadge size={96}><ChatBubbles3D size={72} /></ArtBadge>
            <Text style={styles.empty}>No messages yet. Say hello.</Text>
            <Text style={styles.emptySub}>Your first message opens the conversation with {firstName === 'there' ? 'this member' : firstName}.</Text>
          </View>
        )}
        contentContainerStyle={styles.listPad}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        initialNumToRender={10}
        maxToRenderPerBatch={10}
      />

      {/* An EMPTY thread: the labelled openers (website "What is it about?"). */}
      {messages.length === 0 && draftEmpty && !picture ? (
        <View style={styles.openers}>
          <Text style={styles.openersTitle}>What is it about?</Text>
          <Text style={styles.openersHint}>Pick one to start. It goes in the box below for you to change before you send it.</Text>
          {OPENERS.map((o, i) => (
            <PressableScale
              key={o.label}
              onPress={() => applyOpener(o.text)}
              contentStyle={styles.opener}
              accessibilityRole="button"
              accessibilityLabel={`${o.label}. ${o.hint}`}
            >
              <GradientGlyph icon={o.icon} tone={i === 0 ? 'blue' : i === 1 ? 'teal' : 'amber'} size={36} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.openerTitle}>{o.label}</Text>
                <Text style={styles.openerSub} numberOfLines={2}>{o.hint}</Text>
              </View>
              <Icon name="north-east" size={16} color={PALETTE.textFaint} />
            </PressableScale>
          ))}
        </View>
      ) : null}

      {/* A LIVE thread: one quiet chip row, only while the box is empty. */}
      {messages.length > 0 && draftEmpty && !picture ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow} keyboardShouldPersistTaps="handled" style={styles.chipScroll}>
          <Text style={styles.chipLead}>START WITH</Text>
          {OPENERS.map((o) => (
            <TouchableOpacity key={o.label} style={styles.chip} onPress={() => applyOpener(o.text)} accessibilityRole="button">
              <Icon name={o.icon} size={14} color={PALETTE.blue} />
              <Text style={styles.chipText}>{o.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : null}

      {/* The chosen picture, before it goes. */}
      {picture ? (
        <View style={styles.preview}>
          <FitImage uri={picture.uri} style={styles.previewImg} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.previewName} numberOfLines={1}>{picture.name}</Text>
            <Text style={styles.previewHint}>Ready to send — a caption is optional.</Text>
          </View>
          <TouchableOpacity onPress={() => setPicture(null)} accessibilityLabel="Remove picture" style={styles.previewX}>
            <Icon name="close" size={SIZE.icon} color={PALETTE.textMuted} />
          </TouchableOpacity>
        </View>
      ) : null}

      {emojiOpen ? (
        <View style={styles.emojiGrid}>
          {EMOJI.map((mark, i) => (
            <TouchableOpacity key={`${mark}-${i}`} style={styles.emojiCell} onPress={() => insertEmoji(mark)} accessibilityRole="button" accessibilityLabel={`Insert ${mark}`}>
              <Text style={styles.emoji}>{mark}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      {sendError ? <Notice kind="warning" text={sendError} style={styles.sendError} /> : null}
      <View style={[styles.composer, { paddingBottom: composerBottom }]}>
        <TouchableOpacity onPress={pickPicture} disabled={sending} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="Send a picture">
          <Icon name="add-photo-alternate" size={SIZE.iconLg - 2} color={PALETTE.blueDark} />
        </TouchableOpacity>
        <View style={styles.inputWrap}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={(v) => { setText(v); if (sendError) setSendError(''); }}
            onSelectionChange={(ev) => setSelection(ev?.nativeEvent?.selection || { start: (text || '').length, end: (text || '').length })}
            placeholder={placeholder}
            placeholderTextColor={PALETTE.textFaint}
            selectionColor={PALETTE.blue}
            multiline
            maxLength={4000}
            accessibilityLabel="Message"
          />
          <TouchableOpacity
            onPress={() => setEmojiOpen((v) => !v)}
            style={styles.emojiBtn}
            accessibilityRole="button"
            accessibilityLabel={emojiOpen ? 'Close emoji' : 'Insert an emoji'}
          >
            <Icon name={emojiOpen ? 'keyboard' : 'insert-emoticon'} size={SIZE.iconLg - 2} color={emojiOpen ? PALETTE.blue : PALETTE.textMuted} />
          </TouchableOpacity>
        </View>
        <PressableScale
          onPress={submit}
          disabled={cannotSend}
          scaleTo={0.9}
          accessibilityRole="button"
          accessibilityLabel="Send"
          accessibilityState={{ disabled: cannotSend, busy: sending }}
        >
          {cannotSend && !sending ? (
            <View style={[styles.sendBtn, { backgroundColor: PALETTE.disabled }]}><Icon name="send" size={SIZE.icon} color={PALETTE.textFaint} /></View>
          ) : (
            <LinearGradient colors={PREMIUM_GRADIENTS.memberButton} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.sendBtn, styles.sendShadow]}>
              {sending ? <ActivityIndicator color={PALETTE.white} /> : <Icon name="send" size={SIZE.icon} color={PALETTE.white} />}
            </LinearGradient>
          )}
        </PressableScale>
      </View>
    </>
  );

  return (
    <View style={styles.screen}>
      {Platform.OS === 'ios' ? (
        <KeyboardAvoidingView style={styles.flex} behavior="padding">
          {topBar}
          {body}
        </KeyboardAvoidingView>
      ) : (
        <>
          {topBar}
          <View style={styles.flex}>{body}</View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: PALETTE.canvas },
  flex: { flex: 1 },
  barBtn: {
    width: SIZE.touch, height: SIZE.touch, borderRadius: SIZE.touch / 2, alignItems: 'center', justifyContent: 'center',
    backgroundColor: BRAND.glass, borderWidth: 1, borderColor: BRAND.glassBorder,
  },
  listPad: { paddingHorizontal: SPACE.lg, paddingTop: SPACE.lg, paddingBottom: SPACE.md, flexGrow: 1 },

  dayRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, marginVertical: SPACE.md },
  dayLine: { flex: 1, height: 1, backgroundColor: PALETTE.border },
  dayPill: { paddingHorizontal: SPACE.md, paddingVertical: 4, borderRadius: 999, backgroundColor: PALETTE.white, borderWidth: 1, borderColor: PALETTE.border },
  dayText: { fontSize: 11, lineHeight: 14, fontWeight: '700', color: PALETTE.textMuted, letterSpacing: 0.3 },

  bubbleRow: { flexDirection: 'row' },
  tailGap: { marginBottom: SPACE.md },
  groupGap: { marginBottom: 3 },
  left: { justifyContent: 'flex-start', paddingRight: SPACE.xxl },
  right: { justifyContent: 'flex-end', paddingLeft: SPACE.xxl },
  bubble: { maxWidth: '82%', minWidth: 76, borderRadius: 20 },
  bubbleFill: { borderRadius: 20 },
  bubblePad: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: SPACE.sm },
  mineShadow: {
    backgroundColor: BRAND.blue, shadowColor: BRAND.blue, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.28, shadowRadius: 10, elevation: 4,
  },
  theirs: {
    backgroundColor: PALETTE.white, borderWidth: 1, borderColor: 'rgba(226,232,240,0.9)',
    shadowColor: BRAND.shadowNavy, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2,
  },
  img: { width: 220, maxWidth: '100%', height: 180, borderRadius: 14, marginBottom: SPACE.xs + 2, backgroundColor: PALETTE.field },
  body: { fontSize: 15, lineHeight: 21, color: PALETTE.text },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: SPACE.xs, marginTop: SPACE.xs },
  meta: { fontSize: 11, lineHeight: 14, color: PALETTE.textFaint },

  older: {
    flexDirection: 'row', gap: 6, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', minHeight: 36,
    paddingHorizontal: SPACE.lg, marginBottom: SPACE.md, borderRadius: 999, backgroundColor: PALETTE.white, borderWidth: 1, borderColor: PALETTE.border,
  },
  olderText: { color: PALETTE.blue, fontWeight: '700', fontSize: 13, lineHeight: 18 },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: SPACE.xl, gap: SPACE.sm },
  empty: { ...TYPE.heading, textAlign: 'center', marginTop: SPACE.sm },
  emptySub: { ...TYPE.caption, textAlign: 'center', maxWidth: 280 },

  openers: {
    backgroundColor: PALETTE.white, paddingHorizontal: SPACE.lg, paddingTop: SPACE.lg, paddingBottom: SPACE.sm,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    shadowColor: BRAND.shadowNavy, shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 8,
  },
  openersTitle: { ...TYPE.heading },
  openersHint: { ...TYPE.caption, fontSize: 13, lineHeight: 18, fontWeight: '400', marginTop: 2, marginBottom: SPACE.xs },
  opener: {
    flexDirection: 'row', alignItems: 'center', gap: SPACE.md, borderWidth: 1, borderColor: PALETTE.border, borderRadius: 16,
    padding: SPACE.md, marginTop: SPACE.sm, backgroundColor: PALETTE.fieldBg,
  },
  openerTitle: { ...TYPE.bodyStrong },
  openerSub: { ...TYPE.caption, fontWeight: '400', marginTop: 2 },

  chipScroll: { flexGrow: 0, backgroundColor: PALETTE.white, borderTopWidth: 1, borderTopColor: PALETTE.border },
  chipRow: { alignItems: 'center', gap: SPACE.xs + 2, paddingHorizontal: SPACE.lg, paddingVertical: SPACE.sm },
  chipLead: { ...TYPE.eyebrow, color: PALETTE.textFaint, marginRight: 2 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: '#C7DAFB', borderRadius: 999,
    paddingHorizontal: SPACE.md, minHeight: 34, backgroundColor: PALETTE.blueTint,
  },
  chipText: { fontSize: 12, lineHeight: 16, fontWeight: '700', color: PALETTE.blueDark },

  preview: {
    flexDirection: 'row', alignItems: 'center', gap: SPACE.md, marginHorizontal: SPACE.lg, marginVertical: SPACE.sm, padding: SPACE.sm,
    borderRadius: 16, borderWidth: 1, borderColor: PALETTE.border, backgroundColor: PALETTE.white,
  },
  previewImg: { width: 56, height: 56, borderRadius: 12, backgroundColor: PALETTE.field },
  previewName: { ...TYPE.bodyStrong },
  previewHint: { ...TYPE.caption, marginTop: 2 },
  previewX: { width: SIZE.touch, height: SIZE.touch, borderRadius: SIZE.touch / 2, alignItems: 'center', justifyContent: 'center' },

  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: SPACE.md, paddingVertical: SPACE.sm, borderTopWidth: 1, borderTopColor: PALETTE.border, backgroundColor: PALETTE.white },
  emojiCell: { width: '12.5%', minHeight: SIZE.touch, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 22 },

  sendError: { marginHorizontal: SPACE.lg, marginBottom: SPACE.sm },
  composer: {
    flexDirection: 'row', alignItems: 'flex-end', gap: SPACE.sm, paddingHorizontal: SPACE.md, paddingTop: SPACE.sm,
    backgroundColor: PALETTE.white, borderTopWidth: 1, borderTopColor: PALETTE.border,
  },
  iconBtn: { width: SIZE.touch, height: SIZE.touch, borderRadius: SIZE.touch / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: PALETTE.blueSoft },
  inputWrap: {
    flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'flex-end', minHeight: SIZE.touch, borderRadius: 22,
    backgroundColor: PALETTE.fieldBg, borderWidth: 1, borderColor: PALETTE.border,
  },
  input: {
    flex: 1, minWidth: 0, maxHeight: 120, paddingLeft: 14, paddingRight: 4,
    paddingTop: Platform.OS === 'ios' ? 12 : 10, paddingBottom: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 15, lineHeight: 20, color: PALETTE.text,
  },
  emojiBtn: { width: 40, height: SIZE.touch - 2, alignItems: 'center', justifyContent: 'center' },
  sendBtn: { width: SIZE.touch, height: SIZE.touch, borderRadius: SIZE.touch / 2, alignItems: 'center', justifyContent: 'center' },
  sendShadow: { shadowColor: BRAND.blue, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 4 },
});

export default MessageThreadScreen;
