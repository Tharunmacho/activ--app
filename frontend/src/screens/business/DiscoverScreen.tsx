// Discover Screen - Active Company by default, whole network on search
//
// Idle (no search term): shows ONLY the company you have switched to, exactly
// like every other business screen.
// Searching: opens up to the whole network, so a buyer typing "chairs" finds
// every member selling chairs, whoever owns them.
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../../types';
import api from '../../services/api';
import { resolveMediaUrl } from '../../config/api.config';
import { useActiveCompany, useActiveCompanyStore } from '../../stores/activeCompanyStore';

type DiscoverScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Discover'>;

interface Props {
  navigation: DiscoverScreenNavigationProp;
}

interface ProductItem {
  _id: string;
  name?: string;
  category?: string;
  price?: number;
  stock?: number;
  description?: string;
  sku?: string;
  imageUrl?: string;
  isFeatured?: boolean;
  companyId?: any;
}

interface CompanyItem {
  _id: string;
  businessName?: string;
  businessType?: string;
  location?: string;
  area?: string;
  mobileNumber?: string;
  email?: string;
  description?: string;
  logo?: string;
  products?: ProductItem[];
  matchedProducts?: ProductItem[];
}

const SEARCH_DEBOUNCE_MS = 400;

// A single character matches too many names to be a useful search.
const MIN_QUERY_LENGTH = 2;

type DiscoverFilter = 'all' | 'companies' | 'products';

const FILTERS: { key: DiscoverFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'companies', label: 'Companies' },
  { key: 'products', label: 'Products' },
];

