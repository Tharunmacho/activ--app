import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { FlatList, Text, TouchableOpacity } from 'react-native';
import { ReportsPane } from '../src/screens/admin/super/delivery/ReportsPane';
import { ConsoleButton, ConsoleStatTile, ConsoleSearch } from '../src/ui';
import { ChipRow } from '../src/screens/admin/super/superKit';
import {
  getDeliveryReport,
  type ReportFilters,
  type ReportRow,
} from '../src/services/deliveryReportApi';

jest.mock('../src/services/deliveryReportApi', () => ({
  ...jest.requireActual('../src/services/deliveryReportApi'),
  getDeliveryReport: jest.fn(),
}));
jest.mock('../src/services/superApi', () => ({
  errorText: (error: Error) => error.message,
}));

const accepted = ['accepted', 'sent', 'delivered', 'read', 'marked_read'];
const rows: ReportRow[] = [
  ['whatsapp', 'read', 'Asha'],
  ['whatsapp', 'sent', 'Sent member'],
  ['whatsapp', 'delivered', 'Delivered member'],
  ['in_app', 'marked_read', 'Inbox member'],
  ['push', 'failed', 'Long member name for a narrow screen'],
  ['email', 'failed', 'Email member'],
  ...Array.from({ length: 25 }, () => ['email', 'accepted', 'Email member']),
].map(([channel, status, recipientName], index) => ({
  _id: `row-${index}`,
  channel: channel as ReportRow['channel'],
  status,
  recipientName,
  recipient: 'a-long-member-email-address@example.test',
  title: 'Regional association update',
  campaignKey: 'campaign-1',
  createdAt: '2026-10-16T10:00:00Z',
  ...(status === 'failed' ? { error: 'The device registration expired.' } : {}),
}));
const counts = (items: ReportRow[]) => ({
  records: items.length,
  accepted: items.filter(row => accepted.includes(row.status)).length,
  opened: items.filter(row => row.status === 'read').length,
  delivered: items.filter(
    row =>
      row.channel === 'whatsapp' && ['delivered', 'read'].includes(row.status),
  ).length,
  failed: items.filter(row => row.status === 'failed').length,
  queued: 0,
  skipped: 0,
  unconfirmed: items.filter(row => row.status !== 'read').length,
});
function report(filters: ReportFilters) {
  const base = rows.filter(
    row =>
      (!filters.channel || row.channel === filters.channel) &&
      (!filters.search ||
        row.recipientName.toLowerCase().includes(filters.search.toLowerCase())),
  );
  const filtered = base.filter(
    row =>
      !filters.status ||
      (filters.status === 'accepted_any'
        ? accepted.includes(row.status)
        : row.status === filters.status),
  );
  const page = filters.page || 1,
    limit = filters.limit || 25;
  return {
    summary: {
      ...counts(base),
      recipients: new Set(base.map(row => row.recipientName)).size,
    },
    channels: ['email', 'whatsapp', 'push', 'in_app'].map(_id => ({
      _id,
      ...counts(base.filter(row => row.channel === _id)),
    })),
    campaigns: [
      {
        _id: 'campaign-1',
        title: 'Regional association update',
        kind: 'announcement',
        event: '',
        createdAt: '2026-10-16T10:00:00Z',
        lastAt: '2026-10-16T10:00:00Z',
        ...counts(base),
      },
    ],
    rows: filtered.slice((page - 1) * limit, page * limit),
    pagination: {
      page,
      limit,
      total: filtered.length,
      pages: Math.max(1, Math.ceil(filtered.length / limit)),
    },
    campaignPagination: { page: 1, total: 1, pages: 1 },
    generatedAt: '2026-10-16T12:00:00Z',
  };
}
let screen: Renderer.ReactTestRenderer;
let scroll: jest.SpyInstance;
const filters = () =>
  (getDeliveryReport as jest.Mock).mock.calls.at(-1)[0] as ReportFilters;
const text = () =>
  screen.root
    .findAllByType(Text)
    .map(node =>
      React.Children.toArray(node.props.children)
        .filter(child => typeof child === 'string' || typeof child === 'number')
        .join(''),
    )
    .join(' ');
const settle = async () => {
  await act(async () => {
    jest.advanceTimersByTime(350);
  });
};
const press = async (onPress: () => void) => {
  await act(async () => {
    onPress();
  });
  await settle();
};
const tile = (label: string) =>
  screen.root
    .findAllByType(ConsoleStatTile)
    .find(node => node.props.label === label)!;
