import React, { useEffect } from 'react';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';
import { BizStatePage } from './businessKit';

type BusinessProfileViewScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'BusinessProfileView'>;
type BusinessProfileViewScreenRouteProp = RouteProp<RootStackParamList, 'BusinessProfileView'>;

/**
 * LEGACY ROUTE — kept registered so an old deep link or stored navigation
 * state still lands somewhere, but it now hands over to ViewCompany.
 *
 * This screen used to render its own copy of a company page from fields a
 * company does not have (`views`, `productsCount`, `connections` — always 0)
 * and called the Discover-listing flag (`isActive`) the review status. The
 * company details screen shows the real figures (GET /products/stats) and the
 * real `status`, so there is one company page, not two that disagree.
 */
const BusinessProfileViewScreen: React.FC = () => {
  const navigation = useNavigation<BusinessProfileViewScreenNavigationProp>();
  const route = useRoute<BusinessProfileViewScreenRouteProp>();
  const companyId = String(route?.params?.companyId || '');

  useEffect(() => {
    if (!companyId) return;
    try {
      navigation.replace('ViewCompany', { companyId });
    } catch (err) {
      console.warn('Company redirect safely caught:', err);
    }
  }, [companyId, navigation]);

  if (!companyId) {
    return <BizStatePage title="Company details" eyebrow="Company" onBack={() => navigation.goBack()} error="No company was selected." />;
  }
  return <BizStatePage title="Company details" eyebrow="Company" onBack={() => navigation.goBack()} />;
};

export default BusinessProfileViewScreen;
