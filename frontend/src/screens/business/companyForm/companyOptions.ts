/**
 * The option lists the company form offers — the app's copy of the website's
 * `lib/businessTypes.ts` and `lib/memberFormOptions.ts`, which mirror the
 * backend enums (`backend/src/modules/members/businessTypes.js`,
 * `businessOptions.js`).
 *
 * Every one of these is enum-checked server-side, so a value that is not on the
 * list is a 400 after the whole form has been filled in. Spacing and casing are
 * load-bearing ("50 Lakhs - 1 Crore" is not "50 Lakhs-1 Crore"). Keep in step
 * with the backend, never with a guess.
 */

export const BUSINESS_TYPES = [
  'Manufacturing',
  'Trader',
  'Service Provider',
  'Dealer',
  'Franchise',
  'Others',
] as const;

/** A stored type the list no longer offers comes back '' so the member re-picks. */
export const normalizeBusinessType = (value?: string | null): string => {
  const raw = String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
  if (!raw) return '';
  return BUSINESS_TYPES.find((type) => type.toLowerCase() === raw) || '';
};

export const CONSTITUTION_TYPES = [
  'OPC',
  'TRUST',
  'SOCIETY',
  'Proprietorship',
  'Partnership',
  'Private Limited',
  'LLP',
] as const;

/** `Above 1 Crore` is deliberately absent — the crore slabs replace it. */
export const TURNOVER_RANGES = [
  'Below 1 Lakh',
  '1-5 Lakhs',
  '5-10 Lakhs',
  '10-50 Lakhs',
  '50 Lakhs - 1 Crore',
  '₹1 Crore - ₹10 Crore',
  '₹10 Crore - ₹25 Crore',
  '₹25 Crore - ₹50 Crore',
  '₹51 Crore - ₹100 Crore',
  '₹101 Crore - ₹200 Crore',
  '₹201 Crore - ₹500 Crore',
  'Above ₹500 Crore',
  'Other / Manual Entry',
] as const;

/** The slab that opens the free-text figure. Compared, never re-typed. */
export const TURNOVER_MANUAL = 'Other / Manual Entry';

export const GOVT_REGISTRATIONS = ['Export Councils', 'MSME / Udyam', 'NSIC', 'Other'] as const;

export const REGISTRATION_HINTS: Record<string, string> = {
  'Export Councils': 'EPC, FIEO or a commodity board',
  'MSME / Udyam': 'Micro, small or medium enterprise registration',
  NSIC: 'National Small Industries Corporation — supports MSMEs',
  Other: 'Any other government body you are registered with',
};

export const GOVT_SCHEMES = ['Startup India', 'MUDRA', 'Stand-Up India', 'PMEGP', 'None', 'Others'] as const;

/** DGFT Appendix 2T, grouped the way the website's picker groups it. */
export const EXPORT_COUNCILS: { name: string; group: string }[] = [
  ...[
    'Apparel Export Promotion Council (AEPC)',
    'AYUSH Export Promotion Council (AYUSHEXCIL)',
    'Basic Chemicals, Cosmetics and Dyes Export Promotion Council (CHEMEXCIL)',
    'Carpet Export Promotion Council (CEPC)',
    'Cashew Export Promotion Council of India (CEPCI)',
    'Chemicals and Allied Products Export Promotion Council (CAPEXIL)',
    'Council for Leather Exports (CLE)',
    'Electronics and Computer Software Export Promotion Council (ESC)',
    'Engineering Export Promotion Council India (EEPC India)',
    'Export Promotion Council for EOUs and SEZs (EPCES)',
    'Export Promotion Council for Handicrafts (EPCH)',
    'Export Promotion Council for Medical Devices (EPCMD)',
    'Gem and Jewellery Export Promotion Council (GJEPC)',
    'Handloom Export Promotion Council (HEPC)',
    'Indian Oilseeds and Produce Export Promotion Council (IOPEPC)',
    'Indian Silk Export Promotion Council (ISEPC)',
    'Jute Products Development and Export Promotion Council (JPDEPC)',
    'Man-made and Technical Textiles Export Promotion Council (MATEXIL)',
    'Mobile and Electronics Devices Export Promotion Council (MEDEPC)',
    'Pharmaceuticals Export Promotion Council of India (PHARMEXCIL)',
    'Plastics Export Promotion Council (PLEXCONCIL)',
    'Powerloom Development and Export Promotion Council (PDEXCIL)',
    'Project Exports Promotion Council of India (PEPC)',
    'Services Export Promotion Council (SEPC)',
    'Shellac and Forest Products Export Promotion Council (SHEFEXIL)',
    'Sports Goods and Toys Export Promotion Council (SGEPC)',
    'Telecom Equipment and Services Export Promotion Council (TEPC)',
    'The Cotton Textiles Export Promotion Council (TEXPROCIL)',
    'Wool and Woollens Export Promotion Council (WWEPC)',
  ].map((name) => ({ name, group: 'Export Promotion Councils' })),
  ...['Coffee Board', 'Coir Board', 'Coconut Development Board', 'Rubber Board', 'Spices Board', 'Tea Board', 'Tobacco Board']
    .map((name) => ({ name, group: 'Commodity Boards' })),
  ...[
    'Agricultural and Processed Food Products Export Development Authority (APEDA)',
    'Marine Products Export Development Authority (MPEDA)',
  ].map((name) => ({ name, group: 'Export Development Authorities' })),
  { name: 'Federation of Indian Export Organisations (FIEO)', group: 'Apex Body' },
];

