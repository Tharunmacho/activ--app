# MASTER PROMPT: ACTIV MOBILE PLATFORM BUILD & INTEGRATION SPECIFICATION

> **Role & Task**: You are an expert React Native & Full-Stack Engineer. Your objective is to build/integrate the complete **ACTIV Mobile Application** according to the exact 8-stage architecture, dual-track registration pathways, pre-payment dashboard state, 3-tier administrative approval process, tiered payment gate, and active feature-rich dashboard defined below.

---

## 🎯 1. APPLICATION IDENTITY & SYSTEM OVERVIEW

ACTIV is a multi-tier organizational mobile platform connecting **Established Business Members** and **Aspirant Student Entrepreneurs** with local, district, and state association chapters.

### Key Roles:
- **Member / Applicant**: Aspirant (Student) or Company (Business Owner).
- **Block Admin**: Reviews local residency and applicant details at the Block level.
- **District Admin**: Reviews and verifies district business credentials.
- **State Admin**: Final approval authority to grant membership access.
- **Super Admin**: System administrator managing all users, analytics, and reports.

---

## 🗺️ 2. COMPLETE 8-STAGE WORKFLOW & ROUTING ENGINE

```
[Stage 1: Onboarding Carousel] ──> [Stage 2: Login / Auth]
                                             │
                                    (New User Registration)
                                             ▼
                          [Stage 3: Location (State/District/Block) + Member Type Choice]
                                             │
                  ┌──────────────────────────┴──────────────────────────┐
                  ▼                                                     ▼
     [Pathway A: Company Member]                           [Pathway B: Aspirant / Student]
   1. Personal Details                                   1. Personal Details
   2. Business Information                               2. Aspirant Declaration & Goals
   3. Financial & Compliance (GST/PAN)                  (Bypasses Tax & Financial Forms)
   4. Legal Declaration                                                 │
                  │                                                     │
                  └──────────────────────────┬──────────────────────────┘
                                             ▼
                        [Stage 5: Non-Payable Pre-Payment Dashboard]
                        • Dynamic Profile Completion Tracker (%)
                        • Business Logo, Info & Catalog Draft Setup
                        • Application Review Status Tracker
                                             │
                                             ▼
                 [Stage 6: 3-Tier Admin Review Workflow]
                 Block Admin (Approve) ──> District Admin (Approve) ──> State Admin (Approve)
                                             │
                                             ▼
                        [Stage 7: Tiered Membership Payment Gate]
                        • Select Plan: Aspirant Tier vs Company Tier
                        • Razorpay/UPI Payment Gateway WebView
                                             │
                                             ▼
                        [Stage 8: Full Active Dashboard]
                        • B2B Directory & Member Search
                        • Upcoming Events, Expos & Agendas
                        • Multi-Company Catalog & Stock Suite
```

---

## 📋 3. DETAILED SCREEN & FEATURE SPECIFICATIONS

### Stage 1: Onboarding Carousel (`OnboardingScreen.tsx`)
- Swipeable hero cards: *Networking*, *Business Growth*, *Regional Associations*, *Industrial Catalogs*.
- Buttons: `Get Started` (navigates to Login) and `Skip` (navigates to Login).

### Stage 2: Authentication (`LoginScreen.tsx`)
- Form Inputs: Email (with regex format check) & Password (min 6 characters, show/hide toggle).
- Social Auth: Google, Facebook, LinkedIn single-sign-on integration.
- Navigation Routing based on JWT payload:
  - Unregistered user $\rightarrow$ Navigate to `RegistrationStep1`.
  - Pending review user $\rightarrow$ Navigate to `MemberMain` (Non-Payable Dashboard).
  - Approved & Paid user $\rightarrow$ Navigate to `MemberMain` (Active Dashboard).

### Stage 3: Location & Member Type Selection (`RegistrationStep1Screen.tsx` & `RegistrationStep2Screen.tsx`)
- **Step 1**: Basic identity (Full Name, Email, Phone, Password).
- **Step 2**: 
  - Hierarchical location selectors: State $\rightarrow$ District $\rightarrow$ Block.
  - Member Type toggle: `COMPANY` (Business Member) vs `ASPIRANT` (Student Member).

