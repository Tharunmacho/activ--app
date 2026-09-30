import React, { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { launchImageLibrary, ImageLibraryOptions } from 'react-native-image-picker';
import api from '../../../services/api';
import { useBlockAdminData } from './context/BlockAdminContext';
import { signOutAdmin } from '../shared/TierMenu';
import TierSettingsView from '../shared/TierSettingsView';

const BlockSettingsScreen = ({ navigation }: any) => {
  const { adminName, adminEmail, adminPhone, currentBlock, updateAdminProfile, profileImageUri, setProfileImageUri, fetchDashboardData } = useBlockAdminData();

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [nameInput, setNameInput] = useState(adminName);
  const [emailInput, setEmailInput] = useState(adminEmail);
  const [phoneInput, setPhoneInput] = useState(adminPhone);
  const [blockInput, setBlockInput] = useState(currentBlock);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Sync state when context updates
  useEffect(() => {
    setNameInput(adminName);
    setEmailInput(adminEmail);
    setPhoneInput(adminPhone);
    setBlockInput(currentBlock);
  }, [adminName, adminEmail, adminPhone, currentBlock]);

  const handleLogout = async () => {
    // Server logout, the WHOLE session cleared (token, user, role), then the
    // admin sign-in — reset on the ROOT stack, not this tab navigator.
    await signOutAdmin(navigation?.getParent?.() || navigation);
  };

  const handlePickImage = () => {
    const options: ImageLibraryOptions = {
      mediaType: 'photo',
      quality: 0.8,
      selectionLimit: 1,
    };

    try {
      if (typeof launchImageLibrary !== 'function') return;
      launchImageLibrary(options, (response) => {
        if (response?.didCancel) return;
        if (response?.errorCode) {
          Alert.alert('Error', response?.errorMessage || 'Could not pick image');
          return;
        }
        const asset = response?.assets?.[0];
        if (asset?.uri) {
          setProfileImageUri(asset.uri);
        }
      });
    } catch (err) {
      console.warn('Native module call safely caught:', err);
    }
  };

  const handleSave = async () => {
    if (newPassword && !oldPassword) {
      Alert.alert('Validation Error', 'You must provide your current password to set a new password.');
      return;
    }
    setIsSaving(true);
    let successCount = 0;

    try {
      // 1. Update Profile (Name, Email, Block)
      if (nameInput !== adminName || emailInput !== adminEmail || phoneInput !== adminPhone || blockInput !== currentBlock) {
        await api.put('/admin/profile', {
          fullName: nameInput,
          email: emailInput,
          phoneNumber: (phoneInput || '').trim(),
          block: blockInput,
        });
        updateAdminProfile(nameInput, emailInput, (phoneInput || '').trim());
        fetchDashboardData(true);
        successCount++;
      }

      // 2. Change Password
      if (newPassword) {
        if (!oldPassword) {
          Alert.alert('Validation Error', 'You must provide your current password to set a new password.');
          setIsSaving(false);
          return;
        }
        await api.post('/auth/change-password', {
          oldPassword,
          newPassword,
        });
        setOldPassword('');
        setNewPassword('');
        successCount++;
      }

      if (successCount > 0) {
        Alert.alert('Success', 'Profile updated successfully!');
      }
      setIsEditing(false);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <TierSettingsView
      tier="block"
      name={adminName}
      email={adminEmail}
      roleLine={`${currentBlock} Admin`}
      photo={profileImageUri}
      isEditing={isEditing}
      isSaving={isSaving}
      onEdit={() => setIsEditing(true)}
      onSave={handleSave}
      onBack={() => navigation.navigate('Dashboard')}
      onPickImage={handlePickImage}
      onLogout={handleLogout}
      fields={[
        { label: 'Full Name', value: nameInput, onChangeText: setNameInput, placeholder: 'Enter your name', icon: 'person-outline' },
        { label: 'Email Address', value: emailInput, onChangeText: setEmailInput, placeholder: 'Enter your email', keyboardType: 'email-address', icon: 'mail-outline' },
        { label: 'Mobile Number', value: phoneInput, onChangeText: setPhoneInput, placeholder: 'Enter your mobile number', keyboardType: 'phone-pad', icon: 'phone' },
        { label: 'Block Name', value: blockInput, onChangeText: setBlockInput, placeholder: 'Enter block name', icon: 'place' },
      ]}
      passwordFields={[
        { label: 'Current Password', value: oldPassword, onChangeText: setOldPassword, placeholder: 'Enter current password', icon: 'lock-outline' },
        { label: 'New Password', value: newPassword, onChangeText: setNewPassword, placeholder: 'Enter new password (min 6 chars)', icon: 'lock-reset' },
      ]}
    />
  );
};

export default BlockSettingsScreen;
