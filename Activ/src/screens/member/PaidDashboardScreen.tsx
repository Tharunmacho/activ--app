import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../theme/theme';
import api, { getUserData } from '../../services/api';
import { useAuthStore } from '../../stores/exampleStore';

type PaidDashboardProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'PaidDashboard'>;
};

const PaidDashboardScreen: React.FC<PaidDashboardProps> = ({ navigation }) => {
  const { logout } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    loadUserData();
  }, []);

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

      let memberName = storedUser?.fullName || 'Member';
      let memberEmail = storedUser?.email || 'member@activ.org';
      let planType = 'Aspirant Plan';
      let profilePhoto = storedUser?.profilePhoto || '';

      if (userId) {
        try {
          const appRes = await api.get(`/applications/user/${userId}`);
          const appsList = Array.isArray(appRes.data.data)
            ? appRes.data.data
            : (appRes.data.applications || []);
          if (appsList.length > 0) {
            const app = appsList[0];
            memberName = app.fullName || app.memberName || memberName;
            memberEmail = app.email || app.memberEmail || memberEmail;

            if (app.paymentDetails?.planType) {
              planType = app.paymentDetails.planType;
            } else if (app.memberType === 'business' || app.registrationType === 'business') {
              planType = 'Business Membership';
            } else {
              planType = 'Aspirant Plan';
            }
          }
        } catch (appErr) {
          console.log('Error loading application data:', appErr);
        }

        try {
          const profileRes = await api.get('/members/my-profile');
          if (profileRes.data?.success && profileRes.data?.data) {
            const prof = profileRes.data.data;
            memberName = prof.fullName || memberName;
            memberEmail = prof.email || memberEmail;
            if (prof.profilePhoto) profilePhoto = prof.profilePhoto;
          }
        } catch (profErr) {
          console.log('Error loading profile:', profErr);
        }
      }

      setUserData({
        name: memberName,
        email: memberEmail,
        planType,
        status: 'Active',
        membershipId: `ACTIV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 899999 + 100000))}`,
        profilePhoto,
      });
    } catch (error) {
      console.error('Error loading paid dashboard user data:', error);
      setUserData({
        name: 'Member',
        email: 'member@activ.org',
        planType: 'Aspirant Plan',
        status: 'Active',
        membershipId: 'ACTIV-2024-000000',
        profilePhoto: '',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadCertificate = () => {
    Alert.alert(
      'Membership Certificate',
      `Official ACTIV Membership Certificate for ${userData?.name} (${userData?.membershipId}) is ready!`,
      [{ text: 'Download PDF', onPress: () => console.log('Downloading Certificate...') }, { text: 'Close', style: 'cancel' }]
    );
  };

  const handleDownloadTaxExemption = () => {
    const textContent = `
TAX EXEMPTION CERTIFICATE
================================
Member ID: ${userData?.membershipId}
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

  const stage2Features = [
    { title: 'B2C & B2B Catalog', desc: 'Product listings, categories, pricing', icon: 'storefront', route: 'ProductsServices' },
    { title: 'Shopping Cart & Checkout', desc: 'Manage orders & basic payments', icon: 'shopping-cart', route: 'Discover' },
    { title: 'B2B Inquiry Form', desc: 'Inquiries & lead inbox', icon: 'mail-outline', route: 'Settings' },
    { title: 'Business Showcase', desc: 'Store details & location', icon: 'business', route: 'ViewCompany' },
    { title: 'Seller Dashboard', desc: 'Orders & reviews management', icon: 'dashboard', route: 'BusinessDashboard' },
  ];

  const stage3Features = [
    { title: 'WhatsApp Catalog Sharing', desc: 'Link/QR generator for product catalog', icon: 'share' },
    { title: 'Inventory Tracking', desc: 'Real-time stock levels & low stock alerts', icon: 'inventory' },
  ];

  const recentActivities = [
    { title: 'Attended Virtual Networking Event', time: '2 days ago', icon: 'event', color: '#2563EB' },
    { title: 'Downloaded Tax Exemption Certificate', time: '5 days ago', icon: 'description', color: '#059669' },
    { title: 'Updated Profile Information', time: '1 week ago', icon: 'person', color: '#7C3AED' },
    { title: 'Joined Industry Workshop', time: '2 weeks ago', icon: 'star', color: '#D97706' },
  ];

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading Paid Member Dashboard...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top App Bar */}
      <View style={styles.appBar}>
        <Text style={styles.appBarTitle}>Member Dashboard</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => Alert.alert('Notifications', 'No new notifications.')}
          >
            <Icon name="notifications-none" size={24} color="#334155" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: '#FEF2F2' }]}
            onPress={handleLogout}
          >
            <Icon name="logout" size={22} color="#DC2626" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Welcome Gradient Banner */}
        <View style={styles.welcomeBanner}>
          <View style={styles.avatarRow}>
            <View style={styles.avatarBox}>
              {userData?.profilePhoto ? (
                <Image source={{ uri: userData.profilePhoto }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarLetter}>
                  {(userData?.name || 'M').charAt(0).toUpperCase()}
                </Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.welcomeGreeting}>Welcome back,</Text>
              <Text style={styles.userName}>{userData?.name || 'Member'}</Text>
              <Text style={styles.userEmail}>{userData?.email}</Text>
            </View>
          </View>

          <View style={styles.badgeRow}>
            <View style={styles.planPill}>
              <Text style={styles.planPillText}>{userData?.planType}</Text>
            </View>
            <View style={styles.activePill}>
              <Icon name="check" size={14} color="#FFFFFF" />
              <Text style={styles.activePillText}>Active</Text>
            </View>
          </View>
        </View>

        {/* Business Account Banner */}
        <View style={styles.businessBannerCard}>
          <View style={styles.businessCardHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.businessBannerTitle}>Business Dashboard</Text>
              <Text style={styles.businessBannerSub}>Manage catalog, companies, analytics & sales</Text>
            </View>
            <TouchableOpacity
              style={styles.businessBannerBtn}
              onPress={() => navigation.navigate('BusinessDashboard')}
              activeOpacity={0.85}
            >
              <Text style={styles.businessBannerBtnText}>Open</Text>
              <Icon name="chevron-right" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Actions Grid */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('EditProfile')}
          >
            <View style={[styles.actionIconBox, { backgroundColor: '#2563EB' }]}>
              <Icon name="person" size={22} color="#FFFFFF" />
            </View>
            <Text style={styles.actionTitle}>My Profile</Text>
            <Text style={styles.actionDesc}>View & edit profile</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => Alert.alert('Events', 'Workshops and area meets list.')}
          >
            <View style={[styles.actionIconBox, { backgroundColor: '#7C3AED' }]}>
              <Icon name="event" size={22} color="#FFFFFF" />
            </View>
            <Text style={styles.actionTitle}>Events</Text>
            <Text style={styles.actionDesc}>Workshops & meets</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => Alert.alert('Support', 'Contact helpdesk: support@activ.org')}
          >
            <View style={[styles.actionIconBox, { backgroundColor: '#059669' }]}>
              <Icon name="headset-mic" size={22} color="#FFFFFF" />
            </View>
            <Text style={styles.actionTitle}>Support</Text>
            <Text style={styles.actionDesc}>Get help & FAQs</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('Settings')}
          >
            <View style={[styles.actionIconBox, { backgroundColor: '#475569' }]}>
              <Icon name="settings" size={22} color="#FFFFFF" />
            </View>
            <Text style={styles.actionTitle}>Settings</Text>
            <Text style={styles.actionDesc}>Account preferences</Text>
          </TouchableOpacity>
        </View>

        {/* Upcoming Features (Stage 2) */}
        <View style={styles.cardSection}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardHeaderTitle}>Upcoming Features</Text>
            <Text style={styles.tagLabel}>Stage 2</Text>
          </View>

          {stage2Features.map((feature, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.featureItem}
              onPress={() => {
                if (feature.route === 'BusinessDashboard') {
                  navigation.navigate('BusinessDashboard');
                } else if (feature.route === 'Discover') {
                  navigation.navigate('Discover');
                } else if (feature.route === 'Settings') {
                  navigation.navigate('Settings');
                } else {
                  Alert.alert(feature.title, feature.desc);
                }
              }}
            >
              <View style={styles.featureIconBox}>
                <Icon name={feature.icon} size={20} color="#2563EB" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.featureItemTitle}>{feature.title}</Text>
                <Text style={styles.featureItemDesc}>{feature.desc}</Text>
              </View>
              <Icon name="chevron-right" size={20} color="#94A3B8" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Future Features (Stage 3) */}
        <View style={styles.cardSection}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardHeaderTitle}>Future Features</Text>
            <Text style={[styles.tagLabel, { backgroundColor: '#F3E8FF', color: '#7C3AED' }]}>Stage 3</Text>
          </View>

          {stage3Features.map((feature, idx) => (
            <TouchableOpacity
              key={idx}
              style={[styles.featureItem, { backgroundColor: '#FAF5FF', borderColor: '#E9D5FF' }]}
              onPress={() => Alert.alert(feature.title, feature.desc)}
            >
              <View style={[styles.featureIconBox, { backgroundColor: '#F3E8FF' }]}>
                <Icon name={feature.icon} size={20} color="#7C3AED" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.featureItemTitle}>{feature.title}</Text>
                <Text style={styles.featureItemDesc}>{feature.desc}</Text>
              </View>
              <Icon name="chevron-right" size={20} color="#94A3B8" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Official Documents */}
        <View style={styles.cardSection}>
          <Text style={[styles.cardHeaderTitle, { marginBottom: 12 }]}>Official Documents</Text>

          <TouchableOpacity style={styles.docRow} onPress={handleDownloadCertificate}>
            <View style={[styles.docIconBox, { backgroundColor: '#2563EB' }]}>
              <Icon name="military-tech" size={22} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.docTitle}>Membership Certificate</Text>
              <Text style={styles.docDesc}>Download official certificate</Text>
            </View>
            <Icon name="file-download" size={22} color="#2563EB" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.docRow} onPress={handleDownloadTaxExemption}>
            <View style={[styles.docIconBox, { backgroundColor: '#059669' }]}>
              <Icon name="description" size={22} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.docTitle}>Tax Exemption Certificate</Text>
              <Text style={styles.docDesc}>Download tax exemption file</Text>
            </View>
            <Icon name="file-download" size={22} color="#059669" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.docRow}
            onPress={() => Alert.alert('Payment History', `Member ID: ${userData?.membershipId}\nPlan: ${userData?.planType}\nStatus: Completed`)}
          >
            <View style={[styles.docIconBox, { backgroundColor: '#D97706' }]}>
              <Icon name="receipt" size={22} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.docTitle}>Payment History</Text>
              <Text style={styles.docDesc}>View transactions & receipts</Text>
            </View>
            <Icon name="chevron-right" size={22} color="#D97706" />
          </TouchableOpacity>
        </View>

        {/* Recent Activity */}
        <View style={styles.cardSection}>
          <Text style={[styles.cardHeaderTitle, { marginBottom: 12 }]}>Recent Activity</Text>

          {recentActivities.map((act, idx) => (
            <View key={idx} style={styles.actItem}>
              <View style={[styles.actIconBox, { backgroundColor: `${act.color}15` }]}>
                <Icon name={act.icon} size={18} color={act.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.actTitle}>{act.title}</Text>
                <Text style={styles.actTime}>{act.time}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutCard} onPress={handleLogout} activeOpacity={0.85}>
          <Icon name="logout" size={20} color="#DC2626" style={{ marginRight: 8 }} />
          <Text style={styles.logoutCardText}>Log Out</Text>
        </TouchableOpacity>

        <View style={{ height: SPACING.xl * 2 }} />
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
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
  },
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  appBarTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  iconBtn: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  content: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 16,
  },
  welcomeBanner: {
    backgroundColor: '#1E40AF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    ...SHADOWS.md,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  avatarBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarLetter: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  welcomeGreeting: {
    fontSize: 12,
    color: '#93C5FD',
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  userEmail: {
    fontSize: 12,
    color: '#BFDBFE',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  planPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  planPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  activePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  actionCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.sm,
  },
  actionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  actionDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  cardSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    ...SHADOWS.sm,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  tagLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  featureIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  featureItemDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  docIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  docTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  docDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  actItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 12,
  },
  actIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  actTime: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
  logoutCard: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1.5,
    borderRadius: 16,
    paddingVertical: 14,
    marginTop: 8,
    marginBottom: 8,
  },
  logoutCardText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#DC2626',
  },
  businessBannerCard: {
    backgroundColor: '#F3E8FF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: '#E9D5FF',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  businessCardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  businessBannerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  businessBannerSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  businessBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7C3AED',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    marginLeft: 10,
  },
  businessBannerBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default PaidDashboardScreen;
