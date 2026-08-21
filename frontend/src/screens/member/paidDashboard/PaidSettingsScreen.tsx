import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../types';
import LinearGradient from 'react-native-linear-gradient';
import { useAuthStore } from '../../../stores/exampleStore';
import { getUserData } from '../../../services/api';

type PaidSettingsScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList>;
};

const PaidSettingsScreen: React.FC<PaidSettingsScreenProps> = ({ navigation }) => {
  const { logout } = useAuthStore();
  const [isBusinessUser, setIsBusinessUser] = React.useState(false);

  React.useEffect(() => {
    checkUserType();
  }, []);

  const checkUserType = async () => {
    const user = await getUserData();
    // Simplified logic: usually we get this from the app data or member store.
    // If they have business member roles, they are a business user.
    if (user?.role === 'business_member' || user?.registrationType === 'business') {
      setIsBusinessUser(true);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => {
          logout();
          navigation.reset({ index: 0, routes: [{ name: 'Login' as any }] });
        } 
      },
    ]);
  };

  const SettingRow = ({ icon, title, subtitle, onPress, color = '#3B82F6' }: any) => (
    <TouchableOpacity style={styles.settingRow} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.iconBox, { backgroundColor: color + '15' }]}>
        <Icon name={icon} size={22} color={color} />
      </View>
      <View style={styles.settingTextWrap}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      <Icon name="chevron-right" size={24} color="#9CA3AF" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FCE7F3" />
      
      <LinearGradient
        colors={['#FCE7F3', '#FBCFE8', '#F9A8D4']}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <SafeAreaView edges={['top']} style={styles.safeArea}>
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Icon name="arrow-back" size={24} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>App Settings</Text>
            <View style={{ width: 24 }} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      <View style={styles.sheetContainer}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.card}>
            <SettingRow 
              icon="person" 
              title="Profile Details" 
              subtitle="Update your personal and contact info"
              color="#3B82F6"
              onPress={() => navigation.navigate('PaidProfile' as any)}
            />
            {isBusinessUser && (
              <SettingRow 
                icon="storefront" 
                title="Business Settings" 
                subtitle="Manage your catalog and company profile"
                color="#7C3AED"
                onPress={() => navigation.navigate('Settings' as any)}
              />
            )}
            <SettingRow 
              icon="lock" 
              title="Security" 
              subtitle="Change your password"
              color="#10B981"
              onPress={() => Alert.alert('Security', 'Password change feature coming soon.')}
            />
          </View>

          <Text style={styles.sectionTitle}>Preferences</Text>
          <View style={styles.card}>
            <SettingRow 
              icon="notifications" 
              title="Notifications" 
              subtitle="Manage your push notifications"
              color="#F59E0B"
              onPress={() => Alert.alert('Notifications', 'Notification preferences coming soon.')}
            />
            <SettingRow 
              icon="language" 
              title="Language" 
              subtitle="English (US)"
              color="#6366F1"
              onPress={() => Alert.alert('Language', 'Language selection coming soon.')}
            />
          </View>

          <Text style={styles.sectionTitle}>Support & About</Text>
          <View style={styles.card}>
            <SettingRow 
              icon="help-outline" 
              title="Help Center" 
              color="#8B5CF6"
              onPress={() => Alert.alert('Help', 'Contact our support team for help.')}
            />
            <SettingRow 
              icon="privacy-tip" 
              title="Privacy Policy" 
              color="#64748B"
              onPress={() => Alert.alert('Privacy', 'View our privacy policy.')}
            />
          </View>

          <View style={styles.logoutContainer}>
            <TouchableOpacity 
              style={styles.logoutButton} 
              onPress={handleLogout}
              activeOpacity={0.8}
            >
              <Icon name="logout" size={20} color="#EF4444" style={{ marginRight: 8 }} />
              <Text style={styles.logoutButtonText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
          
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9A8D4',
  },
  headerGradient: {
    paddingBottom: 30,
  },
  safeArea: {
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  sheetContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -20,
    paddingTop: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
    marginTop: 16,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  settingTextWrap: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  settingSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  logoutContainer: {
    marginTop: 32,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  logoutButton: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButtonText: {
    color: '#EF4444',
    fontSize: 15,
    fontWeight: '600',
  }
});

export default PaidSettingsScreen;
