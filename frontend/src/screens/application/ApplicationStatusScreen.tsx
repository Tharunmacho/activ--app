// Application Status Screen
//
// Presentation is a gradient status hero + an animated review timeline. The
// data layer below (fetch, stage derivation, 3-tier status rules) is unchanged;
// only how it is rendered was rebuilt.
//
// Motion uses the RN Animated API on the native driver, with every animation
// stopped on unmount so a backgrounded screen never keeps the UI thread busy.
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  BackHandler,
  Animated,
  Easing,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';
import api, { getUserData } from '../../services/api';

type ApplicationStatusProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ApplicationStatus'>;
};

// Shared with the login screen, the profile forms and the submitted screen.
const BG = '#F0F4F8';
const INK = '#0F172A';
const MUTED = '#64748B';
const PRIMARY = '#1E50E6';

const TONE = {
  approved: { color: '#16A34A', soft: '#DCFCE7', icon: 'check', label: 'Approved' },
  in_progress: { color: '#1E50E6', soft: '#E0E7FF', icon: 'hourglass-empty', label: 'In Review' },
  rejected: { color: '#DC2626', soft: '#FEE2E2', icon: 'close', label: 'Rejected' },
  pending: { color: '#94A3B8', soft: '#F1F5F9', icon: 'schedule', label: 'Waiting' },
} as const;

type ToneKey = keyof typeof TONE;

const toneFor = (status?: string): (typeof TONE)[ToneKey] =>
  TONE[(status || 'pending') as ToneKey] || TONE.pending;

// Short label under each node of the progress rail.
const SHORT_LABEL: Record<string, string> = {
  block_admin: 'Block',
  district_admin: 'District',
  state_admin: 'State',
  payment: 'Payment',
};

