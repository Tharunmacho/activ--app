/**
 * Puts the share-preview rules at the TOP of public_html/.htaccess, replacing
 * any earlier copy between the BEGIN/END markers and leaving everything else
 * in the file (the SPA fallback, the /api proxy) exactly as it was. At the top
 * because the SPA fallback rewrites every unknown path to index.html and must
 * not see a crawler's event URL first.
 *
 *   node deploy/merge-htaccess.mjs ../public_html/.htaccess
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const target = process.argv[2];
if (!target) {
    console.error('usage: node deploy/merge-htaccess.mjs <path to .htaccess>');
    process.exit(1);
}
const block = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'share-previews.htaccess'), 'utf8').trim();
const current = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : '';
const rest = current
    .replace(/# BEGIN ACTIV share previews[\s\S]*?# END ACTIV share previews\s*/g, '')
    .replace(/^\s+/, '');
if (current && !fs.existsSync(`${target}.before-share-previews`)) {
    fs.writeFileSync(`${target}.before-share-previews`, current);
}
fs.writeFileSync(target, `${block}\n\n${rest}`);
console.log(`share-preview rules merged into ${target}`);
