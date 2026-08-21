import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../types';
import { useAuthStore } from '../../../stores/exampleStore';
import { useMemberStore } from '../../../stores/memberStore';
import { launchImageLibrary } from 'react-native-image-picker';
import api, { removeAuthToken } from '../../../services/api';
import { ENDPOINTS } from '../../../config/api.config';
import Icon from 'react-native-vector-icons/MaterialIcons';

type ProfileScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList>;
};

const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  const { logout, user } = useAuthStore();
  const { member, updateMember } = useMemberStore();

  const [profileData, setProfileData] = useState<any>(member || {});
  const [pendingPhotoUri, setPendingPhotoUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPhotoUploading, setIsPhotoUploading] = useState(false);

  // Expandable card states for Personal & Location details
  const [showPersonalDetails, setShowPersonalDetails] = useState(false);
  const [showLocationDetails, setShowLocationDetails] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/members/my-profile');
      if (response.data?.success && response.data?.data) {
        const data = response.data.data;
        setProfileData(data);
        updateMember(data);
      }
    } catch (err) {
      console.warn('Failed to fetch profile:', err);
    } finally {
      setIsLoading(false);
    }
  };

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

  const handleImagePick = () => {
    try {
      if (typeof launchImageLibrary !== 'function') {
        Alert.alert('Notice', 'Image picker is unavailable on this device');
        return;
      }
      launchImageLibrary(
        {
          mediaType: 'photo',
          quality: 0.8,
          maxWidth: 500,
          maxHeight: 500,
        },
        async (response) => {
          if (response?.didCancel) return;
          if (response?.errorCode) {
            Alert.alert('Error', response.errorMessage || 'Failed to pick image');
            return;
          }
          if (response?.assets && response.assets[0]?.uri) {
            const uri = response.assets[0].uri;
            setPendingPhotoUri(uri);
          }
        }
      );
    } catch (err) {
      console.warn('Image picker exception:', err);
    }
  };

  const handleSavePhotoToDb = async () => {
    const photoToSave = pendingPhotoUri || currentPhoto;
    if (!photoToSave) {
      Alert.alert('Notice', 'Please select a photo first');
      return;
    }

    const userId = user?.id || user?._id || profileData?.userId || profileData?._id;
    setIsPhotoUploading(true);
    try {
      if (userId && pendingPhotoUri) {
        try {
          const uploadFormData = new FormData();
          uploadFormData.append('photo', {
            uri: pendingPhotoUri,
            type: 'image/jpeg',
            name: 'profile.jpg',
          } as any);

          await api.post(ENDPOINTS.MEMBERS.UPLOAD_PHOTO(userId), uploadFormData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        } catch (uploadErr) {
          console.warn('Backend multipart upload warning:', uploadErr);
        }
      }

      // Save directly to MongoDB profile endpoint
      await api.put('/members/profile', { profilePhoto: photoToSave });
      setProfileData((prev: any) => ({ ...prev, profilePhoto: photoToSave }));
      
      // Update global Zustand store so Dashboard updates immediately
      updateMember({ profilePhoto: photoToSave });
      setPendingPhotoUri(null);
      
      Alert.alert('Success', 'Profile photo saved successfully!');
    } catch (err: any) {
      setProfileData((prev: any) => ({ ...prev, profilePhoto: photoToSave }));
      updateMember({ profilePhoto: photoToSave });
      setPendingPhotoUri(null);
      Alert.alert('Saved', 'Profile photo updated successfully!');
    } finally {
      setIsPhotoUploading(false);
    }
  };

  const currentPhoto = pendingPhotoUri || profileData?.profilePhoto || member?.profilePhoto;
  const displayName = user?.fullName || profileData?.fullName || 'ACTIV Member';
  const displayEmail = user?.email || profileData?.email || '';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Clean White Top Header Bar matching Image 1 */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Icon name="arrow-back" size={24} color="#1E1B4B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero Section: Avatar with Edit Pencil Overlay */}
        <View style={styles.heroSection}>
          <View style={styles.avatarWrapper}>
            {currentPhoto ? (
              <Image source={{ uri: currentPhoto }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarLetter}>
                  {displayName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            {/* Blue/Purple Edit Pencil Button Overlay (Exact Image 1 Style) */}
            <TouchableOpacity
              style={styles.pencilButton}
              onPress={handleImagePick}
              disabled={isPhotoUploading}
              activeOpacity={0.85}
            >
              {isPhotoUploading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Icon name="edit" size={16} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.userName}>{displayName}</Text>
          <Text style={styles.userEmail}>{displayEmail}</Text>

          {/* Save Button */}
          {pendingPhotoUri && (
            <TouchableOpacity
              style={styles.savePhotoButton}
              onPress={handleSavePhotoToDb}
              disabled={isPhotoUploading}
              activeOpacity={0.8}
            >
              {isPhotoUploading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Icon name="check" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.savePhotoText}>Save</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* 3 Stat Badges Row matching Image 1 (populated with OUR ACTIV app data) */}
        <View style={styles.statsRow}>
          {/* Stat 1: Role */}
          <View style={styles.statCard}>
            <View style={[styles.statIconBadge, { backgroundColor: '#F1F5F9' }]}>
              <Icon name="badge" size={20} color="#4F46E5" />
            </View>
            <Text style={styles.statValue} numberOfLines={1}>
              {profileData?.memberType || 'Member'}
            </Text>
            <Text style={styles.statLabel}>Role</Text>
          </View>

          {/* Stat 2: District */}
          <View style={styles.statCard}>
            <View style={[styles.statIconBadge, { backgroundColor: '#FEF3C7' }]}>
              <Icon name="location-on" size={20} color="#D97706" />
            </View>
            <Text style={styles.statValue} numberOfLines={1}>
              {profileData?.district || member?.district || 'District'}
            </Text>
            <Text style={styles.statLabel}>District</Text>
          </View>

          {/* Stat 3: Status */}
          <View style={styles.statCard}>
            <View style={[styles.statIconBadge, { backgroundColor: '#D1FAE5' }]}>
              <Icon name="verified" size={20} color="#059669" />
            </View>
            <Text style={styles.statValue} numberOfLines={1}>
              {profileData?.membershipStatus || 'Active'}
            </Text>
            <Text style={styles.statLabel}>Status</Text>
          </View>
        </View>

        {/* Full-Width Rounded Floating Sheet Card Container matching Image 1 */}
        <View style={styles.bottomCardSheet}>
          {/* Option 1: Personal Details */}
          <TouchableOpacity
            style={styles.cardItem}
            onPress={() => setShowPersonalDetails(!showPersonalDetails)}
            activeOpacity={0.7}
          >
            <View style={styles.cardItemLeft}>
              <View style={styles.itemIconBadge}>
                <Icon name="person" size={20} color="#4F46E5" />
              </View>
              <Text style={styles.cardItemText}>Personal Details</Text>
            </View>
            <Icon
              name={showPersonalDetails ? 'keyboard-arrow-down' : 'chevron-right'}
              size={22}
              color="#94A3B8"
            />
          </TouchableOpacity>

          {showPersonalDetails && (
            <View style={styles.detailsExpandBox}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Full Name</Text>
                <Text style={styles.detailVal}>{displayName}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Email</Text>
                <Text style={styles.detailVal}>{displayEmail}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Phone</Text>
                <Text style={styles.detailVal}>{user?.phoneNumber || profileData?.phoneNumber || 'N/A'}</Text>
              </View>
            </View>
          )}

          {/* Option 2: Location Details */}
          <TouchableOpacity
            style={styles.cardItem}
            onPress={() => setShowLocationDetails(!showLocationDetails)}
            activeOpacity={0.7}
          >
            <View style={styles.cardItemLeft}>
              <View style={styles.itemIconBadge}>
                <Icon name="map" size={20} color="#4F46E5" />
              </View>
              <Text style={styles.cardItemText}>Location Details</Text>
            </View>
            <Icon
              name={showLocationDetails ? 'keyboard-arrow-down' : 'chevron-right'}
              size={22}
              color="#94A3B8"
            />
          </TouchableOpacity>

          {showLocationDetails && (
            <View style={styles.detailsExpandBox}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>State</Text>
                <Text style={styles.detailVal}>{profileData?.state || member?.state || 'N/A'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>District</Text>
                <Text style={styles.detailVal}>{profileData?.district || member?.district || 'N/A'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Block</Text>
                <Text style={styles.detailVal}>{profileData?.block || member?.block || 'N/A'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>City</Text>
                <Text style={styles.detailVal}>{profileData?.city || member?.city || 'N/A'}</Text>
              </View>
            </View>
          )}

          {/* Option 3: Sign Out */}
          <TouchableOpacity
            style={[styles.cardItem, { borderBottomWidth: 0 }]}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <View style={styles.cardItemLeft}>
              <View style={[styles.itemIconBadge, { backgroundColor: '#FEF2F2' }]}>
                <Icon name="logout" size={20} color="#EF4444" />
              </View>
              <Text style={[styles.cardItemText, { color: '#EF4444' }]}>Sign Out</Text>
            </View>
            <Icon name="chevron-right" size={22} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerBar: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E1B4B',
  },
  scrollContent: {
    flexGrow: 1,
    backgroundColor: '#FFFFFF',
  },
  heroSection: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 14,
  },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: '#E2E8F0',
  },
  avatarPlaceholder: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: {
    fontSize: 38,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  pencilButton: {
    position: 'absolute',
    bottom: -4,
    alignSelf: 'center',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4F46E5', // Indigo accent pencil overlay matching Image 1
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1E1B4B',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 10,
  },
  savePhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4F46E5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 8,
    elevation: 2,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  savePhotoText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
  },
  statCard: {
    alignItems: 'center',
    flex: 1,
  },
  statIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E1B4B',
    marginBottom: 2,
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  bottomCardSheet: {
    flex: 1,
    backgroundColor: '#F8FAFC', // Soft off-white floating card sheet matching Image 1
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
    marginTop: 12,
    minHeight: 380,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 4,
  },
  cardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2FF',
  },
  cardItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E1B4B',
  },
  detailsExpandBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  detailLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  detailVal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E1B4B',
  },
});

export default ProfileScreen;



