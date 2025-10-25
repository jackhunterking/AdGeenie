# Facebook Login for Business - Rebuild Summary

## Overview
Successfully rebuilt the Facebook Business Login integration using the **standard Facebook Login flow** (`FB.login()`) instead of the non-existent `FB.ui({ method: 'business_login' })`.

## Problem Fixed
The previous implementation was using `FB.ui({ method: 'business_login' })`, which **does not exist** in the Facebook JavaScript SDK. This was causing the "Page Not Found" error when users tried to connect their Meta account.

## Solution Implemented
Replaced with the official **Facebook Login for Business** approach:
- Use standard `FB.login()` with business-related permissions
- Request appropriate scopes for accessing business assets
- Backend uses the access token to fetch business data via Graph API

## Files Changed

### 1. `/lib/types/facebook.d.ts`
**Changes:**
- Removed `FBBusinessLoginResponse` and `FBBusinessLoginCallbackResponse` types
- Simplified to use standard `FBLoginStatusResponse` and `FBAuthResponse`
- Updated `FBNamespace` to reflect proper `FB.login()` and `FB.getLoginStatus()` signatures

### 2. `/lib/utils/facebook-sdk.ts`
**Changes:**
- Replaced `fbBusinessLogin()` with `fbLogin()`
- Now uses `FB.login()` instead of `FB.ui()`
- Accepts permissions array and joins them into scope string
- Returns `accessToken`, `userID`, and `expiresIn`
- Added `fbGetLoginStatus()` helper for checking login status

**Permissions requested:**
- `public_profile` - Basic profile information
- `email` - User email
- `business_management` - Access to business accounts
- `pages_show_list` - List user's pages
- `pages_read_engagement` - Read page data
- `pages_manage_metadata` - Manage page settings
- `instagram_basic` - Access Instagram accounts
- `ads_read` - Read ad campaigns
- `ads_management` - Manage ad campaigns

### 3. `/components/meta-connect-step.tsx`
**Changes:**
- Updated import from `fbBusinessLogin` to `fbLogin`
- Updated API endpoint from `/api/meta/business-login/callback` to `/api/meta/auth/callback`
- Now sends `accessToken` and `userID` instead of `signed_request` and `request_id`
- Added `public_profile` and `email` to permissions list

### 4. `/app/api/meta/auth/callback/route.ts` (NEW)
**Changes:**
- Created new route replacing the old business-login callback
- Accepts `accessToken` and `userID` from frontend
- Removed signed request decoding logic
- Uses Graph API to fetch:
  - **Ad Accounts**: `/me/adaccounts`
  - **Pages**: `/me/accounts` (with Instagram account info)
  - **Businesses**: `/me/businesses`
- Selects first available assets (can be enhanced for user selection)
- Stores assets in same format as before for compatibility

### 5. `/app/layout.tsx`
**Changes:**
- Added `FB.AppEvents.logPageView()` after SDK initialization (best practice)
- Verified SDK is properly configured with correct app ID and version

### 6. Deleted Files
- `/app/api/meta/business-login/callback/route.ts` - Removed old implementation

## Testing Checklist

### Prerequisites
1. Ensure your `.env.local` file has:
   ```
   NEXT_PUBLIC_FB_APP_ID=your-app-id
   NEXT_PUBLIC_FB_GRAPH_VERSION=v24.0
   ```

2. Ensure your Facebook App settings have:
   - **Client OAuth Login**: Enabled
   - **Web OAuth Login**: Enabled
   - **Valid OAuth Redirect URIs**: Your domain(s) configured
   - **App Mode**: Live (or test users in Development mode)

### Test Steps
1. **Start the app**: `npm run dev`
2. **Navigate** to a campaign's Meta connect step
3. **Click** "Connect with Meta" button
4. **Observe**: Standard Facebook login dialog should appear (not "Page Not Found")
5. **Login**: Enter Facebook credentials if not already logged in
6. **Grant permissions**: Review and accept the requested permissions
7. **Verify success**: 
   - Dialog should close
   - Backend should fetch your business assets
   - UI should display connected Page, Ad Account, and Instagram (if connected)

