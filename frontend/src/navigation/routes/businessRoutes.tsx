import React from 'react';
import CompanyPublicScreen from '../../screens/business/CompanyPublicScreen';
import EditProductScreen from '../../screens/business/EditProductScreen';
import TrustListScreen from '../../screens/business/TrustListScreen';
import StockCentreScreen from '../../screens/business/StockCentreScreen';

/**
 * The business area's NEW stack screens. Registered once in App.tsx inside the
 * root <Stack.Navigator> — add screens here, never in App.tsx, so the five
 * areas never edit the same file. The older business screens (BusinessDashboard,
 * ProductsServices, AddProduct, Discover, Analytics, Settings, ManageCompanies,
 * AddCompany, EditCompany, ViewCompany, BusinessProfile, BusinessProfileView)
 * stay registered in App.tsx under their existing names.
 */
export const businessScreens = (Stack: any) => (
  <>
    <Stack.Screen name="CompanyPublic" component={CompanyPublicScreen} options={{ headerShown: false }} />
    <Stack.Screen name="EditProduct" component={EditProductScreen} options={{ headerShown: false }} />
    <Stack.Screen name="TrustList" component={TrustListScreen} options={{ headerShown: false }} />
    <Stack.Screen name="StockCentre" component={StockCentreScreen} options={{ headerShown: false }} />
  </>
);
