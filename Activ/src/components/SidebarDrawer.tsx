import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Image,
  Alert,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuthStore } from '../stores/exampleStore';
import { useMemberStore } from '../stores/memberStore';
import { removeAuthToken } from '../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.78, 300);

type SidebarDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  navigation: any;
  currentScreen?: string;
};

const SidebarDrawer: React.FC<SidebarDrawerProps> = ({
  isOpen,
  onClose,
  navigation,
  currentScreen,
}) => {
  const { user, logout } = useAuthStore();
  const { member } = useMemberStore();

  const handleNavigate = (screenName: string) => {
    onClose();
    if (screenName === 'Dashboard') {
      navigation.navigate('MemberMain');
    } else {
      navigation.navigate(screenName);
    }
  };

  const handleLogout = () => {
    onClose();
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

  if (!isOpen) return null;

  const currentPhoto = member?.profilePhoto || (user as any)?.profilePhoto;

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Backdrop Tap Area */}
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        {/* Sidebar Card */}
        <SafeAreaView style={styles.drawerContainer}>
          <View style={styles.drawerContent}>
            {/* User Profile Banner Header */}
            <View style={styles.header}>
              <View style={styles.avatarContainer}>
                {currentPhoto ? (
                  <Image source={{ uri: currentPhoto }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarLetter}>
                      {(user?.fullName || 'M').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.userName} numberOfLines={1}>
                {user?.fullName || 'ACTIV Member'}
              </Text>
              <Text style={styles.userEmail} numberOfLines={1}>
                {user?.email || ''}
              </Text>
            </View>

            {/* Navigation Links */}
            <View style={styles.navSection}>
              <TouchableOpacity
                style={[
                  styles.navItem,
                  currentScreen === 'Dashboard' && styles.navItemActive,
                ]}
                onPress={() => handleNavigate('Dashboard')}
              >
                <Icon
                  name="home"
                  size={22}
                  color={currentScreen === 'Dashboard' ? '#1E88E5' : '#64748B'}
                />
                <Text
                  style={[
                    styles.navText,
                    currentScreen === 'Dashboard' && styles.navTextActive,
                  ]}
                >
                  Home / Dashboard
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.navItem,
                  currentScreen === 'Profile' && styles.navItemActive,
                ]}
                onPress={() => handleNavigate('Profile')}
              >
                <Icon
                  name="person"
                  size={22}
                  color={currentScreen === 'Profile' ? '#1E88E5' : '#64748B'}
                />
                <Text
                  style={[
                    styles.navText,
                    currentScreen === 'Profile' && styles.navTextActive,
                  ]}
                >
                  My Profile
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navItem}
                onPress={() => handleNavigate('BusinessProfile')}
              >
                <Icon name="business-center" size={22} color="#64748B" />
                <Text style={styles.navText}>Business Profile</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navItem}
                onPress={() => handleNavigate('BrowseMembers')}
              >
                <Icon name="explore" size={22} color="#64748B" />
                <Text style={styles.navText}>Explore Members</Text>
              </TouchableOpacity>
            </View>

            {/* Sidebar Footer — Sign Out Button */}
            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.logoutButton}
                onPress={handleLogout}
                activeOpacity={0.8}
              >
                <Icon name="logout" size={22} color="#EF4444" />
                <Text style={styles.logoutText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  drawerContainer: {
    width: DRAWER_WIDTH,
    backgroundColor: '#FFFFFF',
    height: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  drawerContent: {
    flex: 1,
    paddingTop: 16,
    paddingBottom: 24,
    paddingHorizontal: 16,
  },
  header: {
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 16,
  },
  avatarContainer: {
    marginBottom: 12,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#1E88E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 13,
    color: '#64748B',
  },
  navSection: {
    flex: 1,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  navItemActive: {
    backgroundColor: '#EFF6FF',
  },
  navText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
    marginLeft: 14,
  },
  navTextActive: {
    color: '#1E88E5',
    fontWeight: '700',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#EF4444',
    marginLeft: 12,
  },
});

export default SidebarDrawer;
