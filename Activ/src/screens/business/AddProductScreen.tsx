// Add Product Screen - Business Card Theme Form System
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, useRoute } from '@react-navigation/native';
import { launchImageLibrary } from 'react-native-image-picker';
import { RootStackParamList } from '../../types';
import api from '../../services/api';
import { ENDPOINTS } from '../../config/api.config';
import { useActiveCompany } from '../../stores/activeCompanyStore';

type AddProductScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'AddProduct'>;
type AddProductScreenRouteProp = RouteProp<RootStackParamList, 'AddProduct'>;

interface Props {
  navigation: AddProductScreenNavigationProp;
}

const CATEGORIES = [
  'Software',
  'Services',
  'Education',
  'Product',
  'Hardware',
  'Electronics',
  'Clothing',
  'Food',
  'Books',
  'Toys',
  'Furniture',
  'Sports',
  'Beauty',
  'Other',
];

const AddProductScreen: React.FC<Props> = ({ navigation }) => {
  const route = useRoute<AddProductScreenRouteProp>();
  const { companyId: routeCompanyId } = route.params || {};

  // Fall back to the active company so a product can never be filed against
  // whichever company the server happens to consider "latest".
  const activeCompany = useActiveCompany();
  const companyId = routeCompanyId || activeCompany?._id || '';

  const [formData, setFormData] = useState({
    productName: '',
    description: '',
    category: '',
    price: '',
    stock: '',
    sku: '',
  });

  const [imageAsset, setImageAsset] = useState<any>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSaving, setIsSaving] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleImagePicker = () => {
    try {
      if (typeof launchImageLibrary !== 'function') {
        Alert.alert('Unavailable', 'The photo picker is not available on this device.');
        return;
      }

      launchImageLibrary(
        {
          mediaType: 'photo',
          // Square-ish source keeps the round preview from cropping oddly.
          maxWidth: 1000,
          maxHeight: 1000,
          quality: 0.9,
          selectionLimit: 1,
        },
        (response) => {
          if (response.didCancel) return;
          if (response.errorCode) {
            Alert.alert('Error', response.errorMessage || 'Failed to select image. Please try again.');
            return;
          }

          const asset = (response.assets || [])[0];
          if (!asset?.uri) {
            Alert.alert('Error', 'That image could not be read. Please pick another.');
            return;
          }

          setImageAsset(asset);
          setImagePreview(asset.uri);
        }
      );
    } catch (err) {
      console.warn('Native module call safely caught:', err);
      Alert.alert('Error', 'Could not open the photo picker.');
    }
  };

  const validate = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.productName.trim()) newErrors.productName = 'Product name is required';
    if (!formData.category) newErrors.category = 'Category is required';
    if (!formData.price.trim()) newErrors.price = 'Price is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setIsSaving(true);

    try {
      if (imageAsset && imageAsset.uri) {
        const formDataToSend = new FormData();
        if (companyId) {
          formDataToSend.append('companyId', companyId);
        }
        formDataToSend.append('name', formData.productName.trim());
        formDataToSend.append('productName', formData.productName.trim());
        formDataToSend.append('category', formData.category);
        formDataToSend.append('price', formData.price.trim());
        formDataToSend.append('stock', formData.stock.trim() || '0');
        formDataToSend.append('sku', formData.sku.trim() || `SKU-${Date.now()}`);

        if (formData.description.trim()) {
          formDataToSend.append('description', formData.description.trim());
        }

        formDataToSend.append('image', {
          uri: imageAsset.uri,
          type: imageAsset.type || 'image/jpeg',
          name: imageAsset.fileName || `product-${Date.now()}.jpg`,
        } as any);

        const response = await api.post(ENDPOINTS.PRODUCTS.CREATE, formDataToSend, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        if (response.data && (response.data.success || response.data.data)) {
          Alert.alert('Success', 'Product / Service added successfully!', [
            { text: 'OK', onPress: () => navigation.goBack() },
          ]);
        } else {
          throw new Error(
            response.data?.message || 'Server did not confirm the product was saved.'
          );
        }
      } else {
        const payload = {
          companyId,
          name: formData.productName.trim(),
          productName: formData.productName.trim(),
          category: formData.category,
          price: parseFloat(formData.price) || 0,
          stock: parseInt(formData.stock) || 0,
          sku: formData.sku.trim() || `SKU-${Date.now()}`,
          description: formData.description.trim(),
        };

        const response = await api.post(ENDPOINTS.PRODUCTS.CREATE, payload);

        if (response.data && (response.data.success || response.data.data)) {
          Alert.alert('Success', 'Product / Service added successfully!', [
            { text: 'OK', onPress: () => navigation.goBack() },
          ]);
        } else {
          throw new Error(
            response.data?.message || 'Server did not confirm the product was saved.'
          );
        }
      }
    } catch (error: any) {
      console.error('Error creating product:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to add product. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F7FD" />

      {/* Nav Header */}
      <View style={styles.navHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.7}>
          <Icon name="arrow-back" size={24} color="#1E1B4B" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Add Product / Service</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Upload Image Section Card */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Icon name="inventory-2" size={22} color="#7C3AED" style={{ marginRight: 8 }} />
              <Text style={styles.cardHeaderTitle}>Product Media</Text>
            </View>

            <TouchableOpacity
              style={styles.uploadContainer}
              onPress={handleImagePicker}
              activeOpacity={0.8}
            >
              {imagePreview ? (
                <View style={styles.imagePreviewWrapper}>
                  <View style={styles.avatarFrame}>
                    <View style={styles.avatarClip}>
                      <Image
                        source={{ uri: imagePreview }}
                        style={styles.uploadImagePreview}
                        resizeMode="cover"
                      />
                    </View>

                    <View style={styles.avatarBadge}>
                      <Icon name="photo-camera" size={18} color="#FFFFFF" />
                    </View>
                  </View>

                  <Text style={styles.changeHint}>Tap to change photo</Text>
                </View>
              ) : (
                <>
                  <View style={styles.uploadIconCircle}>
                    <Icon name="cloud-upload" size={32} color="#7C3AED" />
                  </View>
                  <Text style={styles.uploadTitle}>Upload Product Image</Text>
                  <Text style={styles.uploadHint}>JPG or PNG formats supported</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Product Details Card */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Icon name="info" size={22} color="#7C3AED" style={{ marginRight: 8 }} />
              <Text style={styles.cardHeaderTitle}>Product Details</Text>
            </View>

            {/* Product Name */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Product Name *</Text>
              <View style={[styles.inputContainer, errors.productName ? styles.inputError : null]}>
                <Icon name="shopping-bag" size={20} color="#7C3AED" style={styles.fieldLeftIcon} />
                <TextInput
                  style={styles.textInput}
                  value={formData.productName}
                  onChangeText={(value) => handleInputChange('productName', value)}
                  placeholder="Enter product / service name"
                  placeholderTextColor="#94A3B8"
                />
              </View>
              {errors.productName ? <Text style={styles.errorText}>{errors.productName}</Text> : null}
            </View>

            {/* Description */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Description</Text>
              <View style={[styles.inputContainer, styles.textAreaContainer]}>
                <Icon name="description" size={20} color="#7C3AED" style={styles.fieldLeftIconTop} />
                <TextInput
                  style={[styles.textInput, styles.textAreaInput]}
                  value={formData.description}
                  onChangeText={(value) => handleInputChange('description', value)}
                  placeholder="Describe your product features & specifications..."
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            </View>

            {/* Category Pill Grid */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Category *</Text>
              
              <View style={styles.pillGrid}>
                {CATEGORIES.map((cat) => {
                  const isActive = formData.category === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.pillCard, isActive && styles.pillCardActive]}
                      onPress={() => handleInputChange('category', cat)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.pillText, isActive && styles.pillTextActive]}>{cat}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {errors.category ? <Text style={styles.errorText}>{errors.category}</Text> : null}
            </View>
          </View>

          {/* Pricing & Inventory Card */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Icon name="sell" size={22} color="#7C3AED" style={{ marginRight: 8 }} />
              <Text style={styles.cardHeaderTitle}>Pricing & Inventory</Text>
            </View>

            {/* Price */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Price (₹) *</Text>
              <View style={[styles.inputContainer, errors.price ? styles.inputError : null]}>
                <Icon name="currency-rupee" size={20} color="#7C3AED" style={styles.fieldLeftIcon} />
                <TextInput
                  style={styles.textInput}
                  value={formData.price}
                  onChangeText={(value) => handleInputChange('price', value)}
                  placeholder="0.00"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                />
              </View>
              {errors.price ? <Text style={styles.errorText}>{errors.price}</Text> : null}
            </View>

            {/* Stock Quantity */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Stock Quantity</Text>
              <View style={styles.inputContainer}>
                <Icon name="layers" size={20} color="#7C3AED" style={styles.fieldLeftIcon} />
                <TextInput
                  style={styles.textInput}
                  value={formData.stock}
                  onChangeText={(value) => handleInputChange('stock', value)}
                  placeholder="e.g. 100"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* SKU */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>SKU / Code</Text>
              <View style={styles.inputContainer}>
                <Icon name="qr-code" size={20} color="#7C3AED" style={styles.fieldLeftIcon} />
                <TextInput
                  style={styles.textInput}
                  value={formData.sku}
                  onChangeText={(value) => handleInputChange('sku', value)}
                  placeholder="e.g. PRD-2024-001"
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>
          </View>

          {/* Action Button */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.publishButton}
              onPress={handleSave}
              disabled={isSaving}
              activeOpacity={0.85}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.publishButtonText}>Publish Product</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F7FD',
  },
  navHeader: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#F7F7FD',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E1B4B',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F3E8FF',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E1B4B',
  },

  uploadContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    borderRadius: 14,
    backgroundColor: '#F3E8FF',
    borderWidth: 1.5,
    borderColor: '#DDD6FE',
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  uploadIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  uploadTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#7C3AED',
  },
  uploadHint: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  imagePreviewWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFrame: {
    width: 132,
    height: 132,
    position: 'relative',
  },
  avatarClip: {
    width: 132,
    height: 132,
    borderRadius: 66,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  uploadImagePreview: {
    width: '100%',
    height: '100%',
  },
  avatarBadge: {
    position: 'absolute',
    right: 0,
    bottom: 4,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#F3E8FF',
  },
  changeHint: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7C3AED',
    marginTop: 12,
  },

  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E1B4B',
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
  },
  inputError: {
    borderColor: '#EF4444',
  },
  fieldLeftIcon: {
    marginRight: 10,
  },
  fieldLeftIconTop: {
    marginRight: 10,
    marginTop: 2,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: '#1E1B4B',
  },
  dropdownValueText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E1B4B',
  },
  placeholderText: {
    color: '#94A3B8',
    fontWeight: '400',
  },
  pillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  pillCard: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pillCardActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  pillTextActive: {
    color: '#FFFFFF',
  },
  textAreaContainer: {
    height: 'auto',
    alignItems: 'flex-start',
    paddingVertical: 10,
  },
  textAreaInput: {
    minHeight: 60,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },

  buttonRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  publishButton: {
    flex: 1,
    height: 52,
    backgroundColor: '#7C3AED',
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  publishButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default AddProductScreen;
