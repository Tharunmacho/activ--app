import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, TextInput, Alert, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { launchImageLibrary, ImageLibraryOptions } from 'react-native-image-picker';
import api, { STORAGE_KEYS } from '../../../services/api';
import { useStateAdminData } from './context/StateAdminContext';
import { getInitials } from '../applicantStyles';

const StateSettingsScreen = ({ navigation }: any) => {
  const { adminName, adminEmail, currentState, updateAdminProfile, profileImageUri, setProfileImageUri } = useStateAdminData();

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [nameInput, setNameInput] = useState(adminName);
  const [emailInput, setEmailInput] = useState(adminEmail);
  const [stateInput, setStateInput] = useState(currentState);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    setNameInput(adminName);
    setEmailInput(adminEmail);
    setStateInput(currentState);
  }, [adminName, adminEmail, currentState]);

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      await AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA);
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    } catch {
      navigation.navigate('Login');
    }
  };

  const handlePickImage = () => {
    const options: ImageLibraryOptions = { mediaType: 'photo', quality: 0.8, selectionLimit: 1 };
    launchImageLibrary(options, response => {
      if (response.didCancel) return;
      if (response.errorCode) { Alert.alert('Error', response.errorMessage || 'Could not pick image'); return; }
      const asset = response.assets?.[0];
      if (asset?.uri) setProfileImageUri(asset.uri);
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    let successCount = 0;
    try {
      if (nameInput !== adminName || emailInput !== adminEmail || stateInput !== currentState) {
        await api.put('/admin/profile', { fullName: nameInput, email: emailInput, state: stateInput });
        updateAdminProfile(nameInput, emailInput);
        successCount++;
      }
      if (newPassword) {
        if (!oldPassword) { Alert.alert('Validation Error', 'Provide current password to set a new one.'); setIsSaving(false); return; }
        await api.post('/auth/change-password', { oldPassword, newPassword });
        setOldPassword('');
        setNewPassword('');
        successCount++;
      }
      if (successCount > 0) Alert.alert('Success', 'Profile updated successfully!');
      setIsEditing(false);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const renderInput = (label: string, value: string, onChangeText: (t: string) => void, placeholder: string, secure = false) => (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput style={styles.inputField} value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#94A3B8" secureTextEntry={secure} editable={isEditing} />
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate('Dashboard')}>
          <Icon name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { flex: 1, marginLeft: 12 }]}>Settings</Text>
        <TouchableOpacity style={styles.editBtn} onPress={() => isEditing ? handleSave() : setIsEditing(true)} disabled={isSaving}>
          {isSaving ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.editBtnText}>{isEditing ? 'Save' : 'Edit'}</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} automaticallyAdjustKeyboardInsets={true}>
        <View style={styles.profileCard}>
          <TouchableOpacity style={styles.avatarWrapper} onPress={handlePickImage} activeOpacity={0.8}>
            {profileImageUri ? (
              <Image source={{ uri: profileImageUri }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarLarge}><Text style={styles.avatarLargeText}>{getInitials(adminName)}</Text></View>
            )}
            <View style={styles.cameraBadge}><Icon name="camera-alt" size={14} color="#FFFFFF" /></View>
          </TouchableOpacity>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{adminName}</Text>
            <Text style={styles.profileRole}>{currentState} State Admin</Text>
            <Text style={styles.profileEmail}>{adminEmail || 'admin@activ.com'}</Text>
            <TouchableOpacity style={styles.changePhotoBtn} onPress={handlePickImage}>
              <Icon name="photo-camera" size={14} color="#6366F1" />
              <Text style={styles.changePhotoText}>Change Photo</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.menuSectionTitle}>Profile Information</Text>
          {renderInput('Full Name', nameInput, setNameInput, 'Enter your name')}
          {renderInput('Email Address', emailInput, setEmailInput, 'Enter your email')}
          {renderInput('State Name', stateInput, setStateInput, 'Enter state name')}
          {isEditing && (
            <>
              <View style={styles.divider} />
              <Text style={[styles.menuSectionTitle, { marginTop: 8 }]}>Change Password (Optional)</Text>
              {renderInput('Current Password', oldPassword, setOldPassword, 'Enter current password', true)}
              {renderInput('New Password', newPassword, setNewPassword, 'Enter new password (min 6 chars)', true)}
            </>
          )}
        </View>

        {!isEditing && (
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Icon name="logout" size={20} color="#EF4444" />
            <Text style={styles.logoutBtnText}>Log Out</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FAFAFA', marginBottom: 8 },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#1E293B' },
  backBtn: { padding: 8, backgroundColor: '#F1F5F9', borderRadius: 20 },
  editBtn: { backgroundColor: '#6366F1', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, minWidth: 60, alignItems: 'center' },
  editBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 13 },
  profileCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EEF2FF', borderRadius: 16, padding: 16, marginBottom: 24 },
  avatarWrapper: { position: 'relative', marginRight: 16 },
  avatarLarge: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#6366F1', justifyContent: 'center', alignItems: 'center' },
  avatarImage: { width: 72, height: 72, borderRadius: 36 },
  avatarLargeText: { fontSize: 26, fontWeight: '700', color: '#FFFFFF' },
  cameraBadge: { position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, borderRadius: 12, backgroundColor: '#6366F1', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#EEF2FF' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 18, fontWeight: '700', color: '#1E293B', marginBottom: 2 },
  profileRole: { fontSize: 13, color: '#6366F1', fontWeight: '500', marginBottom: 2 },
  profileEmail: { fontSize: 12, color: '#64748B', marginBottom: 8 },
  changePhotoBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  changePhotoText: { fontSize: 12, color: '#6366F1', fontWeight: '600' },
  formCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 1 },
  menuSectionTitle: { fontSize: 14, fontWeight: '600', color: '#6366F1', marginBottom: 16 },
  inputContainer: { marginBottom: 16 },
  inputLabel: { fontSize: 12, fontWeight: '600', color: '#64748B', marginBottom: 6 },
  inputField: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#1E293B' },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 8 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FEE2E2', paddingVertical: 16, borderRadius: 16, gap: 8 },
  logoutBtnText: { color: '#EF4444', fontSize: 15, fontWeight: '600' },
});

export default StateSettingsScreen;
