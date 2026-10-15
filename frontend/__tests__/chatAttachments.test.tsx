import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { FlatList, Keyboard, NativeModules, Platform, Text, TextInput, View } from 'react-native';
import { pick, keepLocalCopy } from '@react-native-documents/picker';
import MessageThreadScreen from '../src/screens/member/messages/MessageThreadScreen';
import { getThread, sendMessage, uploadMessageAttachment } from '../src/services/memberApi';
import { downloadChatAttachment, pickChatDocument, validateChatFile } from '../src/services/messageAttachments';
import { getAuthToken } from '../src/services/api';
import { keyboardOverlap } from '../src/screens/member/messages/useThreadKeyboard';

jest.mock('@react-navigation/native', () => ({ useFocusEffect: (callback: any) => require('react').useEffect(callback, [callback]) }));
jest.mock('../src/screens/member/useMemberAccess', () => ({ useMemberAccess: () => ({ profile: { memberType: 'aspirant', membershipStatus: 'active' } }) }));
jest.mock('../src/services/memberApi', () => ({ getThread: jest.fn(), sendMessage: jest.fn(), markConversationRead: jest.fn(), uploadMessageAttachment: jest.fn() }));
jest.mock('../src/services/api', () => ({ getAuthToken: jest.fn() }));
jest.mock('../src/services/downloadsPermission', () => ({ ensureDownloadsPermission: jest.fn(async () => {}) }));
jest.mock('../src/config/api.config', () => ({ API_BASE_URL: 'https://api.activ.org.in/api/v1', resolveMediaUrl: (value: string) => value }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 24, left: 0, right: 0 }) }));
jest.mock('../src/ui', () => {
  const React = require('react'); const { View, Text, Pressable } = require('react-native');
  return {
    ...jest.requireActual('../src/ui'),
    PremiumTopBar: ({ title }: any) => <Text>{title}</Text>,
    GradientAvatar: () => null, GradientGlyph: () => null, ArtBadge: () => null, ChatBubbles3D: () => null,
    CardSkeletons: () => null, StateView: ({ message }: any) => <Text>{message}</Text>,
    FitImage: ({ uri, ...props }: any) => <View {...props} testID="chat-image" accessibilityLabel={uri} />,
    Notice: ({ text }: any) => <Text>{text}</Text>,
    PressableScale: ({ children, ...props }: any) => <Pressable {...props}>{children}</Pressable>,
  };
});

const id = '764b0ba0-29c9-4d08-bc82-146dc046188a';
const receipt = { id, url: `/api/v1/messages/attachments/${id}`, name: 'quote.pdf', mimeType: 'application/pdf', size: 100, kind: 'file' as const, token: 'signed-upload' };
const message = (key: string, at = '2026-10-15T10:00:00Z') => ({ id: key, body: key, at, mine: false });
let tree: Renderer.ReactTestRenderer | null = null;
let listeners: Record<string, (event?: any) => void>;
let frameBottom: number;
let scroll: jest.SpyInstance;
const nodeText = () => tree!.root.findAllByType(Text).map(node => React.Children.toArray(node.props.children).filter(value => typeof value === 'string' || typeof value === 'number').join('')).join('\n');
const button = (label: string) => tree!.root.findAll(node => node.props.accessibilityLabel === label && typeof node.props.onPress === 'function')[0];
const press = async (label: string) => { await act(async () => { await button(label).props.onPress(); }); };
const list = () => tree!.root.findByType(FlatList);
const render = async () => { await act(async () => { tree = Renderer.create(<MessageThreadScreen navigation={{ goBack: jest.fn(), navigate: jest.fn() }} route={{ params: { conversationId: 'thread' } }} />, {
  createNodeMock: () => ({ measureInWindow: (callback: any) => callback(0, 0, 390, frameBottom) }),
}); }); };
const choosePdf = async () => {
  (pick as jest.Mock).mockResolvedValue([{ uri: 'content://quote', name: 'quote.pdf', type: 'application/pdf', size: 100 }]);
  (keepLocalCopy as jest.Mock).mockResolvedValue([{ status: 'success', localUri: 'file:///cache/quote.pdf' }]);
  await press('Attach a photo or document'); await press('Choose a document');
};

beforeEach(() => {
  jest.useFakeTimers(); jest.clearAllMocks(); listeners = {}; frameBottom = 800;
  Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
  jest.spyOn(Keyboard, 'addListener').mockImplementation((event, callback) => { listeners[event] = callback; return { remove: jest.fn() } as any; });
  jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => {});
  jest.spyOn(View.prototype, 'measureInWindow').mockImplementation((callback: any) => callback(0, 0, 390, frameBottom));
  scroll = jest.spyOn(FlatList.prototype, 'scrollToEnd').mockImplementation(() => {});
  (getThread as jest.Mock).mockResolvedValue({ conversation: { withMember: { fullName: 'Member' } }, messages: [message('recent')], hasMore: false });
  (uploadMessageAttachment as jest.Mock).mockResolvedValue(receipt);
  (sendMessage as jest.Mock).mockResolvedValue({ ...message('sent'), mine: true, body: '', attachmentUrl: receipt.url, attachment: receipt });
});
afterEach(async () => { if (tree) await act(async () => tree!.unmount()); tree = null; jest.restoreAllMocks(); jest.useRealTimers(); });

