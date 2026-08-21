/**
 * Activ App
 * React Native App with Navigation
 *
 * @format
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LogBox, StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

LogBox.ignoreAllLogs();

// Auth Screens
import OnboardingScreen from './src/screens/auth/OnboardingScreen';
import LoginScreen from './src/screens/auth/LoginScreen';
import WelcomeScreen from './src/screens/auth/WelcomeScreen';

// Registration Screens
import RegistrationStep1Screen from './src/screens/registration/RegistrationStep1Screen';
import RegistrationStep2Screen from './src/screens/registration/RegistrationStep2Screen';

// Member Screens
import MemberBottomTabs from './src/navigation/MemberBottomTabs';
import BlockAdminBottomTabs from './src/navigation/BlockAdminBottomTabs';
import DistrictAdminBottomTabs from './src/navigation/DistrictAdminBottomTabs';
import StateAdminBottomTabs from './src/navigation/StateAdminBottomTabs';
import EditProfileScreen from './src/screens/member/profile/EditProfileScreen';
import PaidDashboardScreen from './src/screens/member/paidDashboard/PaidDashboardScreen';
import PaidProfileScreen from './src/screens/member/paidDashboard/PaidProfileScreen';
import PaidSettingsScreen from './src/screens/member/paidDashboard/PaidSettingsScreen';
import EditBusinessScreen from './src/screens/member/profile/EditBusinessScreen';
import EditFinancialScreen from './src/screens/member/profile/EditFinancialScreen';
import EditDeclarationScreen from './src/screens/member/profile/EditDeclarationScreen';

// Profile Completion Forms
import PersonalDetailsFormScreen from './src/screens/profile/PersonalDetailsFormScreen';
import BusinessInformationFormScreen from './src/screens/profile/BusinessInformationFormScreen';
import FinancialComplianceFormScreen from './src/screens/profile/FinancialComplianceFormScreen';
import DeclarationFormScreen from './src/screens/profile/DeclarationFormScreen';

// Application Screens
import ApplicationStatusScreen from './src/screens/application/ApplicationStatusScreen';
import ApplicationSubmittedScreen from './src/screens/application/ApplicationSubmittedScreen';

// Business Screens
import BusinessProfileScreen from './src/screens/business/BusinessProfileScreen';
import BusinessDashboardScreen from './src/screens/business/BusinessDashboardScreen';
import ManageCompaniesScreen from './src/screens/business/ManageCompaniesScreen';
import AddCompanyScreen from './src/screens/business/AddCompanyScreen';
import ProductsServicesScreen from './src/screens/business/ProductsServicesScreen';
import AddProductScreen from './src/screens/business/AddProductScreen';
import DiscoverScreen from './src/screens/business/DiscoverScreen';
import AnalyticsScreen from './src/screens/business/AnalyticsScreen';
import SettingsScreen from './src/screens/business/SettingsScreen';
import EditCompanyScreen from './src/screens/business/EditCompanyScreen';
import ViewCompanyScreen from './src/screens/business/ViewCompanyScreen';
import BusinessProfileViewScreen from './src/screens/business/BusinessProfileViewScreen';

// Admin Screens
import {
  ApplicantDetailScreen,
} from './src/screens/admin';

// Payment Screens
import {
  CompleteMembershipScreen,
  PaymentGatewayScreen,
  MockPaymentScreen,
  PaymentSuccessScreen,
} from './src/screens/payment';

import ErrorBoundary from './src/components/ErrorBoundary';
import { RootStackParamList } from './src/types';

// Global JavaScript Error Handler to prevent app crashes on uncaught errors
if (typeof (globalThis as any).ErrorUtils !== 'undefined') {
  const defaultHandler = (globalThis as any).ErrorUtils.getGlobalHandler();
  (globalThis as any).ErrorUtils.setGlobalHandler((error: any, isFatal?: boolean) => {
    console.error('Caught global JS error:', error, 'isFatal:', isFatal);
    // Suppress fatal crash and prevent app exit
    if (__DEV__) {
      defaultHandler(error, false);
    }
  });
}

const Stack = createNativeStackNavigator<RootStackParamList>();

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <NavigationContainer>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <Stack.Navigator initialRouteName="Onboarding">
          {/* Auth Stack */}
          <Stack.Screen 
            name="Onboarding" 
            component={OnboardingScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="Welcome" 
            component={WelcomeScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="Login" 
            component={LoginScreen}
            options={{ headerShown: false }}
          />
          
          {/* Registration Stack */}
          <Stack.Screen 
            name="RegistrationStep1" 
            component={RegistrationStep1Screen}
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="RegistrationStep2" 
            component={RegistrationStep2Screen}
            options={{ headerShown: false }}
          />
          
          {/* Member Stack */}
          <Stack.Screen 
            name="MemberMain" 
            component={MemberBottomTabs}
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="EditProfile" 
            component={EditProfileScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="EditBusiness" 
            component={EditBusinessScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="EditFinancial" 
            component={EditFinancialScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="EditDeclaration" 
            component={EditDeclarationScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="PaidDashboard" 
            component={PaidDashboardScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="PaidProfile" 
            component={PaidProfileScreen}
            options={{ headerShown: false }}
          />
          
          {/* Profile Completion Forms */}
          <Stack.Screen 
            name="PersonalDetailsForm" 
            component={PersonalDetailsFormScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="BusinessInformationForm" 
            component={BusinessInformationFormScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="FinancialComplianceForm" 
            component={FinancialComplianceFormScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="DeclarationForm" 
            component={DeclarationFormScreen}
            options={{ headerShown: false }}
          />
          
          {/* Application Screens */}
          <Stack.Screen 
            name="ApplicationStatus" 
            component={ApplicationStatusScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="ApplicationSubmitted" 
            component={ApplicationSubmittedScreen}
            options={{ headerShown: false }}
          />
          
          {/* Business Screens */}
          <Stack.Screen 
            name="BusinessProfile" 
            component={BusinessProfileScreen}
            options={{ title: 'Business Profile' }}
          />
          <Stack.Screen 
            name="BusinessDashboard" 
            component={BusinessDashboardScreen}
            options={{ title: 'Business Dashboard' }}
          />
          <Stack.Screen 
            name="ManageCompanies" 
            component={ManageCompaniesScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="AddCompany" 
            component={AddCompanyScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="ProductsServices" 
            component={ProductsServicesScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="AddProduct" 
            component={AddProductScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="Discover" 
            component={DiscoverScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="Analytics" 
            component={AnalyticsScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="PaidSettings" 
            component={PaidSettingsScreen}
            options={{ headerShown: false }} 
          />
          <Stack.Screen 
            name="Settings" 
            component={SettingsScreen}
            options={{ headerShown: false }} 
          />
          <Stack.Screen 
            name="EditCompany" 
            component={EditCompanyScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="ViewCompany" 
            component={ViewCompanyScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="BusinessProfileView" 
            component={BusinessProfileViewScreen}
            options={{ headerShown: false }}
          />
          
          {/* Admin Screens */}
          <Stack.Screen
            name="ApplicantDetail"
            component={ApplicantDetailScreen}
            options={{ headerShown: false }}
          />

          {/* Block Admin Screens */}
          <Stack.Screen name="BlockDashboard" component={BlockAdminBottomTabs} options={{ headerShown: false }} />

          {/* District Admin Screens */}
          <Stack.Screen name="DistrictDashboard" component={DistrictAdminBottomTabs} options={{ headerShown: false }} />

          {/* State Admin Screens */}
          <Stack.Screen name="StateDashboard" component={StateAdminBottomTabs} options={{ headerShown: false }} />

          {/* Payment Screens */}
          <Stack.Screen 
            name="CompleteMembership" 
            component={CompleteMembershipScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="PaymentGateway" 
            component={PaymentGatewayScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="MockPayment" 
            component={MockPaymentScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="PaymentSuccess" 
            component={PaymentSuccessScreen}
            options={{ headerShown: false }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  </ErrorBoundary>
  );
}

export default App;
