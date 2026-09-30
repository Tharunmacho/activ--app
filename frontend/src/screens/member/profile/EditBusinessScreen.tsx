import React from 'react';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../types';
import BusinessInformationFormScreen from '../../profile/BusinessInformationFormScreen';

/**
 * EDIT BUSINESS STATUS (website: /member/profile?step=2 from ProfileView).
 *
 * The member's business step is two questions — do you trade (and since which
 * year), or are you an aspirant / student — sent as
 * PUT /members/profile { doingBusiness, registrationType, businessCommencementYear? }.
 * It reuses the application's own step in edit mode, so options, rules and the
 * payload cannot drift from it.
 *
 * Organisation, constitution, activities, employees, chambers, GSTIN and
 * turnover are per company now — edited under Business Account → Companies,
 * exactly as the website moved them. The old screen still wrote them here as
 * free text (including `businessTypes` as one comma string, which the enum
 * rejects).
 */

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'EditBusiness'>;
};

const EditBusinessScreen: React.FC<Props> = ({ navigation }) => (
  <BusinessInformationFormScreen
    navigation={navigation as any}
    route={{ key: 'EditBusiness', name: 'BusinessInformationForm', params: { userData: {} } } as any}
    editMode
  />
);

export default EditBusinessScreen;
