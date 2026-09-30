import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Screen, AppHeader, Card, Field, PrimaryButton, PALETTE, SPACE } from '../../../ui';
import { createAnnouncement, updateAnnouncement, UpdateCategory, errorText } from '../../../services/superApi';
import { ChipRow, ToggleRow, useRegionTreeAll, useRegionNames } from './superKit';
import { InlineSelect, Choice, DateField } from './events/eventKit';

/**
 * ============================================================================
 * SUPER ADMIN — write / edit one update (website Updates editor)
 * ============================================================================
 *
 * POST /announcements, PUT /announcements/:id with the same fields the website
 * sends (the server `sanitize`s them): title, summary, body, category,
 * state/district/block (empty = everyone), audience all|paid, pinned,
 * status draft|published, bannerUrl, bannerAlt, attachmentUrl, attachmentLabel,
 * expiresAt (the END of the chosen local day, as an ISO instant — or '').
 * Banner and attachment are links, exactly as the website's form takes them.
 */

const CATEGORIES: { value: UpdateCategory; label: string }[] = [
  { value: 'general', label: 'General update' },
  { value: 'notice', label: 'Notice' },
  { value: 'policy', label: 'Policy' },
  { value: 'scheme', label: 'Scheme' },
  { value: 'achievement', label: 'Achievement' },
  { value: 'urgent', label: 'Urgent' },
];

