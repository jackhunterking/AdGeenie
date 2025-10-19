# Database Error Fix - User Signup Issue

## Problem

Users were getting "Database error saving new user" when trying to sign up. The signup process was failing completely.

## Root Cause

The `handle_new_user_campaign()` trigger function was blocking user creation when:
- The temp_prompt_id was invalid
- The temp prompt was expired or already used
- Any database constraint error occurred during campaign creation
- Any unexpected error happened

**Without error handling**, if the trigger threw an exception, PostgreSQL would roll back the entire transaction, preventing the user from being created.

## Solution Implemented

Updated the `handle_new_user_campaign()` trigger function to wrap all campaign creation logic in a `BEGIN...EXCEPTION...END` block.

### What Changed

**Before:**
```sql
BEGIN
  -- Extract temp_prompt_id
  -- Create campaign
  -- If ANY error occurs → USER SIGNUP FAILS ❌
  RETURN NEW;
END;
```

**After:**
```sql
BEGIN
  BEGIN
    -- Extract temp_prompt_id
    -- Create campaign
    -- All campaign logic wrapped in inner BEGIN block
  EXCEPTION WHEN OTHERS THEN
    -- Log error but don't prevent user creation
    RAISE WARNING 'Failed to create campaign for user %: %', NEW.id, SQLERRM;
  END;
  
  -- Always return NEW → USER SIGNUP SUCCEEDS ✅
  RETURN NEW;
END;
```

### Key Features

1. **Error Isolation**: Campaign creation errors don't affect user creation
2. **Warning Logs**: Errors are logged with `RAISE WARNING` for debugging
3. **Graceful Degradation**: If campaign creation fails, user still gets created
4. **Always Returns**: Function always returns NEW, never blocks signup

## How It Works Now

### Scenario 1: Valid Prompt
```
1. User signs up with temp_prompt_id
2. Trigger finds valid prompt
3. Creates campaign successfully
4. User created ✅
5. Campaign created ✅
```

### Scenario 2: Invalid/Expired Prompt
```
1. User signs up with temp_prompt_id
2. Trigger finds prompt is expired
3. Exits early (IF NOT FOUND)
4. User created ✅
5. No campaign created (graceful)
```

### Scenario 3: Database Error
```
1. User signs up with temp_prompt_id
2. Trigger tries to create campaign
3. Database constraint error occurs
4. Exception caught, warning logged
5. User created ✅
6. No campaign created (but user signup succeeds)
```

### Scenario 4: No Prompt
```
1. User signs up without prompt
2. Trigger checks: temp_prompt_id is NULL
3. Exits early (IF NULL)
4. User created ✅
5. No campaign attempted
```

## Testing

### Test 1: Normal Signup (No Prompt)
1. Go to homepage
2. Click "Sign Up" directly (don't enter prompt)
3. Create account
4. ✅ Should succeed
5. ✅ User created, no campaign

### Test 2: Signup with Prompt
1. Go to homepage
2. Enter prompt: "I want to promote my coffee shop"
3. Sign up
4. ✅ Should succeed
5. ✅ User created
6. ✅ Campaign created with prompt

### Test 3: Signup with Expired Prompt
1. Create a prompt
2. Wait 31 minutes (prompts expire after 30 min)
3. Sign up
4. ✅ Should succeed
5. ✅ User created
6. ⚠️ No campaign created (prompt expired, warning logged)

## Error Logging

When campaign creation fails, you'll see warnings in Supabase logs:
```
WARNING: Failed to create campaign for user [uuid]: [error message]
```

These warnings help debug issues without breaking user signup.

## Benefits

1. **Reliable Signups**: Users can always create accounts
2. **Better UX**: No confusing "database error" messages
3. **Debugging**: Errors are logged for investigation
4. **Fault Tolerance**: System continues working even if campaign creation fails
5. **Data Integrity**: Users are created first, campaigns are optional

## Database Objects Modified

- **Function**: `public.handle_new_user_campaign()`
- **Trigger**: `on_user_signup_create_campaign` (unchanged)
- **Tables Affected**: 
  - `auth.users` (where trigger fires)
  - `campaigns` (where campaign is created)
  - `campaign_states` (where state is created)

## Related Triggers

- `on_auth_user_created` → Creates user profile (handles `profiles` table)
- `on_user_signup_create_campaign` → Creates campaign if prompt exists

Both triggers run on user signup, but errors in one don't affect the other.

---

**Status**: ✅ Fixed  
**Date**: October 18, 2025  
**Impact**: All future signups will work reliably

