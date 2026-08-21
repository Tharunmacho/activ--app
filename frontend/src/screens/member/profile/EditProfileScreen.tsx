import React, { useState, useEffect } from 'react';
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
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../types';
import { launchImageLibrary } from 'react-native-image-picker';
import api from '../../../services/api';
import { ENDPOINTS } from '../../../config/api.config';
import { useAuthStore } from '../../../stores/exampleStore';
import { useMemberStore } from '../../../stores/memberStore';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { SafeAreaView } from 'react-native-safe-area-context';

type EditProfileProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'EditProfile'>;
};

const EditProfileScreen: React.FC<EditProfileProps> = ({ navigation }) => {
  const { user, updateUser } = useAuthStore();
  const { member, updateMember } = useMemberStore();

  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    fullName: user?.fullName || member?.fullName || '',
    email: user?.email || member?.email || '',
    phoneNumber: user?.phoneNumber || member?.phoneNumber || '',
    state: member?.state || '',
    district: member?.district || '',
    block: member?.block || '',
    city: member?.city || '',
  });

  const [profilePhoto, setProfilePhoto] = useState(member?.profilePhoto);

  const handleChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleImagePick = () => {
    if (!isEditing) return;
    
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
        const response = await api.put(ENDPOINTS.MEMBERS.UPDATE(userId), {
          ...formData,
          // Exclude email from updates as it might not be allowed
          email: undefined
        });
        if (response.data?.success) {
          await updateUser({ fullName: formData.fullName, phoneNumber: formData.phoneNumber });
          updateMember({ 
            fullName: formData.fullName,
            phoneNumber: formData.phoneNumber,
            state: formData.state,
            district: formData.district,
            block: formData.block,
            city: formData.city,
            profilePhoto 
          });
        }
      } else {
        // Fallback store update if user ID is missing
        await updateUser({ fullName: formData.fullName, phoneNumber: formData.phoneNumber });
        updateMember({ 
          fullName: formData.fullName,
          phoneNumber: formData.phoneNumber,
          state: formData.state,
          district: formData.district,
          block: formData.block,
          city: formData.city,
          profilePhoto 
        });
      }

      Alert.alert('Success', 'Profile updated successfully!', [
        { text: 'OK', onPress: () => setIsEditing(false) },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const renderInput = (
    label: string, 
    value: string, 
    field: string, 
    placeholder: string,
    disabled: boolean = false,
    keyboardType: any = 'default'
  ) => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[
          styles.input, 
          !isEditing && styles.inputReadOnly,
          disabled && styles.inputDisabled
        ]}
        value={value}
        onChangeText={(text) => handleChange(field, text)}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        editable={isEditing && !disabled && !isLoading}
        keyboardType={keyboardType}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => {
          if (isEditing) {
            setIsEditing(false);
          } else {
            navigation.goBack();
          }
        }} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        
        <Text style={styles.title}>{isEditing ? 'Edit Profile' : 'My Profile'}</Text>
        
        {!isEditing ? (
          <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.editIconButton}>
            <Icon name="edit" size={22} color="#1E50E6" />
          </TouchableOpacity>
        ) : (
          <View style={styles.spacer} />
        )}
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          
          {/* Profile Photo */}
          <View style={styles.photoContainer}>
            <TouchableOpacity 
              activeOpacity={isEditing ? 0.7 : 1}
              onPress={handleImagePick}
            >
              {profilePhoto ? (
                <Image
                  source={{ uri: profilePhoto }}
                  style={styles.avatar}
                />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarLetter}>
                    {formData.fullName.charAt(0).toUpperCase() || 'U'}
                  </Text>
                </View>
              )}
              {isEditing && (
                <View style={styles.photoEditBadge}>
                  <Icon name="camera-alt" size={16} color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.formContainer}>
            
            {/* Basic Detail Section */}
            <Text style={styles.sectionTitle}>Basic Detail</Text>
            
            {renderInput('Full Name', formData.fullName, 'fullName', 'Enter full name')}

            {/* Contact Detail Section */}
            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Contact Detail</Text>
            
            {renderInput('Mobile number', formData.phoneNumber, 'phoneNumber', 'Enter mobile number', false, 'phone-pad')}
            {renderInput('Email', formData.email, 'email', 'Enter email address', true)}
            
            {/* Location Detail Section */}
            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Location Detail</Text>
            
            {renderInput('State', formData.state, 'state', 'Enter state')}
            {renderInput('District', formData.district, 'district', 'Enter district')}
            {renderInput('Block', formData.block, 'block', 'Enter block')}
            {renderInput('City', formData.city, 'city', 'Enter city')}
            
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
          onPress={() => isEditing ? handleSave() : setIsEditing(true)}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>
              {isEditing ? 'Save' : 'Edit Profile'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 56,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  editIconButton: {
    padding: 8,
    marginRight: -8,
  },
  spacer: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  photoContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F1F5F9',
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E2E8F0',
  },
  avatarLetter: {
    fontSize: 36,
    fontWeight: '700',
    color: '#64748B',
  },
  photoEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E50E6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  formContainer: {
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
    fontSize: 15,
    color: '#1E293B',
    backgroundColor: '#FFFFFF',
  },
  inputReadOnly: {
    backgroundColor: '#F8FAFC',
    color: '#334155',
  },
  inputDisabled: {
    backgroundColor: '#F1F5F9',
    color: '#94A3B8',
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 12,
  },
  innerInput: {
    flex: 1,
    fontSize: 15,
    color: '#1E293B',
    height: '100%',
    padding: 0,
  },
  radioGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  radioOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  radioOptionSelected: {
    borderColor: '#1E50E6',
    backgroundColor: '#EFF6FF',
  },
  radioOptionDisabled: {
    backgroundColor: '#F8FAFC',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  radioCircleSelected: {
    borderColor: '#1E50E6',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#1E50E6',
  },
  radioText: {
    fontSize: 15,
    color: '#64748B',
    fontWeight: '500',
  },
  radioTextSelected: {
    color: '#1E50E6',
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  primaryButton: {
    backgroundColor: '#1E50E6',
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1E50E6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default EditProfileScreen;

