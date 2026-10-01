import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';
import { PremiumInput as Field, Loading, Notice, SPACE, ProfileForm3D } from '../../ui';
import { errorText } from '../../ui/data';
import { getMyProfile, updateProfile } from '../../services/memberApi';
import { getStates, getDistricts, getBlocks, fetchRegionTree, RegionNode } from '../../services/regions';
import {
  FormScreen, FormFooter, FormSection, SelectField, FieldLabel, FieldMessage, ChoicePills,
} from './formKit';
import {
  SOCIAL_CATEGORIES, GENDERS, religionsFor, normalizeReligion, normalizeSocialCategory, normalizeGender,
} from './memberFormOptions';

/**
 * ============================================================================
 * STEP 1 OF 3 — PERSONAL DETAILS (website: pages/member/PersonalForm.tsx)
 * ============================================================================
 *
 *   GET /members/my-profile   the saved answers, `isLocked`, `isInternational`,
 *                             `country`, `place`
 *   PUT /members/profile      { fullName, phoneNumber, email, state, district,
 *                               block, city, place, socialCategory, religion,
 *                               gender }  — the website's exact body
 *
 * NO PASSWORD FIELDS. Sending `password`/`confirmPassword` here is what makes
 * the server take its password-change branch; changing a password lives in
 * Account Settings, as on the website.
 *
 * A member outside India (decided by the SERVER from their number) gives a
 * place instead of a state/district/block; the region is not sent at all.
 *
 * Errors are shown, never swallowed: the region gate's message names the
 * region, and moving on after a failed save is how a member arrives at the
 * declaration with nothing stored.
 */

type Props = NativeStackScreenProps<RootStackParamList, 'PersonalDetailsForm'> & {
  /**
   * EDIT MODE — the website's /member/profile?step=1 reached from the profile
   * view: same fields, same PUT, but it saves and returns instead of walking on
   * to step 2.
   */
  editMode?: boolean;
  /** Rendered above the first section (edit mode puts the photo here). */
  topSlot?: React.ReactNode;
};

/** The website's email check (Profile.tsx saveStep1). */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const STEPS = ['Personal', 'Business', 'Declaration'];

/** A page-level Notice already sits on the gutter; here it only needs the section rhythm. */
const NOTICE = { marginTop: 0, marginBottom: SPACE.lg };

interface FormState {
  fullName: string;
  phoneNumber: string;
  email: string;
  state: string;
  district: string;
  block: string;
  city: string;
  place: string;
  socialCategory: string;
  religion: string;
  gender: string;
}

const EMPTY: FormState = {
  fullName: '',
  phoneNumber: '',
  email: '',
  state: '',
  district: '',
  block: '',
  city: '',
  place: '',
  socialCategory: '',
  religion: '',
  gender: '',
};

const names = (nodes: RegionNode[]) => (nodes || []).map((n) => n?.name || '').filter(Boolean);

/** Keep the saved value visible even when it is no longer listed. */
const withCurrent = (list: string[], current?: string | null) => {
  const value = String(current || '').trim();
  if (!value) return list;
  return (list || []).some((item) => (item || '').toLowerCase() === value.toLowerCase()) ? list : [value, ...(list || [])];
};