const formatDate = (value?: string): string => {
  if (!value) return '';
  try {
    const parsed = new Date(value);
    if (isNaN(parsed.getTime())) return '';
    return parsed.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch (err) {
    console.warn('Date format safely caught:', err);
    return '';
  }
};

// TypeScript Interfaces
interface AdminData {
  _id: string;
  fullName: string;
  email: string;
}

interface ApplicationData {
  _id: string;
  userId: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  state: string;
  district: string;
  block: string;
  city: string;
  status: string;
  assignedBlockAdmin?: AdminData;
  assignedDistrictAdmin?: AdminData;
  assignedStateAdmin?: AdminData;
  blockApprovedAt?: string;
  districtApprovedAt?: string;
  stateApprovedAt?: string;
  blockReviewMessage?: string;
  districtReviewMessage?: string;
  stateReviewMessage?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
  isBlockApproved: boolean;
  isDistrictApproved: boolean;
  isStateApproved: boolean;
  isRejected: boolean;
}

interface ApplicationStage {
  name: string;
  displayName: string;
  status: 'pending' | 'in_progress' | 'approved' | 'rejected';
  reviewer?: string;
  reviewDate?: string;
  message?: string;
  statusColor: string;
  icon: string;
  isCompleted: boolean;
  isActive: boolean;
}

const ApplicationStatusScreen: React.FC<ApplicationStatusProps> = ({ navigation }) => {
  const [applicationData, setApplicationData] = useState<ApplicationData | null>(null);
  const [stages, setStages] = useState<ApplicationStage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // One value per animated concern so nothing fights over the same driver.
  const heroFade = useRef(new Animated.Value(0)).current;
  const heroLift = useRef(new Animated.Value(20)).current;
  const barGrow = useRef(new Animated.Value(0)).current;
  const activePulse = useRef(new Animated.Value(0)).current;
  const cardValues = useRef<Animated.Value[]>([]).current;

  const handleGoBack = () => {
    try {
      navigation.navigate('MemberMain');
    } catch (err) {
      console.warn('Navigation safely caught:', err);
    }
  };

  useEffect(() => {
    fetchApplicationStatus();

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      handleGoBack();
      return true;
    });

    return () => subscription.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Intro runs once the stages exist, so the bar animates to a real figure
  // rather than snapping from an empty state.
  useEffect(() => {
    if ((stages || []).length === 0) return;

    // Reuse existing values where possible so a refresh doesn't replay from 0.
    while (cardValues.length < stages.length) {
      cardValues.push(new Animated.Value(0));
    }

    const intro = Animated.parallel([
      Animated.timing(heroFade, {
        toValue: 1,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(heroLift, {
        toValue: 0,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(barGrow, {
        toValue: 1,
        duration: 900,
        easing: Easing.out(Easing.cubic),
        // Width can't run on the native driver.
        useNativeDriver: false,
      }),
      Animated.stagger(
        90,
        cardValues.slice(0, stages.length).map((value) =>
          Animated.timing(value, {
            toValue: 1,
            duration: 300,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          })
        )
      ),
    ]);

    // Slow breathing halo behind whichever stage is currently under review.
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(activePulse, {
          toValue: 1,
          duration: 1100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(activePulse, {
          toValue: 0,
          duration: 1100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    intro.start();
    pulse.start();

    return () => {
      intro.stop();
      pulse.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stages.length]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchApplicationStatus();
    setIsRefreshing(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchApplicationStatus = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);

      // Get user data from local storage
      const userData = await getUserData();
      if (!userData) {
        setErrorMessage('User data not found. Please login again.');
        setIsLoading(false);
        return;
      }

      // Extract user ID (handle different property names)
      const userId = userData.id || userData.memberId || userData._id;
      if (!userId) {
        setErrorMessage('User ID not found. Please login again.');
        setIsLoading(false);
        return;
      }

      // API Request to Backend
      const response = await api.get(`/applications/user/${userId}`);
      const appsList = Array.isArray(response.data.data)
        ? response.data.data
        : (response.data.applications || []);

      if (response.data.success && appsList.length > 0) {
        // Select the most advanced application status
        const app =
          appsList.find((a: any) => a.status === 'Approved') ||
          appsList.find((a: any) => a.status === 'Pending-State') ||
          appsList.find((a: any) => a.status === 'Pending-District') ||
          appsList[0];

        // Transform data - Add helper flags deriving from status & timestamps
        const isBlockApproved =
          app.status === 'Approved' ||
          app.status === 'Pending-State' ||
          app.status === 'Pending-District' ||
          !!app.blockApprovedAt;

        const isDistrictApproved =
          app.status === 'Approved' ||
          app.status === 'Pending-State' ||
          !!app.districtApprovedAt;

        const isStateApproved =
          app.status === 'Approved' ||
          !!app.stateApprovedAt;

        const transformedApp: ApplicationData = {
          ...app,
          _id: app._id,
          isBlockApproved,
          isDistrictApproved,
          isStateApproved,
          isRejected: app.status === 'Rejected',
        };

        setApplicationData(transformedApp);

        // Build stages array
        const builtStages = buildStagesFromData(transformedApp);
        setStages(builtStages);
      } else {
        setErrorMessage('No application found. Please submit your profile first.');
      }
    } catch (error: any) {
      console.error('Error fetching application status:', error);
      setErrorMessage(
        error.response?.data?.message || 'Failed to load application status. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const buildStagesFromData = (app: ApplicationData): ApplicationStage[] => {
    const stages: ApplicationStage[] = [];

    // Stage 1: Block Admin Review
    stages.push({
      name: 'block_admin',
      displayName: 'Block Admin Review',
      status: getStageStatus('block', app),
      reviewer: app.assignedBlockAdmin?.fullName || 'Not assigned yet',
      reviewDate: app.blockApprovedAt,
      message: app.blockReviewMessage || getStageMessage('block', app),
      statusColor: getStageColor(getStageStatus('block', app)),
      icon: getStageIcon(getStageStatus('block', app)),
      isCompleted: app.isBlockApproved,
      isActive: app.status === 'Pending-Block',
    });

    // Stage 2: District Admin Review
    stages.push({
      name: 'district_admin',
      displayName: 'District Admin Review',
      status: getStageStatus('district', app),
      reviewer: app.assignedDistrictAdmin?.fullName || 'Not assigned yet',
      reviewDate: app.districtApprovedAt,
      message: app.districtReviewMessage || getStageMessage('district', app),
      statusColor: getStageColor(getStageStatus('district', app)),
      icon: getStageIcon(getStageStatus('district', app)),
      isCompleted: app.isDistrictApproved,
      isActive: app.status === 'Pending-District',
    });

    // Stage 3: State Admin Review
    stages.push({
      name: 'state_admin',
      displayName: 'State Admin Review',
      status: getStageStatus('state', app),
      reviewer: app.assignedStateAdmin?.fullName || 'Not assigned yet',
      reviewDate: app.stateApprovedAt,
      message: app.stateReviewMessage || getStageMessage('state', app),
      statusColor: getStageColor(getStageStatus('state', app)),
      icon: getStageIcon(getStageStatus('state', app)),
      isCompleted: app.isStateApproved,
      isActive: app.status === 'Pending-State',
    });

    // Stage 4: Payment Ready
    stages.push({
      name: 'payment',
      displayName: 'Ready for Payment',
      status: app.status === 'Approved' ? 'approved' : 'pending',
      reviewer: 'ACTIV System',
      reviewDate: app.stateApprovedAt,
      message: app.status === 'Approved' 
        ? 'Your application is approved! Please proceed with membership payment.' 
        : '',
      statusColor: app.status === 'Approved' ? '#4CAF50' : '#90CAF9',
      icon: app.status === 'Approved' ? '💳' : '○',
      isCompleted: app.status === 'Approved',
      isActive: app.status === 'Approved',
    });

    return stages;
  };

  const getStageStatus = (
    stage: 'block' | 'district' | 'state',
    app: ApplicationData
  ): 'pending' | 'in_progress' | 'approved' | 'rejected' => {
    if (app.isRejected) {
      // Check which stage rejected it
      if (stage === 'block' && !app.isBlockApproved) return 'rejected';
      if (stage === 'district' && app.isBlockApproved && !app.isDistrictApproved) return 'rejected';
      if (stage === 'state' && app.isDistrictApproved && !app.isStateApproved) return 'rejected';
    }

    if (stage === 'block') {
      if (app.isBlockApproved) return 'approved';
      if (app.status === 'Pending-Block') return 'in_progress';
      return 'pending';
    }

    if (stage === 'district') {
      if (app.isDistrictApproved) return 'approved';
      if (app.status === 'Pending-District' && app.isBlockApproved) return 'in_progress';
      return 'pending';
    }

    if (stage === 'state') {
      if (app.isStateApproved) return 'approved';
      if (app.status === 'Pending-State' && app.isDistrictApproved) return 'in_progress';
      return 'pending';
    }

    return 'pending';
  };

  const getStageColor = (status: string): string => {
    switch (status) {
      case 'approved':
        return '#4CAF50'; // Green
      case 'in_progress':
        return '#2196F3'; // Blue
      case 'rejected':
        return '#F44336'; // Red
      case 'pending':
      default:
        return '#90CAF9'; // Light blue
    }
  };

  const getStageIcon = (status: string): string => {
    switch (status) {
      case 'approved':
        return '✓';
      case 'in_progress':
        return '⏳';
      case 'rejected':
        return '✗';
      case 'pending':
      default:
        return '○';
    }
  };

  const getStageMessage = (
    stage: 'block' | 'district' | 'state',
    app: ApplicationData
  ): string => {
    const status = getStageStatus(stage, app);

    if (status === 'approved') {
      return 'Application approved at this stage.';
    }

    if (status === 'in_progress') {
      return 'Your application is currently being reviewed. Please check back later.';
    }

    if (status === 'rejected') {
      return app.rejectionReason || 'Application was rejected at this stage.';
    }

    return ''; // Pending - no message
  };

  const handlePaymentNavigation = () => {
    if (applicationData?.status === 'Approved') {
      navigation.navigate('CompleteMembership');
    }
  };

  const calculateProgress = (): number => {
    const list = stages || [];
    if (list.length === 0) return 0;
    const completedStages = list.filter((stage) => stage?.isCompleted).length;
    return (completedStages / list.length) * 100;
  };

  const completedCount = (stages || []).filter((s) => s?.isCompleted).length;
  const totalCount = (stages || []).length;
  const progress = calculateProgress();

  const isRejected = applicationData?.isRejected === true;
  const isApproved = applicationData?.status === 'Approved';

  // Hero gradient reflects the overall outcome at a glance.
  const heroColors: string[] = isRejected
    ? ['#EF4444', '#B91C1C']
    : isApproved
    ? ['#22C55E', '#15803D']
    : ['#3B6FF5', '#1E3FA8'];

  const heroHeadline = isRejected
    ? 'Application Rejected'
    : isApproved
    ? 'Application Approved'
    : 'Under Review';

  const heroCaption = isRejected
    ? 'See the reviewer note below for details.'
    : isApproved
    ? 'You can now complete your membership payment.'
    : `${completedCount} of ${totalCount} stages completed`;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <StatusBar barStyle="dark-content" backgroundColor={BG} />
        <View style={styles.centeredBox}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={styles.centeredCaption}>Loading application status…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (errorMessage || !applicationData) {
    const isMissing = !errorMessage;

    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <StatusBar barStyle="dark-content" backgroundColor={BG} />

        <View style={styles.navHeader}>
          <TouchableOpacity
            onPress={handleGoBack}
            style={styles.backButton}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name="arrow-back" size={24} color={INK} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Application Status</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.centeredBox}>
          <View style={styles.emptyIconRing}>
            <Icon
              name={isMissing ? 'description' : 'error-outline'}
              size={38}
              color={isMissing ? MUTED : '#DC2626'}
            />
          </View>
          <Text style={styles.emptyTitle}>
            {isMissing ? 'No Application Found' : 'Something Went Wrong'}
          </Text>
          <Text style={styles.emptyCaption}>
            {errorMessage ||
              "You haven't submitted an application yet. Complete your profile to get started."}
          </Text>

          {!isMissing ? (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={fetchApplicationStatus}
              activeOpacity={0.85}
            >
              <Icon name="refresh" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.primaryButtonText}>Try Again</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity style={styles.ghostButton} onPress={handleGoBack} activeOpacity={0.85}>
            <Text style={styles.ghostButtonText}>Back to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      <View style={styles.navHeader}>
        <TouchableOpacity
          onPress={handleGoBack}
          style={styles.backButton}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Icon name="arrow-back" size={24} color={INK} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Application Status</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[PRIMARY]} />
        }
      >
        {/* Gradient status hero */}
        <Animated.View style={{ opacity: heroFade, transform: [{ translateY: heroLift }] }}>
          <LinearGradient
            colors={heroColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <View style={styles.heroTopRow}>
              <View style={styles.heroBadge}>
                <Icon
                  name={isRejected ? 'cancel' : isApproved ? 'verified' : 'hourglass-empty'}
                  size={14}
                  color="#FFFFFF"
                />
                <Text style={styles.heroBadgeText}>{applicationData.status || 'Pending'}</Text>
              </View>

              <Text style={styles.heroPercent}>{Math.round(progress)}%</Text>
            </View>

            <Text style={styles.heroHeadline}>{heroHeadline}</Text>
            <Text style={styles.heroCaption}>{heroCaption}</Text>

            {/* Progress track */}
            <View style={styles.heroTrack}>
              <Animated.View
                style={[
                  styles.heroTrackFill,
                  {
                    width: barGrow.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', `${Math.max(0, Math.min(100, progress))}%`],
                    }),
                  },
                ]}
              />
            </View>

            {/* Node rail */}
            <View style={styles.heroNodeRow}>
              {(stages || []).map((stage) => (
                <View key={`node-${stage?.name}`} style={styles.heroNode}>
                  <View
                    style={[
                      styles.heroNodeDot,
                      stage?.isCompleted && styles.heroNodeDotDone,
                      stage?.isActive && !stage?.isCompleted && styles.heroNodeDotActive,
                    ]}
                  >
                    {stage?.isCompleted ? <Icon name="check" size={11} color="#FFFFFF" /> : null}
                  </View>
                  <Text style={styles.heroNodeLabel}>
                    {SHORT_LABEL[stage?.name || ''] || 'Stage'}
                  </Text>
                </View>
              ))}
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Reference strip */}
        <Animated.View
          style={[styles.metaRow, { opacity: heroFade, transform: [{ translateY: heroLift }] }]}
        >
          <View style={styles.metaCell}>
            <Text style={styles.metaLabel}>Application ID</Text>
            <Text style={styles.metaValue}>
              #{((applicationData._id || '').slice(-8) || '—').toUpperCase()}
            </Text>
          </View>
          <View style={styles.metaDivider} />
          <View style={styles.metaCell}>
            <Text style={styles.metaLabel}>Submitted</Text>
            <Text style={styles.metaValue}>{formatDate(applicationData.createdAt) || '—'}</Text>
          </View>
        </Animated.View>

        {/* Reviewer note on a rejection */}
        {isRejected && applicationData.rejectionReason ? (
          <View style={styles.rejectionCard}>
            <View style={styles.rejectionIconBox}>
              <Icon name="report-problem" size={18} color="#DC2626" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rejectionTitle}>Reviewer Note</Text>
              <Text style={styles.rejectionText}>{applicationData.rejectionReason}</Text>
            </View>
          </View>
        ) : null}

        <Text style={styles.sectionLabel}>Review Timeline</Text>

        {/* Timeline */}
        {(stages || []).map((stage, index) => {
          const tone = toneFor(stage?.status);
          const isLast = index === (stages || []).length - 1;
          const value = cardValues[index];
          const isActive = stage?.isActive === true && !stage?.isCompleted;
          const reviewDate = formatDate(stage?.reviewDate);

          const animatedStyle = value
            ? {
                opacity: value,
                transform: [
                  {
                    translateX: value.interpolate({
                      inputRange: [0, 1],
                      outputRange: [18, 0],
                    }),
                  },
                ],
              }
            : undefined;

          return (
            <Animated.View
              key={String(stage?.name || index)}
              style={[styles.timelineRow, animatedStyle]}
            >
              {/* Rail */}
              <View style={styles.timelineRail}>
                {isActive ? (
                  <Animated.View
                    style={[
                      styles.timelineHalo,
                      {
                        backgroundColor: tone.color,
                        opacity: activePulse.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.08, 0.28],
                        }),
                        transform: [
                          {
                            scale: activePulse.interpolate({
                              inputRange: [0, 1],
                              outputRange: [1, 1.45],
                            }),
                          },
                        ],
                      },
                    ]}
                  />
                ) : null}

                <View style={[styles.timelineDot, { backgroundColor: tone.color }]}>
                  <Icon name={tone.icon} size={14} color="#FFFFFF" />
                </View>

                {!isLast ? (
                  <View
                    style={[
                      styles.timelineConnector,
                      stage?.isCompleted && { backgroundColor: TONE.approved.color },
                    ]}
                  />
                ) : null}
              </View>

              {/* Card */}
              <View style={[styles.timelineCard, isActive && styles.timelineCardActive]}>
                <View style={styles.timelineCardHead}>
                  <Text style={styles.timelineTitle} numberOfLines={1}>
                    {stage?.displayName || 'Stage'}
                  </Text>
                  <View style={[styles.tonePill, { backgroundColor: tone.soft }]}>
                    <Text style={[styles.tonePillText, { color: tone.color }]}>{tone.label}</Text>
                  </View>
                </View>

                {stage?.reviewer ? (
                  <View style={styles.timelineMetaRow}>
                    <Icon name="person-outline" size={13} color={MUTED} />
                    <Text style={styles.timelineMetaText} numberOfLines={1}>
                      {stage.reviewer}
                    </Text>
                  </View>
                ) : null}

                {reviewDate ? (
                  <View style={styles.timelineMetaRow}>
                    <Icon name="event" size={13} color={MUTED} />
                    <Text style={styles.timelineMetaText}>{reviewDate}</Text>
                  </View>
                ) : null}

                {stage?.message ? (
                  <Text style={styles.timelineMessage}>{stage.message}</Text>
                ) : null}
              </View>
            </Animated.View>
          );
        })}

        {isApproved ? (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handlePaymentNavigation}
            activeOpacity={0.85}
          >
            <Icon name="payment" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.primaryButtonText}>Proceed to Payment</Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity style={styles.ghostButton} onPress={handleGoBack} activeOpacity={0.85}>
          <Text style={styles.ghostButtonText}>Back to Dashboard</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BG,
  },

  navHeader: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: BG,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: INK,
  },

  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 32,
  },

  // Loading / empty / error
  centeredBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  centeredCaption: {
    fontSize: 13,
    color: MUTED,
    marginTop: 14,
  },
  emptyIconRing: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E8EEF6',
  },
  emptyTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: INK,
    textAlign: 'center',
  },
  emptyCaption: {
    fontSize: 13,
    color: MUTED,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 26,
    lineHeight: 19,
  },

  // Gradient hero
  hero: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 14,
    shadowColor: '#1E3FA8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 8,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 11,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  heroBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  heroPercent: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.6,
  },
  heroHeadline: {
    fontSize: 23,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 14,
    letterSpacing: -0.4,
  },
  heroCaption: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.86)',
    marginTop: 4,
  },
  heroTrack: {
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.24)',
    marginTop: 18,
    overflow: 'hidden',
  },
  heroTrackFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  heroNodeRow: {
    flexDirection: 'row',
    marginTop: 14,
  },
  heroNode: {
    flex: 1,
    alignItems: 'center',
  },
  heroNodeDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.45)',
  },
  heroNodeDotDone: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderColor: '#FFFFFF',
  },
  heroNodeDotActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    borderColor: '#FFFFFF',
  },
  heroNodeLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 6,
  },

  // Reference strip
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 14,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: '#E8EEF6',
  },
  metaCell: {
    flex: 1,
    alignItems: 'center',
  },
  metaDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#E8EEF6',
  },
  metaLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: MUTED,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '700',
    color: INK,
    marginTop: 3,
  },

  // Rejection note
  rejectionCard: {
    flexDirection: 'row',
    backgroundColor: '#FEF2F2',
    borderRadius: 18,
    padding: 14,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  rejectionIconBox: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rejectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#B91C1C',
  },
  rejectionText: {
    fontSize: 12.5,
    color: '#7F1D1D',
    marginTop: 3,
    lineHeight: 18,
  },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: MUTED,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    marginBottom: 14,
  },

  // Timeline
  timelineRow: {
    flexDirection: 'row',
  },
  timelineRail: {
    width: 30,
    alignItems: 'center',
  },
  timelineHalo: {
    position: 'absolute',
    top: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  timelineDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineConnector: {
    flex: 1,
    width: 2,
    backgroundColor: '#E2E8F0',
    marginVertical: 4,
  },
  timelineCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    marginLeft: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E8EEF6',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  timelineCardActive: {
    borderColor: PRIMARY,
    shadowColor: PRIMARY,
    shadowOpacity: 0.14,
    elevation: 4,
  },
  timelineCardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timelineTitle: {
    flex: 1,
    fontSize: 14.5,
    fontWeight: '700',
    color: INK,
    marginRight: 8,
  },
  tonePill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 9,
  },
  tonePillText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  timelineMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 7,
  },
  timelineMetaText: {
    flex: 1,
    fontSize: 12,
    color: MUTED,
    marginLeft: 6,
  },
  timelineMessage: {
    fontSize: 12.5,
    color: '#475569',
    lineHeight: 18,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },

  // Actions
  primaryButton: {
    height: 54,
    borderRadius: 16,
    backgroundColor: PRIMARY,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  ghostButton: {
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  ghostButtonText: {
    color: PRIMARY,
    fontSize: 14,
    fontWeight: '700',
  },
});

export default ApplicationStatusScreen;
