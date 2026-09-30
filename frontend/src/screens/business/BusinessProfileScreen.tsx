import React, { useEffect, useLayoutEffect, useState } from 'react';
import { Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';
import api from '../../services/api';
import { ENDPOINTS } from '../../config/api.config';
import { useActiveCompanyStore } from '../../stores/activeCompanyStore';
import CompanyForm from './companyForm/CompanyForm';

type Props = NativeStackScreenProps<RootStackParamList, 'BusinessProfile'>;

/**
 * CREATE BUSINESS PROFILE — the member's FIRST company (the website's
 * /business/create-profile → CompanyForm).
 *
 * The website's rule: when `GET /business-profiles/me` already answers a
 * company there is nothing to create here, so go straight to the business
 * dashboard. An unknown answer (error) leaves the form open.
 *
 * The form itself is the shared `companyForm/CompanyForm`. The member's own
 * mobile and email (GET /auth/me) are offered as a starting point.
 */
const BusinessProfileScreen: React.FC<Props> = ({ navigation }) => {
  const setActiveCompany = useActiveCompanyStore((st) => st.setActiveCompany);
  const [prefill, setPrefill] = useState<{ mobileNumber?: string; email?: string }>({});

  // App.tsx registers this route with a native title bar; CompanyForm draws the
  // kit AppHeader itself, so hide the native one — exactly one header (kit rule 2).
  useLayoutEffect(() => {
    try { navigation.setOptions({ headerShown: false }); } catch (err) { console.warn('Header option safely caught:', err); }
  }, [navigation]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await api.get('/business-profiles/me');
        const existing = res?.data?.data;
        if (alive && existing && (existing?._id || existing?.id)) {
          navigation.replace('BusinessDashboard');
        }
      } catch {
        /* unknown — keep the form available */
      }
    })();
    return () => { alive = false; };
  }, [navigation]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await api.get(ENDPOINTS.AUTH.PROFILE);
        const me = res?.data?.data || res?.data || {};
        if (alive) setPrefill({ mobileNumber: String(me?.phoneNumber || me?.mobile || ''), email: String(me?.email || '') });
      } catch {
        /* no prefill — the member types them */
      }
    })();
    return () => { alive = false; };
  }, []);

  return (
    <CompanyForm
      title="Create business profile"
      subtitle="Register your company to start listing products"
      createLabel="Create profile"
      prefill={prefill}
      onBack={() => navigation.goBack()}
      onSaved={(company) => {
        const id = String(company?._id || company?.id || '');
        if (id) setActiveCompany(id);
        Alert.alert('Business profile created', 'Your company is ready. Add products next.', [
          { text: 'View dashboard', onPress: () => navigation.replace('BusinessDashboard') },
        ]);
      }}
    />
  );
};

export default BusinessProfileScreen;