const PersonalDetailsFormScreen: React.FC<Props> = ({ navigation, route, editMode = false, topSlot }) => {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [isLocked, setIsLocked] = useState(false);
  const [isAbroad, setIsAbroad] = useState(false);
  const [abroadCountry, setAbroadCountry] = useState('');

  const [states, setStates] = useState<string[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [blocks, setBlocks] = useState<string[]>([]);
  const [regionError, setRegionError] = useState('');
  /** Bumped by "Try again"; also bumped when the tree lands so districts/blocks re-read it. */
  const [regionAttempt, setRegionAttempt] = useState(0);
  const [regionVersion, setRegionVersion] = useState(0);
  /** False when no region on the platform is staffed at all (website `coverageAvailable`). */
  const [coverageAvailable, setCoverageAvailable] = useState(true);

  /* ---------------------------------------------------------------- load */

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const profile = await getMyProfile();
      const seed = route?.params?.userData || {};
      setForm({
        fullName: String(profile?.fullName || seed?.fullName || ''),
        phoneNumber: String(profile?.phoneNumber || seed?.phoneNumber || ''),
        email: String(profile?.email || seed?.email || ''),
        state: String(profile?.state || ''),
        district: String(profile?.district || ''),
        block: String(profile?.block || ''),
        city: String(profile?.city || ''),
        place: String(profile?.place || profile?.city || ''),
        socialCategory: normalizeSocialCategory(profile?.socialCategory),
        religion: normalizeReligion(profile?.religion),
        gender: normalizeGender(profile?.gender),
      });
      setIsLocked(profile?.isLocked === true);
      setIsAbroad(profile?.isInternational === true);
      setAbroadCountry(String(profile?.country || ''));
    } catch (err) {
      setLoadError(errorText(err, 'Could not load your details.'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /* ---------------------------------------------------------------- regions */

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    setRegionError('');
    // A dropped connection (or a dev-machine hiccup) should not strand the
    // form: try three times, backing off, before asking the member to retry.
    const attempt = (tries: number) => {
      getStates(regionAttempt > 0 || tries > 0)
        .then((nodes) => {
          if (cancelled) return;
          setStates(names(nodes));
          setRegionVersion((v) => v + 1);
        })
        .catch(() => {
          if (cancelled) return;
          if (tries < 2) {
            timer = setTimeout(() => attempt(tries + 1), 1500 * (tries + 1));
          } else {
            setRegionError('Could not load regions. Check your connection and try again.');
          }
        });
    };
    attempt(0);
    fetchRegionTree(false, 'all')
      .then((tree) => { if (!cancelled) setCoverageAvailable(tree?.coverageAvailable !== false); })
      .catch(() => { /* a failed read is not "no coverage" */ });
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [regionAttempt]);

  useEffect(() => {
    let cancelled = false;
    if (!form.state) {
      setDistricts([]);
      return undefined;
    }
    getDistricts(form.state)
      .then((nodes) => { if (!cancelled) setDistricts(withCurrent(names(nodes), form.district)); })
      .catch(() => { if (!cancelled) setDistricts(withCurrent([], form.district)); });
    return () => { cancelled = true; };
  }, [form.state, form.district, regionVersion]);

  useEffect(() => {
    let cancelled = false;
    if (!form.state || !form.district) {
      setBlocks([]);
      return undefined;
    }
    getBlocks(form.state, form.district)
      .then((nodes) => { if (!cancelled) setBlocks(withCurrent(names(nodes), form.block)); })
      .catch(() => { if (!cancelled) setBlocks(withCurrent([], form.block)); });
    return () => { cancelled = true; };
  }, [form.state, form.district, form.block, regionVersion]);

  /* ---------------------------------------------------------------- edits */

  /** Parents clear children; a category change clears an incompatible religion. */
  const setField = (field: keyof FormState, value: string) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value || '' };
      if (field === 'state') {
        next.district = '';
        next.block = '';
      } else if (field === 'district') {
        next.block = '';
      } else if (field === 'socialCategory') {
        if (next.religion && !religionsFor(value).includes(next.religion)) next.religion = '';
      }
      return next;
    });
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const allowedReligions = useMemo(() => religionsFor(form.socialCategory), [form.socialCategory]);

  const goNext = () => {
    navigation.navigate('BusinessInformationForm', {
      userData: { email: form.email, fullName: form.fullName, phoneNumber: form.phoneNumber },
    });
  };

  const validate = (): boolean => {
    const req = 'Required';
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!(form.fullName || '').trim()) next.fullName = req;
    if (!(form.phoneNumber || '').trim()) next.phoneNumber = req;
    if (!(form.email || '').trim()) next.email = req;
    else if (!EMAIL_RE.test((form.email || '').trim())) next.email = 'Please enter a valid email address';
    if (isAbroad) {
      if (!(form.place || '').trim()) next.place = req;
    } else {
      if (!form.state) next.state = req;
      if (!form.district) next.district = req;
      if (!form.block) next.block = req;
      if (!(form.city || '').trim()) next.city = req;
    }
    if (!form.socialCategory) next.socialCategory = req;
    if (!form.religion) next.religion = req;
    // A saved combination the form itself would not offer (website Profile.tsx).
    else if (form.socialCategory && !religionsFor(form.socialCategory).includes(form.religion)) {
      next.religion = `Please choose a religion recognised for ${form.socialCategory}`;
    }
    if (!form.gender) next.gender = req;
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const finishEdit = () => {
    if (navigation.canGoBack()) navigation.goBack();
  };

  const handleNext = async () => {
    // Locked by the server once submitted: nothing to save, but the member can
    // still walk on to the next step instead of meeting a dead button.
    if (isLocked) {
      if (editMode) finishEdit(); else goNext();
      return;
    }
    if (!validate()) {
      Alert.alert('Missing details', 'Please fill in all required fields.');
      return;
    }

    setSaving(true);
    try {
      const place = (form.place || '').trim();
      await updateProfile(
        isAbroad
          ? { ...form, state: undefined, district: undefined, block: undefined, city: place, place }
          : { ...form },
      );
      if (editMode) {
        Alert.alert('Saved', 'Personal information saved.', [{ text: 'OK', onPress: finishEdit }]);
      } else {
        goNext();
      }
    } catch (err) {
      Alert.alert('Could not save', errorText(err, 'Failed to save your details'));
    } finally {
      setSaving(false);
    }
  };

  /* ---------------------------------------------------------------- render */

  if (loading) {
    return (
      <FormScreen
        title={editMode ? 'Personal details' : 'Complete Your Profile'}
        subtitle={editMode ? 'Edit your profile' : 'Personal details'}
        onBack={() => navigation.goBack()}
        step={editMode ? undefined : 1}
        steps={STEPS}
        art={<ProfileForm3D size={88} />}
      >
        <Loading label="Loading your details…" />
      </FormScreen>
    );
  }

  return (
    <FormScreen
      title={editMode ? 'Personal details' : 'Complete Your Profile'}
      subtitle={editMode ? 'Edit your profile' : 'Personal details'}
      onBack={() => navigation.goBack()}
      step={editMode ? undefined : 1}
      steps={STEPS}
      art={<ProfileForm3D size={88} />}
      footer={(
        <FormFooter
          primaryLabel={isLocked ? (editMode ? 'Done' : 'Continue') : (editMode ? 'Save changes' : 'Save & continue')}
          onPrimary={handleNext}
          loading={saving}
        />
      )}
    >
      {/* The slot's content (edit mode: the photo card) lands on the gutter. */}
      {topSlot ? <View style={{ marginHorizontal: SPACE.lg }}>{topSlot}</View> : null}

      {loadError ? (
        <Notice kind="danger" text={loadError} action="Retry" onAction={load} style={NOTICE} />
      ) : null}
      {isLocked ? (
        <Notice
          kind="info"
          icon="lock-outline"
          style={NOTICE}
          text={editMode
            ? 'Your personal details were submitted and are locked.'
            : 'Your personal details were submitted and are locked. Continue to the next step.'}
        />
      ) : null}
      {!isAbroad && !coverageAvailable ? (
        <Notice
          kind="warning"
          style={NOTICE}
          text="No region on the platform currently has an active block admin, so there is nothing to select yet. An administrator has to open a region before an application can be routed."
        />
      ) : null}

      <FormSection
        icon="location-on"
        title="Location"
        subtitle={isAbroad ? 'Where you are based' : 'Where your business is located'}
      >
        {isAbroad ? (
          <Field
            label="Place"
            required
            value={form.place}
            onChangeText={(v) => setField('place', v)}
            placeholder={abroadCountry ? `Your city, ${abroadCountry}` : 'Your city and country'}
            error={errors.place}
            hint={`You are registered from ${abroadCountry || 'outside India'} — no state, district or block is needed.`}
            editable={!isLocked}
            icon="public"
            style={{ marginBottom: 0 }}
          />
        ) : (
          <>
            {regionError ? (
              <Notice
                kind="danger"
                text={regionError}
                action="Try again"
                onAction={() => setRegionAttempt((n) => n + 1)}
                style={NOTICE}
              />
            ) : null}
            <SelectField
              label="State"
              required
              value={form.state}
              options={withCurrent(states, form.state)}
              onChange={(v) => setField('state', v)}
              placeholder="Select state"
              icon="map"
              iconBadge
              error={errors.state}
              disabled={isLocked}
              emptyText="No regions are open yet"
            />
            <SelectField
              label="District"
              required
              value={form.district}
              options={districts}
              onChange={(v) => setField('district', v)}
              placeholder={form.state ? 'Select district' : 'Choose a state first'}
              icon="apartment"
              iconBadge
              error={errors.district}
              disabled={isLocked || !form.state}
            />
            <SelectField
              label="Block"
              required
              value={form.block}
              options={blocks}
              onChange={(v) => setField('block', v)}
              placeholder={form.district ? 'Select block' : 'Choose a district first'}
              icon="holiday-village"
              iconBadge
              error={errors.block}
              disabled={isLocked || !form.district}
            />
            <Field
              label="City"
              required
              value={form.city}
              onChangeText={(v) => setField('city', v)}
              placeholder="Enter city name"
              error={errors.city}
              editable={!isLocked}
              icon="place"
              style={{ marginBottom: 0 }}
            />
          </>
        )}
      </FormSection>

      <FormSection icon="contact-phone" title="Contact" subtitle="We will use this to reach you">
        <Field
          label="Full name"
          required
          value={form.fullName}
          onChangeText={(v) => setField('fullName', v)}
          placeholder="Enter full name"
          autoCapitalize="words"
          error={errors.fullName}
          editable={!isLocked}
          icon="person-outline"
        />
        <Field
          label="Phone number"
          required
          value={form.phoneNumber}
          onChangeText={(v) => setField('phoneNumber', v)}
          placeholder="Enter phone number"
          keyboardType="phone-pad"
          maxLength={isAbroad ? 18 : 10}
          error={errors.phoneNumber}
          editable={!isLocked}
          icon="phone"
        />
        <Field
          label="Email address"
          required
          value={form.email}
          onChangeText={(v) => setField('email', v)}
          placeholder="Enter email address"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          error={errors.email}
          editable={!isLocked}
          icon="mail-outline"
          style={{ marginBottom: 0 }}
        />
      </FormSection>

      <FormSection icon="groups" title="Demographics" subtitle="Help us know you better">
        <SelectField
          label="Social category"
          required
          value={form.socialCategory}
          options={SOCIAL_CATEGORIES}
          onChange={(v) => setField('socialCategory', v)}
          placeholder="Select social category"
          icon="diversity-3"
          error={errors.socialCategory}
          disabled={isLocked}
        />
        <SelectField
          label="Religion"
          required
          value={form.religion}
          options={allowedReligions}
          onChange={(v) => setField('religion', v)}
          placeholder={form.socialCategory ? 'Select religion' : 'Choose a social category first'}
          icon="self-improvement"
          error={errors.religion}
          disabled={isLocked || !form.socialCategory}
        />
        <View>
          <FieldLabel label="Gender" required />
          <ChoicePills
            options={(GENDERS as readonly string[]).map((g) => ({ value: g, label: g }))}
            value={form.gender}
            onChange={(v) => setField('gender', v)}
            disabled={isLocked}
          />
          <FieldMessage error={errors.gender} />
        </View>
      </FormSection>
    </FormScreen>
  );
};

export default PersonalDetailsFormScreen;
