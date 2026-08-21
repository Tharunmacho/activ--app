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
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../types';
import api from '../../../services/api';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { SafeAreaView } from 'react-native-safe-area-context';

type EditDeclarationProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'EditDeclaration'>;
};

const EditDeclarationScreen: React.FC<EditDeclarationProps> = ({ navigation }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    sisterConcerns: '',
    companyNames: '',
  });

  const [agreeToDeclaration, setAgreeToDeclaration] = useState<boolean>(false);

  useEffect(() => {
    fetchDeclarationInfo();
  }, []);

  const fetchDeclarationInfo = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/members/declaration-info');
      if (response.data.success && response.data.data) {
        const data = response.data.data;
        setFormData({
          sisterConcerns: data.sisterConcerns?.toString() || '0',
          companyNames: Array.isArray(data.companyNames) ? data.companyNames.join(', ') : (data.companyNames || ''),
        });
        setAgreeToDeclaration(data.agreeToDeclaration || false);
      }
    } catch (error: any) {
      console.warn('Failed to load declaration info', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = {
        sisterConcerns: parseInt(formData.sisterConcerns, 10) || 0,
        companyNames: formData.companyNames.split(',').map(s => s.trim()).filter(Boolean),
        agreeToDeclaration,
      };

      const response = await api.put('/members/profile', payload);
      if (response.data?.success) {
        Alert.alert('Success', 'Declarations updated successfully!', [
          { text: 'OK', onPress: () => setIsEditing(false) },
        ]);
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update declarations');
    } finally {
      setIsSaving(false);
    }
  };

  const renderInput = (
    label: string, 
    value: string, 
    field: string, 
    placeholder: string,
    keyboardType: any = 'default',
    multiline: boolean = false
  ) => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[
          styles.input, 
          !isEditing && styles.inputReadOnly,
          multiline && { height: 80, textAlignVertical: 'top', paddingTop: 12 }
        ]}
        value={value}
        onChangeText={(text) => handleChange(field, text)}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        editable={isEditing && !isSaving}
        keyboardType={keyboardType}
        multiline={multiline}
      />
    </View>
  );

  const renderRadioGroup = (
    label: string,
    value: boolean,
    onValueChange: (val: boolean) => void
  ) => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.radioGroup}>
        <TouchableOpacity
          style={[styles.radioOption, value === true && styles.radioOptionSelected, !isEditing && styles.radioOptionDisabled]}
          onPress={() => isEditing && onValueChange(true)}
          activeOpacity={isEditing ? 0.7 : 1}
        >
          <View style={[styles.radioCircle, value === true && styles.radioCircleSelected]}>
            {value === true && <View style={styles.radioInner} />}
          </View>
          <Text style={[styles.radioText, value === true && styles.radioTextSelected]}>Yes</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.radioOption, value === false && styles.radioOptionSelected, !isEditing && styles.radioOptionDisabled]}
          onPress={() => isEditing && onValueChange(false)}
          activeOpacity={isEditing ? 0.7 : 1}
        >
          <View style={[styles.radioCircle, value === false && styles.radioCircleSelected]}>
            {value === false && <View style={styles.radioInner} />}
          </View>
          <Text style={[styles.radioText, value === false && styles.radioTextSelected]}>No</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => {
          if (isEditing) setIsEditing(false);
          else navigation.goBack();
        }} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        
        <Text style={styles.title}>{isEditing ? 'Edit Declarations' : 'Declarations'}</Text>
        
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
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1E50E6" />
          </View>
        ) : (
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.formContainer}>
              <Text style={styles.sectionTitle}>Sister Concerns</Text>
              
              {renderInput('Number of Sister Concerns', formData.sisterConcerns, 'sisterConcerns', 'e.g. 0', 'numeric')}
              {renderInput('Company Names (comma separated)', formData.companyNames, 'companyNames', 'e.g. ABC Corp, XYZ Ltd', 'default', true)}

              <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Agreements</Text>
              
              {renderRadioGroup('I agree to the declarations', agreeToDeclaration, setAgreeToDeclaration)}
              
            </View>
            <View style={{ height: 40 }} />
          </ScrollView>
        )}
      </KeyboardAvoidingView>

      {/* Footer Button */}
      {(!isLoading && isEditing) && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.primaryButton, isSaving && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={isSaving}
            activeOpacity={0.8}
          >
            {isSaving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
      {(!isLoading && !isEditing) && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => setIsEditing(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Edit Declarations</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 56,
  },
  backButton: { padding: 8, marginLeft: -8 },
  title: { fontSize: 18, fontWeight: '700', color: '#1E293B' },
  editIconButton: { padding: 8, marginRight: -8 },
  spacer: { width: 40 },
  content: { flex: 1, paddingTop: 16 },
  formContainer: { paddingHorizontal: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 16 },
  inputContainer: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '500', color: '#64748B', marginBottom: 8 },
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
  inputReadOnly: { backgroundColor: '#F8FAFC', color: '#334155' },
  radioGroup: { flexDirection: 'row', gap: 12 },
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
  radioOptionSelected: { borderColor: '#1E50E6', backgroundColor: '#EFF6FF' },
  radioOptionDisabled: { backgroundColor: '#F8FAFC' },
  radioCircle: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2,
    borderColor: '#CBD5E1', justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  radioCircleSelected: { borderColor: '#1E50E6' },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#1E50E6' },
  radioText: { fontSize: 15, color: '#64748B', fontWeight: '500' },
  radioTextSelected: { color: '#1E50E6', fontWeight: '600' },
  footer: {
    paddingHorizontal: 24, paddingVertical: 16, backgroundColor: '#FFFFFF',
    borderTopWidth: 1, borderTopColor: '#F1F5F9',
  },
  primaryButton: {
    backgroundColor: '#1E50E6', height: 52, borderRadius: 26,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#1E50E6', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
  },
  buttonDisabled: { opacity: 0.7 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});

export default EditDeclarationScreen;
