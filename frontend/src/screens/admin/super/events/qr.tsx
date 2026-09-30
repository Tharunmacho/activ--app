import React, { useMemo } from 'react';
import { View } from 'react-native';

/**
 * ============================================================================
 * A QR code, drawn with plain Views — no native module, no SVG dependency.
 * ============================================================================
 *
 * The website draws its event QR with the `qrcode` npm package onto a canvas.
 * The app has neither, and a new native module is a release risk for one
 * picture, so this is a small, spec-complete QR encoder (byte mode, error
 * correction level M, versions 1–40, all eight masks scored) following the
 * reference algorithm of ISO/IEC 18004, after Project Nayuki's public-domain
 * description. Level M matches the website (`errorCorrectionLevel: 'M'`), so a
 * phone scans the same content from either.
 *
 * The matrix is drawn a row at a time with horizontal runs merged into one View
 * each, which keeps a ~41×41 code to a few hundred Views.
 */

const ECC_PER_BLOCK_M = [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28];
const NUM_BLOCKS_M = [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49];
const FORMAT_ECC_M = 0; // L=1, M=0, Q=3, H=2

const bit = (x: number, i: number) => ((x >>> i) & 1) !== 0;

const rawModules = (ver: number) => {
  let r = (16 * ver + 128) * ver + 64;
  if (ver >= 2) {
    const n = Math.floor(ver / 7) + 2;
    r -= (25 * n - 10) * n - 55;
    if (ver >= 7) r -= 36;
  }
  return r;
};
const dataCodewords = (ver: number) => Math.floor(rawModules(ver) / 8) - ECC_PER_BLOCK_M[ver] * NUM_BLOCKS_M[ver];

const gfMul = (x: number, y: number) => {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z & 0xff;
};
const rsDivisor = (degree: number) => {
  const out: number[] = new Array(degree).fill(0);
  out[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < out.length; j++) {
      out[j] = gfMul(out[j], root);
      if (j + 1 < out.length) out[j] ^= out[j + 1];
    }
    root = gfMul(root, 0x02);
  }
  return out;
};
const rsRemainder = (data: number[], divisor: number[]) => {
  const out: number[] = divisor.map(() => 0);
  data.forEach((b) => {
    const factor = b ^ (out.shift() as number);
    out.push(0);
    divisor.forEach((coef, i) => { out[i] ^= gfMul(coef, factor); });
  });
  return out;
};

/** UTF-8 bytes of a string, without TextEncoder (not on every Hermes build). */
const utf8 = (text: string) => {
  const out: number[] = [];
  const s = unescape(encodeURIComponent(String(text || '')));
  for (let i = 0; i < s.length; i++) out.push(s.charCodeAt(i) & 0xff);
  return out;
};

