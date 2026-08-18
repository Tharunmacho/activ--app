import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../theme/theme';
import { formatRelativeTime } from '../../utils/formatters';
import api from '../../services/api';
import { ENDPOINTS } from '../../config/api.config';
import { useAuthStore } from '../../stores/exampleStore';
import Icon from 'react-native-vector-icons/MaterialIcons';

const NotificationScreen = () => {
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadNotifications = async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const response = await api.get(ENDPOINTS.NOTIFICATIONS.LIST);
      const payload = response.data?.data || response.data || {};
      const list = payload.notifications || payload;
      setNotifications(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error('Load notifications error:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const markAsRead = async (id?: string) => {
    if (!id) return;
    try {
      // The route is PATCH, not PUT — a PUT here fell through to a 404.
      await api.patch(ENDPOINTS.NOTIFICATIONS.MARK_READ(id));
      setNotifications((prev) =>
        (prev || []).map((notif) =>
          notif?.id === id ? { ...notif, isRead: true } : notif
        )
      );
    } catch (error) {
      console.error('Mark as read error:', error);
    }
  };

  const getIconName = (type?: string | null) => {
    switch (type) {
      case 'success':
        return 'check-circle';
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      default:
        return 'info';
    }
  };

  const getIconColor = (type?: string | null) => {
    switch (type) {
      case 'success':
        return COLORS.success;
      case 'error':
        return COLORS.error;
      case 'warning':
        return COLORS.warning;
      default:
        return COLORS.info;
    }
  };

  const renderNotification = ({ item }: any) => (
    <TouchableOpacity
      style={[styles.notificationCard, !item?.isRead && styles.unreadCard]}
      onPress={() => markAsRead(item?.id || item?._id)}
    >
      <View style={[styles.iconContainer, { backgroundColor: getIconColor(item?.type) + '20' }]}>
        <Icon name={getIconName(item?.type)} size={24} color={getIconColor(item?.type)} />
      </View>
      <View style={styles.notificationContent}>
        <Text style={styles.notificationTitle}>{item?.title || 'Notification'}</Text>
        <Text style={styles.notificationMessage}>{item?.message || ''}</Text>
        <Text style={styles.notificationTime}>
          {formatRelativeTime(item?.createdAt)}
        </Text>
      </View>
      {!item?.isRead && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
      </View>
      {notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="notifications-off" size={64} color={COLORS.border} />
          <Text style={styles.emptyText}>No notifications yet</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={(item: any, index: number) => String(item?.id || item?._id || index)}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={10}
          removeClippedSubviews
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => loadNotifications(true)}
              colors={[COLORS.primary]}
            />
          }
        />
      )}
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
  },
  header: {
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    paddingTop: SPACING.xxl,
    ...SHADOWS.sm,
  },
  title: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textPrimary,
  },
  listContent: {
    padding: SPACING.md,
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  unreadCard: {
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.round,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  notificationMessage: {
    fontSize: FONTS.sizes.base,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  notificationTime: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginLeft: SPACING.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: FONTS.sizes.lg,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
});

export default NotificationScreen;