### Stage 4: Dual-Track Registration Forms

#### Pathway A: Company Member (4 Forms)
1. **Personal Details** (`PersonalDetailsFormScreen.tsx`): Full Name, 12-digit Aadhaar Number, Educational Qualification, Religion, Social Category, City.
2. **Business Information** (`BusinessInformationFormScreen.tsx`): `doingBusiness=true`, Organization Name, Constitution Type (Pvt Ltd, Partnership, Sole Prop, OPC), Business Categories (Manufacturing, Trader, Service), Commencement Year, Employee Count, Chamber/Govt Memberships.
3. **Financial & Compliance** (`FinancialComplianceFormScreen.tsx`): 10-char PAN Number, 15-char GSTIN, Udyam Registration, ITR Filing Status, Annual Turnover Range, Government Scheme Benefits.
4. **Legal Declaration** (`DeclarationFormScreen.tsx`): Sister Concerns list, Legal Undertaking Agreement $\rightarrow$ Submits status as `Pending-Block`.

#### Pathway B: Aspirant / Student Member (2 Forms)
1. **Personal Details** (`PersonalDetailsFormScreen.tsx`): Full Name, Aadhaar/ID, Education Level/Institution, Religion, Social Category, City.
2. **Aspirant Declaration & Goals** (`DeclarationFormScreen.tsx`): `doingBusiness=false`, Targeted Business Domain, Mentorship/Training Needs, Legal Undertaking Agreement.
   - **CRITICAL RULE**: Bypasses Financial/Tax forms (No GST, PAN, ITR, or Turnover requested) for swift onboarding.

### Stage 5: Non-Payable Dashboard (`DashboardScreen.tsx` in Pre-Payment State)
- **Profile Completion Tracker**: Dynamic % progress bar (50% $\rightarrow$ 75% $\rightarrow$ 100%).
- **Business Account Draft Setup** (`AddCompanyScreen.tsx` & `AddProductScreen.tsx`): Allows company users to pre-upload business logo, company summary, and draft catalog items while review is pending (`isDraft=true`).
- **Application Tracker**: Live stepper displaying `Pending-Block` $\rightarrow$ `Pending-District` $\rightarrow$ `Pending-State`.
- **Restricted Access**: Locks B2B contact info and VIP event RSVPs until approval and payment.

### Stage 6: Three-Tier Administrative Review Workflow
1. **Block Admin** (`BlockAdminDashboardScreen.tsx`): Reviews local applicants in their assigned Block. Actions: `Approve` (moves to `Pending-District`) or `Reject` (with comments).
2. **District Admin** (`DistrictAdminDashboardScreen.tsx`): Reviews applicants in their District. Actions: `Approve` (moves to `Pending-State`) or `Send Back`.
3. **State Admin** (`StateAdminDashboardScreen.tsx`): Final authority. Actions: `Approve` (sets status to `Approved` and unlocks payment gate).

### Stage 7: Tiered Payment Gate (`CompleteMembershipScreen.tsx`)
- Displays membership tiers upon State Admin approval:
  - **Aspirant Tier**: Discounted student membership rate, student workshop access, aspirant B2B listing.
  - **Company Tier**: Standard annual business rate, unlimited product/service catalog, full B2B directory access, VIP expo access.
- Payment Gateway Integration: Razorpay / UPI Payment WebView. Signature verification via `POST /api/v1/payment/verify` updates status to `Active Member`.

### Stage 8: Main Active Dashboard (`DashboardScreen.tsx` & `BusinessDashboardScreen.tsx`)
- **Upcoming Events & Agendas**: Industrial expos, trade fairs, speaker schedules, session reminders.
- **B2B Directory** (`DiscoverScreen.tsx` & `BrowseMembersScreen.tsx`): Search & filter businesses/aspirants by State, District, Block, or Sector.
- **Complete Business Suite**: Manage multi-company profiles, publish draft product catalogs, view lead analytics.

