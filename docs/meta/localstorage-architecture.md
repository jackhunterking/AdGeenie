# Meta Integration - localStorage Architecture

## Overview

The Meta integration has been refactored to use localStorage for temporary data storage instead of Supabase. This provides a simpler, client-side approach for managing Meta connection data during development and testing.

## Key Changes

### 1. New Utilities

#### `lib/meta/logger.ts`
- Comprehensive logging utility for all Meta Graph API calls
- Logs before and after each API call with timing information
- Stores logs in localStorage (last 100 entries)
- Provides structured logging with context, operation, endpoint, and metadata

#### `lib/meta/storage.ts`
- localStorage-based storage for Meta connection data
- Replaces all Supabase persistence
- Provides type-safe connection management
- Auto-cleanup on disconnect

#### `lib/meta/service-refactored.ts`
- Refactored service with comprehensive logging
- All Supabase calls removed
- Returns data for client-side storage
- Separated server-side (API calls) from client-side (storage) concerns

### 2. Data Flow

#### OAuth Flow (System App)

```
1. User clicks "Connect with Meta"
   ↓
2. Opens OAuth popup
   ↓
3. User grants permissions
   ↓
4. Callback: /api/meta/auth/callback
   - Exchange code for tokens
   - Fetch businesses, pages, ad accounts
   - Compute admin snapshot
   - Return data in URL (base64-encoded JSON)
   ↓
5. Bridge: /meta/oauth/bridge
   - Decode connection data
   - postMessage to parent window
   ↓
6. Parent (MetaConnectCard)
   - Receive message with connectionData
   - Store in localStorage via metaStorage
   - Update UI
```

#### OAuth Flow (User App)

```
1. User clicks "Login with Facebook (User Access)"
   ↓
2. Opens OAuth popup
   ↓
3. User grants permissions
   ↓
4. Callback: /api/meta/auth/callback?type=user
   - Exchange code for tokens
   - Fetch user ID
   - Return user app token data in URL
   ↓
5. Bridge: /meta/oauth/bridge
   - Decode user app data
   - postMessage to parent window
   ↓
6. Parent (MetaConnectCard)
   - Receive message with connectionData
   - Update existing connection in localStorage
   - Update UI
```

#### Admin Verification Flow

```
1. User clicks "Verify Admin Access"
   ↓
2. Call API: /api/meta/admin/verify (to be created)
   - Get token from localStorage
   - Verify roles via Graph API
   - Return role data (no persistence)
   ↓
3. Parent (MetaConnectCard)
   - Receive role data
   - Update localStorage via metaStorage
   - Update UI
```

#### Payment Flow

```
1. User clicks "Add Payment Method"
   ↓
2. Call FB.ui({ method: 'ads_payment', ... })
   ↓
3. Facebook dialog opens
   ↓
4. On success: Validate via API
   - Call /api/meta/payment/validate (to be created)
   - Check funding status via Graph API
   - Return validation result
   ↓
5. Parent (MetaConnectCard)
   - Mark payment connected in localStorage
   - Update UI
```

### 3. localStorage Schema

#### Connection Data Key Format
```
meta_connection_{campaignId}
```

#### Connection Data Structure
```typescript
{
  campaign_id: string;
  user_id: string;
  fb_user_id: string;
  long_lived_user_token: string;
  token_expires_at: string;

  // Business
  selected_business_id?: string;
  selected_business_name?: string;

  // Page
  selected_page_id?: string;
  selected_page_name?: string;
  selected_page_access_token?: string;

  // Instagram
  selected_ig_user_id?: string;
  selected_ig_username?: string;

  // Ad Account
  selected_ad_account_id?: string;
  selected_ad_account_name?: string;
  ad_account_payment_connected?: boolean;

  // Admin verification
  admin_connected?: boolean;
  admin_checked_at?: string;
  admin_business_role?: string;
  admin_ad_account_role?: string;

  // User app token
  user_app_token?: string;
  user_app_token_expires_at?: string;
  user_app_connected?: boolean;
  user_app_fb_user_id?: string;

  // Status
  status?: string; // 'connected' | 'payment_linked' | 'selected_assets'

  // Metadata
  created_at: string;
  updated_at: string;
}
```

#### Logs Key
```
meta_api_logs
```

### 4. API Routes (Refactored)

#### `/api/meta/auth/callback`
**Status**: ✅ Refactored
- **Purpose**: Exchange OAuth code for tokens, fetch assets, return data
- **Changes**:
  - No Supabase persistence
  - Returns connection data in URL (base64-encoded)
  - Comprehensive logging added

