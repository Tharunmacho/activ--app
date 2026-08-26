// Products & Services Screen - Isolated Company Catalog System
// Always shows the ACTIVE company's catalog only. Switching companies is done
// on the Business dashboard / Manage Companies, never silently from here.
import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
  StatusBar,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, useRoute, useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../../types';
import api from '../../services/api';
import { ENDPOINTS, resolveMediaUrl } from '../../config/api.config';
import { useActiveCompany, useActiveCompanyStore } from '../../stores/activeCompanyStore';

type ProductsServicesScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'ProductsServices'
>;
type ProductsServicesScreenRouteProp = RouteProp<RootStackParamList, 'ProductsServices'>;

interface Props {
  navigation: ProductsServicesScreenNavigationProp;
}

interface Product {
  _id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  sku: string;
  description?: string;
  imageUrl?: string;
}

const ProductsServicesScreen: React.FC<Props> = ({ navigation }) => {
  const route = useRoute<ProductsServicesScreenRouteProp>();
  const { companyId: routeCompanyId } = route.params || {};

  const selectedCompany = useActiveCompany();
  const setActiveCompany = useActiveCompanyStore((state) => state.setActiveCompany);
  const loadCompanies = useActiveCompanyStore((state) => state.loadCompanies);

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Bumped every time the screen regains focus. The data effects below key off
  // it as well as the company id, so returning here after creating, editing or
  // deleting something re-reads from the server instead of showing the copy
  // fetched the first time this company was selected.
  const [focusTick, setFocusTick] = useState(0);

  useFocusEffect(
    useCallback(() => {
      setFocusTick((tick) => tick + 1);
      // A route param is an explicit switch (e.g. "Products" from Manage
      // Companies) — it becomes the new active company everywhere.
      if (routeCompanyId) {
        setActiveCompany(routeCompanyId);
      }
      loadCompanies();
    }, [routeCompanyId, setActiveCompany, loadCompanies])
  );

  useEffect(() => {
    const companyId = selectedCompany?._id;
    if (!companyId) {
      setProducts([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    fetchProductsForCompany(companyId).finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompany?._id, focusTick]);

  const fetchProductsForCompany = async (targetCompanyId: string) => {
    if (!targetCompanyId) return;
    try {
      const response = await api.get(ENDPOINTS.PRODUCTS.LIST, {
        params: { companyId: targetCompanyId },
      });

      const payload = response.data?.data || [];
      // Belt and braces: the server already scopes by companyId, but never let
      // a stale/mismatched row from another company render here.
      setProducts(
        (Array.isArray(payload) ? payload : []).filter((p: any) => {
          const owner = typeof p?.companyId === 'object' ? p?.companyId?._id : p?.companyId;
          return !owner || String(owner) === String(targetCompanyId);
        })
      );
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
    }
  };

  const handleDeleteProduct = (product: Product) => {
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${product.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              await api.delete(ENDPOINTS.PRODUCTS.DELETE(product._id));
              Alert.alert('Success', 'Product deleted successfully');
              if (selectedCompany?._id) {
                fetchProductsForCompany(selectedCompany._id);
              }
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.message || 'Failed to delete product.');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
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
          <Text style={styles.headerTitle}>Products & Services</Text>
        </View>

        <TouchableOpacity
          onPress={() =>
            selectedCompany?._id
              ? navigation.navigate('AddProduct', { companyId: selectedCompany._id })
              : Alert.alert('Notice', 'Please select or create a company profile first.')
          }
          style={styles.addButtonHeader}
          activeOpacity={0.7}
        >
          <Icon name="add" size={24} color="#7C3AED" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Active Company Banner - this catalog belongs to this company only */}
        <View style={styles.activeCompanyBanner}>
          {selectedCompany?.logo ? (
            <Image source={{ uri: resolveMediaUrl(selectedCompany.logo) }} style={styles.activeCompanyLogo} />
          ) : (
            <View style={styles.activeCompanyLogoPlaceholder}>
              <Icon name="storefront" size={20} color="#7C3AED" />
            </View>
          )}
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.activeCompanyLabel}>ACTIVE CATALOG</Text>
            <Text style={styles.activeCompanyName}>
              {selectedCompany?.businessName || 'No company selected'}
            </Text>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={styles.statIconBoxPurple}>
              <Icon name="inventory-2" size={18} color="#7C3AED" />
            </View>
            <Text style={styles.statTitle}>Products</Text>
            <Text style={styles.statValue}>{(products || []).length}</Text>
            <Text style={styles.statSub}>Total items</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIconBoxGreen}>
              <Icon name="visibility" size={18} color="#10B981" />
            </View>
            <Text style={styles.statTitle}>Views</Text>
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statSub}>Total views</Text>
          </View>
        </View>

        {/* Product Catalog Header */}
        <View style={styles.catalogHeaderRow}>
          <Text style={styles.catalogTitle}>
            Catalog Items ({(products || []).length})
          </Text>
        </View>

        {/* Products List */}
        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#7C3AED" />
          </View>
        ) : products.length > 0 ? (
          products.map((prod) => (
            <View key={prod._id} style={styles.productCard}>
              <View style={styles.cardHeaderRow}>
                {prod.imageUrl ? (
                  <Image source={{ uri: resolveMediaUrl(prod.imageUrl) }} style={styles.productThumbImage} />
                ) : (
                  <View style={styles.iconBox}>
                    <Icon name="inventory-2" size={24} color="#7C3AED" />
                  </View>
                )}
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.productName}>{prod.name}</Text>
                  <Text style={styles.productCategory}>{prod.category || 'General'}</Text>
                  <Text style={styles.productPrice}>₹{prod.price?.toLocaleString('en-IN') || '0'}</Text>
                </View>
                <TouchableOpacity
                  style={styles.deleteIconButton}
                  onPress={() => handleDeleteProduct(prod)}
                  activeOpacity={0.7}
                >
                  <Icon name="delete-outline" size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>

              {prod.description ? (
                <Text style={styles.productDesc} numberOfLines={2}>
                  {prod.description}
                </Text>
              ) : null}

              <View style={styles.badgeRow}>
                <View style={styles.stockBadge}>
                  <Icon name="layers" size={14} color="#7C3AED" style={{ marginRight: 4 }} />
                  <Text style={styles.stockBadgeText}>Stock: {prod.stock || 0}</Text>
                </View>
                {prod.sku ? (
                  <View style={styles.skuBadge}>
                    <Text style={styles.skuBadgeText}>SKU: {prod.sku}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyCard}>
            <View style={styles.emptyGraphicBox}>
              <Icon name="inventory-2" size={48} color="#FFFFFF" />
            </View>
            <Text style={styles.emptyTitle}>No Products Yet</Text>
            <Text style={styles.emptySub}>Add products to start showcasing your business and reach more customers.</Text>
            <TouchableOpacity
              style={styles.addBtnPrimary}
              onPress={() =>
                selectedCompany?._id
                  ? navigation.navigate('AddProduct', { companyId: selectedCompany._id })
                  : Alert.alert('Notice', 'Please select or create a company profile first.')
              }
              activeOpacity={0.85}
            >
              <Icon name="add" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.addBtnPrimaryText}>Add Product</Text>
            </TouchableOpacity>
          </View>
        )}
        {/* Quick Tips */}
        <View style={styles.quickTipsCard}>
          <View style={styles.quickTipsHeader}>
            <Icon name="lightbulb-outline" size={20} color="#7C3AED" />
            <Text style={styles.quickTipsTitle}>Quick Tips</Text>
          </View>
          <View style={styles.quickTipItem}>
            <View style={styles.quickTipDot} />
            <Text style={styles.quickTipText}>Add clear photos and descriptions</Text>
          </View>
          <View style={styles.quickTipItem}>
            <View style={styles.quickTipDot} />
            <Text style={styles.quickTipText}>Set competitive prices</Text>
          </View>
          <View style={styles.quickTipItem}>
            <View style={styles.quickTipDot} />
            <Text style={styles.quickTipText}>Keep your catalog updated</Text>
          </View>
        </View>
      </ScrollView>

      {/* Floating Bottom Navigation Tab Bar */}
      <View style={styles.bottomNavCard}>
        <TouchableOpacity style={styles.navTabItem} activeOpacity={0.7} onPress={() => navigation.navigate('BusinessDashboard')}>
          <Icon name="storefront" size={24} color="#6B7280" />
          <Text style={styles.navTabText}>Business</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navTabItem} activeOpacity={0.7}>
          <Icon name="grid-view" size={24} color="#7C3AED" />
          <Text style={styles.navTabActiveText}>Products</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navTabItem} activeOpacity={0.7} onPress={() => navigation.navigate('Discover')}>
          <Icon name="search" size={24} color="#6B7280" />
          <Text style={styles.navTabText}>Discover</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navTabItem} activeOpacity={0.7} onPress={() => navigation.navigate('Analytics')}>
          <Icon name="bar-chart" size={24} color="#6B7280" />
          <Text style={styles.navTabText}>Analytics</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navTabItem} activeOpacity={0.7} onPress={() => navigation.navigate('Settings')}>
          <Icon name="settings" size={24} color="#6B7280" />
          <Text style={styles.navTabText}>Settings</Text>
        </TouchableOpacity>
      </View>

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
  addButtonHeader: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },

  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 90,
  },

  companySelectorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E9D5FF',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  companyLogo: {
    width: 44,
    height: 44,
    borderRadius: 12,
  },
  companyLogoPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectorLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#7C3AED',
    letterSpacing: 0.5,
  },
  companySelectorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E1B4B',
  },
  switchBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  switchBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7C3AED',
  },

  activeCompanyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: '#E9D5FF',
  },
  activeCompanyLogo: {
    width: 40,
    height: 40,
    borderRadius: 12,
  },
  activeCompanyLogoPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeCompanyLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#7C3AED',
    letterSpacing: 0.5,
  },
  activeCompanyName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E1B4B',
  },

  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F3E8FF',
  },
  statIconBoxPurple: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statIconBoxGreen: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statTitle: {
    fontSize: 13,
    color: '#475569',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1E1B4B',
    marginVertical: 4,
  },
  statSub: {
    fontSize: 11,
    color: '#6B7280',
  },

  catalogHeaderRow: {
    marginBottom: 12,
  },
  catalogTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E1B4B',
  },

  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
  },

  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F3E8FF',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productThumbImage: {
    width: 44,
    height: 44,
    borderRadius: 12,
  },
  productName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E1B4B',
  },
  productCategory: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  productPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: '#7C3AED',
    marginTop: 4,
  },
  deleteIconButton: {
    padding: 8,
  },
  productDesc: {
    fontSize: 13,
    color: '#475569',
    marginTop: 10,
    lineHeight: 18,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  stockBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7C3AED',
  },
  skuBadge: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  skuBadgeText: {
    fontSize: 12,
    color: '#64748B',
  },

  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3E8FF',
  },
  emptyGraphicBox: {
    width: 80,
    height: 64,
    backgroundColor: '#7C3AED',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E1B4B',
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  addBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7C3AED',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
  },
  addBtnPrimaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  quickTipsCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
  },
  quickTipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  quickTipsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E1B4B',
    marginLeft: 8,
  },
  quickTipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  quickTipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#7C3AED',
    marginRight: 10,
  },
  quickTipText: {
    fontSize: 13,
    color: '#475569',
  },

  bottomNavCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 10,
    paddingHorizontal: 6,
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F3E8FF',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  navTabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navTabText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 2,
  },
  navTabActiveText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7C3AED',
    marginTop: 2,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E1B4B',
  },
  modalCompanyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#F8FAFC',
  },
  modalCompanyItemSelected: {
    backgroundColor: '#F3E8FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  modalCompanyName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E1B4B',
  },
  modalCompanyType: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  modalAddCompanyBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: '#7C3AED',
    borderRadius: 14,
    marginTop: 12,
  },
  modalAddCompanyText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#7C3AED',
  },
});

export default ProductsServicesScreen;