const channel = (label: string) =>
  screen.root
    .findAllByType(TouchableOpacity)
    .find(
      node =>
        node.props.accessibilityLabel === `Filter delivery records by ${label}`,
    )!;
const outcome = () =>
  screen.root
    .findAllByType(ChipRow)
    .find(node =>
      node.props.options.some(
        (option: { value: string }) => option.value === 'accepted_any',
      ),
    )!;
const listRows = () =>
  screen.root.findByType(FlatList).props.data as ReportRow[];
beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  scroll = jest
    .spyOn(FlatList.prototype, 'scrollToOffset')
    .mockImplementation(() => {});
  (getDeliveryReport as jest.Mock).mockImplementation(
    async (input: ReportFilters) => report(input),
  );
});
afterEach(async () => {
  if (screen)
    await act(async () => {
      screen.unmount();
    });
  scroll.mockRestore();
  jest.useRealTimers();
});
const mount = async () => {
  await act(async () => {
    screen = Renderer.create(<ReportsPane />);
  });
  await settle();
};

it('summary cards reveal records, reset pagination and preserve activity/date/campaign filters', async () => {
  await mount();
  const from = filters().from;
  await press(
    screen.root
      .findAllByType(TouchableOpacity)
      .find(
        node =>
          node.props.accessibilityLabel ===
          'View report: Regional association update',
      )!.props.onPress,
  );
  await press(
    screen.root
      .findAllByType(ConsoleButton)
      .find(node => node.props.accessibilityLabel === 'Next recipients')!.props
      .onPress,
  );
  expect(filters().page).toBe(2);
  await press(tile('Accepted / in inbox').props.onPress);
  expect(filters()).toEqual(
    expect.objectContaining({
      status: 'accepted_any',
      page: 1,
      campaignKey: 'campaign-1',
      from,
    }),
  );
  expect(listRows().map(row => row.status)).toEqual(
    expect.arrayContaining([
      'accepted',
      'sent',
      'delivered',
      'read',
      'marked_read',
    ]),
  );
  expect(tile('Accepted / in inbox').props.selected).toBe(true);
  expect(scroll).toHaveBeenCalled();
  await press(() => outcome().props.onChange('accepted'));
  expect(listRows().every(row => row.status === 'accepted')).toBe(true);
  await press(tile('Confirmed opens').props.onPress);
  expect(filters().status).toBe('read');
  expect(listRows()).toHaveLength(1);
  expect(listRows()[0].recipientName).toBe('Asha');
});

it('channel cards combine with outcomes and identity cards explain repeated deliveries', async () => {
  await mount();
  await press(tile('Failed').props.onPress);
  expect(listRows()).toHaveLength(2);
  await press(channel('Email').props.onPress);
  expect(filters()).toEqual(
    expect.objectContaining({ channel: 'email', status: 'failed' }),
  );
  expect(channel('Email').props.accessibilityState.selected).toBe(true);
  expect(listRows()).toHaveLength(1);
  await press(tile('Recipient identities').props.onPress);
  expect(filters()).toEqual(
    expect.objectContaining({ channel: 'email', status: '' }),
  );
  expect(listRows()).toHaveLength(25);
  expect(text()).toContain('the same recipient can appear more than once');
  await press(channel('Email').props.onPress);
  expect(filters().channel).toBe('');
  expect(channel('Email').props.accessibilityState.selected).toBe(false);
  await press(() =>
    screen.root.findByType(ConsoleSearch).props.onChangeText('Long member'),
  );
  await press(tile('Failed').props.onPress);
  expect(filters()).toEqual(
    expect.objectContaining({ search: 'Long member', status: 'failed' }),
  );
  expect(listRows()).toHaveLength(1);
  const recipient = screen.root
    .findAllByType(TouchableOpacity)
    .find(
      node =>
        node.props.accessibilityHint ===
        'Show or hide delivery timeline and provider details',
    )!;
  await press(recipient.props.onPress);
  expect(recipient.props.accessibilityState.expanded).toBe(true);
  expect(text()).toContain('The device registration expired.');
  expect(
    screen.root
      .findAllByType(Text)
      .some(node => node.props.children === 'Recorded timeline'),
  ).toBe(true);
});