---

## 🛠️ 4. TYPESCRIPT DATA MODELS (`src/types/index.ts`)

```typescript
export enum UserRole {
  MEMBER = 'member',
  BLOCK_ADMIN = 'block_admin',
  DISTRICT_ADMIN = 'district_admin',
  STATE_ADMIN = 'state_admin',
  SUPER_ADMIN = 'super_admin',
}

export enum ApplicationStatus {
  PENDING_BLOCK = 'Pending-Block',
  PENDING_DISTRICT = 'Pending-District',
  PENDING_STATE = 'Pending-State',
  APPROVED = 'Approved',
  REJECTED = 'Rejected',
}

export enum MemberType {
  ASPIRANT = 'aspirant',
  COMPANY = 'company',
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  phoneNumber: string;
  role: UserRole;
  createdAt: string;
}

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
  isPaid: boolean;
}

export interface Application {
  id: string;
  userId: string;
  memberType: MemberType;
  status: ApplicationStatus;
  personalDetails: any;
  businessDetails?: any;
  financialDetails?: any;
  submittedAt: string;
  timeline: { stage: string; status: string; adminName?: string; timestamp: string }[];
}

export interface BusinessProfile {
  id: string;
  memberId: string;
  companyName: string;
  businessType: string;
  gstNumber?: string;
  registrationNumber?: string;
  logo?: string;
  description?: string;
  isDraft: boolean;
}

export interface Product {
  id: string;
  companyId: string;
  name: string;
  description: string;
  price: number;
  category: string;
  images: string[];
  isDraft: boolean;
}
```

---

## ⚡ 5. INTEGRATION & IMPLEMENTATION RULES

1. **Strict Stack Typing & React Navigation Rules**:
   - Navigation stack initialization in `App.tsx` must be generically typed: `createNativeStackNavigator<RootStackParamList>()`.
   - Screen component props must use `NativeStackScreenProps<RootStackParamList, 'ScreenName'>` (e.g. `type Props = NativeStackScreenProps<RootStackParamList, 'EditCompany'>`).
   - All navigation param types must be centralized in `src/types/index.ts`. Never reference non-existent relative module paths like `../../navigation/types`.

2. **Dynamic Dev Host API Resolution**:
   - `api.config.ts` must never hardcode local network IP addresses (e.g. `172.18.x.x`).
   - Development host must resolve dynamically: `Platform.OS === 'android' ? '10.0.2.2' : 'localhost'` to enable seamless Android Emulator and iOS Simulator network requests to `http://localhost:5000/api/v1`.
   - Production URL must include the full versioned API base path (`/api/v1`).

3. **Safe Backend Controller Request Parsing**:
   - Controllers must never invoke bare `JSON.parse(req.body.field)` without exception handling.
   - Incoming string or array parameters (such as `businessTypes` or categories) must be parsed safely inside try-catch blocks to prevent HTTP 500 crashes when receiving raw form strings vs JSON arrays.

4. **Data Model ID Resilience**:
   - Mongoose MongoDB documents use `_id` while frontend APIs map `id`. `User` and `Member` interfaces must support both `id: string` and `_id?: string` to prevent undefined reference crashes across screens.

5. **Form Conditional Routing Pathways**:
   - `PersonalDetailsFormScreen` checks `userData.memberType`.
   - If `MemberType.ASPIRANT`, navigating next routes directly to `DeclarationFormScreen` (bypassing financial & tax forms).
   - If `MemberType.COMPANY`, navigating next routes through `BusinessInformationFormScreen` $\rightarrow$ `FinancialComplianceFormScreen` $\rightarrow$ `DeclarationFormScreen`.

6. **Theme Token & Property Verification**:
   - Theme variables must strictly match exported token names (e.g., `FONTS.sizes.sm`, `FONTS.weights.semiBold`). Never guess token names (`small`, `semibold`).

7. **Verification Standard**:
   - Before committing changes, run `npx tsc --noEmit` to ensure 0 TypeScript compilation errors.

