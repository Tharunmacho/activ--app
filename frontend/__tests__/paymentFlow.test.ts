import { parseReturnUrl, bandLabel, toAudience } from '../src/services/paymentFlow';

describe('paymentFlow', () => {
  test('recognises the gateway return URL on any host and reads its params', () => {
    const r = parseReturnUrl('https://activ.org.in/payment-success?orderId=ord_abc123&payment_id=MOJO5a&payment_status=Credit');
    expect(r).toEqual({ orderId: 'ord_abc123', paymentId: 'MOJO5a', paymentStatus: 'Credit' });
    expect(parseReturnUrl('http://localhost:8080/payment-success?orderId=ord_x')?.orderId).toBe('ord_x');
  });

  test('ignores every other page of the checkout', () => {
    expect(parseReturnUrl('https://www.instamojo.com/@activ/abc/')).toBeNull();
    expect(parseReturnUrl('https://activ.org.in/payment-successful')).toBeNull();
    expect(parseReturnUrl('')).toBeNull();
  });

  test('band labels are half-open and only for company plans', () => {
    const base: any = { key: 'k', name: 'n', description: '', price: 1, membershipType: 'annual', experience: '', features: [], popular: false };
    expect(bandLabel({ ...base, audience: 'business', minYears: 0, maxYears: 5 })).toBe('0–5 years in business');
    expect(bandLabel({ ...base, audience: 'business', minYears: 10, maxYears: null })).toBe('10+ years in business');
    expect(bandLabel({ ...base, audience: 'student', minYears: 0, maxYears: null })).toBe('');
  });

  test('unknown audiences are business; platinum is recognised (and filtered by getMyPlans)', () => {
    expect(toAudience('Student')).toBe('student');
    expect(toAudience('platinum')).toBe('platinum');
    expect(toAudience(undefined)).toBe('business');
  });
});
