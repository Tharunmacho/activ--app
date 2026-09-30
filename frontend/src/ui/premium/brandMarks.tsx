import React, { memo } from 'react';
import Svg, { Path } from 'react-native-svg';

/**
 * ============================================================================
 * BRAND MARKS & FLAGS
 * ============================================================================
 *
 * Google / LinkedIn / Facebook drawn as vectors in their official colours,
 * so the sign-in pills stay crisp at any density (the PNGs blurred).
 * Shapes follow each company's published mark; do not recolour them.
 */

type MarkProps = { size?: number };

/** Google "G" — #4285F4 / #34A853 / #FBBC05 / #EA4335. */
export const GoogleMark = memo(function GoogleMark({ size = 20 }: MarkProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path fill="#FBBC05" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
      <Path fill="#EA4335" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
      <Path fill="#34A853" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
      <Path fill="#4285F4" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
    </Svg>
  );
});

/** LinkedIn "in" square — #0A66C2. */
export const LinkedInMark = memo(function LinkedInMark({ size = 20 }: MarkProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        fill="#0A66C2"
        d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
      />
    </Svg>
  );
});

/** Facebook "f" in a circle — #0866FF. */
export const FacebookMark = memo(function FacebookMark({ size = 20 }: MarkProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        fill="#0866FF"
        d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z"
      />
    </Svg>
  );
});

/** Mark by provider name ('Google' | 'LinkedIn' | 'Facebook', any case). */
export function SocialMark({ provider, size = 20 }: { provider: string; size?: number }) {
  const key = String(provider || '').toLowerCase();
  if (key === 'google') return <GoogleMark size={size} />;
  if (key === 'linkedin') return <LinkedInMark size={size} />;
  if (key === 'facebook') return <FacebookMark size={size} />;
  return null;
}

/**
 * A country's flag as an emoji, from its ISO-3166 alpha-2 code (two regional
 * indicator symbols). Anything that is not two letters gets the globe.
 */
export function flagEmoji(iso2?: string | null): string {
  const code = String(iso2 || '').trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return '\u{1F310}';
  try {
    return String.fromCodePoint(0x1f1e6 + code.charCodeAt(0) - 65, 0x1f1e6 + code.charCodeAt(1) - 65);
  } catch {
    return '\u{1F310}';
  }
}
