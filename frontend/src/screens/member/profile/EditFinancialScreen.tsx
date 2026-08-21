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

type EditFinancialProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'EditFinancial'>;
};

const TURNOVER_RANGES = [
  'Below 1 Lakh',
  '1-5 Lakhs',
  '5-10 Lakhs',
  '10-50 Lakhs',
  '50 Lakhs - 1 Crore',
  'Above 1 Crore',
];

const EditFinancialScreen: React.FC<EditFinancialProps> = ({ navigation }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    panNumber: '',
    gstNumber: '',
    udyamNumber: '',
    turnoverRange: '',
  });

  const [filedITR, setFiledITR] = useState<boolean>(false);
  const [govtSchemeBenefit, setGovtSchemeBenefit] = useState<boolean>(false);

  useEffect(() => {
    fetchFinancialInfo();
  }, []);

  const fetchFinancialInfo = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/members/financial-info');
      if (response.data.success && response.data.data) {
        const data = response.data.data;
        setFormData({
          panNumber: data.panNumber || '',
          gstNumber: data.gstNumber || '',
          udyamNumber: data.udyamNumber || '',
          turnoverRange: data.turnoverRange || data.lastYearTurnover || '',
        });
        if (data.filedITR !== undefined) setFiledITR(data.filedITR);
        if (data.govtSchemeBenefit !== undefined) setGovtSchemeBenefit(data.govtSchemeBenefit);
      }
    } catch (error: any) {
      console.warn('Failed to load financial info', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const validatePAN = (pan: string): boolean => {
    if (!pan) return true;
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    return panRegex.test(pan);
  };

  const validateGST = (gst: string): boolean => {
    if (!gst) return true;
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    return gstRegex.test(gst);
  };

  const handleSave = async () => {
    if (formData.panNumber && !validatePAN(formData.panNumber)) {
      Alert.alert('Invalid PAN', 'Please enter a valid 10-character PAN number (e.g. ABCDE1234F).');
      return;
    }

    if (formData.gstNumber && !validateGST(formData.gstNumber)) {
      Alert.alert('Invalid GST', 'Please enter a valid 15-character GSTIN number.');
      return;
    }

    setIsSaving(true);
    try {
      const payload: any = {
        panNumber: formData.panNumber,
        gstNumber: formData.gstNumber,
        udyamNumber: formData.udyamNumber,
        filedITR,
        govtSchemeBenefit,
      };

      if (formData.turnoverRange) {
        payload.turnoverRange = formData.turnoverRange;
      }

      const response = await api.put('/members/profile', payload);
      if (response.data?.success) {
        Alert.alert('Success', 'Financial info updated successfully!', [
          { text: 'OK', onPress: () => setIsEditing(false) },
        ]);
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update financial info');
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
    autoCapitalize: 'none' | 'sentences' | 'words' | 'characters' = 'sentences'
  ) => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[
          styles.input, 
          !isEditing && styles.inputReadOnly,
        ]}
        value={value}
        onChangeText={(text) => handleChange(field, text)}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        editable={isEditing && !isSaving}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
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
        
        <Text style={styles.title}>{isEditing ? 'Edit Financial Info' : 'Financial Info'}</Text>
        
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
              <Text style={styles.sectionTitle}>Tax & Registration</Text>
              
              {renderInput('PAN Number', formData.panNumber, 'panNumber', 'e.g. ABCDE1234F', 'default', 'characters')}
              {renderInput('GSTIN Number', formData.gstNumber, 'gstNumber', 'e.g. 22ABCDE1234F1Z5', 'default', 'characters')}
              {renderInput('UDYAM Number', formData.udyamNumber, 'udyamNumber', 'Enter UDYAM Number', 'default', 'characters')}

              <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Compliance</Text>
              
              {renderRadioGroup('Have you filed Income Tax Returns?', filedITR, setFiledITR)}
              
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Turnover Range</Text>
                {!isEditing ? (
                   <TextInput
                    style={[styles.input, styles.inputReadOnly]}
                    value={formData.turnoverRange || 'Not specified'}
                    editable={false}
                   />
                ) : (
                  <View style={styles.pillWrapContainer}>
                    {TURNOVER_RANGES.map((range) => {
                      const isActive = formData.turnoverRange === range;
                      return (
                        <TouchableOpacity
                          key={range}
                          style={[styles.pillButton, isActive && styles.pillButtonActive]}
                          onPress={() => handleChange('turnoverRange', range)}
                          activeOpacity={0.8}
                        >
                          <Text style={[styles.pillButtonText, isActive && styles.pillButtonTextActive]}>
                            {range}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>

              {renderRadioGroup('Beneficiary of Government Schemes?', govtSchemeBenefit, setGovtSchemeBenefit)}
              
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
            <Text style={styles.primaryButtonText}>Edit Financial Info</Text>
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
  pillWrapContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pillButton: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pillButtonActive: {
    backgroundColor: '#1E50E6',
    borderColor: '#1E50E6',
  },
  pillButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  pillButtonTextActive: {
    color: '#FFFFFF',
  },
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

export default EditFinancialScreen;
