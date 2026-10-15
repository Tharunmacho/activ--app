export const A4_WIDTH = 794;
export const A4_HEIGHT = 1123;

export const MEMBERSHIP_PAGE = {
  width: A4_HEIGHT,
  height: A4_WIDTH,
  side: 92,
  contentTop: 38,
  contentBottom: 590,
  signaturesTop: 598,
  signatureHeight: 128,
  footerTop: 732,
};

/** Fit the whole page in the measured viewport, including after rotation. */
export function certificateFitWidth(width: number, height: number, landscape: boolean): number {
  const availableWidth = Number.isFinite(width) && width > 0 ? width : 1;
  const availableHeight = Number.isFinite(height) && height > 0 ? height : availableWidth;
  const ratio = landscape ? A4_HEIGHT / A4_WIDTH : A4_WIDTH / A4_HEIGHT;
  return Math.max(1, Math.floor(Math.min(availableWidth, availableHeight * ratio)));
}

/** Fit content above the signature band without clipping long supplied facts. */
export function membershipContentScale(height: number): number {
  const available = MEMBERSHIP_PAGE.contentBottom - MEMBERSHIP_PAGE.contentTop;
  return Number.isFinite(height) && height > available ? available / height : 1;
}
