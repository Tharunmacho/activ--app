import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  TextInput,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, ApplicationStatus } from '../../types';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../theme/theme';
import api, { getUserData } from '../../services/api';
import { ENDPOINTS } from '../../config/api.config';
import { useAuthStore } from '../../stores/exampleStore';
import { useMemberStore } from '../../stores/memberStore';
import PaidDashboardScreen from './PaidDashboardScreen';

import SidebarDrawer from './SidebarDrawer';
import { removeAuthToken } from '../../services/api';

type DashboardScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'MemberMain'>;
};

const DashboardScreen: React.FC<DashboardScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuthStore();
  const { member, setMember, setApplication } = useMemberStore();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await removeAuthToken();
            await logout();
            navigation.replace('Login');
          },
        },
      ]
    );
  };

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [memberStatus, setMemberStatus] = useState<any>(null);
  const [hasBusinessAccount, setHasBusinessAccount] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);
  const [applicationData, setApplicationData] = useState<any>(null);

  useEffect(() => {
    loadDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDashboardData = async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      // Get member profile using my-profile endpoint
      const profileResponse = await api.get('/members/my-profile');

      if (profileResponse.data.success && profileResponse.data.data) {
        const memberData = profileResponse.data.data;
        setMember(memberData);
        setProfileData(memberData);

        // Set member status based on profile data
        setMemberStatus({
          membershipStatus: memberData.membershipStatus || 'pending',
          membershipType: memberData.membershipType || 'none',
          hasApplication: !!memberData.approvedAt,
        });

        // Check if user has a business account by calling the business profile API
        try {
          const businessResponse = await api.get(ENDPOINTS.BUSINESS.CREATE + '/me');
          if (businessResponse.data.success && businessResponse.data.data) {
            setHasBusinessAccount(true);
          } else {
            setHasBusinessAccount(false);
          }
        } catch (businessError: any) {
          // 404 means no business profile exists
          setHasBusinessAccount(false);
        }

        // Check if user has an active application submitted
        try {
          const userData = await getUserData();
          const userId = userData?.id || userData?.memberId || userData?._id || user?._id || user?.id;
          if (userId) {
            const appResponse = await api.get(`/applications/user/${userId}`);
            const appsList = Array.isArray(appResponse.data.data)
              ? appResponse.data.data
              : (appResponse.data.applications || []);
            if (appsList.length > 0) {
              setApplicationData(appsList[0]);
            }
          }
        } catch (appErr) {
          // Ignore if no application
        }
      }
    } catch (error: any) {
      // Silently handle error - user might not have profile yet
      if (error.response?.status !== 404) {
        // Only show error for non-404 errors
        setMemberStatus({
          membershipStatus: 'pending',
          membershipType: 'none',
          hasApplication: false,
        });
      }
      setHasBusinessAccount(false);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const getStatusColor = (status?: ApplicationStatus) => {
    switch (status) {
      case ApplicationStatus.APPROVED:
        return COLORS.approved;
      case ApplicationStatus.REJECTED:
        return COLORS.rejected;
      case ApplicationStatus.PENDING_BLOCK:
      case ApplicationStatus.PENDING_DISTRICT:
      case ApplicationStatus.PENDING_STATE:
        return COLORS.pending;
      default:
        return COLORS.textSecondary;
    }
  };

  const calculateProfileCompletion = () => {
    if (!profileData) return 0;

    const fields = [
      profileData.fullName,
      profileData.email,
      profileData.phoneNumber,
      profileData.state,
      profileData.district,
      profileData.block,
      profileData.city,
      profileData.aadhaarNumber,
      profileData.educationalQualification,
      profileData.religion,
      profileData.socialCategory,
    ];

    const filledFields = fields.filter(field => field && field.toString().trim() !== '').length;
    return Math.round((filledFields / fields.length) * 100);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // Active Paid Members ALWAYS see PaidDashboardScreen (After Payment Dashboard)
  if (profileData?.membershipStatus === 'approved' || profileData?.membershipStatus === 'active') {
    return <PaidDashboardScreen navigation={navigation as any} />;
  }

  const hasSubmittedApplication = !!(applicationData && (applicationData._id || applicationData.id || applicationData.status));

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      {/* Sidebar Drawer Component */}
      <SidebarDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        navigation={navigation}
        currentScreen="Dashboard"
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadDashboardData(true)}
            colors={['#2563EB']}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section matching reference image */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.profileSection}
            onPress={() => navigation.navigate('Profile' as any)}
            activeOpacity={0.8}
          >
            {member?.profilePhoto || profileData?.profilePhoto ? (
              <Image
                source={{ uri: member?.profilePhoto || profileData.profilePhoto }}
                style={styles.avatarImage}
              />
            ) : (
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>
                  {profileData?.fullName?.charAt(0).toUpperCase() || 'P'}
                </Text>
              </View>
            )}
            <View style={styles.profileInfo}>
              <Text style={styles.greetingLabel}>Welcome back,</Text>
              <Text style={styles.greetingName}>
                {profileData?.fullName || 'Pradeep'} 👋
              </Text>
              <View style={styles.locationRow}>
                <Icon name="location-on" size={14} color="#94A3B8" />
                <Text style={styles.locationText}>
                  {profileData?.city || profileData?.district || 'Sriyalur'}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Search Bar matching reference image */}
        <View style={styles.searchContainer}>
          <Icon name="search" size={20} color="#94A3B8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by location, business, events..."
            placeholderTextColor="#94A3B8"
          />
        </View>

        {/* Card 1: "Complete Your Profile" Banner */}
        <View style={styles.profileBannerCard}>
          <View style={styles.cardHeaderFlex}>
            <View style={styles.cardLeftContent}>
              <Text style={styles.cardMainTitle}>
                Complete Your{'\n'}Profile
              </Text>

              {/* Progress percentage row */}
              <View style={styles.progressStatusRow}>
                <Text style={styles.progressStatusText}>
                  You're <Text style={styles.progressHighlight}>{calculateProfileCompletion()}%</Text> there!
                </Text>
              </View>

              {/* Progress bar */}
              <View style={styles.progressBarWrapper}>
                <View style={styles.progressBarTrack}>
                  <View style={[styles.progressBarFill, { width: `${calculateProfileCompletion()}%` }]} />
                </View>
                <Text style={styles.progressPctBadge}>{calculateProfileCompletion()}%</Text>
              </View>

              <Text style={styles.cardSubText}>
                Unlock all features by completing your profile.
              </Text>

              <TouchableOpacity
                style={styles.profileActionButton}
                onPress={async () => {
                  if (hasSubmittedApplication) {
                    navigation.navigate('ApplicationStatus');
                  } else {
                    try {
                      const storedUserData = await getUserData();
                      navigation.navigate('PersonalDetailsForm', {
                        userData: storedUserData || {
                          email: user?.email || '',
                          memberId: user?._id || user?.id || '',
                          fullName: user?.fullName || '',
                          phoneNumber: user?.phoneNumber || '',
                        }
                      });
                    } catch (error) {
                      navigation.navigate('PersonalDetailsForm', {
                        userData: {
                          email: user?.email || '',
                          memberId: user?._id || user?.id || '',
                        }
                      });
                    }
                  }
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.profileActionButtonText}>
                  {hasSubmittedApplication ? 'View Status' : 'Continue Profile'}
                </Text>
                <Icon name="chevron-right" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Right side 3D Clipboard Image */}
            <View style={styles.clipboardBadgeContainer}>
              <Image
                source={require('../../assets/images/clipboard_3d_final-removebg-preview.png')}
                style={styles.graphicImageClipboard}
                resizeMode="contain"
              />
            </View>
          </View>
        </View>

        {/* Card 2: "Your Business Account" Banner matching Image 1 */}
        <View style={styles.businessBannerCard}>
          <Text style={styles.cardMainTitle}>Your Business Account</Text>
          <Text style={styles.cardSubText}>
            Create your business account to access all premium features.
          </Text>

          <View style={styles.businessCardFlex}>
            {/* Feature Bullets */}
            <View style={styles.featuresList}>
              <View style={styles.featureItem}>
                <View style={[styles.featureIconBadge, { backgroundColor: '#EEF2FF' }]}>
                  <Icon name="verified-user" size={16} color="#4F46E5" />
                </View>
                <View style={styles.featureTextWrapper}>
                  <Text style={styles.featureTitle}>Verified & Trusted</Text>
                  <Text style={styles.featureDesc}>Build credibility for your business</Text>
                </View>
              </View>

              <View style={styles.featureItem}>
                <View style={[styles.featureIconBadge, { backgroundColor: '#EFF6FF' }]}>
                  <Icon name="trending-up" size={16} color="#2563EB" />
                </View>
                <View style={styles.featureTextWrapper}>
                  <Text style={styles.featureTitle}>Grow Your Reach</Text>
                  <Text style={styles.featureDesc}>Connect with more customers</Text>
                </View>
              </View>

              <View style={styles.featureItem}>
                <View style={[styles.featureIconBadge, { backgroundColor: '#FDF4FF' }]}>
                  <Icon name="stars" size={16} color="#A855F7" />
                </View>
                <View style={styles.featureTextWrapper}>
                  <Text style={styles.featureTitle}>Premium Benefits</Text>
                  <Text style={styles.featureDesc}>Unlock exclusive business tools</Text>
                </View>
              </View>
            </View>

            {/* Right side 3D Briefcase Image */}
            <View style={styles.briefcaseContainer}>
              <Image
                source={require('../../assets/images/briefcase_3d_final-removebg-preview.png')}
                style={styles.graphicImageBriefcase}
                resizeMode="contain"
              />
            </View>
          </View>

          {/* Action Button */}
          <TouchableOpacity
            style={styles.businessActionButton}
            onPress={() => {
              if (hasBusinessAccount) {
                navigation.navigate('BusinessDashboard');
              } else {
                navigation.navigate('BusinessProfile');
              }
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.businessActionButtonText}>
              {hasBusinessAccount ? 'Open Business Dashboard' : 'Create Business Account'}
            </Text>
            <Icon name="chevron-right" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 30,
  },
  header: {
    marginBottom: 14,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    elevation: 3,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  avatarImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginRight: 14,
    backgroundColor: '#E2E8F0',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  profileInfo: {
    flex: 1,
  },
  greetingLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  greetingName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 26,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  locationText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    marginLeft: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    height: 48,
    paddingHorizontal: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
  },

  /* Card 1: Complete Profile Banner */
  profileBannerCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 18,
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  cardHeaderFlex: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLeftContent: {
    flex: 1,
    paddingRight: 10,
  },
  cardMainTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 28,
    letterSpacing: -0.3,
  },
  progressStatusRow: {
    marginTop: 8,
    marginBottom: 6,
  },
  progressStatusText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  progressHighlight: {
    color: '#2563EB',
    fontWeight: '800',
  },
  progressBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  progressBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#2563EB',
    borderRadius: 4,
  },
  progressPctBadge: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E40AF',
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  cardSubText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 16,
  },
  profileActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 14,
    paddingVertical: 11,
    paddingHorizontal: 18,
    alignSelf: 'flex-start',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  profileActionButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    marginRight: 4,
  },
  clipboardBadgeContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 155,
    height: 175,
  },
  graphicImageClipboard: {
    width: 155,
    height: 175,
  },

  /* Card 2: Business Account Banner */
  businessBannerCard: {
    backgroundColor: '#F3E8FF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 18,
    borderWidth: 1.5,
    borderColor: '#E9D5FF',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  businessCardFlex: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 12,
  },
  featuresList: {
    flex: 1,
    paddingRight: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  featureTextWrapper: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  featureDesc: {
    fontSize: 11,
    color: '#64748B',
  },
  briefcaseContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 150,
    height: 165,
  },
  graphicImageBriefcase: {
    width: 150,
    height: 165,
  },
  businessActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7C3AED',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignSelf: 'flex-start',
    marginTop: 8,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  businessActionButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    marginRight: 4,
  },
});

export default DashboardScreen;
