import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { RootStackParamList } from '../../types';
import api from '../../services/api';
import { ENDPOINTS, resolveMediaUrl } from '../../config/api.config';

type BusinessProfileViewScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'BusinessProfileView'
>;

type BusinessProfileViewScreenRouteProp = RouteProp<
  RootStackParamList,
  'BusinessProfileView'
>;

interface Company {
  _id: string;
  businessName: string;
  description?: string;
  businessType?: string;
  mobileNumber?: string;
  area?: string;
  location?: string;
  logo?: string;
  views?: number;
  productsCount?: number;
  connections?: number;
  status?: string;
  isActive?: boolean;
}

const BusinessProfileViewScreen: React.FC = () => {
  const navigation = useNavigation<BusinessProfileViewScreenNavigationProp>();
  const route = useRoute<BusinessProfileViewScreenRouteProp>();
  const { companyId } = route.params || {};

  const [isLoading, setIsLoading] = useState(true);
  const [company, setCompany] = useState<Company | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCompanyDetails();
  }, [companyId]);

  const loadCompanyDetails = async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('🔍 Loading company details for ID:', companyId);
      
      const response = await api.get(`${ENDPOINTS.BUSINESS.CREATE}/${companyId}`);
      
      if (response.data.success && response.data.data) {
        setCompany(response.data.data);
        console.log('✅ Loaded company:', response.data.data.businessName);
      } else {
        setError('Company not found');
      }
    } catch (e: any) {
      console.error('❌ Error loading company details:', e);
      setError(e.response?.data?.message || e.message || 'Failed to load company');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status?: string): string => {
    if (!status) return '#9E9E9E';
    
    switch (status.toUpperCase()) {
      case 'ACTIVE':
      case 'APPROVED':
        return '#4CAF50';
      case 'REJECTED':
        return '#F44336';
      case 'UNDER_REVIEW':
      case 'PENDING':
        return '#FF9800';
      default:
        return '#9E9E9E';
    }
  };

  const getStatusDisplay = (status?: string, isActive?: boolean): string => {
    if (isActive) return 'Active';
    if (!status) return 'Pending';
    
    switch (status.toUpperCase()) {
      case 'ACTIVE':
      case 'APPROVED':
        return 'Active';
      case 'REJECTED':
        return 'Rejected';
      case 'UNDER_REVIEW':
      case 'PENDING':
        return 'Pending';
      default:
        return 'Unknown';
    }
  };

  const renderStatItem = (
    iconName: string,
    label: string,
    value: string,
    color: string
  ) => (
    <View style={[styles.statCard, { backgroundColor: `${color}1A`, borderColor: `${color}4D` }]}>
      <View style={styles.statHeader}>
        <Icon name={iconName} size={20} color={color} />
        <Text style={styles.statLabel} numberOfLines={1}>{label}</Text>
      </View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Company Details</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorContainer}>
          <Icon name="error-outline" size={80} color="#EF4444" />
          <Text style={styles.errorTitle}>Failed to load company details</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadCompanyDetails}>
            <Icon name="refresh" size={20} color="#FFFFFF" />
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!company) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.noDataText}>No company data available</Text>
      </View>
    );
  }

  const statusColor = getStatusColor(company.status);
  const statusDisplay = getStatusDisplay(company.status, company.isActive);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Company Details</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Main Content */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Logo Section */}
        <View style={styles.logoSection}>
          <View style={styles.logoContainer}>
            {company.logo ? (
              <Image
                source={{ uri: resolveMediaUrl(company.logo) }}
                style={styles.logoImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.logoPlaceholder}>
                <Icon name="add-photo-alternate" size={60} color="#9CA3AF" />
                <Text style={styles.logoPlaceholderText}>Upload Logo</Text>
              </View>
            )}
          </View>
          <Text style={styles.logoHintText}>Tap to upload business logo</Text>
        </View>

        {/* Stats Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Company Statistics</Text>
          <View style={styles.statsRow}>
            {renderStatItem(
              'visibility',
              'Profile Views',
              (company.views || 0).toString(),
              '#2196F3'
            )}
            {renderStatItem(
              'inventory-2',
              'Products',
              (company.productsCount || 0).toString(),
              '#4CAF50'
            )}
          </View>
          <View style={styles.statsRow}>
            {renderStatItem(
              'link',
              'Connections',
              (company.connections || 0).toString(),
              '#FF9800'
            )}
            {renderStatItem(
              'business-center',
              'Status',
              statusDisplay,
              statusColor
            )}
          </View>
        </View>

        {/* Company Details Card */}
        <View style={styles.card}>
          <View style={styles.formSection}>
            {/* Business Name */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Business Name</Text>
              <View style={styles.readOnlyInput}>
                <Text style={styles.inputText}>{company.businessName}</Text>
              </View>
            </View>

            {/* Description */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Description</Text>
              <View style={[styles.readOnlyInput, styles.textAreaInput]}>
                <Text style={styles.inputText}>{company.description || 'N/A'}</Text>
              </View>
            </View>

            {/* Business Type */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Business Type</Text>
              <View style={styles.readOnlyInput}>
                <Text style={styles.inputText}>{company.businessType || 'N/A'}</Text>
              </View>
            </View>

            {/* Mobile Number */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Mobile Number</Text>
              <View style={styles.readOnlyInput}>
                <Text style={styles.inputText}>{company.mobileNumber || 'N/A'}</Text>
              </View>
            </View>

            {/* Area */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Area</Text>
              <View style={styles.readOnlyInput}>
                <Text style={styles.inputText}>{company.area || 'N/A'}</Text>
              </View>
            </View>

            {/* Location */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Location</Text>
              <View style={styles.readOnlyInput}>
                <Text style={styles.inputText}>{company.location || 'N/A'}</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8E3F5',
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#E8E3F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#1565C0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 50,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoContainer: {
    width: 160,
    height: 160,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: '#D1D5DB',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  logoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoPlaceholderText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 12,
  },
  logoHintText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    marginLeft: 8,
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  formSection: {
    gap: 20,
  },
  fieldContainer: {
    marginBottom: 4,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  readOnlyInput: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  textAreaInput: {
    minHeight: 100,
  },
  inputText: {
    fontSize: 16,
    color: '#1F2937',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  noDataText: {
    fontSize: 16,
    color: '#6B7280',
  },
});

export default BusinessProfileViewScreen;
