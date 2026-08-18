// Manage Companies Screen - Purple Theme Design System
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../../types';
import api from '../../services/api';
import { ENDPOINTS } from '../../config/api.config';
import { useActiveCompanyStore } from '../../stores/activeCompanyStore';

type ManageCompaniesScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'ManageCompanies'
>;

interface Props {
  navigation: ManageCompaniesScreenNavigationProp;
}

interface Company {
  _id: string;
  businessName: string;
  businessType: string;
  mobileNumber: string;
  email?: string;
  location: string;
  area?: string;
  status: string;
  isActive: boolean;
}

const ManageCompaniesScreen: React.FC<Props> = ({ navigation }) => {
  const companies = useActiveCompanyStore((state) => state.companies) as Company[];
  const activeCompanyId = useActiveCompanyStore((state) => state.activeCompanyId);
  const setActiveCompany = useActiveCompanyStore((state) => state.setActiveCompany);
  const loadCompanies = useActiveCompanyStore((state) => state.loadCompanies);

  const [isLoading, setIsLoading] = useState(true);

  // On focus, not on mount: a company created or edited on another screen must
  // be visible the moment the user comes back to this list.
  useFocusEffect(
    useCallback(() => {
      fetchCompanies();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const fetchCompanies = async () => {
    try {
      setIsLoading(true);
      await loadCompanies({ force: true });
    } catch (error: any) {
      console.error('Error fetching companies:', error);
      Alert.alert('Error', 'Failed to load companies.');
    } finally {
      setIsLoading(false);
    }
  };

  // The one place a company switch is made. Every business screen follows it.
  const handleUseCompany = (company: Company) => {
    if (!company?._id) return;
    setActiveCompany(company._id);
    Alert.alert(
      'Company Switched',
      `You are now working as "${company.businessName || 'this company'}". Products, profile and analytics now show this company only.`
    );
  };

  const handleDelete = (company: Company) => {
    Alert.alert(
      'Delete Company',
      `Are you sure you want to delete "${company.businessName}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              await api.delete(ENDPOINTS.BUSINESS.DELETE(company._id));
              if (activeCompanyId === company._id) {
                setActiveCompany(null);
              }
              Alert.alert('Success', 'Company deleted successfully');
              fetchCompanies();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.message || 'Failed to delete company.');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F7FD" />

      {/* Nav Header */}
      <View style={styles.navHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.7}>
          <Icon name="arrow-back" size={24} color="#1E1B4B" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Manage Companies</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('AddCompany')} style={styles.addButtonHeader} activeOpacity={0.7}>
          <Icon name="add" size={24} color="#7C3AED" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {(companies || []).length > 0 ? (
          (companies || []).map((comp) => (
            <View
              key={comp._id}
              style={[styles.companyCard, activeCompanyId === comp._id && styles.companyCardActive]}
            >
              <View style={styles.cardHeaderRow}>
                <View style={styles.iconBox}>
                  <Icon name="storefront" size={26} color="#7C3AED" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.companyName}>{comp.businessName}</Text>
                  <Text style={styles.companyType}>{comp.businessType}</Text>
                  <Text style={styles.companyPhone}>{comp.mobileNumber}</Text>
                </View>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>
                    {comp.status === 'pending'
                      ? 'Under Review'
                      : comp.status === 'active'
                      ? 'Active'
                      : comp.status || 'Under Review'}
                  </Text>
                </View>
              </View>

              {/* Active / switch control - the single company-switch point */}
              {activeCompanyId === comp._id ? (
                <View style={styles.activeRow}>
                  <Icon name="check-circle" size={16} color="#10B981" style={{ marginRight: 6 }} />
                  <Text style={styles.activeRowText}>
                    Currently active — products, profile & analytics show this company
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.switchRow}
                  onPress={() => handleUseCompany(comp)}
                  activeOpacity={0.85}
                >
                  <Icon name="swap-horiz" size={16} color="#7C3AED" style={{ marginRight: 6 }} />
                  <Text style={styles.switchRowText}>Switch to this company</Text>
                </TouchableOpacity>
              )}

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() => navigation.navigate('EditCompany', { companyId: comp._id })}
                  activeOpacity={0.8}
                >
                  <Icon name="edit" size={16} color="#7C3AED" style={{ marginRight: 4 }} />
                  <Text style={styles.editBtnText}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.productsBtn}
                  onPress={() => {
                    // Opening a company's catalog switches the active company,
                    // so no screen ends up mixing two companies' data.
                    setActiveCompany(comp._id);
                    navigation.navigate('ProductsServices', { companyId: comp._id });
                  }}
                  activeOpacity={0.8}
                >
                  <Icon name="inventory-2" size={16} color="#10B981" style={{ marginRight: 4 }} />
                  <Text style={styles.productsBtnText}>Products</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDelete(comp)}
                  activeOpacity={0.8}
                >
                  <Icon name="delete-outline" size={16} color="#EF4444" style={{ marginRight: 4 }} />
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyCard}>
            <Icon name="storefront" size={54} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>No Companies Registered</Text>
            <Text style={styles.emptySub}>Add your business profile to showcase products and services.</Text>
            <TouchableOpacity
              style={styles.addBtnPrimary}
              onPress={() => navigation.navigate('AddCompany')}
              activeOpacity={0.85}
            >
              <Icon name="add" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.addBtnPrimaryText}>Add Company</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F7FD',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7F7FD',
  },
  navHeader: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#F7F7FD',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonHeader: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E1B4B',
  },

  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 60,
  },

  // Company Card
  companyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F3E8FF',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
  },
  companyCardActive: {
    borderWidth: 1.5,
    borderColor: '#7C3AED',
  },
  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 12,
  },
  activeRowText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    color: '#166534',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 12,
  },
  switchRowText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7C3AED',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  companyName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E1B4B',
  },
  companyType: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  companyPhone: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7C3AED',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
  },

  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  editBtn: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: '#7C3AED',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#7C3AED',
  },
  productsBtn: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#DCFCE7',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productsBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10B981',
  },
  deleteBtn: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFF1F2',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#EF4444',
  },

  // Empty State
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3E8FF',
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E1B4B',
    marginTop: 14,
  },
  emptySub: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 18,
  },
  addBtnPrimary: {
    height: 48,
    paddingHorizontal: 24,
    backgroundColor: '#7C3AED',
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  addBtnPrimaryText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default ManageCompaniesScreen;
