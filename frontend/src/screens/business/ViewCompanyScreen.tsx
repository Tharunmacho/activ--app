import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';
import api from '../../services/api';
import { resolveMediaUrl } from '../../config/api.config';

type Props = NativeStackScreenProps<RootStackParamList, 'ViewCompany'>;

interface CompanyData {
  _id: string;
  businessName: string;
  description?: string;
  businessType?: string;
  mobileNumber?: string;
  email?: string;
  location: string;
  area?: string;
  logo?: string;
  status?: string;
  productsCount?: number;
  isVerified?: boolean;
}

const ViewCompanyScreen: React.FC<Props> = ({ navigation, route }) => {
  const { companyId } = route.params || {};
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCompanyData();
  }, []);

  const loadCompanyData = async () => {
    if (!companyId) {
      setIsLoading(false);
      return;
    }

    try {
      // TODO: Replace with actual company details endpoint
      // const response = await api.get(`/api/v1/companies/${companyId}`);
      
      // Mock data for now
      await new Promise<void>(resolve => setTimeout(resolve, 500));
      setCompany(null);
    } catch (error: any) {
      console.error('Error loading company:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (!company) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Company Profile</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Icon name="business" size={80} color="#BDBDBD" />
          <Text style={styles.emptyTitle}>Company not found</Text>
          <Text style={styles.emptySubtitle}>The company you're looking for doesn't exist</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Company Profile</Text>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          {/* Logo */}
          <View style={styles.logoContainer}>
            <View style={styles.logoBox}>
              {company.logo ? (
                <Image source={{ uri: resolveMediaUrl(company.logo) }} style={styles.logoImage} />
              ) : (
                <Icon name="business" size={48} color="#2563EB" />
              )}
            </View>
          </View>

          {/* Company Info */}
          <View style={styles.infoSection}>
            <View style={styles.titleRow}>
              <Text style={styles.companyName}>{company.businessName}</Text>
              {company.isVerified && <Icon name="verified" size={24} color="#2563EB" />}
            </View>
            {company.description && (
              <Text style={styles.description}>{company.description}</Text>
            )}
          </View>

          {/* Details */}
          <View style={styles.detailsSection}>
            {company.businessType && (
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <Icon name="category" size={20} color="#2563EB" />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Business Type</Text>
                  <Text style={styles.detailValue}>{company.businessType}</Text>
                </View>
              </View>
            )}

            {company.mobileNumber && (
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <Icon name="phone" size={20} color="#2563EB" />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Mobile Number</Text>
                  <Text style={styles.detailValue}>{company.mobileNumber}</Text>
                </View>
              </View>
            )}

            {company.email && (
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <Icon name="email" size={20} color="#2563EB" />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Email</Text>
                  <Text style={styles.detailValue}>{company.email}</Text>
                </View>
              </View>
            )}

            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Icon name="location-on" size={20} color="#2563EB" />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Location</Text>
                <Text style={styles.detailValue}>
                  {company.area ? `${company.area}, ${company.location}` : company.location}
                </Text>
              </View>
            </View>

            {company.status && (
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <Icon name="info" size={20} color="#2563EB" />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      company.status === 'active' && styles.statusActive,
                      company.status === 'pending' && styles.statusPending,
                      company.status === 'inactive' && styles.statusInactive,
                    ]}>
                    <Text
                      style={[
                        styles.statusText,
                        company.status === 'active' && styles.statusTextActive,
                        company.status === 'pending' && styles.statusTextPending,
                        company.status === 'inactive' && styles.statusTextInactive,
                      ]}>
                      {company.status.charAt(0).toUpperCase() + company.status.slice(1)}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* Stats */}
          <View style={styles.statsSection}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{company.productsCount || 0}</Text>
              <Text style={styles.statLabel}>Products</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>0</Text>
              <Text style={styles.statLabel}>Reviews</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>0</Text>
              <Text style={styles.statLabel}>Connections</Text>
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
  loadingContainer: {
    flex: 1,
    backgroundColor: '#E8E3F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#1565C0',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    flex: 1,
    textAlign: 'center',
    marginRight: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  profileCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoBox: {
    width: 128,
    height: 128,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    backgroundColor: '#F5F5F5',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  infoSection: {
    marginBottom: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  companyName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212121',
    flex: 1,
  },
  description: {
    fontSize: 14,
    color: '#616161',
    lineHeight: 20,
  },
  detailsSection: {
    gap: 16,
    marginBottom: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  detailRow: {
    flexDirection: 'row',
    gap: 12,
  },
  detailIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailContent: {
    flex: 1,
    justifyContent: 'center',
  },
  detailLabel: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusActive: {
    backgroundColor: '#E8F5E9',
  },
  statusPending: {
    backgroundColor: '#FFF3E0',
  },
  statusInactive: {
    backgroundColor: '#FFEBEE',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusTextActive: {
    color: '#2E7D32',
  },
  statusTextPending: {
    color: '#E65100',
  },
  statusTextInactive: {
    color: '#C62828',
  },
  statsSection: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2563EB',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#757575',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#424242',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
    marginTop: 8,
  },
});

export default ViewCompanyScreen;