test('keyboard overlap lifts composer only by the part Android did not resize', async () => {
  expect(keyboardOverlap(800, 500)).toBe(300); expect(keyboardOverlap(500, 500)).toBe(0);
  await render();
  await act(async () => listeners.keyboardDidShow({ endCoordinates: { screenY: 500 } }));
  expect(tree!.root.findByProps({ testID: 'chat-keyboard-frame' }).props.style[1].paddingBottom).toBe(300);
  expect(tree!.root.findByType(TextInput).props.accessibilityLabel).toBe('Message');
  frameBottom = 500;
  await act(async () => tree!.root.findAll(node => typeof node.props.onLayout === 'function')[0].props.onLayout());
  expect(tree!.root.findByProps({ testID: 'chat-keyboard-frame' }).props.style[1].paddingBottom).toBe(0);
  await act(async () => listeners.keyboardDidHide());
  expect(tree!.root.findByProps({ testID: 'chat-keyboard-frame' }).props.style[1].paddingBottom).toBe(0);
});

test('history readers retain their position during resize and can jump back to latest', async () => {
  await render(); scroll.mockClear();
  await act(async () => {
    list().props.onScrollBeginDrag();
    list().props.onScroll({ nativeEvent: { contentOffset: { y: 0 }, contentSize: { height: 1500 }, layoutMeasurement: { height: 500 } } });
    list().props.onScrollEndDrag();
    list().props.onContentSizeChange(); list().props.onLayout();
  });
  expect(scroll).not.toHaveBeenCalled();
  await press('Jump to latest messages'); expect(scroll).toHaveBeenCalled();
});

test('attachment preview is removable before uploading and documents never render as pictures', async () => {
  await render(); await choosePdf();
  expect(nodeText()).toContain('quote.pdf'); expect(nodeText()).toContain('Caption optional');
  expect(tree!.root.findAllByProps({ testID: 'chat-image' })).toHaveLength(0);
  expect(uploadMessageAttachment).not.toHaveBeenCalled();
  await press('Remove attachment'); expect(nodeText()).not.toContain('quote.pdf');
});

test('failed send preserves document and caption; retry reuses verified upload receipt', async () => {
  (sendMessage as jest.Mock).mockRejectedValueOnce(new Error('Please try again.'));
  await render(); await choosePdf();
  await act(async () => tree!.root.findByType(TextInput).props.onChangeText('Quotation attached'));
  await press('Send'); expect(nodeText()).toContain('quote.pdf');
  expect(tree!.root.findByType(TextInput).props.value).toBe('Quotation attached');
  await press('Send');
  expect(uploadMessageAttachment).toHaveBeenCalledTimes(1);
  expect(sendMessage).toHaveBeenLastCalledWith('thread', 'Quotation attached', receipt.url, receipt);
  expect(button('Download quote.pdf')).toBeDefined();
  expect(tree!.root.findAllByProps({ testID: 'chat-image' })).toHaveLength(0);
});

test('polling keeps loaded history while adding the latest messages and read receipts', async () => {
  (getThread as jest.Mock).mockResolvedValueOnce({ messages: [message('recent')], hasMore: true })
    .mockResolvedValueOnce({ messages: [message('old', '2026-10-14T10:00:00Z')], hasMore: false })
    .mockResolvedValue({ messages: [message('recent'), message('new', '2026-10-15T11:00:00Z')], hasMore: true });
  await render();
  await act(async () => list().props.ListHeaderComponent.props.onPress());
  await act(async () => { jest.advanceTimersByTime(10000); });
  const ids = list().props.data.filter((row: any) => row.kind === 'msg').map((row: any) => row.m.id);
  expect(ids).toEqual(['old', 'recent', 'new']);
});

test('picker rejects oversized/spoofed files and cancellation leaves the draft alone', async () => {
  expect(() => validateChatFile('report.exe', 'application/pdf', 10)).toThrow();
  expect(() => validateChatFile('report.pdf', 'text/html', 10)).toThrow();
  expect(() => validateChatFile('report.pdf', 'application/pdf', 10 * 1024 * 1024 + 1)).toThrow('10 MB');
  expect(() => validateChatFile('photo.jpg', 'image/jpeg', 5 * 1024 * 1024 + 1)).toThrow('5 MB');
  (pick as jest.Mock).mockRejectedValue({ code: 'OPERATION_CANCELED' });
  expect(await pickChatDocument()).toBeNull();
});

test('private download derives API path from UUID and passes authentication only to the native private downloader', async () => {
  (getAuthToken as jest.Mock).mockResolvedValue('local-session-token');
  NativeModules.ReportExport = { downloadChatFile: jest.fn(async () => true) };
  await downloadChatAttachment({ ...receipt, url: 'https://untrusted.test/document.pdf' });
  expect(NativeModules.ReportExport.downloadChatFile).toHaveBeenCalledWith(`https://api.activ.org.in/api/v1/messages/attachments/${id}`, 'local-session-token', 'quote.pdf', 'application/pdf');
  await expect(downloadChatAttachment({ ...receipt, id: '../escape' })).rejects.toThrow();
});
