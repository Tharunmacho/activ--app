import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { RootStackParamList } from '../../types';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../theme/theme';
import api, { getUserData } from '../../services/api';

type CompleteMembershipScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'CompleteMembership'
>;

interface MembershipPlan {
  key: string;
  id: string;
  name: string;
  title: string;
  subtitle: string;
  benefits: string[];
  price: string;
  rawPrice: number;
  experience: string;
  showBadge?: boolean;
  iconName: string;
  accentColor: string;
}

const CompleteMembershipScreen: React.FC = () => {
  const navigation = useNavigation<CompleteMembershipScreenNavigationProp>();
  
  const [isCompany, setIsCompany] = useState(true);
  const [selectedExperience, setSelectedExperience] = useState('5 – 10 years');
  const [selectedPlanKey, setSelectedPlanKey] = useState('Intermediate Plan');
  const [isLockedType, setIsLockedType] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [applicationId, setApplicationId] = useState<string | undefined>(undefined);

  useEffect(() => {
    fetchMemberTypeAndApplication();
  }, []);

  const fetchMemberTypeAndApplication = async () => {
    try {
      setIsLoading(true);
      const userData = await getUserData();
      const userId = userData?.id || userData?.memberId || userData?._id;

      let isAspirantUser = false;
      let expYears = '5 – 10 years';

      if (userId) {
        // 1. Check application data first
        try {
          const appRes = await api.get(`/applications/user/${userId}`);
          const appsList = Array.isArray(appRes.data.data)
            ? appRes.data.data
            : (appRes.data.applications || []);
          
          if (appsList.length > 0) {
            const app = appsList[0];
            setApplicationId(app._id || app.id || app.applicationId);
            const biz = app.businessInfo || app.personalDetails || {};
            
            if (
              biz.doingBusiness === false ||
              app.registrationType === 'aspirant' ||
              app.memberType === 'aspirant'
            ) {
              isAspirantUser = true;
            } else if (biz.doingBusiness === true || app.registrationType === 'business') {
              isAspirantUser = false;
              if (biz.businessCommencementYear) {
                const currentYear = new Date().getFullYear();
                const startYr = parseInt(biz.businessCommencementYear, 10);
                if (!isNaN(startYr)) {
                  const years = currentYear - startYr;
                  if (years < 5) expYears = '< 5 years';
                  else if (years <= 10) expYears = '5 – 10 years';
                  else expYears = '10+ years';
                }
              }
            }
          }
        } catch (appErr) {
          console.log('No application found or error:', appErr);
        }

        // 2. Check profile API if application is neutral
        try {
          const profileRes = await api.get('/members/my-profile');
          const profile = profileRes.data?.data;
          if (profile) {
            if (
              profile.doingBusiness === false ||
              profile.registrationType === 'aspirant' ||
              profile.memberType === 'aspirant'
            ) {
              isAspirantUser = true;
            } else if (profile.doingBusiness === true || profile.registrationType === 'business') {
              isAspirantUser = false;
            }
          }
        } catch (pErr) {
          console.log('Error fetching member profile:', pErr);
        }
      }

      if (isAspirantUser) {
        setIsCompany(false);
        setIsLockedType(true);
        setSelectedPlanKey('Aspirant Plan');
        setSelectedExperience('Student / Aspirant');
      } else {
        setIsCompany(true);
        setIsLockedType(true);
        setSelectedExperience(expYears);
        if (expYears === '< 5 years') setSelectedPlanKey('Basic Plan');
        else if (expYears === '10+ years') setSelectedPlanKey('Ideal Plan');
        else setSelectedPlanKey('Intermediate Plan');
      }
    } catch (error) {
      console.error('Error determining member type:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const companyPlans: MembershipPlan[] = [
    {
      key: 'Basic Plan',
      id: 'basic',
      name: 'Starter',
      title: 'Basic Plan',
      subtitle: 'For companies less than 5 years',
      experience: '< 5 years',
      benefits: [
        'Compliance and documentation guidance',
        'Access to networking forums',
        'Standard email support',
      ],
      price: '₹5,000',
      rawPrice: 5000,
      iconName: 'auto-awesome',
      accentColor: '#0EA5E9',
    },
    {
      key: 'Intermediate Plan',
      id: 'intermediate',
      name: 'Professional',
      title: 'Intermediate Plan',
      subtitle: 'For companies 5 – 10 years',
      experience: '5 – 10 years',
      benefits: [
        'All Basic benefits',
        'Priority event invitations',
        'Growth and scaling advisory sessions',
      ],
      price: '₹10,000',
      rawPrice: 10000,
      showBadge: true,
      iconName: 'workspace-premium',
      accentColor: '#8B5CF6',
    },
    {
      key: 'Ideal Plan',
      id: 'ideal',
      name: 'Enterprise',
      title: 'Ideal Plan',
      subtitle: 'For companies 10+ years',
      experience: '10+ years',
      benefits: [
        'All Intermediate benefits',
        'Premium advisory and consulting',
        'Featured listing and special recognition',
      ],
      price: '₹20,000',
      rawPrice: 20000,
      iconName: 'emoji-events',
      accentColor: '#F59E0B',
    },
  ];

  const aspirantPlan: MembershipPlan = {
    key: 'Aspirant Plan',
    id: 'aspirant',
    name: 'Aspirant',
    title: 'Aspirant Plan',
    subtitle: 'For students without company experience',
    experience: 'Student / Aspirant',
    benefits: [
      'Access to learning resources and webinars',
      'Student-only events and competitions',
      'Mentorship and career guidance',
      'Networking with professionals',
    ],
    price: '₹2,000',
    rawPrice: 2000,
    iconName: 'school',
    accentColor: '#10B981',
  };

  const getActivePlan = (): MembershipPlan => {
    if (!isCompany) return aspirantPlan;
    return companyPlans.find(p => p.key === selectedPlanKey) || companyPlans[1];
  };

  const activePlan = getActivePlan();

  const handlePayment = async () => {
    setIsProcessing(true);
    try {
      navigation.navigate('PaymentGateway', {
        planType: activePlan.title,
        planAmount: activePlan.rawPrice,
        totalAmount: activePlan.rawPrice,
        applicationId,
      });
    } catch (error) {
      console.error('Payment navigation error:', error);
      Alert.alert('Error', 'Unable to open checkout. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const renderPlanCard = (plan: MembershipPlan) => {
    const isSelected = isCompany ? selectedPlanKey === plan.key : true;

    return (
      <TouchableOpacity
        key={plan.key}
        activeOpacity={0.9}
        onPress={() => {
          if (isCompany) {
            setSelectedPlanKey(plan.key);
            setSelectedExperience(plan.experience);
          }
        }}
        style={[
          styles.planCard,
          isSelected && {
            borderColor: plan.accentColor,
            borderWidth: 2,
            backgroundColor: '#FFFFFF',
            ...SHADOWS.md,
          },
        ]}
      >
        {plan.showBadge && (
          <View style={[styles.popularBadge, { backgroundColor: plan.accentColor }]}>
            <Text style={styles.popularBadgeText}>POPULAR</Text>
          </View>
        )}
        
        <View style={styles.planHeader}>
          <View style={[styles.planIconCircle, { backgroundColor: `${plan.accentColor}15` }]}>
            <Icon name={plan.iconName} size={24} color={plan.accentColor} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.planTitle}>{plan.title}</Text>
            </View>
            <Text style={styles.planSubtitle}>{plan.subtitle}</Text>
          </View>
        </View>

        <View style={styles.priceBox}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <Text style={[styles.priceAmount, { color: plan.accentColor }]}>{plan.price}</Text>
            <Text style={styles.pricePeriod}> / year</Text>
          </View>
          <Text style={styles.experienceTag}>{plan.experience}</Text>
        </View>

        <View style={styles.benefitsList}>
          {plan.benefits.map((benefit, index) => (
            <View key={index} style={styles.benefitItem}>
              <View style={[styles.checkCircle, { backgroundColor: `${plan.accentColor}20` }]}>
                <Icon name="check" size={14} color={plan.accentColor} />
              </View>
              <Text style={styles.benefitText}>{benefit}</Text>
            </View>
          ))}
        </View>

        <View
          style={[
            styles.selectBtn,
            isSelected
              ? { backgroundColor: plan.accentColor }
              : { backgroundColor: '#F1F5F9' },
          ]}
        >
          <Icon
            name={isSelected ? 'check-circle' : 'radio-button-unchecked'}
            size={18}
            color={isSelected ? '#FFFFFF' : '#64748B'}
          />
          <Text
            style={[
              styles.selectBtnText,
              { color: isSelected ? '#FFFFFF' : '#475569' },
            ]}
          >
            {isSelected ? 'Selected Plan' : 'Select Plan'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const afterPaymentBenefits = [
    { icon: 'bolt', text: 'Instant activation', color: '#F59E0B' },
    { icon: 'description', text: 'Digital certificate', color: '#8B5CF6' },
    { icon: 'email', text: 'Email & WhatsApp confirmation', color: '#0EA5E9' },
    { icon: 'dashboard', text: 'Full Member Dashboard access', color: '#10B981' },
  ];

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ marginTop: 12, color: COLORS.textSecondary }}>Loading membership plan...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Clean Single Top Navbar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.headerTitle}>Complete Membership</Text>
          <Text style={styles.headerSubtitle}>
            {isCompany ? 'Company Membership Plan' : 'Aspirant Student Membership Plan'}
          </Text>
        </View>
        <View style={styles.lockBadge}>
          <Icon name="lock" size={14} color="#10B981" />
          <Text style={styles.lockBadgeText}>Secure Checkout</Text>
        </View>
      </View>

      {/* Main Content */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Title Header */}
        <View style={styles.heroSection}>
          <View style={styles.badgePill}>
            <Icon name="star" size={14} color="#8B5CF6" />
            <Text style={styles.badgePillText}>MEMBERSHIP PLAN</Text>
          </View>
          <Text style={styles.mainTitle}>
            {isCompany ? 'Select Business Plan' : 'Aspirant Membership Plan'}
          </Text>
          <Text style={styles.mainSubtitle}>
            {isCompany
              ? 'Choose a plan that fits your business experience'
              : 'Empowering students and future entrepreneurs'}
          </Text>
        </View>

        {/* Member Category Toggle (HIDDEN when member type is locked/determined) */}
        {!isLockedType && (
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              onPress={() => {
                setIsCompany(false);
                setSelectedPlanKey('Aspirant Plan');
                setSelectedExperience('Student / Aspirant');
              }}
              style={[
                styles.toggleButton,
                !isCompany && styles.toggleButtonActive,
              ]}
            >
              <Icon
                name="school"
                size={18}
                color={!isCompany ? '#FFFFFF' : '#475569'}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.toggleButtonText, !isCompany && styles.toggleButtonTextActive]}>
                Aspirant (Student)
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={() => {
                setIsCompany(true);
                setSelectedPlanKey('Intermediate Plan');
                setSelectedExperience('5 – 10 years');
              }}
              style={[
                styles.toggleButton,
                isCompany && styles.toggleButtonActive,
              ]}
            >
              <Icon
                name="business"
                size={18}
                color={isCompany ? '#FFFFFF' : '#475569'}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.toggleButtonText, isCompany && styles.toggleButtonTextActive]}>
                Company
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Plan Cards */}
        <Text style={styles.sectionTitle}>
          {isCompany ? 'Available Business Plans' : 'Your Membership Plan'}
        </Text>
        {isCompany ? (
          <View>{companyPlans.map(plan => renderPlanCard(plan))}</View>
        ) : (
          renderPlanCard(aspirantPlan)
        )}

        {/* Secure Payment Card */}
        <View style={styles.secureCard}>
          <View style={styles.secureHeader}>
            <View style={styles.secureIconCircle}>
              <Icon name="lock" size={20} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.secureTitle}>Secure Payment</Text>
              <Text style={styles.secureSubtext}>
                Powered by Instamojo with 256-bit SSL encryption & PCI compliance.
              </Text>
            </View>
          </View>
          <View style={styles.pillRow}>
            <View style={styles.pillTag}>
              <Text style={styles.pillTagText}>SSL Encrypted</Text>
            </View>
            <View style={styles.pillTag}>
              <Text style={styles.pillTagText}>PCI-DSS Compliant</Text>
            </View>
          </View>
        </View>

        {/* What's Next After Payment Benefits */}
        <View style={styles.nextCard}>
          <Text style={styles.nextTitle}>What's Next After Payment?</Text>
          <View style={styles.nextGrid}>
            {afterPaymentBenefits.map((item, idx) => (
              <View key={idx} style={styles.nextItem}>
                <View style={[styles.nextIconBox, { backgroundColor: `${item.color}15` }]}>
                  <Icon name={item.icon} size={18} color={item.color} />
                </View>
                <Text style={styles.nextText}>{item.text}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Payment Summary Box */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Icon name="credit-card" size={20} color="#FFFFFF" />
            <Text style={styles.summaryTitle}>Payment Summary</Text>
          </View>
          <View style={styles.summaryContent}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Member Type</Text>
              <Text style={styles.summaryValue}>
                {isCompany ? 'Company' : 'Aspirant (Student)'}
              </Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Experience</Text>
              <Text style={styles.summaryValue}>{activePlan.experience}</Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Selected Plan</Text>
              <View style={[styles.planBadge, { backgroundColor: `${activePlan.accentColor}15` }]}>
                <Text style={[styles.planBadgeText, { color: activePlan.accentColor }]}>
                  {activePlan.title}
                </Text>
              </View>
            </View>
            
            <View style={styles.summaryDivider} />

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>{activePlan.price}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tax</Text>
              <Text style={[styles.summaryValue, { color: '#10B981' }]}>₹0 (Included)</Text>
            </View>
            
            <View style={styles.summaryDivider} />

            <View style={styles.summaryRow}>
              <Text style={styles.summaryTotalLabel}>Total Amount</Text>
              <Text style={[styles.summaryTotalValue, { color: activePlan.accentColor }]}>
                {activePlan.price}
              </Text>
            </View>
          </View>
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={[
            styles.payButton,
            { backgroundColor: isProcessing ? '#94A3B8' : activePlan.accentColor },
          ]}
          onPress={handlePayment}
          disabled={isProcessing}
          activeOpacity={0.8}
        >
          {isProcessing ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Icon name="lock" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.payButtonText}>Proceed to Payment ({activePlan.price})</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Micro Trust Indicators */}
        <View style={styles.trustRow}>
          <View style={styles.trustItem}>
            <Icon name="verified-user" size={14} color="#64748B" />
            <Text style={styles.trustText}>100% Safe & Secure</Text>
          </View>
          <View style={styles.trustItem}>
            <Icon name="shield" size={14} color="#64748B" />
            <Text style={styles.trustText}>Encrypted Payment</Text>
          </View>
        </View>

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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748B',
  },
  lockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  lockBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 18,
  },
  heroSection: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    marginBottom: 8,
  },
  badgePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7C3AED',
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 4,
  },
  mainSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 24,
    padding: 4,
    marginBottom: 20,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 20,
  },
  toggleButtonActive: {
    backgroundColor: '#2563EB',
    ...SHADOWS.sm,
  },
  toggleButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  toggleButtonTextActive: {
    color: '#FFFFFF',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  planCard: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    position: 'relative',
    ...SHADOWS.sm,
  },
  popularBadge: {
    position: 'absolute',
    top: 0,
    right: 16,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  popularBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  planIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  planTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  planSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  priceBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 12,
  },
  priceAmount: {
    fontSize: 24,
    fontWeight: '800',
  },
  pricePeriod: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  experienceTag: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  benefitsList: {
    gap: 8,
    marginBottom: 14,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  benefitText: {
    fontSize: 12,
    color: '#334155',
    flex: 1,
  },
  selectBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  selectBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  secureCard: {
    backgroundColor: '#0F766E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    ...SHADOWS.sm,
  },
  secureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  secureIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  secureTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secureSubtext: {
    fontSize: 11,
    color: '#CCFBF1',
    lineHeight: 16,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  pillTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  pillTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  nextCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    ...SHADOWS.sm,
  },
  nextTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  nextGrid: {
    gap: 10,
  },
  nextItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 12,
    gap: 10,
  },
  nextIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    flex: 1,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    ...SHADOWS.md,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  summaryContent: {
    padding: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  planBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  planBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 8,
  },
  summaryTotalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  summaryTotalValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  payButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 12,
    ...SHADOWS.md,
  },
  payButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  trustRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trustText: {
    fontSize: 11,
    color: '#64748B',
  },
});

export default CompleteMembershipScreen;