const DiscoverScreen: React.FC<Props> = ({ navigation }) => {
  const activeCompany = useActiveCompany();
  const loadCompanies = useActiveCompanyStore((state) => state.loadCompanies);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [filter, setFilter] = useState<DiscoverFilter>('all');
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const requestIdRef = useRef(0);
  // Bumped every time the screen regains focus. The data effects below key off
  // it as well as the company id, so returning here after creating, editing or
  // deleting something re-reads from the server instead of showing the copy
  // fetched the first time this company was selected.
  const [focusTick, setFocusTick] = useState(0);

  useFocusEffect(
    useCallback(() => {
      setFocusTick((tick) => tick + 1);
    }, [])
  );

  // The idle view needs to know which company is active
  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  // Debounce keystrokes so typing doesn't fire a request per character
  useEffect(() => {
    const handle = setTimeout(() => {
      setActiveQuery(searchQuery.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [searchQuery]);

  useEffect(() => {
    fetchDiscoverData(activeQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeQuery, activeCompany?._id, focusTick]);

  const fetchDiscoverData = useCallback(
    async (rawTerm: string) => {
      const term = (rawTerm || '').length >= MIN_QUERY_LENGTH ? rawTerm : '';
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;

      try {
        setIsLoading(true);

        // No search term: stay inside the switched company, like every other
        // business screen. Only its own catalog is fetched.
        if (!term) {
          const companyId = activeCompany?._id;
          if (!companyId) {
            setCompanies([]);
            setProducts([]);
            return;
          }

          const ownRes = await api.get('/products/discover', {
            params: { companyId },
          });

          if (requestIdRef.current !== requestId) return;

          const ownPayload = ownRes.data?.data || ownRes.data || [];
          const ownProducts: ProductItem[] = (Array.isArray(ownPayload) ? ownPayload : []).filter(
            (p: ProductItem) => p && p._id
          );

          setCompanies([{ ...(activeCompany as CompanyItem), products: ownProducts, matchedProducts: [] }]);
          setProducts([]);
          return;
        }

        // Search term present: open up to the whole network
        const params = { q: term };

        const [compRes, prodRes] = await Promise.allSettled([
          api.get('/business-profiles/discover', { params }),
          api.get('/products/discover', { params }),
        ]);

        // A slower earlier request must not overwrite a newer result
        if (requestIdRef.current !== requestId) return;

        let compList: CompanyItem[] = [];
        if (compRes.status === 'fulfilled') {
          const payload = compRes.value.data?.data || compRes.value.data || [];
          compList = Array.isArray(payload) ? payload : [];
        }

        let prodList: ProductItem[] = [];
        if (prodRes.status === 'fulfilled') {
          const payload = prodRes.value.data?.data || prodRes.value.data || [];
          prodList = Array.isArray(payload) ? payload : [];
        }

        // Drop obvious test rows from the public directory
        compList = compList.filter((c) => {
          const name = (c?.businessName || '').toLowerCase();
          return name && !name.includes('test company') && !name.includes('dummy');
        });

        setCompanies(compList);
        setProducts(prodList.filter((p) => p && p._id));
      } catch (error) {
        console.log('Error fetching discover data:', error);
        if (requestIdRef.current === requestId) {
          setCompanies([]);
          setProducts([]);
        }
      } finally {
        if (requestIdRef.current === requestId) {
          setIsLoading(false);
        }
      }
    },
    [activeCompany]
  );

  const hasQuery = activeQuery.length >= MIN_QUERY_LENGTH;
  const isTermTooShort = activeQuery.length > 0 && !hasQuery;

  const includesTerm = useCallback(
    (value?: string | null) => {
      const term = (activeQuery || '').toLowerCase();
      if (!term) return false;
      return (value || '').toLowerCase().includes(term);
    },
    [activeQuery]
  );

  // Match only what a person actually types a search for - the item's own
  // name / category / sku. Free-text description is deliberately excluded:
  // matching it is what made a short term pull in the whole directory.
  const productMatchesQuery = useCallback(
    (p?: ProductItem | null) =>
      !!p && (includesTerm(p.name) || includesTerm(p.category) || includesTerm(p.sku)),
    [includesTerm]
  );

  const companyMatchesQuery = useCallback(
    (c?: CompanyItem | null) =>
      !!c && (includesTerm(c.businessName) || includesTerm(c.businessType)),
    [includesTerm]
  );

  // Product hits are what a buyer typing "chairs" actually wants to see first
  const productResults = useMemo(() => {
    if (!hasQuery || filter === 'companies') return [];
    return (products || []).filter((p) => p && p.name && productMatchesQuery(p));
  }, [products, hasQuery, filter, productMatchesQuery]);

  // A company survives only if its own name/type matches, or it owns a product
  // that matches. This re-checks locally so nothing loose can leak through.
  //
  // Product hits are then folded into their seller's card, so a search for
  // "chairs" renders the same detailed company card as a search for the
  // business name - never a thinner, different-looking result row.
  const companyResults = useMemo(() => {
    if (!hasQuery) return companies || [];

    const byId = new Map<string, CompanyItem>();

    (companies || []).forEach((c) => {
      if (!c?._id) return;
      const nameHit = companyMatchesQuery(c);
      const productHit = (c?.matchedProducts || []).some(productMatchesQuery);
      if (!nameHit && !productHit) return;
      if (filter === 'companies' && !nameHit) return;
      if (filter === 'products' && !productHit) return;
      byId.set(String(c._id), c);
    });

    // A matching product whose seller the company search didn't return still
    // deserves a card - build one from the populated companyId.
    if (filter !== 'companies') {
      (productResults || []).forEach((prod) => {
        const seller =
          prod?.companyId && typeof prod.companyId === 'object' ? prod.companyId : null;
        const sellerId = seller?._id ? String(seller._id) : '';
        if (!sellerId) return;

        const existing = byId.get(sellerId);
        if (!existing) {
          byId.set(sellerId, { ...seller, products: [prod], matchedProducts: [prod] });
          return;
        }

        const known = new Set((existing.matchedProducts || []).map((p) => String(p?._id)));
        if (!known.has(String(prod?._id))) {
          byId.set(sellerId, {
            ...existing,
            matchedProducts: [...(existing.matchedProducts || []), prod],
          });
        }
      });
    }

    return Array.from(byId.values());
  }, [companies, productResults, hasQuery, filter, companyMatchesQuery, productMatchesQuery]);

  const renderCompanyCard = (item: CompanyItem) => {
    const catalog = item.products || [];
    const matched = (item.matchedProducts || []).filter(productMatchesQuery);
    const highlightIds = new Set(matched.map((p) => String(p?._id)));
    // The company itself matched -> show its catalog, hits first.
    // It only surfaced via a product -> show that product alone, so searching
    // "chairs" doesn't dump every other item the seller stocks.
    const ordered = !hasQuery
      ? catalog
      : companyMatchesQuery(item)
      ? [...matched, ...catalog.filter((p) => !highlightIds.has(String(p?._id)))]
      : matched;

    return (
      <View key={item._id} style={styles.companyCard}>
        <View style={styles.companyHeader}>
          {item.logo ? (
            <Image source={{ uri: resolveMediaUrl(item.logo) }} style={styles.companyLogo} />
          ) : (
            <View style={styles.companyLogoPlaceholder}>
              <Icon name="business" size={28} color="#7C3AED" />
            </View>
          )}
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.companyName}>{item.businessName || 'Business'}</Text>
            <Text style={styles.companyType}>{item.businessType || 'Manufacturing'}</Text>

            <View style={styles.locationRow}>
              <Icon name="location-on" size={14} color="#6B7280" style={{ marginRight: 2 }} />
              <Text style={styles.locationText}>
                {item.location || 'Tamil Nadu'}
                {item.area ? `, ${item.area}` : ''}
              </Text>
            </View>

            {item.mobileNumber ? (
              <View style={styles.phoneRow}>
                <Icon name="phone" size={14} color="#7C3AED" style={{ marginRight: 4 }} />
                <Text style={styles.phoneText}>{item.mobileNumber}</Text>
              </View>
            ) : null}

            {item.email ? (
              <View style={styles.phoneRow}>
                <Icon name="email" size={14} color="#6B7280" style={{ marginRight: 4 }} />
                <Text style={styles.emailText} numberOfLines={1}>
                  {item.email}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {item.description ? (
          <Text style={styles.companyDesc} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}

        {ordered.length > 0 ? (
          <View style={styles.productsContainer}>
            <Text style={styles.productsHeaderLabel}>
              {hasQuery && !companyMatchesQuery(item)
                ? `Matching Products (${ordered.length})`
                : `Products & Services (${ordered.length})`}
            </Text>

            {ordered.map((prod, index) => {
              const isMatch = highlightIds.has(String(prod?._id));
              return (
                <View
                  key={String(prod?._id || index)}
                  style={[styles.productRow, isMatch && styles.productRowMatch]}
                >
                  {prod?.imageUrl ? (
                    <Image
                      source={{ uri: resolveMediaUrl(prod.imageUrl) }}
                      style={styles.productRowImage}
                    />
                  ) : (
                    <View style={styles.productRowImagePlaceholder}>
                      <Icon name="inventory-2" size={20} color="#7C3AED" />
                    </View>
                  )}

                  <View style={styles.productRowBody}>
                    <Text style={styles.productRowName} numberOfLines={1}>
                      {prod?.name || 'Item'}
                    </Text>
                    <Text style={styles.productRowMeta} numberOfLines={1}>
                      {prod?.category || 'General'}
                      {prod?.sku ? ` · ${prod.sku}` : ''}
                    </Text>
                    {prod?.description ? (
                      <Text style={styles.productRowDesc} numberOfLines={2}>
                        {prod.description}
                      </Text>
                    ) : null}
                  </View>

                  <View style={styles.productRowRight}>
                    <Text style={styles.productRowPrice}>
                      ₹{Number(prod?.price || 0).toLocaleString('en-IN')}
                    </Text>
                    {prod?.stock ? (
                      <View style={styles.stockPill}>
                        <Text style={styles.stockPillText}>Stock {prod.stock}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}
      </View>
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
          <Text style={styles.headerTitle}>Discover Network</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Icon name="search" size={22} color="#7C3AED" style={{ marginRight: 10 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search any product or company (e.g. chairs)..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="close" size={18} color="#64748B" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Result-type filters */}
        <View style={styles.filterRow}>
          {FILTERS.map((f) => {
            const isActive = filter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterPill, isActive && styles.filterPillActive]}
                onPress={() => setFilter(f.key)}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Banner - explains which of the two modes the screen is in */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Icon name="travel-explore" size={22} color="#7C3AED" style={{ marginRight: 8 }} />
            <Text style={styles.cardHeaderTitle}>
              {hasQuery ? 'Statewide Business Network' : 'Your Active Company'}
            </Text>
          </View>
          <Text style={styles.cardSub}>
            {hasQuery
              ? `Showing only results matching "${activeQuery}".`
              : isTermTooShort
              ? `Type at least ${MIN_QUERY_LENGTH} characters to search the network.`
              : `Showing ${activeCompany?.businessName || 'your company'} only. Type a product or company name to search the whole network.`}
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#7C3AED" />
            <Text style={styles.loadingText}>
              {hasQuery ? 'Searching the business network...' : 'Loading your catalog...'}
            </Text>
          </View>
        ) : (
          <>
            {companyResults.length > 0 ? (
              <>
                <Text style={styles.sectionTitle}>
                  {hasQuery ? `Results (${companyResults.length})` : 'Your Business'}
                </Text>
                {companyResults.map(renderCompanyCard)}
              </>
            ) : null}

            {companyResults.length === 0 ? (
              <View style={styles.emptyCard}>
                <Icon name="travel-explore" size={54} color="#7C3AED" />
                <Text style={styles.emptyTitle}>
                  {hasQuery ? 'No Matching Results' : 'No Active Company'}
                </Text>
                <Text style={styles.emptySub}>
                  {hasQuery
                    ? `No ${
                        filter === 'companies'
                          ? 'businesses'
                          : filter === 'products'
                          ? 'products'
                          : 'products or businesses'
                      } matching "${activeQuery}"`
                    : isTermTooShort
                    ? `Type at least ${MIN_QUERY_LENGTH} characters to search.`
                    : 'Switch to a company from the Business dashboard to see it here.'}
                </Text>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>

      {/* Floating Bottom Navigation Tab Bar */}
      <View style={styles.bottomNavCard}>
        <TouchableOpacity
          style={styles.navTabItem}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('BusinessDashboard')}
        >
          <Icon name="storefront" size={24} color="#6B7280" />
          <Text style={styles.navTabText}>Business</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navTabItem}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('ProductsServices', {})}
        >
          <Icon name="grid-view" size={24} color="#6B7280" />
          <Text style={styles.navTabText}>Products</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navTabItem} activeOpacity={0.7}>
          <Icon name="search" size={24} color="#7C3AED" />
          <Text style={styles.navTabActiveText}>Discover</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navTabItem}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('Analytics')}
        >
          <Icon name="bar-chart" size={24} color="#6B7280" />
          <Text style={styles.navTabText}>Analytics</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navTabItem}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('Settings')}
        >
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
  emailText: {
    flex: 1,
    fontSize: 12,
    color: '#6B7280',
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    padding: 10,
    marginTop: 10,
  },
  productRowMatch: {
    borderColor: '#7C3AED',
    backgroundColor: '#FAF5FF',
  },
  productRowImage: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#F3E8FF',
  },
  productRowImagePlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productRowBody: {
    flex: 1,
    marginLeft: 10,
    marginRight: 8,
  },
  productRowName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E1B4B',
  },
  productRowMeta: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  productRowDesc: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 3,
  },
  productRowRight: {
    alignItems: 'flex-end',
  },
  productRowPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: '#7C3AED',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  filterPill: {
    flex: 1,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterPillActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
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
    paddingBottom: 90,
  },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 50,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F3E8FF',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1E1B4B',
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
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
    marginBottom: 8,
  },
  cardHeaderTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E1B4B',
  },
  cardSub: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E1B4B',
    marginBottom: 10,
    marginTop: 4,
  },

  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#6B7280',
  },

  companyCard: {
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
  companyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  companyLogo: {
    width: 52,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F3E8FF',
  },
  companyLogoPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  companyName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E1B4B',
  },
  companyType: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7C3AED',
    marginTop: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  locationText: {
    fontSize: 12,
    color: '#6B7280',
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  phoneText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#7C3AED',
  },
  companyDesc: {
    fontSize: 13,
    color: '#475569',
    marginTop: 10,
    lineHeight: 18,
  },

  productsContainer: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3E8FF',
  },
  productsHeaderLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E1B4B',
    marginBottom: 8,
  },

  stockPill: {
    backgroundColor: '#F3E8FF',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  stockPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7C3AED',
  },


  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3E8FF',
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E1B4B',
    marginTop: 14,
  },
  emptySub: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 6,
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
});

export default DiscoverScreen;
