# Meta Connection Error Logging

## Overview
This document describes the comprehensive error logging added to identify issues in the Meta connection flow.

## Logging Added

### 1. Callback Route (`/app/api/meta/auth/callback/route.ts`)

Enhanced logging for the OAuth callback flow:

- **Asset Fetching**: Detailed logging of businesses, pages, and ad accounts
  - Logs count of each asset type
  - Logs HTTP errors with status codes and response text
  - Logs all ad account statuses
  - Logs selected assets with full details (business, page, Instagram, ad account)

- **Database Operations**: 
  - Logs connection data being upserted (with token redacted)
  - Logs success/failure of connection upsert
  - Logs campaign state update with full meta_connect_data
  - Logs database errors with context

**Key Log Identifiers:**
- `[MetaCallback]` prefix on all logs
- Logs campaign ID, user ID, and asset counts
- Tracks reconnection vs. new connection

### 2. Selection Route (`/app/api/meta/selection/route.ts`)

Added comprehensive logging for asset selection retrieval:

- **Database Queries**:
  - Logs errors when fetching campaign_meta_connections
  - Logs errors when fetching campaign_states
  - Includes campaign ID and user ID in error context

- **Response Data**:
  - Logs what data is being returned to client
  - Includes status, business ID, page ID, ad account ID
  - Shows payment connection status

- **Error Handling**:
  - Detailed catch block with error message and stack trace
  - Includes request campaign ID in error logs

**Key Log Identifiers:**
- `[MetaSelection]` prefix on all logs
- Shows presence/absence of connection and state data
- Logs all errors with full context

### 3. Payment Status Route (`/app/api/meta/payment/status/route.ts`)

Enhanced logging for payment validation:

- **Request Tracking**:
  - Logs start of request with parameters
  - Validates and logs missing parameters

- **Graph API Calls**:
  - Logs before making Facebook Graph API call
  - Logs Graph API version and account ID
  - Logs Graph API errors with status and response text
  - Logs full Graph API response (funding source info)

- **Payment Status**:
  - Logs detected payment connection status
  - Logs database update success/failure
  - Tracks payment flag updates

- **Error Handling**:
  - Comprehensive catch block with full error details
  - Includes campaign ID and ad account ID in errors

**Key Log Identifiers:**
- `[PaymentStatus]` prefix on all logs
- Shows Graph API interaction details
- Tracks payment detection and persistence

### 4. MetaConnectCard Component (`/components/meta/MetaConnectCard.tsx`)

Added comprehensive client-side logging:

- **Hydration**:
  - Logs start of meta connection hydration
  - Logs selection API failures with status codes
  - Logs received selection data (presence of each asset)
  - Logs account validation start and results
  - Logs hydration errors with stack traces

- **Connection Flow**:
  - Logs connect button click
  - Logs Facebook SDK readiness checks
  - Logs login parameters and redirect URI
  - Logs FB.login callback responses
  - Logs cookie setting with campaign ID

- **Disconnection**:
  - Logs disconnect button click and user confirmation
  - Logs disconnect API call and response
  - Logs success and error states

- **Account Validation**:
  - Logs validation requests with account ID
  - Logs validation results (status, funding, etc.)
  - Logs validation errors

**Key Log Identifiers:**
- `[MetaConnectCard]` prefix on all logs
- Shows user actions and SDK interactions
- Tracks state changes and API responses

## How to Use These Logs

### Debugging Connection Issues

1. **Check Browser Console** for `[MetaConnectCard]` logs:
   - Look for SDK initialization issues
   - Verify login parameters are correct
   - Check if FB.login callback receives response

2. **Check Server Logs** for `[MetaCallback]` logs:
   - Verify OAuth code exchange succeeds
   - Check if assets are fetched from Facebook
   - Verify data is persisted to database
   - Look for Supabase errors

3. **Check Selection API** logs via `[MetaSelection]`:
   - Verify connection data is retrieved
   - Check if campaign state is found
   - Look for database query errors

4. **Check Payment Logs** via `[PaymentStatus]`:
   - Verify Graph API calls succeed
   - Check funding source detection
   - Verify payment flag updates

### Common Issues to Look For

1. **No Assets Retrieved**:
   - Check `[MetaCallback] Businesses:` log - count should be > 0
   - Check `[MetaCallback] Pages:` log - count should be > 0
   - Check `[MetaCallback] Ad Accounts:` log - count should be > 0
   - If counts are 0, user may need more permissions

2. **Assets Not Persisting**:
   - Look for `[MetaCallback] Failed to upsert connection` errors
   - Check Supabase errors in connection upsert
   - Verify campaign_id matches

3. **Selection API Returns Empty**:
   - Check `[MetaSelection] Error fetching connection` for DB issues
   - Look at `hasConnection` and `hasState` booleans in logs
   - Verify campaign ownership

4. **Payment Not Detected**:
   - Check `[PaymentStatus] Graph API error` for API failures
   - Look at `hasFundingSource` and `hasFundingSourceDetails` in logs
   - Check if payment flag update succeeded

## Log Search Tips

Use these grep patterns to find specific issues:

```bash
# Find all Meta callback logs
grep "\[MetaCallback\]" logs.txt

# Find connection errors
grep -i "error.*meta" logs.txt

# Find asset counts
grep "count:" logs.txt | grep MetaCallback

# Find payment issues
grep "\[PaymentStatus\]" logs.txt

# Find client-side connection issues
# (in browser console)
[MetaConnectCard]
```

## Next Steps

If logs reveal issues:

1. **Check Facebook App Configuration**:
   - Verify app ID and secret are correct
   - Check OAuth redirect URIs
   - Verify permissions are granted

2. **Check Supabase**:
   - Verify tables exist and have correct schema
   - Check RLS policies allow inserts/updates
   - Verify user has access to campaign

3. **Check Environment Variables**:
   - NEXT_PUBLIC_FB_APP_ID
   - FB_APP_SECRET
   - NEXT_PUBLIC_FB_BIZ_LOGIN_CONFIG_ID
   - NEXT_PUBLIC_FB_GRAPH_VERSION

4. **Check User Permissions**:
   - User must have access to Meta Business account
   - User must have permissions for pages and ad accounts
   - Business verification may be required

## References

- Facebook Login for Business: https://developers.facebook.com/docs/facebook-login/facebook-login-for-business/
- Facebook Graph API: https://developers.facebook.com/docs/graph-api
- Supabase Docs: https://supabase.com/docs

