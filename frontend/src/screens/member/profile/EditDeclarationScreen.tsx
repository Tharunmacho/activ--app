import React from 'react';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../types';
import DeclarationFormScreen from '../../profile/DeclarationFormScreen';

/**
 * EDIT DECLARATION (website: /member/profile?step=3 from ProfileView).
 *
 * The application's own declaration step in edit mode: sister concerns (a
 * Number) and the company-name list (an array) for a business applicant, the
 * agreement — PUT /members/profile — and then it STOPS. An existing member
 * editing their declaration must never lodge a second application.
 */

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'EditDeclaration'>;
};

const EditDeclarationScreen: React.FC<Props> = ({ navigation }) => (
  <DeclarationFormScreen
    navigation={navigation as any}
    route={{ key: 'EditDeclaration', name: 'DeclarationForm', params: { userData: {} } } as any}
    editMode
  />
);

export default EditDeclarationScreen;
