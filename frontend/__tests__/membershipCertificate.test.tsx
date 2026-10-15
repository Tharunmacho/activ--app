import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { Image, StyleSheet, Text, View } from 'react-native';
import { MembershipCertificateView } from '../src/screens/member/certificates/CertificateViews';

const certificate = {
  member: { name: 'Sample Member', companyName: 'Example Enterprise', membershipNumber: 'ACTIV-BEG-20261013-001',
    block: 'Example Block', district: 'Chennai', state: 'Tamil Nadu', businessSector: 'Manufacturing',
    gstNumber: 'TEST-GST', udyamNumber: 'TEST-UDYAM' },
  issuedAt: '2026-10-13T12:00:00Z', memberSince: '2026-10-13T12:00:00Z', validUntil: '2027-10-12', reference: 'CERT-TEST',
};
let tree: Renderer.ReactTestRenderer;
afterEach(async () => { if (tree) await act(async () => tree.unmount()); });
test.each([320, 390, 768, 1170])('membership stays A4 landscape with all facts at preview width %s', async width => {
  const open = jest.fn();
  await act(async () => { tree = Renderer.create(<MembershipCertificateView cert={certificate} width={width} onPress={open} />); });
  const sheet = tree.root.findAllByType(View).find(node => {
    const style = StyleSheet.flatten(node.props.style);
    return node.props.collapsable === false && style?.width === 1123 && style?.height === 794;
  });
  expect(sheet).toBeDefined();
  expect(StyleSheet.flatten(sheet!.props.style).transform[0].scale).toBeCloseTo(width / 1123);
  const text = JSON.stringify(tree.toJSON());
  Object.values(certificate.member).forEach(value => expect(text).toContain(value));
  expect(text).toContain(certificate.reference);
  expect(text).toContain('THAMIZHAZHAGAN NALLAIYAN');
  expect(text).toContain('Founder and Chairperson');
  const signatureBlock = tree.root.findByProps({ testID: 'membership-signature-block' });
  const signText = signatureBlock.findAllByType(Text).map(node => node.props.children);
  expect(signText).toEqual(['Founder and Chairperson', 'THAMIZHAZHAGAN NALLAIYAN']);
  const ink = signatureBlock.findByType(Image);
  expect(ink.props.resizeMode).toBe('contain');
  expect(StyleSheet.flatten(ink.props.style).height).toBe(86);
  tree.root.findAllByType(Text).filter(node => node.props.children === 'MEMBERSHIP CERTIFICATE')
    .forEach(node => expect(node.props.allowFontScaling).toBe(false));
  const tap = tree.root.findAll(node => node.props.accessibilityRole === 'imagebutton' && node.props.onPress)[0];
  await act(async () => tap.props.onPress());
  expect(open).toHaveBeenCalledTimes(1);
});
test('long international lifetime records fit within the landscape sheet without losing facts', async () => {
  await act(async () => { tree = Renderer.create(<MembershipCertificateView width={360} cert={{ ...certificate,
    membershipTier: 'platinum', member: { ...certificate.member, companyName: 'A very long international company name for certificate layout verification',
      isInternational: true, place: 'Example City', country: 'United Kingdom' } }} />); });
  const flow = () => tree.root.findAllByType(View).find(node => StyleSheet.flatten(node.props.style)?.top === 38)!;
  await act(async () => flow().props.onLayout({ nativeEvent: { layout: { height: 700 } } }));
  expect(StyleSheet.flatten(flow().props.style).transform[0].scale * 700).toBeCloseTo(552);
  const text = JSON.stringify(tree.toJSON());
  expect(text).toContain('Lifetime Member');
  expect(text).toContain('United Kingdom');
  expect(text).not.toContain('Example Block');
});
