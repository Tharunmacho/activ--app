import React, { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { ConsoleButton, PALETTE, SPACE } from '../../../../ui';
import { errorText } from '../../../../services/superApi';
import { notificationReason } from '../../../../services/deliveryReportApi';
import {
  confirmHistoryDelete, historySelection, previewHistoryDelete,
  type HistoryDeletePreview, type HistoryDeleteResult, type HistorySelection,
} from '../../../../services/notificationHistoryApi';

/** Admin history only. The server reviews a fixed snapshot before confirmation. */
export function HistoryDeleteControl({ selection, onDone, disabled, label = 'Clear matching logs' }: {
  selection: HistorySelection; onDone: () => void; disabled?: boolean; label?: string;
}) {
  const selectionKey = JSON.stringify(historySelection(selection));
  const currentKey = useRef(selectionKey);
  currentKey.current = selectionKey;
  const reviewedKey = useRef('');
  const completed = useRef(onDone);
  completed.current = onDone;
  const [preview, setPreview] = useState<HistoryDeletePreview | null>(null);
  const [result, setResult] = useState<HistoryDeleteResult | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => { setPreview(null); setResult(null); setError(''); }, [selectionKey]);
  const review = async (event?: { stopPropagation?: () => void }) => {
    event?.stopPropagation?.();
    if (lock.current || disabled) return;
    lock.current = true; setBusy(true); setError(''); setResult(null); setPreview(null);
    const key = selectionKey;
    try {
      const next = await previewHistoryDelete(selection);
      if (!Number.isFinite(next?.eligible) || next.eligible < 0 || !Array.isArray(next?.ids)) {
        throw new Error('Could not review these log entries. Please try again.');
      }
      if (alive.current && key === currentKey.current) { reviewedKey.current = key; setPreview(next); }
    } catch (err) { if (alive.current && key === currentKey.current) setError(errorText(err)); }
    finally { lock.current = false; if (alive.current) setBusy(false); }
  };
  const confirm = async (event?: { stopPropagation?: () => void }) => {
    event?.stopPropagation?.();
    if (lock.current || disabled || currentKey.current !== selectionKey || reviewedKey.current !== selectionKey || !preview?.eligible || !preview.token || !preview.ids?.length) return;
    lock.current = true; setBusy(true); setError('');
    const key = selectionKey;
    try {
      const next = await confirmHistoryDelete({ ids: preview.ids, token: preview.token });
      if (!next?.processing && (!Number.isFinite(next?.removed) || !Number.isFinite(next?.retained) || next.removed < 0 || next.retained < 0)) {
        throw new Error('The server did not confirm deletion. Check the history, then try the same confirmation again.');
      }
      if (alive.current) {
        if (key === currentKey.current) setResult(next);
        if (!next?.processing) {
          setPreview(null);
          try {
            Alert.alert('History updated', `${Number(next?.removed || 0)} log entries deleted · ${Number(next?.retained || 0)} kept. Notifications in people's accounts and messages waiting to send are kept.`);
          } catch { /* Inline counts remain available if a native alert is unavailable. */ }
          completed.current();
        }
      }
    } catch (err) {
      // Keep the same snapshot for an explicit retry; the server makes it idempotent.
      if (alive.current && key === currentKey.current) setError(errorText(err));
    } finally { lock.current = false; if (alive.current) setBusy(false); }
  };
  return <View style={s.wrap}>
    {(selection.ids?.length || 0) > 500 && !preview && <Text style={s.help}>This review covers the first 500 displayed entries. More entries can be reviewed afterwards.</Text>}
    {!preview && <ConsoleButton kind="soft" size="sm" icon="delete-outline" label={label}
      disabled={disabled || busy} loading={busy} onPress={review} />}
    {preview && <View style={s.review}>
      <Text style={s.text}>Delete {Number(preview.eligible || 0)} log entries from admin history?</Text>
      <Text style={s.help}>Notifications in people's accounts and messages waiting to send are kept.</Text>
      <Text style={s.help}>{Number(preview.reviewed || 0)} reviewed · {Number(preview.retained || 0)} kept · {Number(preview.remaining || 0)} more matching entries outside this review.</Text>
      {!!preview.outsideSelection && <Text style={s.help}>{preview.outsideSelection} additional displayed entries are outside this batch.</Text>}
      {(Array.isArray(preview.reasons) ? preview.reasons : []).map((reason, index) => <Text key={index} style={s.help}>{Number(reason?.count || 0)} kept: {notificationReason(reason?.reason)}</Text>)}
      {!!preview.remaining && <Text style={s.help}>Only this reviewed batch will be deleted. Review again afterwards to check more entries.</Text>}
      <View style={s.actions}>
        <ConsoleButton size="sm" icon="delete-outline" label={`Confirm delete (${Number(preview.eligible || 0)})`}
          disabled={disabled || busy || !preview.eligible || !preview.token || !preview.ids?.length} loading={busy} onPress={confirm} />
        <ConsoleButton size="sm" kind="soft" label="Cancel deletion" disabled={busy} onPress={() => setPreview(null)} />
      </View>
    </View>}
    {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
    {result && <Text accessibilityLiveRegion="polite" style={s.help}>{result.processing
      ? 'Deletion is still being processed. Check again using the same confirmation.'
      : `${Number(result.removed || 0)} log entries deleted · ${Number(result.retained || 0)} kept.`}</Text>}
    {(Array.isArray(result?.reasons) ? result.reasons : []).map((reason, index) => <Text key={index} style={s.help}>{Number(reason?.count || 0)} kept: {notificationReason(reason?.reason)}</Text>)}
  </View>;
}
const s = StyleSheet.create({
  wrap: { marginTop: SPACE.sm, gap: SPACE.sm },
  review: { padding: SPACE.md, backgroundColor: PALETTE.canvasAdmin, borderRadius: 12, gap: SPACE.sm },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm },
  text: { fontSize: 16, lineHeight: 23, fontWeight: '700', color: PALETTE.textSoft },
  help: { fontSize: 14, lineHeight: 21, color: PALETTE.textMuted },
  error: { fontSize: 14, lineHeight: 21, color: PALETTE.redDark },
});
