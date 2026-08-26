import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { SUPER, ACCENTS, superStyles } from '../superTheme';

/**
 * A region name field: a full dropdown, free text, and a "+" to add what is
 * missing.
 *
 * Three ways to fill it, in the order a Super Admin reaches for them:
 *
 *   1. **Open the list** (chevron) and pick. The list is the complete set for
 *      this scope — every state in India, every district in the chosen state,
 *      every block in the chosen district — never a truncated sample. A count
 *      sits in each heading so it is obvious nothing has been held back.
 *   2. **Type to narrow.** The same list filters as you type.
 *   3. **Type something that is not there and press "+".** The reference data
 *      does not know every block in the country; this is the escape hatch. The
 *      name joins the dropdown immediately, so a second admin for that same new
 *      region is picked from the list rather than retyped — which is the point,
 *      since the geofence matches an admin's region against an application's
 *      with an anchored regex, and "Ariyalur" and "ariyalur " would be two
 *      regions splitting one queue.
 *
 * Three groups are offered, and the distinction matters:
 *   - **Added now** — typed on this form and not yet saved.
 *   - **Already in use** — a region that already has an admin. Picking one
 *     joins it, and the new admin shares that queue.
 *   - **All <regions>** — the canonical India reference, nobody staffs it yet.
 *     Picking one creates the region on save.
 *
 * Not a native `<Modal>`: this renders inside a bottom-tab screen, where a
 * transparent modal in a nested navigator throws BadTokenException on Android
 * 14+ and kills the process. The panel is an inline card, and its scroll view
 * carries `nestedScrollEnabled` so it still scrolls inside the form's own
 * scroll view on Android.
 */

interface Props {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Regions that already have an admin. Selecting one joins it. */
  inUse?: string[];
  /** Reference names with no admin yet. Selecting one creates the region. */
  suggested?: string[];
  /** Names added on this form with "+", not yet saved anywhere. */
  extra?: string[];
  /** Called when "+" is pressed with a name that is in none of the lists. */
  onAdd?: (name: string) => void;
  /** Called when an added-but-unsaved name is removed from the list again. */
  onRemove?: (name: string) => void;
  /** Describes where the reference list came from, e.g. "in Tamil Nadu". */
  scopeLabel?: string;
  placeholder?: string;
  disabled?: boolean;
  hint?: string;
}

/**
 * A ceiling on rows rendered per group, not on rows offered.
 *
 * Real scopes sit far below it — 36 states, at most ~75 districts in a state,
 * ~30 blocks in a district — so in practice every option is on screen. It
 * exists only so a pathological list cannot stall the UI thread, and when it
 * does bite the footer says exactly how many are hidden rather than quietly
 * cutting the list short.
 */
const MAX_RENDER = 150;

const clean = (value?: string | null) => String(value || '').trim();

const eq = (a?: string | null, b?: string | null) =>
  clean(a).toLowerCase() === clean(b).toLowerCase();

/** Case-insensitive de-duplication that keeps the first spelling seen. */
const unique = (names: string[]) => {
  const seen = new Set<string>();
  const out: string[] = [];
  (names || []).forEach(name => {
    const value = clean(name);
    if (!value) return;
    const k = value.toLowerCase();
    if (seen.has(k)) return;
    seen.add(k);
    out.push(value);
  });
  return out;
};