#### `/api/meta/admin/verify` (To be created)
**Status**: ⏳ Pending
- **Purpose**: Verify admin roles without persisting
- **Input**: `{ campaignId }` (gets token from request)
- **Output**: `{ adminConnected, businessRole, adAccountRole, ... }`
- **Changes**: Stateless, returns data only

#### `/api/meta/payment/validate` (To be created)
**Status**: ⏳ Pending
- **Purpose**: Validate ad account funding status
- **Input**: `{ campaignId, adAccountId }`
- **Output**: `{ hasFunding, isActive, ... }`
- **Changes**: Stateless, returns validation result

### 5. Client Components

#### `MetaConnectCard` (To be updated)
**Status**: ⏳ Pending
- **Changes**:
  - Listen for `META_CONNECTED` messages with `connectionData`
  - Store data via `metaStorage.setConnection()`
  - Read data via `metaStorage.getConnection()`
  - Remove API calls to `/api/meta/selection`
  - Update disconnect to clear localStorage

### 6. Benefits

1. **Simpler Development**: No database setup needed for Meta integration
2. **Faster Iteration**: No migrations, schema changes, or RLS policies
3. **Better Logging**: Comprehensive before/after logs for all API calls
4. **Easier Debugging**: All data visible in browser DevTools
5. **No Server State**: Stateless API routes, easier to test

### 7. Limitations

1. **Data Persistence**: Data cleared when browser cache is cleared
2. **No Cross-Device Sync**: Connection data only on current browser
3. **Security**: Tokens stored in localStorage (use with caution in production)
4. **No History**: No audit trail of connections/changes

### 8. Migration Path (Future)

When ready to move back to Supabase:

1. Update API routes to call `metaStorage.getConnection()` AND persist to Supabase
2. Update `MetaConnectCard` to fetch from API (which checks Supabase)
3. Keep localStorage as a cache layer
4. Add sync logic to keep localStorage and Supabase in sync

### 9. Testing Checklist

- [ ] System OAuth flow (Connect with Meta)
- [ ] User app OAuth flow (Login with Facebook User Access)
- [ ] Admin verification
- [ ] Payment method setup
- [ ] Disconnect (clears localStorage)
- [ ] Multiple campaigns (different campaignIds)
- [ ] Token expiry handling
- [ ] Error scenarios (network failures, token exchange errors)
- [ ] Log storage and retrieval
- [ ] Browser refresh (data persistence)

### 10. Code Organization

```
lib/meta/
├── logger.ts              # Logging utility (NEW)
├── storage.ts             # localStorage utility (NEW)
├── service-refactored.ts  # Refactored service (NEW)
├── service.ts             # Old service (keep for reference)
├── login.ts               # OAuth URL builder (unchanged)
└── types.ts               # Type definitions (unchanged)

app/api/meta/auth/callback/
└── route.ts               # OAuth callback (REFACTORED)

app/meta/oauth/bridge/
└── page.tsx               # Bridge page (REFACTORED)

components/meta/
└── MetaConnectCard.tsx    # Main UI component (TO BE UPDATED)
```

### 11. Environment Variables

No changes to environment variables. Same as before:

```bash
NEXT_PUBLIC_FB_APP_ID=
FB_APP_SECRET=
NEXT_PUBLIC_FB_GRAPH_VERSION=
NEXT_PUBLIC_FB_BIZ_LOGIN_CONFIG_ID_SYSTEM=
NEXT_PUBLIC_FB_BIZ_LOGIN_CONFIG_ID_USER=
NEXT_PUBLIC_ENABLE_META=
NEXT_PUBLIC_META_REQUIRE_ADMIN=
```

### 12. Logging Examples

All Graph API calls are logged with before/after information:

```
[Server] [MetaService] Fetch businesses [START] → https://graph.facebook.com/v24.0/me/businesses
{
  timestamp: "2025-11-02T10:30:00.000Z",
  tokenPrefix: "EAABw...abc",
  endpoint: "https://graph.facebook.com/v24.0/me/businesses"
}

[Server] [MetaService] Fetch businesses [SUCCESS] → https://graph.facebook.com/v24.0/me/businesses (245ms)
{
  timestamp: "2025-11-02T10:30:00.245Z",
  duration: 245,
  statusCode: 200,
  metadata: { count: 3 }
}
```

### 13. Next Steps

1. ✅ Create logging utility
2. ✅ Create storage utility
3. ✅ Refactor service
4. ✅ Update OAuth callback route
5. ✅ Update bridge page
6. ⏳ Update MetaConnectCard component
7. ⏳ Create admin verify API route
8. ⏳ Create payment validate API route
9. ⏳ Test complete flow
10. ⏳ Update documentation with examples

---

**Last Updated**: 2025-11-02
**Status**: In Progress
**Author**: Claude Code
