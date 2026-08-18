// Navigation Types
export type RootStackParamList = {
  // Auth Stack
  Onboarding: undefined;
  Welcome: undefined;
  Login: undefined;
  RegistrationStep1: undefined;
  RegistrationStep2: { 
    fullName: string;
    email: string;
    phoneNumber: string;
    password: string;
  };
  
  // Member Stack
  MemberMain: undefined;
  ProfileDetail: { memberId: string };
  EditProfile: undefined;
  PersonalDetailsForm: { userData: any };
  BusinessInformationForm: { userData: any };
  FinancialComplianceForm: { userData: any };
  DeclarationForm: { userData: any };
  Dashboard: undefined;
  PaidDashboard: undefined;
  ApplicationStatus: undefined;
  ApplicationSubmitted: undefined;
  BusinessProfile: undefined;
  ManageCompanies: undefined;
  BusinessDashboard: undefined;
  CompleteMembership: undefined;
  AddCompany: undefined;
  ProductsServices: { companyId?: string };
  AddProduct: { productId?: string; companyId: string };
  Discover: undefined;
  Settings: undefined;
  EditCompany: { companyId: string };
  ViewCompany: { companyId: string };
  BusinessProfileView: { companyId: string };
  PaymentWebView: { orderId: string; amount: number };
  PaymentGateway: {
    planType: string;
    planAmount: number;
    totalAmount: number;
    applicationId?: string;
  };
  MockPayment: {
    paymentRequestId?: string;
    amount: number;
    planType: string;
    applicationId?: string;
  };
  PaymentSuccess: {
    orderId?: string;
    transactionId?: string;
    paymentDate?: string;
    planType?: string;
    planAmount?: number;
    totalAmount?: number;
    applicationId?: string;
    memberName?: string;
  };
  PaymentFailed: { orderId: string; reason: string };
  
  // Admin Common Screens
  ApplicantDetail: { applicant: Applicant };
  
  // Block Admin Screens
  BlockDashboard: undefined;
  BlockApprovals: undefined;
  BlockMembers: undefined;
  BlockAnalytics: undefined;
  BlockSettings: undefined;
  
  // District Admin Screens
  DistrictDashboard: undefined;
  DistrictApprovals: undefined;
  DistrictMembers: undefined;
  DistrictAnalytics: undefined;
  DistrictSettings: undefined;
  
  // State Admin Screens
  StateDashboard: undefined;
  StateApprovals: undefined;
  StateMembers: undefined;
  StateAnalytics: undefined;
  StateSettings: undefined;

  // Legacy Admin Routes
  BlockAdminDashboard: undefined;
  BlockAdminApproval: undefined;
  BlockAdminMembers: undefined;
  BlockAdminSettings: undefined;
  DistrictAdminDashboard: undefined;
  DistrictAdminApproval: undefined;
  StateAdminDashboard: undefined;
  StateAdminApproval: undefined;
  SuperAdminDashboard: undefined;
  
  // Admin Common Screens
  UserManagement: undefined;
  Analytics: undefined;
  AdminAnalytics: undefined;
  Reports: undefined;
};

export type MemberBottomTabParamList = {
  Dashboard: undefined;
  BrowseMembers: undefined;
  Notifications: undefined;
  Profile: undefined;
};

// User Roles
export enum UserRole {
  MEMBER = 'member',
  BLOCK_ADMIN = 'block_admin',
  DISTRICT_ADMIN = 'district_admin',
  STATE_ADMIN = 'state_admin',
  SUPER_ADMIN = 'super_admin',
}

// Application Status
export enum ApplicationStatus {
  PENDING_BLOCK = 'Pending-Block',
  PENDING_DISTRICT = 'Pending-District',
  PENDING_STATE = 'Pending-State',
  APPROVED = 'Approved',
  REJECTED = 'Rejected',
}

// Member Types
export enum MemberType {
  ASPIRANT = 'aspirant',
  COMPANY = 'company',
}

