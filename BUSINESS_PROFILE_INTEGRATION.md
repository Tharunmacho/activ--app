# Business Profile Screen Integration Guide

## Overview
The Business Profile Screen allows users to create their business profile within the ACTIV platform. This screen has been converted from Dart/Flutter to React Native (TypeScript/TSX).

## Features

### ✅ Implemented Features
1. **Business Logo Upload** - Upload and preview business logo using device camera/gallery
2. **Business Information Form** with fields:
   - Business Name (required)
   - Description (optional, max 500 characters)
   - Business Type selection (Manufacturing, Trader, Service Provider, Others)
   - Mobile Number (auto-prefilled from user profile)
   - Area (optional)
   - Location (required)
3. **Form Validation** - Client-side validation before submission
4. **Loading States** - Visual feedback during API calls
5. **Error Handling** - User-friendly error messages
6. **Navigation** - Seamless integration with navigation stack

## File Structure

### Frontend (React Native)
```
Activ/src/screens/business/
├── BusinessProfileScreen.tsx     # Main business profile form
├── BusinessDashboardScreen.tsx   # Business dashboard (after creation)
└── index.ts                      # Exports

Activ/src/config/
└── api.config.ts                 # API endpoint configurations

Activ/src/services/
└── api.ts                        # Axios instance with interceptors
```

### Backend (Node.js/Express)
```
activ-backend/src/modules/members/
├── business.controller.js        # Business profile controllers
├── business.routes.js           # Business profile routes
├── businessinfo.model.js        # Business info database model

activ-backend/src/
└── routes.js                    # Main routes file
```

## API Endpoints

### Create Business Profile
```http
POST /api/v1/business-profiles
Content-Type: multipart/form-data
Authorization: Bearer <token>

Body:
{
  "organizationName": "string (required)",
  "description": "string",
  "businessTypes": ["string"],
  "phone": "string (required)",
  "area": "string",
  "location": "string (required)",
  "constitutionType": "string",
  "businessActivities": "string",
  "businessCommencementYear": "string",
  "numberOfEmployees": "string",
  "memberOfOtherChamber": boolean,
  "otherChamber": "string",
  "govtOrganizations": ["string"],
  "logo": File (optional)
}

Response: 201 Created
{
  "success": true,
  "message": "Business profile created successfully",
  "data": { ...businessProfile }
}
```

### Get Business Profile
```http
GET /api/v1/business-profiles/me
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "message": "Business profile fetched successfully",
  "data": { ...businessProfile }
}
```

### Update Business Profile
```http
PUT /api/v1/business-profiles/me
Authorization: Bearer <token>

Response: 200 OK
```

### Delete Business Profile
```http
DELETE /api/v1/business-profiles/me
Authorization: Bearer <token>

Response: 200 OK
```

## Navigation Flow

```
Dashboard
    ↓
BusinessProfile (Create)
    ↓
BusinessDashboard (View/Manage)
```

## Usage in Navigation

### Add to RootStackParamList (types/index.ts)
```typescript
export type RootStackParamList = {
  // ... other routes
  BusinessProfile: undefined;
  BusinessDashboard: { companyId?: string };
};
```

### Navigate to Business Profile
```typescript
// From any screen
navigation.navigate('BusinessProfile');

// Or from Dashboard
<TouchableOpacity onPress={() => navigation.navigate('BusinessProfile')}>
  <Text>Create Business Profile</Text>
</TouchableOpacity>
```

## Database Schema

### Collection: `additional form for bussiness 2`
```javascript
{
  userId: ObjectId,              // Reference to user
  doingBusiness: Boolean,        // true for business users
  registrationType: String,      // 'aspirant' | 'business'
  organizationName: String,      // Business name
  constitutionType: String,      // OPC, Trust, Society, etc.
  businessTypes: [String],       // Array of business types
  businessActivities: String,    // Description
  businessCommencementYear: String,
  numberOfEmployees: String,
  memberOfOtherChamber: Boolean,
  otherChamber: String,
  govtOrganizations: [String],   // MSME, KVIC, etc.
  isLocked: Boolean,            // Prevents editing
  submittedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

## Validation Rules

### Client-Side (React Native)
- Business Name: Required, non-empty
- Business Type: Required, must select one
- Mobile Number: Required, phone format
- Location: Required, non-empty
- Description: Optional, max 500 characters
- Logo: Optional, image file only

### Server-Side (Backend)
- User must be authenticated
- No duplicate business profile per user
- Business Types must be valid enum values
- Constitution Type must be valid enum value

## Dependencies

### Required Packages (Already Installed)
```json
{
  "react-native-image-picker": "^8.2.1",
  "react-native-vector-icons": "^10.3.0",
  "axios": "^1.13.2"
}
```

## Configuration

### Update IP Address for Development
In `Activ/src/config/api.config.ts`:
```typescript
development: {
  baseURL: 'http://YOUR_LOCAL_IP:5000/api/v1',  // Change to your IP
  timeout: 12000,
}
```

Find your IP:
```bash
# Windows
ipconfig

# Mac/Linux
ifconfig
```

## Testing Checklist

- [ ] Can navigate to Business Profile screen
- [ ] Logo upload button works
- [ ] Image preview displays correctly
- [ ] All form fields are editable
- [ ] Business type selection works
- [ ] Mobile number is pre-filled
- [ ] Form validation shows errors
- [ ] Submit button shows loading state
- [ ] Success message appears
- [ ] Navigates to Business Dashboard on success
- [ ] Error handling works
- [ ] Cancel button navigates back

## Common Issues & Solutions

### Issue: "Cannot connect to server"
**Solution:** 
- Check if backend is running (`npm run dev` in activ-backend)
- Verify IP address in `api.config.ts`
- Ensure phone/emulator is on same network

### Issue: "Image picker not working"
**Solution:**
- iOS: Add permissions to Info.plist
- Android: Add permissions to AndroidManifest.xml

### Issue: "401 Unauthorized"
**Solution:**
- User must be logged in
- Check if auth token is valid
- Token might be expired

### Issue: "Business profile already exists"
**Solution:**
- One user can only have one business profile
- Use update endpoint to modify existing profile

## Next Steps

1. **Add Image Compression** - Reduce upload size
2. **Add More Fields** - Additional business information
3. **Add Business Dashboard** - View and manage business
4. **Add Products Section** - Manage business products
5. **Add Analytics** - Business performance metrics

## Backend Server Status

Server is running on: `http://localhost:5000`
MongoDB: Connected
Redis: Memory cache fallback (Redis optional)

## Support

For issues or questions, check:
- Backend logs: `activ-backend/logs/app.log`
- Frontend debug: React Native debugger
- API testing: Use Postman/Thunder Client
