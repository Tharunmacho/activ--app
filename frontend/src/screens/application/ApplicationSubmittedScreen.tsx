// Application Submitted Screen
//
// Success confirmation for a submitted membership application. The motion is
// built on the RN Animated API only (no extra dependency): a spring-in success
// mark with two outward pulse rings, then the content staggers up beneath it.
// Every animation runs on the native driver and is stopped on unmount so a
// backgrounded screen can't keep the UI thread busy.
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  StatusBar,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';
import Icon from 'react-native-vector-icons/MaterialIcons';

type ApplicationSubmittedProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ApplicationSubmitted'>;
};

// Matches the login screen and the profile forms.
const BG = '#F0F4F8';
const PRIMARY = '#1E50E6';
const SUCCESS = '#16A34A';
const INK = '#0F172A';
const MUTED = '#64748B';

type Stage = {
  key: string;
  label: string;
  caption: string;
};

const STAGES: Stage[] = [
  { key: 'block', label: 'Block Admin Review', caption: 'In progress' },
  { key: 'district', label: 'District Admin Review', caption: 'Waiting' },
  { key: 'state', label: 'State Admin Review', caption: 'Waiting' },
];

const ApplicationSubmittedScreen: React.FC<ApplicationSubmittedProps> = ({ navigation }) => {
  // One value per animated concern, so nothing fights over the same driver.
  const markScale = useRef(new Animated.Value(0)).current;
  const ringOne = useRef(new Animated.Value(0)).current;
  const ringTwo = useRef(new Animated.Value(0)).current;
  const contentFade = useRef(new Animated.Value(0)).current;
  const contentLift = useRef(new Animated.Value(24)).current;
  const stageValues = useRef(STAGES.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const intro = Animated.sequence([
      Animated.spring(markScale, {
        toValue: 1,
        friction: 5,
        tension: 90,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(contentFade, {
          toValue: 1,
          duration: 340,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(contentLift, {
          toValue: 0,
          duration: 340,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      // Stages arrive one after another so the eye follows the sequence.
      Animated.stagger(
        110,
        stageValues.map((value) =>
          Animated.timing(value, {
            toValue: 1,
            duration: 300,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          })
        )
      ),
    ]);

    const pulse = (value: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(value, {
            toValue: 1,
            duration: 1800,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );

    const pulseOne = pulse(ringOne, 0);
    const pulseTwo = pulse(ringTwo, 900);

    intro.start();
    pulseOne.start();
    pulseTwo.start();

    return () => {
      intro.stop();
      pulseOne.stop();
      pulseTwo.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ringStyle = (value: Animated.Value) => ({
    opacity: value.interpolate({
      inputRange: [0, 0.15, 1],
      outputRange: [0, 0.35, 0],
    }),
    transform: [
      {
        scale: value.interpolate({
          inputRange: [0, 1],
          outputRange: [0.75, 1.9],
        }),
      },
    ],
  });

  const goToStatus = () => {
    try {
      navigation.replace('ApplicationStatus');
    } catch (err) {
      console.warn('Navigation safely caught:', err);
    }
  };

  const goToDashboard = () => {
    try {
      navigation.replace('MemberMain');
    } catch (err) {
      console.warn('Navigation safely caught:', err);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Success mark with two outward pulses */}
        <View style={styles.markArea}>
          <Animated.View style={[styles.pulseRing, ringStyle(ringOne)]} />
          <Animated.View style={[styles.pulseRing, ringStyle(ringTwo)]} />

          <Animated.View style={[styles.markCircle, { transform: [{ scale: markScale }] }]}>
            <Icon name="check" size={46} color="#FFFFFF" />
          </Animated.View>
        </View>

        <Animated.View
          style={{ opacity: contentFade, transform: [{ translateY: contentLift }] }}
        >
          <Text style={styles.title}>Application Submitted</Text>
          <Text style={styles.subtitle}>
            Your membership application is in and moving through review.
          </Text>

          {/* Review timeline */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardHeaderTitle}>Approval Progress</Text>
              <View style={styles.stagePill}>
                <Text style={styles.stagePillText}>Stage 1 of 3</Text>
              </View>
            </View>

            {STAGES.map((stage, index) => {
              const isActive = index === 0;
              const isLast = index === STAGES.length - 1;
              const value = stageValues[index] || new Animated.Value(1);

              return (
                <Animated.View
                  key={stage.key}
                  style={[
                    styles.stageRow,
                    {
                      opacity: value,
                      transform: [
                        {
                          translateX: value.interpolate({
                            inputRange: [0, 1],
                            outputRange: [16, 0],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <View style={styles.stageRail}>
                    <View style={[styles.stageDot, isActive && styles.stageDotActive]}>
                      {isActive ? (
                        <Icon name="hourglass-empty" size={13} color="#FFFFFF" />
                      ) : (
                        <Text style={styles.stageDotText}>{index + 1}</Text>
                      )}
                    </View>
                    {!isLast ? <View style={styles.stageConnector} /> : null}
                  </View>

                  <View style={styles.stageTextCol}>
                    <Text style={[styles.stageLabel, isActive && styles.stageLabelActive]}>
                      {stage.label}
                    </Text>
                    <Text style={styles.stageCaption}>{stage.caption}</Text>
                  </View>
                </Animated.View>
              );
            })}
          </View>

          <View style={styles.noticeRow}>
            <Icon name="notifications-none" size={18} color={PRIMARY} />
            <Text style={styles.noticeText}>
              You'll be notified as each stage is completed.
            </Text>
          </View>

          <TouchableOpacity style={styles.primaryButton} onPress={goToStatus} activeOpacity={0.85}>
            <Text style={styles.primaryButtonText}>View Application Status</Text>
            <Icon name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.ghostButton}
            onPress={goToDashboard}
            activeOpacity={0.85}
          >
            <Text style={styles.ghostButtonText}>Go to Dashboard</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BG,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },

  // Success mark
  markArea: {
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 26,
  },
  pulseRing: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: SUCCESS,
  },
  markCircle: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: SUCCESS,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: SUCCESS,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.32,
    shadowRadius: 18,
    elevation: 10,
  },

  title: {
    fontSize: 26,
    fontWeight: '800',
    color: INK,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: MUTED,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 26,
    lineHeight: 20,
    paddingHorizontal: 8,
  },

  // Timeline card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 6,
    borderWidth: 1,
    borderColor: '#E8EEF6',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cardHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: INK,
  },
  stagePill: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  stagePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: PRIMARY,
  },

  stageRow: {
    flexDirection: 'row',
  },
  stageRail: {
    width: 28,
    alignItems: 'center',
  },
  stageDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stageDotActive: {
    backgroundColor: PRIMARY,
  },
  stageDotText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
  },
  stageConnector: {
    flex: 1,
    width: 2,
    backgroundColor: '#E2E8F0',
    marginVertical: 4,
  },
  stageTextCol: {
    flex: 1,
    marginLeft: 12,
    paddingBottom: 18,
  },
  stageLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  stageLabelActive: {
    color: INK,
    fontWeight: '700',
  },
  stageCaption: {
    fontSize: 12,
    color: MUTED,
    marginTop: 2,
  },

  noticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 22,
    paddingHorizontal: 4,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    color: MUTED,
    marginLeft: 8,
    lineHeight: 17,
  },

  primaryButton: {
    height: 54,
    borderRadius: 16,
    backgroundColor: PRIMARY,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
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
    marginTop: 12,
  },
  ghostButtonText: {
    color: PRIMARY,
    fontSize: 14,
    fontWeight: '700',
  },
});

export default ApplicationSubmittedScreen;