// User Interface
export interface User {
  id: string;
  _id?: string;
  email: string;
  fullName: string;
  phoneNumber: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

// Member Interface
export interface Member extends User {
  profilePhoto?: string;
  state?: string;
  district?: string;
  block?: string;
  city?: string;
  profileCompletion: number;
  hasApplication: boolean;
  applicationStatus?: ApplicationStatus;
  hasBusinessProfile: boolean;
  memberType?: MemberType;
}

// Location Interfaces
export interface Block {
  name: string;
}

export interface District {
  district: string;
  block: string[];
}

export interface State {
  state: string;
  districts: District[];
}

export interface LocationData {
  states: State[];
}

// Application Interface
export interface Application {
  id: string;
  userId: string;
  memberType: MemberType;
  status: ApplicationStatus;
  personalDetails: any;
  businessDetails?: any;
  financialDetails: any;
  submittedAt: string;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  timeline: ApplicationTimeline[];
}

// Applicant as returned by the admin dashboard endpoints — a flattened
// application joined with the member profile it belongs to.
// `upstream` = still awaiting an earlier tier; `closed` = rejected by another
// tier. Both are visible in the `all` bucket but belong to no action queue.
export type ApplicantStage = 'pending' | 'approved' | 'rejected' | 'upstream' | 'closed';

/** Which tier's perspective an applicant payload was built from. */
export type AdminLevel = 'block' | 'district' | 'state';

/** The four buckets every admin dashboard renders. */
export interface ApplicantBuckets {
  pending: Applicant[];
  approved: Applicant[];
  rejected: Applicant[];
  all: Applicant[];
}

export interface Applicant {
  id: string;
  _id?: string;
  applicationId: string;
  memberId: string;
  memberCode: string;
  fullName: string;
  memberName?: string;
  memberType?: string;
  email: string;
  phone: string;
  role: string;
  gender: string;
  block: string;
  district: string;
  state: string;
  city: string;
  status: string;
  stage: ApplicantStage;
  level?: AdminLevel;
  statusLabel: string;
  approvedByText?: string;
  submittedAt: string | null;
  blockApprovedAt: string | null;
  districtApprovedAt?: string | null;
  stateApprovedAt?: string | null;
  rejectionReason: string;
  rejectedBy?: {
    adminType: string;
    rejectedAt: string | null;
  } | null;
  personalDetails: {
    fullName: string;
    block: string;
    city: string;
    district: string;
    phone: string;
    email: string;
    dateOfBirth: string;
    aadhaarNumber: string;
    streetName: string;
    education: string;
    religion: string;
    socialCategory: string;
  };
  businessInfo: {
    doingBusiness: boolean;
    organizationName: string;
    constitutionType: string;
    businessTypes: string[];
    businessActivities: string;
    businessCommencementYear: string | number;
    numberOfEmployees: string | number;
    memberOfOtherChamber?: boolean;
    otherChamber: string;
    govtOrganizations: string[];
  };
  financialInfo: {
    panNumber: string;
    gstNumber: string;
    udyamNumber: string;
    itrFiled: boolean | string;
    turnoverRange: string;
    govtSchemeBenefit?: boolean;
  };
  declaration: {
    sisterConcerns: number | string;
    companyNames: string[];
    agreeToDeclaration?: boolean;
  };
}

export interface ApplicationTimeline {
  stage: string;
  status: string;
  adminName?: string;
  comments?: string;
  timestamp: string;
}

// Business Profile Interface
export interface BusinessProfile {
  id: string;
  memberId: string;
  companyName: string;
  businessType: string;
  gstNumber?: string;
  registrationNumber: string;
  website?: string;
  description?: string;
  logo?: string;
  coverImage?: string;
  email: string;
  phone: string;
  address: string;
  createdAt: string;
  updatedAt: string;
}

// Company Interface
export interface Company {
  id: string;
  memberId: string;
  name: string;
  logo?: string;
  isActive: boolean;
  createdAt: string;
}

// Product Interface
export interface Product {
  id: string;
  companyId: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  images: string[];
  createdAt: string;
  updatedAt: string;
}

// Notification Interface
export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  isRead: boolean;
  createdAt: string;
}

// Membership Plan Interface
export interface MembershipPlan {
  id: string;
  name: string;
  type: MemberType;
  price: number;
  duration: number; // in days
  features: string[];
  isPopular: boolean;
}

// Admin Stats Interface
export interface AdminStats {
  totalApplications: number;
  pendingApplications: number;
  approvedApplications: number;
  rejectedApplications: number;
  totalMembers: number;
}