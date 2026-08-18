import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../theme/theme';
import { launchImageLibrary } from 'react-native-image-picker';
import api from '../../services/api';
import { ENDPOINTS } from '../../config/api.config';
import { useAuthStore } from '../../stores/exampleStore';
import { useMemberStore } from '../../stores/memberStore';
import Icon from 'react-native-vector-icons/MaterialIcons';

type EditProfileProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'EditProfile'>;
};

const EditProfileScreen: React.FC<EditProfileProps> = ({ navigation }) => {
  const { user, updateUser } = useAuthStore();
  const { member, updateMember } = useMemberStore();

  const [formData, setFormData] = useState({
    fullName: user?.fullName || '',
    phoneNumber: user?.phoneNumber || '',
    city: member?.city || '',
  });

  const [profilePhoto, setProfilePhoto] = useState(member?.profilePhoto);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleImagePick = () => {
    try {
      if (typeof launchImageLibrary !== 'function') {
        Alert.alert('Notice', 'Image picker is not available on this device');
        return;
      }
      launchImageLibrary(
        {
          mediaType: 'photo',
          quality: 0.8,
          maxWidth: 500,
          maxHeight: 500,
        },
        (response) => {
          if (response?.didCancel) return;
          if (response?.errorCode) {
            Alert.alert('Error', response.errorMessage || 'Failed to pick image');
            return;
          }
          if (response?.assets && response.assets[0]?.uri) {
            setProfilePhoto(response.assets[0].uri);
          }
        }
      );
    } catch (err: any) {
      console.log('Image picker error:', err);
      Alert.alert('Error', 'Image picker is unavailable right now');
    }
  };

  const handleSave = async () => {
    const userId = user?.id || user?._id;
    setIsLoading(true);
    try {
      // Upload photo if changed and userId exists
      if (userId && profilePhoto && profilePhoto !== member?.profilePhoto) {
        try {
          const uploadFormData = new FormData();
          uploadFormData.append('photo', {
            uri: profilePhoto,
            type: 'image/jpeg',
            name: 'profile.jpg',
          } as any);

          await api.post(ENDPOINTS.MEMBERS.UPLOAD_PHOTO(userId), uploadFormData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        } catch (uploadError) {
          console.warn('Photo upload failed:', uploadError);
        }
      }

      // Update profile
      if (userId) {
        const response = await api.put(ENDPOINTS.MEMBERS.UPDATE(userId), formData);
        if (response.data?.success) {
          await updateUser({ fullName: formData.fullName, phoneNumber: formData.phoneNumber });
          updateMember({ city: formData.city, profilePhoto });
        }
      } else {
        // Fallback store update if user ID is missing
        await updateUser({ fullName: formData.fullName, phoneNumber: formData.phoneNumber });
        updateMember({ city: formData.city, profilePhoto });
      }

      Alert.alert('Success', 'Profile updated successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Edit Profile</Text>
        <View style={styles.spacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Photo */}
        <View style={styles.photoContainer}>
          {profilePhoto ? (
            <Image
              source={{ uri: profilePhoto }}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Icon name="person" size={50} color={COLORS.textSecondary} />
            </View>
          )}
          <TouchableOpacity style={styles.photoButton} onPress={handleImagePick}>
            <Icon name="camera-alt" size={20} color={COLORS.white} />
          </TouchableOpacity>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={formData.fullName}
              onChangeText={(text) => handleChange('fullName', text)}
              placeholder="Enter full name"
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={formData.phoneNumber}
              onChangeText={(text) => handleChange('phoneNumber', text)}
              placeholder="Enter phone number"
              keyboardType="phone-pad"
              maxLength={10}
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>City</Text>
            <TextInput
              style={styles.input}
              value={formData.city}
              onChangeText={(text) => handleChange('city', text)}
              placeholder="Enter city"
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, styles.inputDisabled]}
              value={user?.email}
              editable={false}
            />
            <Text style={styles.helperText}>Email cannot be changed</Text>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Location</Text>
            <TextInput
              style={[styles.input, styles.inputDisabled]}
              value={
                member?.state && member?.district
                  ? `${member.state}, ${member.district}`
                  : 'Not set'
              }
              editable={false}
            />
            <Text style={styles.helperText}>
              Contact support to change location
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Save Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, isLoading && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.saveButtonText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xxl,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  title: {
    fontSize: FONTS.sizes.xl,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textPrimary,
  },
  content: {
    flex: 1,
  },
  photoContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    position: 'relative',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.border,
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoButton: {
    position: 'absolute',
    bottom: SPACING.xl,
    right: '35%',
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  form: {
    paddingHorizontal: SPACING.xl,
  },
  inputContainer: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: FONTS.sizes.base,
    fontWeight: FONTS.weights.medium,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    fontSize: FONTS.sizes.md,
    color: COLORS.textPrimary,
  },
  inputDisabled: {
    backgroundColor: COLORS.background,
    color: COLORS.textSecondary,
  },
  helperText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  footer: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.bold,
  },
  spacer: {
    width: 24,
  },
});

export default EditProfileScreen;
