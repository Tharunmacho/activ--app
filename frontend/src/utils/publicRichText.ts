/** CMS fields contain plain text, editor HTML, and Markdown. Keep the supported
 * formatting as native text; never execute HTML or load a document to read it. */
export type PublicTextSpan = { text: string; bold?: boolean; italic?: boolean; code?: boolean; href?: string };
export type PublicTextBlock = { kind: 'paragraph' | 'heading' | 'quote' | 'list' | 'code'; spans: PublicTextSpan[]; marker?: string };

function entities(value: string): string {
  return value.replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(x[\da-f]+|\d+);/gi, (_, raw) => {
      const code = /^x/i.test(raw) ? parseInt(raw.slice(1), 16) : Number(raw);
      return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : '';
    });
}

function readableMarkup(value: unknown): string {
  return entities(String(value ?? '').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_, href, label) => `[${label}](${href.replace(/\(/g, '%28').replace(/\)/g, '%29')})`)
    .replace(/<\/?(?:strong|b)\b[^>]*>/gi, '**').replace(/<\/?(?:em|i)\b[^>]*>/gi, '*')
    .replace(/<h[1-6]\b[^>]*>/gi, '\n\n### ').replace(/<blockquote\b[^>]*>/gi, '\n\n> ')
    .replace(/<li\b[^>]*>/gi, '\n• ').replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/(?:p|div|h[1-6]|blockquote|ul|ol)>/gi, '\n\n').replace(/<[^>]+>/g, '')).replace(/\r\n?/g, '\n').trim();
}

export function publicInline(value: string, inherited: Omit<PublicTextSpan, 'text'> = {}, depth = 0): PublicTextSpan[] {
  if (depth > 8) return [{ text: value, ...inherited }];
  const spans: PublicTextSpan[] = [];
  let plain = '';
  const flush = () => { if (plain) { spans.push({ text: plain, ...inherited }); plain = ''; } };
  for (let i = 0; i < value.length;) {
    if (value[i] === '\\' && /[\\`*_\[\]#>~]/.test(value[i + 1] || '')) { plain += value[i + 1]; i += 2; continue; }
    const rest = value.slice(i);
    const link = /^!?\[([^\]]+)\]\(([^\s)]+)(?:\s+["'][^"']*["'])?\)/.exec(rest);
    if (link) {
      flush();
      // Images already have dedicated CMS media fields; retain their alt text.
      spans.push(...publicInline(link[1], { ...inherited, ...(rest[0] === '!' ? {} : { href: link[2] }) }, depth + 1));
      i += link[0].length; continue;
    }
    const token = rest.startsWith('***') ? '***' : rest.startsWith('**') ? '**' : rest.startsWith('__') ? '__' : /^[*_`]/.test(rest) ? rest[0] : '';
    // An underscore inside an identifier and a spaced multiplication sign are text.
    const wordBoundary = token !== '_' && token !== '__' || i === 0 || !/[\p{L}\p{N}]/u.test(value[i - 1]);
    if (token && wordBoundary && rest[token.length] && !/\s/.test(rest[token.length])) {
      const end = value.indexOf(token, i + token.length);
      if (end > i + token.length && !/\s/.test(value[end - 1])) {
        flush();
        const inside = value.slice(i + token.length, end);
        if (token === '`') spans.push({ text: inside, ...inherited, code: true });
        else spans.push(...publicInline(inside, { ...inherited, ...(token.length >= 2 ? { bold: true } : {}), ...(token.length !== 2 ? { italic: true } : {}) }, depth + 1));
        i = end + token.length; continue;
      }
    }
    plain += value[i++];
  }
  flush();
  return spans;
}

export function publicTextBlocks(value: unknown): PublicTextBlock[] {
  const blocks: PublicTextBlock[] = [];
  let paragraph: string[] = [], code: string[] | null = null;
  const flush = () => { if (paragraph.length) { blocks.push({ kind: 'paragraph', spans: publicInline(paragraph.join('\n')) }); paragraph = []; } };
  for (const line of readableMarkup(value).split('\n')) {
    if (/^\s*```/.test(line)) { flush(); if (code) { blocks.push({ kind: 'code', spans: [{ text: code.join('\n'), code: true }] }); code = null; } else code = []; continue; }
    if (code) { code.push(line); continue; }
    if (!line.trim()) { flush(); continue; }
    const heading = /^\s{0,3}#{1,6}\s+(.+?)(?:\s+#+)?$/.exec(line);
    const quote = /^\s*>\s?(.*)$/.exec(line);
    const list = /^\s*(?:([-+*•])|(\d+)[.)])\s+(.+)$/.exec(line);
    if (heading || quote || list) {
      flush();
      blocks.push({ kind: heading ? 'heading' : quote ? 'quote' : 'list', spans: publicInline(heading?.[1] ?? quote?.[1] ?? list![3]), ...(list ? { marker: list[2] ? list[2] + '.' : '•' } : {}) });
    } else if (/^\s*(?:\*\s*){3,}$|^\s*(?:-\s*){3,}$/.test(line)) flush();
    else paragraph.push(line.trim());
  }
  if (code) blocks.push({ kind: 'code', spans: [{ text: code.join('\n'), code: true }] });
  flush();
  return blocks;
}

export const publicPlainText = (value: unknown): string => publicTextBlocks(value)
  .map(block => (block.marker ? block.marker + ' ' : '') + block.spans.map(span => span.text).join('')).join('\n\n').trim();
