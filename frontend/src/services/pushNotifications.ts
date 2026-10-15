import { useEffect } from 'react';
import { Alert, AppState, DeviceEventEmitter, Linking, PermissionsAndroid, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApps } from '@react-native-firebase/app';
import { getMessaging, getToken, deleteToken, requestPermission, hasPermission, AuthorizationStatus,
  onMessage, onTokenRefresh, onNotificationOpenedApp, getInitialNotification, setBackgroundMessageHandler } from '@react-native-firebase/messaging';
import api, { getAuthToken, getUserData } from './api';
import { navigationRef } from '../navigation/navigationRef';

const TOKEN_KEY = '@activ_push_token';
const ASKED_KEY = '@activ_push_permission_asked';
export const SESSION_CHANGED = 'activ:session-changed';
let pending: Record<string, string> | null = null;
let syncing = false;
let syncAgain = false;
let detaching = false;
export const firebaseReady = () => getApps().length > 0;

export function notificationDestination(data: Record<string, any> = {}): { route: string; params?: any } {
  if (data.kind === 'message' && data.conversationId) return { route: 'MessageThread', params: { conversationId: data.conversationId } };
  if (data.announcementId || data.kind === 'announcement') return { route: 'UpdateDetail', params: { id: data.announcementId || data.sourceId } };
  if (data.eventId) return { route: data.bookingRef ? 'EventBooking' : 'MemberEventDetail', params: { eventId: data.eventId, id: data.eventId, ...(data.bookingRef ? { ref: data.bookingRef } : {}) } };
  if (data.kind === 'news' && data.slug) return { route: 'PublicInfo', params: { path: `/news/${encodeURIComponent(data.slug)}`, title: 'ACTIV news' } };
  if (data.kind === 'gallery' || data.kind === 'scheme') return { route: 'PublicInfo', params: { path: data.kind === 'gallery' ? '/gallery' : '/schemes', title: data.kind === 'gallery' ? 'Gallery' : 'Government schemes' } };
  if (data.orderId) return { route: 'PaymentSuccess', params: { orderId: data.orderId } };
  return { route: 'MemberNotifications' };
}
export async function flushPushNavigation() {
  if (!pending || !navigationRef.isReady()) return;
  const user = await getUserData();
  const token = await getAuthToken();
  if (!token || !user) return;
  const userId = String(user.memberId || user.id || user._id || user.userId || '');
  if (pending.userId && pending.userId !== userId) { pending = null; return; }
  // Session restoration chooses a landing screen before a push opens its target.
  if (['Onboarding', 'Login', 'Welcome', 'SocialSignIn'].includes(navigationRef.getCurrentRoute()?.name || '')) return;
  const target = pending.kind === 'test' && user.role === 'super_admin'
    ? { route: 'SuperNotifications', params: { view: 'delivery' } } : notificationDestination(pending);
  pending = null;
  (navigationRef.navigate as any)(target.route, target.params);
}
async function receiveOpen(message: any) {
  if (message?.data) { pending = message.data; await flushPushNavigation(); }
}
export async function pushPermission() {
  if (!firebaseReady()) return 'unconfigured';
  if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
    return await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS) ? 'enabled' : 'disabled';
  }
  const status = await hasPermission(getMessaging());
  return (status === AuthorizationStatus.AUTHORIZED || status === AuthorizationStatus.PROVISIONAL) ? 'enabled' : 'disabled';
}
async function allowNotifications(explicit = false) {
  if (await pushPermission() === 'enabled') return true;
  if (!explicit && await AsyncStorage.getItem(ASKED_KEY)) return false;
  await AsyncStorage.setItem(ASKED_KEY, 'true');
  if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
    return (await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS)) === PermissionsAndroid.RESULTS.GRANTED;
  }
  const permission = await requestPermission(getMessaging());
  return (permission === AuthorizationStatus.AUTHORIZED || permission === AuthorizationStatus.PROVISIONAL);
}
export async function syncPushRegistration(explicit = false) {
  if (detaching || !firebaseReady()) return;
  if (syncing) { syncAgain = true; return; }
  syncing = true;
  try {
    const auth = await getAuthToken();
    if (!auth) return;
    if (!(await allowNotifications(explicit))) {
      const saved = await AsyncStorage.getItem(TOKEN_KEY);
      if (saved) await api.delete('/notifications/push/devices', { data: { token: saved } });
      return;
    }
    const token = await getToken(getMessaging());
    if (detaching || await getAuthToken() !== auth) return;
    await api.post('/notifications/push/devices', { token, platform: Platform.OS, enabled: true });
    await AsyncStorage.setItem(TOKEN_KEY, token);
  } catch { /* Connectivity/configuration must never block login. Retry on next foreground. */ }
  finally {
    syncing = false;
    if (syncAgain) { syncAgain = false; void syncPushRegistration(); }
  }
}
export async function detachPushDevice(server = true) {
  detaching = true;
  pending = null;
  try {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (server && token && await getAuthToken()) await api.delete('/notifications/push/devices', { data: { token }, timeout: 5000 }).catch(() => undefined);
    if (firebaseReady()) await deleteToken(getMessaging()).catch(() => undefined);
    await AsyncStorage.removeItem(TOKEN_KEY);
  } finally { detaching = false; }
}
export async function enablePushFromSettings() {
  if (!firebaseReady()) { Alert.alert('Notifications are being prepared', 'Push notifications will be available after ACTIV finishes notification setup and publishes the updated app.'); return; }
  await syncPushRegistration(true);
  if (await pushPermission() !== 'enabled') await Linking.openSettings();
}
export function registerBackgroundPush() {
  if (firebaseReady()) setBackgroundMessageHandler(getMessaging(), async () => {
    // FCM/APNs displays the notification payload. Content is fetched only after authenticated navigation.
  });
}
export function usePushNotifications() {
  useEffect(() => {
    if (!firebaseReady()) return;
    const messaging = getMessaging();
    void syncPushRegistration();
    const foreground = onMessage(messaging, async message => {
      const user = await getUserData();
      if (!await getAuthToken() || String(message.data?.userId || '') !== String(user?.memberId || user?.id || user?._id || user?.userId || '')) return;
      DeviceEventEmitter.emit('activ:notification');
      Alert.alert('ACTIV update', 'Dear member, you have a new notification.', [{ text: 'Later', style: 'cancel' }, { text: 'View', onPress: () => void receiveOpen(message) }]);
    });
    const refresh = onTokenRefresh(messaging, () => { void syncPushRegistration(); });
    const opened = onNotificationOpenedApp(messaging, receiveOpen);
    void getInitialNotification(messaging).then(receiveOpen).catch(() => undefined);
    const session = DeviceEventEmitter.addListener(SESSION_CHANGED, () => { void syncPushRegistration(); });
    const appState = AppState.addEventListener('change', state => { if (state === 'active') void syncPushRegistration(); });
    return () => { foreground(); refresh(); opened(); session.remove(); appState.remove(); };
  }, []);
}
