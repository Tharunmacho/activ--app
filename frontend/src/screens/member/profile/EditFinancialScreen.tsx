import React from 'react';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../types';
import {
  SPACE, PremiumPage, PremiumPageHeader, PREMIUM_OVERLAP, SurfaceCard, StateView, FadeInUp, DocumentStack3D,
} from '../../../ui';

/**
 * FINANCIAL & COMPLIANCE — asked per COMPANY now (website ProfileView links
 * this section to /business/companies).
 *
 * PAN, GSTIN, Udyam, turnover, ITR and government schemes describe a company,
 * and a member trading through two companies had one answer here for both. The
 * website moved the whole step into the Business Account; this screen used to
 * keep writing it to the member record with a turnover list (`Above 1 Crore`)
 * the website no longer offers. It now sends the member where the answer lives.
 */

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'EditFinancial'>;
};

const EditFinancialScreen: React.FC<Props> = ({ navigation }) => (
  <PremiumPage
    header={(
      <PremiumPageHeader
        eyebrow="Asked per company"
        title="Financial & compliance"
        subtitle="PAN, GSTIN, Udyam and turnover live with each company."
        onBack={() => navigation.goBack()}
        art={<DocumentStack3D size={84} />}
        artSize={84}
      />
    )}
  >
    <FadeInUp delay={180} style={{ marginTop: -PREMIUM_OVERLAP }}>
      <SurfaceCard style={{ marginHorizontal: SPACE.lg }}>
        <StateView
          compact
          art={<DocumentStack3D size={64} />}
          title="Kept with each company"
          message="PAN, GSTIN, Udyam, turnover and government registrations are asked once for each company in your Business Account."
          action="Open my companies"
          actionIcon="storefront"
          onAction={() => navigation.navigate('ManageCompanies')}
        />
      </SurfaceCard>
    </FadeInUp>
  </PremiumPage>
);

export default EditFinancialScreen;