/** A stored instant back as a LOCAL `YYYY-MM-DD` — never the UTC day (website toDateInput). */
const isoDay = (v?: string | null) => {
  if (!v) return '';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const SuperUpdateEditorScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const a = route?.params?.announcement || null;
  const editing = !!a?.id;

  const [title, setTitle] = useState(a?.title || '');
  const [summary, setSummary] = useState(a?.summary || '');
  const [body, setBody] = useState(a?.body || '');
  const [category, setCategory] = useState<UpdateCategory>((a?.category as UpdateCategory) || 'general');
  const [state, setState] = useState(a?.state || '');
  const [district, setDistrict] = useState(a?.district || '');
  const [block, setBlock] = useState(a?.block || '');
  const [paidOnly, setPaidOnly] = useState(String(a?.audience || 'all') === 'paid');
  const [pinned, setPinned] = useState(!!a?.pinned);
  const [expiresAt, setExpiresAt] = useState(isoDay(a?.expiresAt));
  const [bannerUrl, setBannerUrl] = useState(String(a?.bannerUrl || ''));
  const [bannerAlt, setBannerAlt] = useState(String(a?.bannerAlt || ''));
  const [attachmentUrl, setAttachmentUrl] = useState(String(a?.attachmentUrl || ''));
  const [attachmentLabel, setAttachmentLabel] = useState(String(a?.attachmentLabel || ''));
  const [saving, setSaving] = useState(false);
  const tree = useRegionTreeAll();
  const names = useRegionNames(tree, state, district);

  const save = async (status: 'draft' | 'published') => {
    if (!(title || '').trim()) { Alert.alert('Add a headline', 'An update needs a headline.'); return; }
    const day = (expiresAt || '').trim();
    /*
     * An expiry is the END of that day, not its midnight (website Updates.tsx):
     * 23:59:59 LOCAL, sent as an ISO instant. Blank is '' — "stays up".
     */
    const expiry = day ? new Date(`${day}T23:59:59`) : null;
    if (day && (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !expiry || Number.isNaN(expiry.getTime()))) {
      Alert.alert('Check the date', 'Stop showing after must look like 2026-12-31, or be blank.');
      return;
    }
    if (block && !district) { Alert.alert('Region', 'Pick the district for that block.'); return; }
    const payload = {
      title: title.trim(),
      summary: (summary || '').trim(),
      body: (body || '').trim(),
      category,
      state: (state || '').trim(),
      district: state ? (district || '').trim() : '',
      block: state && district ? (block || '').trim() : '',
      audience: paidOnly ? 'paid' : 'all',
      pinned,
      status,
      bannerUrl: (bannerUrl || '').trim(),
      bannerAlt: (bannerAlt || '').trim(),
      attachmentUrl: (attachmentUrl || '').trim(),
      attachmentLabel: (attachmentLabel || '').trim(),
      expiresAt: expiry ? expiry.toISOString() : '',
    };
    setSaving(true);
    try {
      if (editing) await updateAnnouncement(String(a.id), payload);
      else await createAnnouncement(payload);
      navigation.goBack();
    } catch (err) {
      Alert.alert('Could not save the update', errorText(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen tone="admin">
      <AppHeader tone="admin" title={editing ? 'Edit update' : 'New update'} subtitle="Members read it on their dashboard" onBack={() => navigation.goBack()} />

      <Card style={s.card}>
        <Field label="Headline" value={title} onChangeText={setTitle} placeholder="What is it about?" />
        <Field label="Standfirst" value={summary} onChangeText={setSummary} placeholder="One line, shown on the dashboard card"
          hint="Left blank, the opening of the body is used." />
        <Field label="The update" value={body} onChangeText={setBody} multiline placeholder="The whole update" inputStyle={{ minHeight: 140 }} />
      </Card>

      <Card style={s.card}>
        <Text style={s.title}>Category</Text>
        <View style={{ marginHorizontal: -SPACE.lg }}><ChipRow<UpdateCategory> options={CATEGORIES} value={category} onChange={setCategory} /></View>
      </Card>

      <Card style={s.card}>
        <Text style={s.title}>Who it reaches</Text>
        <Text style={s.hint}>Leave a region blank to reach everyone below that level. A block-level update goes only to that block.</Text>
        {/*
          * Chosen from the live region tree, never typed (website Updates.tsx):
          * targeting is an anchored match, so a typed "tamil nadu" against a
          * stored "Tamil Nadu" reaches nobody, silently.
          */}
        <InlineSelect label="State" value={state} options={names.states} placeholder="All states" emptyLabel="All states"
          note="Blank reaches every state."
          onChange={(v) => { setState(v); setDistrict(''); setBlock(''); }} />
        <InlineSelect label="District" value={district} options={names.districts} disabled={!state}
          placeholder={state ? 'All districts' : 'Pick a state first'} emptyLabel="All districts"
          onChange={(v) => { setDistrict(v); setBlock(''); }} />
        <InlineSelect label="Block" value={block} options={names.blocks} disabled={!district}
          placeholder={district ? 'All blocks' : 'Pick a district first'} emptyLabel="All blocks"
          onChange={setBlock} />
        <Choice<'all' | 'paid'> value={paidOnly ? 'paid' : 'all'} onChange={(v) => setPaidOnly(v === 'paid')} options={[
          { value: 'all', icon: 'public', title: 'All members', detail: 'Everyone signed in, whether or not they have paid.' },
          { value: 'paid', icon: 'lock', title: 'Paid members only', detail: 'Only members with an active membership can open it.' },
        ]} />
        <View style={{ height: SPACE.sm }} />
        <ToggleRow label="Pin to the top of every feed" value={pinned} onChange={setPinned} last />
      </Card>

      <Card style={s.card}>
        <DateField label="Stop showing after (optional)" value={expiresAt} onChange={setExpiresAt}
          hint="Blank means it stays up. It stays up to the end of that day." />
      </Card>

      <Card style={s.card}>
        <Text style={s.title}>Banner and attachment</Text>
        <Field label="Banner image URL (optional)" value={bannerUrl} onChangeText={setBannerUrl} placeholder="https://…"
          autoCapitalize="none" keyboardType="url" hint="A circular or poster reads best whole." />
        {bannerUrl ? (
          <Field label="Banner description (optional)" value={bannerAlt} onChangeText={setBannerAlt} placeholder="What the picture shows" />
        ) : null}
        <Field label="Attachment URL (optional)" value={attachmentUrl} onChangeText={setAttachmentUrl} placeholder="https://…"
          autoCapitalize="none" keyboardType="url" hint="A circular or form members can open." />
        <Field label="Attachment label (optional)" value={attachmentLabel} onChangeText={setAttachmentLabel} placeholder="Circular 14/2026" />
      </Card>

      <View style={{ paddingHorizontal: SPACE.lg, marginTop: SPACE.xl, gap: SPACE.md }}>
        <PrimaryButton tone="admin" icon="publish" label="Publish" onPress={() => save('published')} loading={saving} />
        <PrimaryButton tone="admin" variant="outline" icon="save" label="Save as draft" onPress={() => save('draft')} disabled={saving} />
      </View>
    </Screen>
  );
};

const s = StyleSheet.create({
  card: { marginHorizontal: SPACE.lg, marginTop: SPACE.lg },
  title: { fontSize: 15, fontWeight: '800', color: PALETTE.text, marginBottom: SPACE.sm },
  hint: { fontSize: 12, color: PALETTE.textMuted, marginBottom: SPACE.md, lineHeight: 17 },
});

export default SuperUpdateEditorScreen;
