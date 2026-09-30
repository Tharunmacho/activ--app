import React from 'react';
import { Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';
import { useActiveCompanyStore } from '../../stores/activeCompanyStore';
import CompanyForm from './companyForm/CompanyForm';

type Props = NativeStackScreenProps<RootStackParamList, 'AddCompany'>;

/**
 * ADD A COMPANY — the website's /business/companies/add (AddEditCompany →
 * CompanyForm). The whole form, fields and payload live in the shared
 * `companyForm/CompanyForm`, so Add, Edit and the first-company screen can
 * never ask different questions or send different shapes.
 */
const AddCompanyScreen: React.FC<Props> = ({ navigation }) => {
  const setActiveCompany = useActiveCompanyStore((st) => st.setActiveCompany);

  return (
    <CompanyForm
      title="Add new company"
      subtitle="Create another business account"
      createLabel="Create company"
      onBack={() => navigation.goBack()}
      onSaved={(company) => {
        // A newly created company becomes the active one everywhere.
        const id = String(company?._id || company?.id || '');
        if (id) setActiveCompany(id);
        Alert.alert('Company created', 'Your company profile has been created.', [
          { text: 'OK', onPress: () => navigation.navigate('BusinessDashboard') },
        ]);
      }}
    />
  );
};

export default AddCompanyScreen;
