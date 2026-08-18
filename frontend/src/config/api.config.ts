import { Platform } from 'react-native';

// Host for dev:
// - Machine LAN IP e.g. '10.249.189.174' works for Wi-Fi & USB Physical Devices, Android Emulator & iOS
const DEV_HOST = 'localhost';

const API_CONFIG = {
  development: {
    baseURL: `http://${DEV_HOST}:5000/api/v1`,
    timeout: 12000,
  },
  production: {
    baseURL: 'https://actv-project.onrender.com/api/v1',
    timeout: 75000, // Cold start handling for Render
  },
};

const ENV = __DEV__ ? 'development' : 'production';

export const API_BASE_URL = API_CONFIG[ENV].baseURL;
export const API_TIMEOUT = API_CONFIG[ENV].timeout;

// Origin the uploaded files are served from (baseURL minus the /api/v1 suffix).
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/v\d+\/?$/, '');

/**
 * Turn a stored logo / product image value into a URL this device can load.
 *
 * Uploads are stored as a relative `/uploads/<file>` path. Older rows hold an
 * absolute URL built from whatever host the *uploading* device used
 * (`http://localhost:5000/...`, `http://10.0.2.2:5000/...`, a stale LAN IP),
 * which every other device fails to fetch - the <Image> just renders blank.
 * So any value carrying an `/uploads/` segment is re-anchored to the API
 * origin we are actually talking to, which repairs those rows on read.
 */
export const resolveMediaUrl = (value?: string | null): string => {
  const raw = (value || '').trim();
  if (!raw) return '';

  // Local picker results and inline data are already displayable as-is.
  if (
    raw.startsWith('data:') ||
    raw.startsWith('file:') ||
    raw.startsWith('content:') ||
    raw.startsWith('asset:')
  ) {
    return raw;
  }

  const uploadIndex = raw.indexOf('/uploads/');
  if (uploadIndex !== -1) {
    return `${API_ORIGIN}${raw.slice(uploadIndex)}`;
  }

  // A genuine remote asset (S3, Cloudinary, a gravatar) is left alone.
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;

  return `${API_ORIGIN}/${raw.replace(/^\/+/, '')}`;
};

// API Endpoints
export const ENDPOINTS = {
  // Auth
  AUTH: {
    REGISTER: '/auth/register',
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    PROFILE: '/auth/me',
    VALIDATE_TOKEN: '/auth/validate-token',
  },

  // Members
  MEMBERS: {
    GET_BY_ID: (id: string) => `/members/${id}`,
    UPDATE: (id: string) => `/members/${id}`,
    GET_STATUS: (id: string) => `/members/${id}/status`,
    GET_BY_EMAIL: (email: string) => `/members/${email}/details`,
    UPLOAD_PHOTO: (id: string) => `/members/${id}/photo`,
  },

  // Applications
  APPLICATIONS: {
    CREATE: '/applications',
    SUBMIT: '/applications',
    MY_APPLICATIONS: '/applications/my-applications',
    GET_BY_ID: (id: string) => `/applications/${id}`,
    GET_BY_USER: (userId: string) => `/applications/${userId}`,
    GET_TIMELINE: (id: string) => `/applications/${id}/timeline`,
    GET_LIST: '/applications',
    // Three-tier approval endpoints
    BLOCK_REVIEW: (id: string) => `/applications/${id}/block-review`,
    DISTRICT_REVIEW: (id: string) => `/applications/${id}/district-review`,
    STATE_REVIEW: (id: string) => `/applications/${id}/state-review`,
    // Legacy endpoints (deprecated)
    APPROVE: (id: string) => `/applications/${id}/approve`,
    REJECT: (id: string) => `/applications/${id}/reject`,
    DISTRICT_APPROVE: (id: string) => `/applications/${id}/district-approve`,
    STATE_APPROVE: (id: string) => `/applications/${id}/state-approve`,
  },

  // Business Profiles
  BUSINESS: {
    CREATE: '/business-profiles',
    GET_BY_MEMBER: (memberId: string) => `/business-profiles/${memberId}`,
    UPDATE: (id: string) => `/business-profiles/${id}`,
    DELETE: (id: string) => `/business-profiles/${id}`,
    GET_STATS: (companyId: string) => `/business/stats/${companyId}`,
    GET_ACTIVITIES: (companyId: string) => `/business/activities/${companyId}`,
  },

  // Companies
  COMPANIES: {
    LIST: '/companies',
    CREATE: '/companies',
    UPDATE: (id: string) => `/companies/${id}`,
    DELETE: (id: string) => `/companies/${id}`,
  },

  // Products
  PRODUCTS: {
    CREATE: '/products',
    LIST: '/products',
    GET_BY_ID: (id: string) => `/products/${id}`,
    UPDATE: (id: string) => `/products/${id}`,
    DELETE: (id: string) => `/products/${id}`,
    STATS: '/products/stats',
    ACTIVITIES: '/products/activities',
    UPLOAD_IMAGES: (id: string) => `/products/${id}/images`,
  },

  // Membership & Payment
  MEMBERSHIP: {
    GET_PLANS: '/membership/plans',
  },
  PAYMENT: {
    CREATE_REQUEST: '/payment/create-request',
    CHECK_STATUS: (paymentRequestId: string) => `/payment/status/${paymentRequestId}`,
    RENEW: '/payment/renew',
    // Legacy endpoints
    CREATE_ORDER: '/payment/create-order',
    VERIFY: '/payment/verify',
    GET_DETAILS: (orderId: string) => `/payment/${orderId}`,
  },
  WEBHOOK: {
    INSTAMOJO: '/webhook/instamojo',
  },

  // Browse & Notifications
  BROWSE: {
    MEMBERS: '/browse-members',
    SEARCH: '/browse-members/search',
  },
  NOTIFICATIONS: {
    // The server derives the user from the auth token; there is no
    // /notifications/:userId route and calling one returned 404.
    LIST: '/notifications',
    MARK_READ: (id: string) => `/notifications/${id}/read`,
    MARK_ALL_READ: '/notifications/read-all',
  },

  // Admin
  ADMIN: {
    BLOCK: {
      DASHBOARD: '/admin/block/dashboard',
      PENDING: '/admin/block/pending-applications',
      MEMBERS: '/admin/block/members',
    },
    DISTRICT: {
      DASHBOARD: '/admin/district/dashboard',
      PENDING: '/admin/district/pending',
    },
    STATE: {
      DASHBOARD: '/admin/state/dashboard',
      PENDING: '/admin/state/pending',
    },
    SUPER: {
      DASHBOARD: '/admin/super/dashboard',
      USERS: '/admin/super/users',
      ANALYTICS: '/admin/super/analytics',
    },
    GET_PROFILE: (id: string) => `/admin/${id}`,
    UPDATE_PROFILE: (id: string) => `/admin/${id}`,
    CHANGE_PASSWORD: (id: string) => `/admin/${id}/password`,
  },
};
