import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, User } from '../../types';
import { COLORS, FONTS, SPACING } from '../../theme/theme';
import api from '../../services/api';

type UserManagementScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'UserManagement'
>;

interface Props {
  navigation: UserManagementScreenNavigationProp;
}

interface UserWithActions extends User {
  name: string;
  email: string;
  userType: string;
  status: 'active' | 'inactive' | 'suspended';
  lastLogin?: string;
}

const UserManagementScreen: React.FC<Props> = () => {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserWithActions[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserWithActions | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/users');
      const payload = response.data?.data || response.data || {};
      const list = payload.users || payload;
      setUsers(Array.isArray(list) ? list : []);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Derived, not stored in state: no second render pass and no effect loop.
  const filteredUsers = useMemo(() => {
    let filtered = users || [];

    const query = (searchQuery || '').toLowerCase();
    if (query) {
      filtered = filtered.filter(
        user =>
          (user?.name || '').toLowerCase().includes(query) ||
          (user?.email || '').toLowerCase().includes(query)
      );
    }

    if (filterRole) {
      filtered = filtered.filter(user => user?.userType === filterRole);
    }

    return filtered;
  }, [users, searchQuery, filterRole]);

  const handleUserAction = async (userId: string, action: 'activate' | 'suspend' | 'delete') => {
    Alert.alert(
      'Confirm Action',
      `Are you sure you want to ${action} this user?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              await api.post(`/admin/users/${userId}/${action}`);
              Alert.alert('Success', `User ${action}d successfully`);
              fetchUsers();
              setModalVisible(false);
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.message || `Failed to ${action} user`);
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status?: string | null) => {
    switch (status) {
      case 'active': return COLORS.success;
      case 'inactive': return COLORS.textSecondary;
      case 'suspended': return COLORS.error;
      default: return COLORS.textSecondary;
    }
  };

  const renderUserItem = ({ item }: { item: UserWithActions }) => (
    <TouchableOpacity
      style={styles.userCard}
      onPress={() => {
        setSelectedUser(item);
        setModalVisible(true);
      }}
    >
      <View style={styles.userAvatar}>
        <Text style={styles.userAvatarText}>
          {((item?.name || '?').charAt(0) || '?').toUpperCase()}
        </Text>
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item?.name || 'Unnamed user'}</Text>
        <Text style={styles.userEmail}>{item?.email || '—'}</Text>
        <View style={styles.userMeta}>
          <View style={[styles.roleBadge, { backgroundColor: COLORS.primary + '20' }]}>
            <Text style={[styles.roleText, { color: COLORS.primary }]}>{item?.userType || '—'}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item?.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item?.status) }]}>
              {item?.status || 'unknown'}
            </Text>
          </View>
        </View>
        {!!item?.lastLogin && (
          <Text style={styles.lastLogin}>Last login: {item.lastLogin}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderFilterButton = (role: string, label: string) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        filterRole === role && styles.filterButtonActive,
      ]}
      onPress={() => setFilterRole(filterRole === role ? null : role)}
    >
      <Text
        style={[
          styles.filterButtonText,
          filterRole === role && styles.filterButtonTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading users...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>User Management</Text>
        <Text style={styles.headerSubtitle}>Total Users: {(users || []).length}</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or email..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={COLORS.textSecondary}
        />
      </View>

      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        {renderFilterButton('member', 'Members')}
        {renderFilterButton('business', 'Business')}
        {renderFilterButton('block-admin', 'Block Admin')}
        {renderFilterButton('district-admin', 'District Admin')}
        {renderFilterButton('state-admin', 'State Admin')}
      </View>

      {/* Users List */}
      <FlatList
        data={filteredUsers}
        renderItem={renderUserItem}
        keyExtractor={(item, index) => String(item?.id || (item as any)?._id || index)}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={10}
        removeClippedSubviews
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No users found</Text>
          </View>
        }
      />

      {/* User Details Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedUser && (
              <>
                <Text style={styles.modalTitle}>User Details</Text>
                <View style={styles.modalUserInfo}>
                  <Text style={styles.modalLabel}>Name:</Text>
                  <Text style={styles.modalValue}>{selectedUser.name}</Text>
                </View>
                <View style={styles.modalUserInfo}>
                  <Text style={styles.modalLabel}>Email:</Text>
                  <Text style={styles.modalValue}>{selectedUser.email}</Text>
                </View>
                <View style={styles.modalUserInfo}>
                  <Text style={styles.modalLabel}>Role:</Text>
                  <Text style={styles.modalValue}>{selectedUser.userType}</Text>
                </View>
                <View style={styles.modalUserInfo}>
                  <Text style={styles.modalLabel}>Status:</Text>
                  <Text style={[styles.modalValue, { color: getStatusColor(selectedUser.status) }]}>
                    {selectedUser.status}
                  </Text>
                </View>

                <View style={styles.modalActions}>
                  {selectedUser.status === 'active' && (
                    <TouchableOpacity
                      style={[styles.modalButton, { backgroundColor: COLORS.warning }]}
                      onPress={() => handleUserAction(selectedUser.id, 'suspend')}
                    >
                      <Text style={styles.modalButtonText}>Suspend User</Text>
                    </TouchableOpacity>
                  )}
                  {selectedUser.status === 'suspended' && (
                    <TouchableOpacity
                      style={[styles.modalButton, { backgroundColor: COLORS.success }]}
                      onPress={() => handleUserAction(selectedUser.id, 'activate')}
                    >
                      <Text style={styles.modalButtonText}>Activate User</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: COLORS.error }]}
                    onPress={() => handleUserAction(selectedUser.id, 'delete')}
                  >
                    <Text style={styles.modalButtonText}>Delete User</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: COLORS.textSecondary }]}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={styles.modalButtonText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
  },
  header: {
    backgroundColor: COLORS.primary,
    padding: SPACING.lg,
    paddingTop: SPACING.xl,
  },
  headerTitle: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: FONTS.weights.bold,
    color: COLORS.white,
    marginBottom: SPACING.xs,
  },
  headerSubtitle: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.white,
    opacity: 0.9,
  },
  searchContainer: {
    padding: SPACING.md,
  },
  searchInput: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: SPACING.md,
    fontSize: FONTS.sizes.md,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
    flexWrap: 'wrap',
  },
  filterButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    marginRight: SPACING.sm,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterButtonText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textPrimary,
  },
  filterButtonTextActive: {
    color: COLORS.white,
    fontWeight: FONTS.weights.semiBold,
  },
  listContainer: {
    padding: SPACING.md,
  },
  userCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: 8,
    marginBottom: SPACING.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  userAvatarText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.bold,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.semiBold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  userEmail: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  userMeta: {
    flexDirection: 'row',
    marginBottom: SPACING.xs,
  },
  roleBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 12,
    marginRight: SPACING.sm,
  },
  roleText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.semiBold,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 12,
  },
  statusText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.semiBold,
  },
  lastLogin: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
  },
  emptyContainer: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: SPACING.lg,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  modalUserInfo: {
    marginBottom: SPACING.sm,
  },
  modalLabel: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  modalValue: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textPrimary,
    fontWeight: FONTS.weights.semiBold,
  },
  modalActions: {
    marginTop: SPACING.lg,
  },
  modalButton: {
    padding: SPACING.md,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  modalButtonText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.semiBold,
  },
});

export default UserManagementScreen;

