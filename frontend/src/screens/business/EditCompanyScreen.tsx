import React from 'react';
import { Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';
import { BizStatePage } from './businessKit';
import CompanyForm from './companyForm/CompanyForm';

type Props = NativeStackScreenProps<RootStackParamList, 'EditCompany'>;

/**
 * EDIT A COMPANY — the website's /business/companies/edit/:id. Loads
 * GET /business-profiles/:id and saves PUT /business-profiles/:id through the
 * shared `companyForm/CompanyForm` (every clearable field is always sent).
 */
const EditCompanyScreen: React.FC<Props> = ({ navigation, route }) => {
  const companyId = String(route?.params?.companyId || '');

  // Without an id the shared form would quietly turn into a CREATE form.
  if (!companyId) {
    return <BizStatePage title="Edit company" eyebrow="Company profile" onBack={() => navigation.goBack()} error="No company was selected to edit." />;
  }

  return (
    <CompanyForm
      companyId={companyId}
      title="Edit company"
      onBack={() => navigation.goBack()}
      onSaved={() => {
        Alert.alert('Saved', 'Company details updated.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }}
    />
  );
};

export default EditCompanyScreen;