/* ------------------------------------------------------------ financial years */

const YEARS_OFFERED = 8;
export const ITR_YEARS_EXPECTED = 3;

/** The last eight completed financial years, newest first ("2024-25"). */
export const financialYears = (from: Date = new Date()): string[] => {
  const year = from.getFullYear();
  const current = from.getMonth() >= 3 ? year : year - 1; // April starts the FY
  return Array.from({ length: YEARS_OFFERED }, (_, i) => {
    const start = current - 1 - i;
    return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
  });
};

export const parseYears = (value?: string | null): string[] =>
  String(value || '').split(/[,;]/).map((part) => part.trim()).filter(Boolean);

/* ------------------------------------------------------------ yes / no */

/** A stored Boolean (or its string forms) as the 'yes' | 'no' | '' a control holds. */
export const toChoice = (value: unknown): string => {
  if (value === true || value === 'yes' || value === 'true') return 'yes';
  if (value === false || value === 'no' || value === 'false') return 'no';
  return '';
};

/** '' is "unanswered" and is not sent — it would blank the stored answer. */
export const toBool = (choice: string): boolean | undefined =>
  choice === 'yes' ? true : choice === 'no' ? false : undefined;

/* ------------------------------------------------------------ mobile number */

/**
 * The website's `validateMobile` for an Indian number (the company form has no
 * country picker, so India is the default there too). A number typed with a
 * leading `+` is judged only on length, as the website judges other countries.
 */
export const checkMobile = (value: unknown, label = 'Mobile number'): string => {
  const raw = String(value ?? '').trim();
  if (!raw) return `${label} is required`;

  if (raw.startsWith('+') && !raw.startsWith('+91')) {
    const digits = raw.replace(/\D/g, '');
    return digits.length >= 7 && digits.length <= 15 ? '' : `${label} does not look like a phone number`;
  }

  let n = raw.replace(/\D/g, '');
  if (n.startsWith('00')) n = n.slice(2);
  if (n.length === 12 && n.startsWith('91')) n = n.slice(2);
  if (n.length === 11 && n.startsWith('0')) n = n.slice(1);

  if (n.length !== 10) return `${label} must be a 10-digit Indian mobile number`;
  if (!/^[6-9]/.test(n)) return `${label} must start with 6, 7, 8 or 9`;

  let up = true;
  let down = true;
  for (let i = 1; i < n.length; i += 1) {
    const step = Number(n[i]) - Number(n[i - 1]);
    if (step !== 1) up = false;
    if (step !== -1) down = false;
  }
  if (/^(\d)\1{9}$/.test(n) || up || down || n.slice(0, 2).repeat(5) === n) {
    return `${n} is not a real mobile number. Please enter the number you actually use.`;
  }
  return '';
};