const RegionInput: React.FC<Props> = ({
  label,
  value,
  onChange,
  inUse = [],
  suggested = [],
  extra = [],
  onAdd,
  onRemove,
  scopeLabel = '',
  placeholder = 'Type a name',
  disabled = false,
  hint = '',
}) => {
  const [open, setOpen] = useState(false);

  // A disabled field (no parent region chosen yet) must not keep a panel open
  // from before — the list under it belongs to a scope that no longer applies.
  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  const typed = clean(value);
  const needle = typed.toLowerCase();

  const addedList = useMemo(() => unique(extra), [extra]);
  const usedList = useMemo(() => unique(inUse), [inUse]);

  // A reference name that is already staffed, or was just added, belongs to that
  // group only — otherwise the same name appears twice with contradictory
  // meanings ("joins it" and "creates it").
  const referenceList = useMemo(
    () => unique(suggested).filter(
      name => !usedList.some(used => eq(used, name)) && !addedList.some(add => eq(add, name)),
    ),
    [suggested, usedList, addedList],
  );

  const narrow = (list: string[]) =>
    (list || []).filter(name => !needle || name.toLowerCase().includes(needle));

  const addedMatches = useMemo(() => narrow(addedList), [addedList, needle]);
  const usedMatches = useMemo(() => narrow(usedList), [usedList, needle]);
  const referenceMatches = useMemo(() => narrow(referenceList), [referenceList, needle]);

  const totalMatches = addedMatches.length + usedMatches.length + referenceMatches.length;

  /** True when the typed name is nowhere in the dropdown, so "+" can add it. */
  const canAdd = useMemo(() => {
    if (!typed) return false;
    return ![...addedList, ...usedList, ...referenceList].some(name => eq(name, typed));
  }, [typed, addedList, usedList, referenceList]);

  /** True when no admin covers this name yet — i.e. saving opens the region. */
  const isNew = useMemo(
    () => !!typed && !usedList.some(used => eq(used, typed)),
    [usedList, typed],
  );

  const pick = (name: string) => {
    onChange(name);
    setOpen(false);
  };

  const add = () => {
    if (!canAdd) return;
    if (typeof onAdd === 'function') onAdd(typed);
    onChange(typed);
    setOpen(true);
  };

  const remove = (name: string) => {
    if (typeof onRemove === 'function') onRemove(name);
  };

  /**
   * `removable` is true for the "Added now" group only.
   *
   * Those names exist nowhere but this form, so removing one is a plain undo of
   * the "+" that put it there. The other two groups are not the list's to
   * delete: a staffed region is deleted by deleting the admins who hold it —
   * which is what the Delete button on an admin row does, with a preview of the
   * applications it would escalate — and a reference name is shared by every
   * Super Admin, not this one's to remove.
   */
  const renderGroup = (
    heading: string,
    names: string[],
    icon: string,
    color: string,
    removable = false,
  ) => {
    if ((names || []).length === 0) return null;
    const shown = names.slice(0, MAX_RENDER);
    const hidden = names.length - shown.length;
    return (
      <View key={heading}>
        <Text style={styles.groupHeading}>{`${heading} · ${names.length}`}</Text>
        {shown.map(name => {
          const selected = eq(name, typed);
          return (
            <TouchableOpacity
              key={`${heading}:${name}`}
              style={[styles.option, selected && styles.optionSelected]}
              onPress={() => pick(name)}
              activeOpacity={0.7}
            >
              <Icon name={icon} size={16} color={color} />
              <Text style={styles.optionText} numberOfLines={1}>{name}</Text>
              {selected ? <Icon name="done" size={16} color={ACCENTS.green} /> : null}
              {removable ? (
                <TouchableOpacity
                  onPress={() => remove(name)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityLabel={`Remove ${name} from the ${label.toLowerCase()} list`}
                >
                  <Icon name="close" size={16} color={ACCENTS.red} />
                </TouchableOpacity>
              ) : null}
            </TouchableOpacity>
          );
        })}
        {hidden > 0 ? (
          <Text style={styles.moreNote}>
            {`${hidden} more — keep typing to narrow the list.`}
          </Text>
        ) : null}
      </View>
    );
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <Text style={superStyles.label}>{label}</Text>
        {isNew ? (
          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>NEW REGION</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.inputRow}>
        <TextInput
          style={[
            superStyles.input,
            styles.input,
            disabled && styles.inputDisabled,
            isNew && styles.inputNew,
          ]}
          value={value}
          onChangeText={next => {
            onChange(next);
            if (!disabled) setOpen(true);
          }}
          placeholder={placeholder}
          placeholderTextColor={SUPER.textFaint}
          editable={!disabled}
          autoCapitalize="words"
          autoCorrect={false}
          onFocus={() => { if (!disabled) setOpen(true); }}
        />

        {canAdd && !disabled ? (
          <TouchableOpacity
            style={[styles.iconButton, styles.addButton]}
            onPress={add}
            activeOpacity={0.75}
            accessibilityLabel={`Add ${typed} to the ${label.toLowerCase()} list`}
          >
            <Icon name="add" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          style={[styles.iconButton, disabled && styles.inputDisabled]}
          onPress={() => { if (!disabled) setOpen(prev => !prev); }}
          activeOpacity={0.75}
          accessibilityLabel={
            open ? `Hide the ${label.toLowerCase()} list` : `Show the ${label.toLowerCase()} list`
          }
        >
          <Icon name={open ? 'expand-less' : 'expand-more'} size={22} color={SUPER.textFaint} />
        </TouchableOpacity>
      </View>

      {canAdd && !disabled ? (
        <Text style={styles.newHint}>
          {`“${typed}” is not in the list — press + to add it${scopeLabel ? ` ${scopeLabel}` : ''}.`}
        </Text>
      ) : isNew ? (
        <Text style={styles.newHint}>
          No admin covers “{typed}” yet — saving creates it and opens it for applicants.
        </Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}

      {open && !disabled ? (
        <View style={styles.panel}>
          {totalMatches === 0 ? (
            <Text style={styles.emptyNote}>
              {typed
                ? 'Nothing matches. Press + to add it.'
                : 'No options loaded yet for this scope — type a name and press + to add one.'}
            </Text>
          ) : (
            <ScrollView
              style={styles.panelScroll}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
            >
              {renderGroup('Added now', addedMatches, 'fiber-new', ACCENTS.orange, true)}
              {renderGroup('Already in use', usedMatches, 'check-circle', ACCENTS.green)}
              {renderGroup(
                `All ${label.toLowerCase()}s${scopeLabel ? ` ${scopeLabel}` : ''}`,
                referenceMatches,
                'add-circle-outline',
                SUPER.textFaint,
              )}
            </ScrollView>
          )}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: { flex: 1, marginBottom: 0 },
  inputDisabled: { opacity: 0.55 },
  inputNew: { borderColor: ACCENTS.orange },

  iconButton: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: SUPER.borderStrong,
    backgroundColor: SUPER.card,
  },
  addButton: { backgroundColor: ACCENTS.orange, borderColor: ACCENTS.orange },

  newBadge: {
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6,
    backgroundColor: ACCENTS.lightOrange, marginBottom: 6,
  },
  newBadgeText: { fontSize: 9, fontWeight: '800', color: '#B45309', letterSpacing: 0.4 },

  hint: { fontSize: 11, color: SUPER.textFaint, marginTop: 5, lineHeight: 15 },
  newHint: { fontSize: 11, color: '#B45309', marginTop: 5, lineHeight: 15 },

  panel: {
    marginTop: 8,
    backgroundColor: SUPER.card,
    borderWidth: 1,
    borderColor: SUPER.borderStrong,
    borderRadius: 12,
    overflow: 'hidden',
    paddingVertical: 4,
  },
  panelScroll: { maxHeight: 260 },
  groupHeading: {
    fontSize: 10, fontWeight: '700', color: SUPER.textFaint,
    letterSpacing: 0.4, paddingHorizontal: 14, paddingTop: 8, paddingBottom: 4,
  },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  optionSelected: { backgroundColor: SUPER.field },
  optionText: { flex: 1, fontSize: 14, color: SUPER.text },
  moreNote: {
    fontSize: 11, color: SUPER.textFaint,
    paddingHorizontal: 14, paddingVertical: 8, fontStyle: 'italic',
  },
  emptyNote: {
    fontSize: 12, color: SUPER.textFaint,
    paddingHorizontal: 14, paddingVertical: 12, lineHeight: 17,
  },
});

export default RegionInput;