### Expected Permissions Dialog
The user should see a permissions request for:
- ✓ Public profile
- ✓ Email address
- ✓ Manage your business
- ✓ Show a list of the Pages you manage
- ✓ Read content posted on the Page
- ✓ View Instagram accounts you have access to
- ✓ Manage your ads

### Troubleshooting

**Issue**: "Facebook SDK not initialized"
- **Solution**: Refresh the page to ensure SDK loads properly

**Issue**: "No ad accounts found"
- **Solution**: Create an ad account in Facebook Business Manager first
- **URL**: https://business.facebook.com/

**Issue**: "No Facebook pages found"
- **Solution**: Create a Facebook page first
- **URL**: https://www.facebook.com/pages/creation/

**Issue**: Permissions denied
- **Solution**: User must grant all requested permissions. If they decline, they'll need to:
  1. Go to Facebook Settings > Apps and Websites
  2. Remove your app
  3. Try connecting again

**Issue**: "Failed to fetch ad accounts" or similar Graph API error
- **Solution**: Check that:
  1. Your app is approved for advanced permissions (if in Live mode)
  2. The user actually has access to these assets
  3. App is properly configured in Facebook Developer Console

## Facebook App Configuration Required

### 1. Basic Settings
- Set **App Domains** to your domain (e.g., `adpilot.studio`)
- Set **Privacy Policy URL**
- Set **Terms of Service URL**

### 2. Facebook Login Settings
Navigate to **Products** > **Facebook Login** > **Settings**:
- Enable **Client OAuth Login**
- Enable **Web OAuth Login**
- Add **Valid OAuth Redirect URIs**:
  - `https://www.adpilot.studio/`
  - `https://staging.adpilot.studio/`
  - `https://adpilot.studio/`
  - `http://localhost:3000/` (for development)

### 3. App Review (for Production)
Before going live, you'll need to submit your app for review to access these permissions:
- `business_management`
- `pages_show_list`
- `pages_read_engagement`
- `instagram_basic`
- `ads_management`

**Note**: `public_profile` and `email` are approved by default.

## References
- [Facebook Login for Web](https://developers.facebook.com/docs/facebook-login/web)
- [FB.login() Reference](https://developers.facebook.com/docs/javascript/reference/FB.login)
- [Facebook Login for Business](https://developers.facebook.com/docs/facebook-login/facebook-login-for-business/)
- [Permissions Reference](https://developers.facebook.com/docs/permissions/reference)
- [Graph API Reference](https://developers.facebook.com/docs/graph-api/reference)

## Next Steps

### Immediate
1. Test the integration end-to-end
2. Verify business assets are correctly fetched and displayed

### Future Enhancements
1. **Multi-asset selection**: Allow users to choose which ad account/page to use if they have multiple
2. **Token refresh**: Implement token refresh logic for long-lived access
3. **Pixel fetching**: Add logic to fetch and select pixels if needed
4. **Error handling**: Add more granular error messages for different Graph API errors
5. **Permission checking**: Use Graph API to verify which permissions were actually granted
6. **Reconnect flow**: Allow users to reconnect/refresh their connection without full re-auth

## Notes for Supabase Backend

The backend implementation assumes:
1. `campaigns` table exists with `id` and `user_id` columns
2. `campaign_meta_connections` table exists with columns:
   - `campaign_id`
   - `user_id`
   - `selected_page_id`
   - `selected_page_name`
   - `selected_ig_user_id`
   - `selected_ig_username`
   - `selected_ad_account_id`
   - `selected_ad_account_name`
3. `campaign_states` table exists with:
   - `campaign_id`
   - `meta_connect_data` (JSONB)

If these don't exist, you'll need to create the appropriate migrations in Supabase.

