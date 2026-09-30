import React, { memo } from 'react';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Path, Rect, Stop } from 'react-native-svg';

/**
 * ============================================================================
 * CONTACT MARKS — WhatsApp (the brand's own glyph), plus drawn call / mail
 * ============================================================================
 *
 * WhatsApp is a real brand: its glyph is drawn as published, in its official
 * green (#25D366), never recoloured. Call and email are not brands, so they
 * are drawn in the ACTIV blues as glossy discs that sit beside it.
 */

type MarkProps = { size?: number };

/** WhatsApp — the phone-in-speech-bubble glyph on its green. */
export const WhatsAppMark = memo(function WhatsAppMark({ size = 24 }: MarkProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        fill="#25D366"
        d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"
      />
    </Svg>
  );
});

/** A glossy blue disc with a handset. */
export const CallMark = memo(function CallMark({ size = 24 }: MarkProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Defs>
        <SvgLinearGradient id="cmDisc" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#60A5FA" />
          <Stop offset="1" stopColor="#1E3A8A" />
        </SvgLinearGradient>
      </Defs>
      <Circle cx={12} cy={12} r={12} fill="url(#cmDisc)" />
      <Path
        fill="#FFFFFF"
        d="M8.2 6.2c.4-.3 1-.3 1.3.1l1.3 1.8c.3.4.3.9 0 1.3l-.7.8c.6 1.3 1.6 2.3 2.9 2.9l.8-.7c.4-.3.9-.3 1.3 0l1.8 1.3c.4.3.4.9.1 1.3l-.9 1c-.6.6-1.5.8-2.3.5-3-1.1-5.4-3.5-6.5-6.5-.3-.8-.1-1.7.5-2.3z"
      />
    </Svg>
  );
});

/** A glossy navy disc with an envelope. */
export const MailMark = memo(function MailMark({ size = 24 }: MarkProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Defs>
        <SvgLinearGradient id="mmDisc" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#93C5FD" />
          <Stop offset="1" stopColor="#1C2E68" />
        </SvgLinearGradient>
      </Defs>
      <Circle cx={12} cy={12} r={12} fill="url(#mmDisc)" />
      <Rect x={6} y={7.5} width={12} height={9} rx={1.6} fill="#FFFFFF" />
      <Path d="M6.6 8.4 L12 12.4 L17.4 8.4" stroke="#2563EB" strokeWidth={1.4} fill="none" strokeLinejoin="round" />
    </Svg>
  );
});