/** The module matrix for `text` (true = dark), or null if it cannot fit. */
export function qrMatrix(text: string, forceMask?: number): boolean[][] | null {
  const bytes = utf8(text);
  let ver = 1;
  for (; ver <= 40; ver++) {
    const ccBits = ver <= 9 ? 8 : 16;
    if (4 + ccBits + bytes.length * 8 <= dataCodewords(ver) * 8) break;
  }
  if (ver > 40) return null;

  // ---- the data bit stream
  const bits: number[] = [];
  const push = (val: number, len: number) => { for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
  push(0x4, 4);
  push(bytes.length, ver <= 9 ? 8 : 16);
  bytes.forEach((b) => push(b, 8));
  const capacity = dataCodewords(ver) * 8;
  push(0, Math.min(4, capacity - bits.length));
  push(0, (8 - (bits.length % 8)) % 8);
  for (let pad = 0xec; bits.length < capacity; pad ^= 0xec ^ 0x11) push(pad, 8);
  const data: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let b = 0;
    for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j];
    data.push(b);
  }

  // ---- error correction and interleaving
  const numBlocks = NUM_BLOCKS_M[ver];
  const eccLen = ECC_PER_BLOCK_M[ver];
  const rawCw = Math.floor(rawModules(ver) / 8);
  const numShort = numBlocks - (rawCw % numBlocks);
  const shortLen = Math.floor(rawCw / numBlocks);
  const div = rsDivisor(eccLen);
  const blocks: number[][] = [];
  for (let i = 0, k = 0; i < numBlocks; i++) {
    const dat = data.slice(k, k + shortLen - eccLen + (i < numShort ? 0 : 1));
    k += dat.length;
    const ecc = rsRemainder(dat, div);
    if (i < numShort) dat.push(0);
    blocks.push(dat.concat(ecc));
  }
  const codewords: number[] = [];
  for (let i = 0; i < blocks[0].length; i++) {
    blocks.forEach((block, j) => {
      if (i !== shortLen - eccLen || j >= numShort) codewords.push(block[i]);
    });
  }

  // ---- the grid
  const size = ver * 4 + 17;
  const mod: boolean[][] = Array.from({ length: size }, () => new Array(size).fill(false));
  const fn: boolean[][] = Array.from({ length: size }, () => new Array(size).fill(false));
  const setFn = (x: number, y: number, dark: boolean) => { mod[y][x] = dark; fn[y][x] = true; };

  for (let i = 0; i < size; i++) { setFn(6, i, i % 2 === 0); setFn(i, 6, i % 2 === 0); }
  const finder = (cx: number, cy: number) => {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const d = Math.max(Math.abs(dx), Math.abs(dy));
        const x = cx + dx; const y = cy + dy;
        if (x >= 0 && x < size && y >= 0 && y < size) setFn(x, y, d !== 2 && d !== 4);
      }
    }
  };
  finder(3, 3); finder(size - 4, 3); finder(3, size - 4);

  const align: number[] = [];
  if (ver > 1) {
    const n = Math.floor(ver / 7) + 2;
    const step = ver === 32 ? 26 : Math.ceil((ver * 4 + 4) / (n * 2 - 2)) * 2;
    align.push(6);
    for (let pos = size - 7; align.length < n; pos -= step) align.splice(1, 0, pos);
  }
  align.forEach((ay, i) => align.forEach((ax, j) => {
    if ((i === 0 && j === 0) || (i === 0 && j === align.length - 1) || (i === align.length - 1 && j === 0)) return;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) setFn(ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  }));

  const drawFormat = (mask: number) => {
    const d = (FORMAT_ECC_M << 3) | mask;
    let rem = d;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const f = ((d << 10) | rem) ^ 0x5412;
    for (let i = 0; i <= 5; i++) setFn(8, i, bit(f, i));
    setFn(8, 7, bit(f, 6)); setFn(8, 8, bit(f, 7)); setFn(7, 8, bit(f, 8));
    for (let i = 9; i < 15; i++) setFn(14 - i, 8, bit(f, i));
    for (let i = 0; i < 8; i++) setFn(size - 1 - i, 8, bit(f, i));
    for (let i = 8; i < 15; i++) setFn(8, size - 15 + i, bit(f, i));
    setFn(8, size - 8, true);
  };
  drawFormat(0);
  if (ver >= 7) {
    let rem = ver;
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    const v = (ver << 12) | rem;
    for (let i = 0; i < 18; i++) {
      const b = bit(v, i); const a = size - 11 + (i % 3); const c = Math.floor(i / 3);
      setFn(a, c, b); setFn(c, a, b);
    }
  }

  // ---- the codewords, in the zig-zag
  let idx = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const up = ((right + 1) & 2) === 0;
        const y = up ? size - 1 - vert : vert;
        if (!fn[y][x] && idx < codewords.length * 8) {
          mod[y][x] = bit(codewords[idx >>> 3], 7 - (idx & 7));
          idx++;
        }
      }
    }
  }

  // ---- masks: try all eight, keep the lowest penalty
  const flip = (mask: number) => {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        let inv = false;
        switch (mask) {
          case 0: inv = (x + y) % 2 === 0; break;
          case 1: inv = y % 2 === 0; break;
          case 2: inv = x % 3 === 0; break;
          case 3: inv = (x + y) % 3 === 0; break;
          case 4: inv = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break;
          case 5: inv = ((x * y) % 2) + ((x * y) % 3) === 0; break;
          case 6: inv = (((x * y) % 2) + ((x * y) % 3)) % 2 === 0; break;
          default: inv = (((x + y) % 2) + ((x * y) % 3)) % 2 === 0; break;
        }
        if (!fn[y][x] && inv) mod[y][x] = !mod[y][x];
      }
    }
  };
  const penalty = () => {
    let p = 0;
    let dark = 0;
    for (let y = 0; y < size; y++) {
      let runX = 1; let runY = 1;
      for (let x = 0; x < size; x++) {
        if (mod[y][x]) dark++;
        if (x > 0) {
          if (mod[y][x] === mod[y][x - 1]) { runX++; if (runX === 5) p += 3; else if (runX > 5) p++; } else runX = 1;
          if (mod[x][y] === mod[x - 1][y]) { runY++; if (runY === 5) p += 3; else if (runY > 5) p++; } else runY = 1;
        }
        if (x > 0 && y > 0) {
          const c = mod[y][x];
          if (c === mod[y][x - 1] && c === mod[y - 1][x] && c === mod[y - 1][x - 1]) p += 3;
        }
      }
    }
    const total = size * size;
    p += (Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1) * 10;
    return p;
  };
  let best = 0;
  let bestScore = Infinity;
  for (let m = 0; m < 8; m++) {
    flip(m);
    drawFormat(m);
    const score = penalty();
    if (score < bestScore) { bestScore = score; best = m; }
    flip(m);
  }
  if (typeof forceMask === 'number' && forceMask >= 0 && forceMask < 8) best = forceMask;
  flip(best);
  drawFormat(best);
  return mod;
}

/** The code on a white card with the 4-module quiet zone the spec asks for. */
export function QrCode({ value, size = 240, color = '#000000' }: { value: string; size?: number; color?: string }) {
  const matrix = useMemo(() => {
    try { return qrMatrix(value); } catch { return null; }
  }, [value]);
  if (!matrix || !matrix.length) return null;
  const n = matrix.length + 8;
  const cell = Math.max(1, Math.floor(size / n));
  const side = cell * n;
  return (
    <View style={{ width: side, height: side, backgroundColor: '#FFFFFF', padding: cell * 4 }}
      accessible accessibilityRole="image" accessibilityLabel="QR code">
      {matrix.map((row, y) => {
        const runs: { x: number; w: number }[] = [];
        for (let x = 0; x < row.length; x++) {
          if (!row[x]) continue;
          const start = x;
          while (x + 1 < row.length && row[x + 1]) x++;
          runs.push({ x: start, w: x - start + 1 });
        }
        return (
          <View key={`r${y}`} style={{ height: cell, width: cell * row.length }}>
            {runs.map((r) => (
              <View key={`c${r.x}`} style={{ position: 'absolute', left: r.x * cell, width: r.w * cell, height: cell, backgroundColor: color }} />
            ))}
          </View>
        );
      })}
    </View>
  );
}
