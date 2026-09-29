import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Alert,
  Image,
  TextInput,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../../../types';
import LinearGradient from 'react-native-linear-gradient';
import api, { getUserData } from '../../../services/api';
import { useAuthStore } from '../../../stores/exampleStore';

type PaidDashboardProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'PaidDashboard'>;
};

const PaidDashboardScreen: React.FC<PaidDashboardProps> = ({ navigation }) => {
  const { logout } = useAuthStore();
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);

  useFocusEffect(
    useCallback(() => {
      loadUserData();
    }, [])
  );

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to log out of your account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' as any }],
            });
          },
        },
      ]
    );
  };

  const loadUserData = async () => {
    try {
      setIsLoading(true);
      const storedUser = await getUserData();
      const userId = storedUser?.id || storedUser?.memberId || storedUser?._id;

      let memberName = storedUser?.fullName || storedUser?.name || 'Member';
      let memberEmail = storedUser?.email || 'member@activ.org';
      let planType = 'Aspirant Membership';
      let profilePhoto = storedUser?.profilePhoto || '';
      let isBusinessUser = false;
      // The Member ID the server assigned (ACTIV-2026-001). Never made up here.
      let membershipId = String(storedUser?.membershipNumber || '');

      if (userId) {
        const [appResResult, profileResResult] = await Promise.allSettled([
          api.get(`/applications/user/${userId}`),
          api.get('/members/my-profile')
        ]);

        if (appResResult.status === 'fulfilled' && appResResult.value) {
          const appRes = appResResult.value;
          const appsList = Array.isArray(appRes.data.data)
            ? appRes.data.data
            : (appRes.data.applications || []);
          if (appsList.length > 0) {
            const app = appsList[0];
            memberName = app.fullName || app.memberName || memberName;
            memberEmail = app.email || app.memberEmail || memberEmail;

            const isDoingBusiness =
              app.doingBusiness === true ||
              app.data?.doingBusiness === true ||
              !!app.businessInfo?.companyName ||
              !!app.data?.businessInfo?.companyName ||
              app.memberType === 'business' ||
              app.registrationType === 'business';

            if (isDoingBusiness) {
              planType = 'Business Membership';
              isBusinessUser = true;
            } else {
              planType = 'Aspirant Membership';
              isBusinessUser = false;
            }
          }
        } else {
          console.log('Error loading application data:', appResResult.status === 'rejected' ? appResResult.reason : 'empty response');
        }

        if (profileResResult.status === 'fulfilled' && profileResResult.value) {
          const profileRes = profileResResult.value;
          if (profileRes.data?.success && profileRes.data?.data) {
            const prof = profileRes.data.data;
            memberName = prof.fullName || memberName;
            memberEmail = prof.email || memberEmail;
            if (prof.profilePhoto) profilePhoto = prof.profilePhoto;
            membershipId = String(prof.membershipNumber || membershipId || '');
          }
        } else {
          console.log('Error loading profile:', profileResResult.status === 'rejected' ? profileResResult.reason : 'empty response');
        }
      }

      setUserData({
        name: memberName,
        email: memberEmail,
        planType,
        isBusinessUser,
        status: 'Active',
        membershipId,
        profilePhoto,
      });
    } catch (error) {
      console.error('Error loading paid dashboard user data:', error);
      // No invented member on failure: the screen shows what is known and a
      // dash for the Member ID rather than somebody else's name and number.
      setUserData({
        name: 'Member',
        email: '',
        planType: 'Membership',
        isBusinessUser: false,
        status: 'Active',
        membershipId: '',
        profilePhoto: '',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadCertificate = () => {
    Alert.alert(
      'Membership Certificate',
      `Official ACTIV Membership Certificate for ${userData?.name} (${userData?.membershipId || "—"}) is ready!`,
      [{ text: 'Download PDF', onPress: () => console.log('Downloading Certificate...') }, { text: 'Close', style: 'cancel' }]
    );
  };

  const handleDownloadTaxExemption = () => {
    const textContent = `
TAX EXEMPTION CERTIFICATE
================================
Member ID: ${userData?.membershipId || "—"}
Member Name: ${userData?.name}
Plan Type: ${userData?.planType}
Status: ACTIVE

This certifies that the member is eligible for
tax exemption benefits under ACTIV Membership.

Issue Date: ${new Date().toLocaleDateString()}
================================
    `.trim();

    Alert.alert('Tax Exemption Certificate', textContent, [
      { text: 'Close', style: 'cancel' },
    ]);
  };

  const recentActivities = [
    { title: 'Attended Virtual Networking Event', time: '2 days ago', icon: 'event', color: '#2563EB', bg: '#EFF6FF' },
    { title: 'Downloaded Tax Exemption', time: '5 days ago', icon: 'description', color: '#059669', bg: '#ECFDF5' },
    { title: 'Updated Profile Information', time: '1 week ago', icon: 'person', color: '#7C3AED', bg: '#F3E8FF' },
    { title: 'Joined Industry Workshop', time: '2 weeks ago', icon: 'star', color: '#D97706', bg: '#FEF3C7' },
  ];

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#352367" />
        <Text style={styles.loadingText}>Loading Dashboard...</Text>
      </View>
    );
  }



  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#352367" />
      
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Header Section */}
        <View style={styles.topHeader}>
          <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }} />
          <View style={styles.headerInner}>
            <TouchableOpacity 
              style={styles.userInfoRow}
              onPress={() => navigation.navigate('PaidProfile' as any)}
              activeOpacity={0.8}
            >
              <View style={styles.avatarWrap}>
                {userData?.profilePhoto ? (
                  <Image source={{ uri: userData.profilePhoto }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarInitial}>
                    {(userData?.name || 'S').charAt(0).toUpperCase()}
                  </Text>
                )}
              </View>
              <View style={styles.welcomeTextWrap}>
                <Text style={styles.welcomeText}>
                  Welcome back, {(userData?.name || '').split(' ')[0] || 'Member'}
                </Text>
                {/*
                  `planType` is a membership tier — starter, lifetime — and it
                  was falling back to "TechCorp Solution", a company name, for
                  anyone whose tier had not loaded. Two unrelated things in one
                  slot, one of them invented. An unset tier renders nothing.
                */}
                {!!userData?.planType && (
                  <Text style={styles.companyText}>{userData.planType}</Text>
                )}
              </View>
            </TouchableOpacity>
            
            <View style={styles.searchWrap}>
              <TextInput 
                style={styles.searchInput}
                placeholder="Search by location..."
                placeholderTextColor="#6B7280"
              />
            </View>
          </View>
        </View>

        {/* Membership Card */}
        <View style={styles.cardWrapper}>
          <LinearGradient
            colors={['#D283ED', '#F670B3']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.membershipCard}
          >
            <View style={styles.cardTopRow}>
              <View style={styles.pillGroup}>
                <View style={styles.lifetimePill}>
                  <Text style={styles.lifetimePillText}>Lifetime</Text>
                </View>
                <View style={styles.activePill}>
                  <Text style={styles.activePillText}>Active</Text>
                </View>
              </View>
              <Icon name="emoji-events" size={24} color="#FDE047" />
            </View>
            
            <View style={styles.cardMidSection}>
              <Text style={styles.memberSinceLabel}>Member since</Text>
              <Text style={styles.memberSinceDate}>January 15, 2020</Text>
            </View>

            <View style={styles.cardBottomSection}>
              <Text style={styles.memberIdText}>Member ID: {userData?.membershipId || '—'}</Text>
            </View>
          </LinearGradient>
        </View>

        {/* Official Documents Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Official Documents</Text>
          <Text style={styles.sectionSubtitle}>
            Access and download essential documents related to your account
          </Text>

          <TouchableOpacity style={styles.certBtnBlue} onPress={handleDownloadCertificate} activeOpacity={0.8}>
            <View style={styles.certIconWrap}>
              <Icon name="verified-user" size={20} color="#1E293B" />
              <Text style={styles.certBtnTextBlue}>Download Membership Certificate</Text>
            </View>
            <Icon name="file-download" size={20} color="#3B82F6" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.certBtnGreen} onPress={handleDownloadTaxExemption} activeOpacity={0.8}>
            <View style={styles.certIconWrap}>
              <Icon name="volunteer-activism" size={20} color="#1E293B" />
              <Text style={styles.certBtnTextGreen}>Download Tax Exemption Certificate</Text>
            </View>
            <Icon name="file-download" size={20} color="#16A34A" />
          </TouchableOpacity>
        </View>

        {/* Quick Actions Grid */}
        <View style={styles.gridContainer}>
          <TouchableOpacity style={styles.gridItem} onPress={() => navigation.navigate('PaidProfile' as any)} activeOpacity={0.8}>
            <Icon name="person-outline" size={32} color="#2563EB" />
            <Text style={styles.gridItemText}>Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.gridItem} onPress={() => Alert.alert('Events', 'Upcoming workshops.')} activeOpacity={0.8}>
            <Icon name="calendar-today" size={28} color="#2563EB" style={{ marginBottom: 4 }} />
            <Text style={styles.gridItemText}>Events</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.gridItem} onPress={() => Alert.alert('Support', 'Contact ACTIV support.')} activeOpacity={0.8}>
            <Icon name="headset-mic" size={28} color="#2563EB" style={{ marginBottom: 4 }} />
            <Text style={styles.gridItemText}>Support</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.gridItem} 
            onPress={() => navigation.navigate('PaidSettings' as any)} 
            activeOpacity={0.8}
          >
            <Icon name="settings" size={30} color="#2563EB" style={{ marginBottom: 2 }} />
            <Text style={styles.gridItemText}>Settings</Text>
          </TouchableOpacity>
        </View>

        {/* Extra Features Based on Logic */}
        {userData?.isBusinessUser && (
          <View style={styles.businessBannerCard}>
            <View style={styles.businessCardTextWrap}>
              <Text style={styles.businessBannerTitle}>Business Dashboard</Text>
              <Text style={styles.businessBannerSub}>Manage catalog, companies, analytics & sales</Text>
            </View>
            <TouchableOpacity
              style={styles.businessOpenBtn}
              onPress={() => navigation.navigate('BusinessDashboard')}
              activeOpacity={0.85}
            >
              <Text style={styles.businessOpenBtnText}>Open</Text>
              <Icon name="chevron-right" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.cardSection}>
          <Text style={styles.cardSectionTitle}>Recent Activity</Text>
          {recentActivities.map((act, idx) => (
            <View key={idx} style={[styles.activityItemRow, idx === recentActivities.length - 1 && { borderBottomWidth: 0 }]}>
              <View style={[styles.activityIconBox, { backgroundColor: act.bg }]}>
                <Icon name={act.icon} size={18} color={act.color} />
              </View>
              <View style={styles.activityTextWrap}>
                <Text style={styles.activityTitle}>{act.title}</Text>
                <Text style={styles.activityTime}>{act.time}</Text>
              </View>
            </View>
          ))}
        </View>

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 90,
  },
  topHeader: {
    backgroundColor: '#352367',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingBottom: 24,
  },
  headerInner: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarWrap: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginRight: 12,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarInitial: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#7C3AED',
  },
  welcomeTextWrap: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  companyText: {
    fontSize: 13,
    color: '#E5E7EB',
    marginTop: 2,
  },
  searchWrap: {
    backgroundColor: '#EAEBFA',
    borderRadius: 24,
    paddingHorizontal: 16,
    height: 48,
    justifyContent: 'center',
  },
  searchInput: {
    fontSize: 14,
    color: '#1F2937',
  },
  cardWrapper: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  membershipCard: {
    borderRadius: 20,
    padding: 20,
    shadowColor: '#EC4899',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pillGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  lifetimePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  lifetimePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  activePill: {
    backgroundColor: '#16A34A',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cardMidSection: {
    marginTop: 20,
  },
  memberSinceLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    opacity: 0.9,
  },
  memberSinceDate: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 4,
  },
  cardBottomSection: {
    marginTop: 12,
  },
  memberIdText: {
    fontSize: 13,
    color: '#FFFFFF',
    opacity: 0.9,
    fontWeight: '500',
  },
  sectionContainer: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 18,
  },
  certBtnBlue: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#D0E5FF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  certBtnTextBlue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginLeft: 10,
  },
  certBtnGreen: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#CCF0D6',
    borderRadius: 16,
    padding: 16,
  },
  certBtnTextGreen: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginLeft: 10,
  },
  certIconWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 24,
  },
  gridItem: {
    width: '48%',
    backgroundColor: '#EEF2FF',
    borderRadius: 20,
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  gridItemText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  businessBannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 20,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  businessCardTextWrap: {
    flex: 1,
    marginRight: 10,
  },
  businessBannerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  businessBannerSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  businessOpenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366F1',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    gap: 4,
  },
  businessOpenBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cardSection: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  cardSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 14,
  },
  activityItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  activityIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityTextWrap: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  activityTime: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  bottomNavContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  navItem: {
    alignItems: 'center',
  },
  navLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#9CA3AF',
    marginTop: 4,
  },
  navLabelActive: {
    color: '#352367',
    fontWeight: '600',
  },
});

export default PaidDashboardScreen;
