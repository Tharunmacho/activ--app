import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  StatusBar,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../types';
import { useAuthStore } from '../../../stores/exampleStore';
import { useMemberStore } from '../../../stores/memberStore';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import api from '../../../services/api';

type PaidProfileScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList>;
};

const PaidProfileScreen: React.FC<PaidProfileScreenProps> = ({ navigation }) => {
  const { user, logout } = useAuthStore();
  const { member, updateMember } = useMemberStore();
  
  const [profileData, setProfileData] = useState<any>(member || {});
  const [businessData, setBusinessData] = useState<any>({});
  const [financialData, setFinancialData] = useState<any>({});
  const [declarationData, setDeclarationData] = useState<any>({});

  // Expandable sections state
  const [showPersonal, setShowPersonal] = useState(false);
  const [showBusiness, setShowBusiness] = useState(false);
  const [showFinancial, setShowFinancial] = useState(false);
  const [showDeclaration, setShowDeclaration] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [])
  );

  const fetchProfile = async () => {
    try {
      const [profileRes, businessRes, financialRes, declarationRes] = await Promise.all([
        api.get('/members/my-profile').catch(() => null),
        api.get('/members/business-info').catch(() => null),
        api.get('/members/financial-info').catch(() => null),
        api.get('/members/declaration-info').catch(() => null),
      ]);

      if (profileRes?.data?.success && profileRes.data?.data) {
        setProfileData(profileRes.data.data);
        updateMember(profileRes.data.data);
      }
      if (businessRes?.data?.success && businessRes.data?.data) {
        setBusinessData(businessRes.data.data);
      }
      if (financialRes?.data?.success && financialRes.data?.data) {
        setFinancialData(financialRes.data.data);
      }
      if (declarationRes?.data?.success && declarationRes.data?.data) {
        setDeclarationData(declarationRes.data.data);
      }
    } catch (err) {
      console.warn('Failed to fetch profile details:', err);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  const currentPhoto = profileData?.profilePhoto || member?.profilePhoto;
  const displayName = user?.fullName || profileData?.fullName || 'Member';
  const displayEmail = user?.email || profileData?.email || '';

  // Accordion Item Component
  const AccordionItem = ({ icon, label, isExpanded, onToggle, children }: any) => (
    <View style={styles.accordionContainer}>
      <TouchableOpacity style={styles.accordionHeader} onPress={onToggle} activeOpacity={0.7}>
        <View style={styles.accordionHeaderLeft}>
          <View style={styles.itemIconBadge}>
            <Icon name={icon} size={20} color="#F472B6" />
          </View>
          <Text style={styles.accordionTitle}>{label}</Text>
        </View>
        <Icon name={isExpanded ? 'keyboard-arrow-down' : 'chevron-right'} size={24} color="#64748B" />
      </TouchableOpacity>
      {isExpanded && <View style={styles.accordionContent}>{children}</View>}
    </View>
  );

  const DetailRow = ({ label, value }: { label: string; value: any }) => {
    if (value === undefined || value === null || value === '' || value === 'N/A') return null;
    return (
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value.toString()}</Text>
      </View>
    );
  };

  const DetailList = ({ label, values }: { label: string; values: any }) => {
    let displayValue = '';
    if (Array.isArray(values) && values.filter(v => v.trim()).length > 0) {
      displayValue = values.filter(v => v.trim()).join(', ');
    } else if (typeof values === 'string' && values.trim().length > 0) {
      displayValue = values;
    }

    if (!displayValue || displayValue === 'None') return null;

    return (
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{displayValue}</Text>
      </View>
    );
  };

  const EditButton = ({ label, onPress }: { label: string; onPress: () => void }) => (
    <TouchableOpacity 
      style={styles.editAccordionButton}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Icon name="edit" size={18} color="#1E50E6" style={{ marginRight: 8 }} />
      <Text style={styles.editAccordionButtonText}>{label}</Text>
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
            <Text style={styles.headerTitle}>Profile Settings</Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.userInfoContainer}>
            <View style={styles.avatarContainer}>
              <TouchableOpacity onPress={() => navigation.navigate('EditProfile' as any)} activeOpacity={0.8}>
                {currentPhoto ? (
                  <Image source={{ uri: currentPhoto }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarPlaceholder]}>
                    <Text style={styles.avatarLetter}>
                      {displayName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={styles.editAvatarBadge}>
                  <Icon name="edit" size={12} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{displayName}</Text>
              <Text style={styles.userEmail}>{displayEmail}</Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <View style={styles.sheetContainer}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          <Text style={styles.sectionTitle}>Profile Details</Text>
          
          <AccordionItem 
            icon="person" 
            label="Personal Details" 
            isExpanded={showPersonal}
            onToggle={() => setShowPersonal(!showPersonal)}
          >
            <DetailRow label="Full Name" value={displayName} />
            <DetailRow label="Email" value={displayEmail} />
            <DetailRow label="Phone" value={profileData?.phoneNumber || user?.phoneNumber} />
            <DetailRow label="Religion" value={profileData?.religion} />
            <DetailRow label="Social Category" value={profileData?.socialCategory} />
            <DetailRow label="State" value={profileData?.state} />
            <DetailRow label="District" value={profileData?.district} />
            <DetailRow label="Block" value={profileData?.block} />
            <DetailRow label="City" value={profileData?.city} />
            
            <EditButton 
              label="Edit Personal Details" 
              onPress={() => navigation.navigate('EditProfile' as any)} 
            />
          </AccordionItem>

          <AccordionItem 
            icon="business" 
            label="Business Information" 
            isExpanded={showBusiness}
            onToggle={() => setShowBusiness(!showBusiness)}
          >
            {businessData?.doingBusiness === false ? (
              <>
                <DetailRow label="Business Status" value="Aspirant (Not currently doing business)" />
              </>
            ) : (
              <>
                <DetailRow label="Organization Name" value={businessData?.organizationName} />
                <DetailRow label="Constitution Type" value={businessData?.constitutionType} />
                <DetailRow label="Commencement Year" value={businessData?.businessCommencementYear} />
                <DetailRow label="Number of Employees" value={businessData?.numberOfEmployees} />
                <DetailRow label="Business Activities" value={businessData?.businessActivities} />
                <DetailList label="Business Types" values={businessData?.businessTypes} />
                <DetailList label="Govt Organizations" values={businessData?.govtOrganizations} />
                <DetailRow label="Other Chamber Member?" value={businessData?.memberOfOtherChamber ? 'Yes' : 'No'} />
                {businessData?.memberOfOtherChamber && (
                  <DetailRow label="Other Chamber Name" value={businessData?.otherChamber} />
                )}
              </>
            )}
            
            <EditButton 
              label="Edit Business Info" 
              onPress={() => navigation.navigate('EditBusiness' as any)} 
            />
          </AccordionItem>

          {businessData?.doingBusiness !== false && (
            <>
              <AccordionItem 
                icon="account-balance" 
                label="Financial & Compliance" 
                isExpanded={showFinancial}
                onToggle={() => setShowFinancial(!showFinancial)}
              >
                <DetailRow 
                  label="PAN Number" 
                  value={financialData?.panNumber ? financialData.panNumber : (financialData?.status ? 'True' : 'N/A')} 
                />
                <DetailRow label="GST Number" value={financialData?.gstNumber} />
                <DetailRow label="UDYAM Number" value={financialData?.udyamNumber} />
                <DetailRow label="Filed ITR?" value={financialData?.filedITR ? 'Yes' : 'No'} />
                <DetailRow label="Turnover Range" value={financialData?.turnoverRange} />
                <DetailRow label="Govt Scheme Benefit?" value={financialData?.govtSchemeBenefit ? 'Yes' : 'No'} />
                
                <EditButton 
                  label="Edit Financial Info" 
                  onPress={() => navigation.navigate('EditFinancial' as any)} 
                />
              </AccordionItem>

              <AccordionItem 
                icon="fact-check" 
                label="Declarations" 
                isExpanded={showDeclaration}
                onToggle={() => setShowDeclaration(!showDeclaration)}
              >
                <DetailRow label="Number of Sister Concerns" value={declarationData?.sisterConcerns} />
                <DetailList label="Company Names" values={declarationData?.companyNames} />
                <DetailRow label="Declaration Agreed?" value={declarationData?.agreeToDeclaration ? 'Yes' : 'No'} />
                
                <EditButton 
                  label="Edit Declarations" 
                  onPress={() => navigation.navigate('EditDeclaration' as any)} 
                />
              </AccordionItem>
            </>
          )}

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

          <View style={{ height: 40 }} />
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
    paddingBottom: 40,
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
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F472B6',
  },
  avatarLetter: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  editAvatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: -2,
    backgroundColor: '#1E50E6',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FCE7F3',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '500',
  },
  sheetContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -24,
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
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 16,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  accordionContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    overflow: 'hidden',
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  accordionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FDF2F8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  accordionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
  },
  accordionContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 4,
    backgroundColor: '#FAFAFA',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  detailLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  editAccordionButton: {
    marginTop: 16, 
    backgroundColor: '#EFF6FF', 
    borderWidth: 1,
    borderColor: '#1E50E6',
    borderRadius: 12, 
    padding: 12, 
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  editAccordionButtonText: {
    color: '#1E50E6', 
    fontWeight: '600', 
    fontSize: 14
  },
  logoutContainer: {
    marginTop: 24,
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

export default PaidProfileScreen;

