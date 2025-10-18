# Auto Campaign Creation on Sign-Up

## Overview
After email verification, new users are automatically redirected to the **Dashboard with Campaign Stepper** (the view with 6 ad variations on the right side).

## User Flow

### Scenario 1: New User Sign-Up (No Initial Prompt)
```
1. User clicks "Sign Up" → Fills form → Submits
2. Confirmation screen shows "Check your email"
3. User clicks verification link in email
4. ✅ Redirects to: /?verified=true
5. 🤖 Auto-creates a campaign: "My Campaign - [Date]"
6. ✅ Redirects to: /{campaignId}
7. 🎨 Dashboard loads with:
   - Left side: AI Chat (1/4 width)
   - Right side: Campaign Stepper with 6 steps
```

### Scenario 2: User Starts with Homepage Prompt
```
1. User enters prompt on homepage (not logged in)
2. Prompt saved to temp storage
3. User signs up
4. After verification:
5. 🤖 Auto-creates campaign with user's original prompt
6. ✅ Redirects to: /{campaignId}?autostart=true
7. 🎨 Dashboard loads with AI chat auto-starting
```

## Technical Implementation

### Changes Made

#### 1. `/app/page.tsx`
- Added `useSearchParams()` to detect `?verified=true`
- Added Suspense wrapper for proper Next.js compatibility
- New logic: Auto-create campaign when `verified=true` + no temp prompt
- Prevention: Uses `sessionStorage` to prevent double campaign creation

#### 2. `/components/auth/sign-up-form.tsx`
- Redirect URL: `${window.location.origin}?verified=true`
- This URL triggers the auto-campaign creation logic

### Code Flow

```typescript
// In app/page.tsx - handlePostAuth()

1. Check: User authenticated? ✅
2. Check: URL has ?verified=true? ✅
3. Check: No temp_prompt_id? ✅
4. Check: Not already processed? ✅

→ CREATE CAMPAIGN
→ REDIRECT TO /{campaignId}
→ USER SEES DASHBOARD WITH STEPPER
```

## Dashboard Features

When users land on `/{campaignId}`, they see:

### Left Panel (1/4 width) - AI Chat
- Campaign dropdown menu
- Credits display
- Theme switcher
- AI conversation interface

### Right Panel (3/4 width) - Campaign Stepper
1. **Ad Creative** - Select from 6 ad variations (Feed/Story formats)
2. **Ad Copy** - Choose headline, description, CTA
3. **Target Location** - Geographic targeting
4. **Define Audience** - Demographics, interests
5. **Set Your Goal** - Leads, calls, awareness
6. **Budget & Publish** - Set budget, connect Meta, launch

## Edge Cases Handled

### ✅ Double Campaign Prevention
- Uses `sessionStorage.setItem('processed_verification', 'true')`
- Prevents duplicate campaigns if user refreshes page

### ✅ Temp Prompt Priority
- If user started with homepage prompt → Uses that prompt
- If no prompt → Creates blank campaign

### ✅ Loading States
- Shows spinner with "Creating your campaign..." message
- Smooth transition to dashboard

## Testing Instructions

### Test 1: New User Sign-Up
1. Clear browser data (important!)
2. Go to homepage
3. Click "Sign Up"
4. Create account with new email
5. Check email and click verification link
6. ✅ Should auto-redirect to dashboard with stepper

### Test 2: Homepage Prompt Flow
1. Start on homepage (not logged in)
2. Enter a prompt: "I want to promote my restaurant"
3. Click submit → Redirected to sign-up
4. Complete sign-up and verify email
5. ✅ Should create campaign with your prompt
6. ✅ Dashboard loads with AI already processing

### Test 3: Returning User
1. Already verified user
2. Visit homepage
3. ✅ Should see campaign grid (not auto-create)

## Backend Requirements

### Supabase Tables Used:
- `campaigns` - Auto-created with user association
- `profiles` - User profile lookup
- `generated_assets` - Campaign thumbnails

### API Endpoints:
- `POST /api/campaigns` - Creates new campaign
- `GET /api/campaigns/{id}` - Fetches campaign data
- `GET /api/temp-prompt` - Retrieves saved prompt

## Troubleshooting

### Issue: "Still seeing homepage after verification"
**Cause**: Campaign creation failed or redirect didn't trigger

**Fix**:
1. Check browser console for errors
2. Verify Supabase connection is working
3. Check Network tab for failed `/api/campaigns` POST request
4. Clear sessionStorage and try again

### Issue: "Multiple campaigns created"
**Cause**: sessionStorage not working or cleared

**Fix**:
- This is prevented by sessionStorage check
- If it happens, manually delete duplicate campaigns in Supabase

### Issue: "Dashboard shows old design"
**Cause**: Wrong route or cache issue

**Fix**:
1. Verify URL is `/{campaignId}` not `/campaign/{id}`
2. Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
3. Check if `Dashboard` component is properly imported in `app/[campaignId]/page.tsx`

## Next Steps

Once this is working, you might want to:

1. **Add Onboarding Tour** - Guide new users through the stepper
2. **Pre-fill Campaign Data** - Ask questions during sign-up to pre-populate campaign
3. **Analytics** - Track how many users complete each step
4. **Templates** - Offer pre-built campaign templates for different industries

---

**Status**: ✅ Implemented and ready for testing
**Last Updated**: October 18, 2025

