# Testing Guide: Authentication Flow with Prompt Preservation

## Prerequisites

Before testing, ensure:
1. ✅ Supabase backend is set up (see `SUPABASE_AUTH_FLOW_SETUP.md`)
2. ✅ Environment variables are configured
3. ✅ Development server is running: `npm run dev`
4. ✅ You have access to the email account you'll use for testing

## Test Scenario 1: Happy Path (New User)

### Step 1: Enter Prompt (Unauthenticated)
1. Open browser in incognito mode
2. Navigate to `http://localhost:3000`
3. In the hero section prompt box, type: "I run a fitness coaching business and need more clients"
4. Click Submit

**Expected Results:**
- Auth modal opens
- Console log shows: POST to `/api/temp-prompt`
- Check DevTools → Application → Local Storage → should see `temp_prompt_id`

### Step 2: Sign Up
1. Switch to "Sign Up" tab in the modal
2. Enter email: `test+fitness@yourdomain.com`
3. Enter a strong password
4. Click "Create Account"

**Expected Results:**
- Success message appears
- "Check your email" screen shows
- Email is sent to your inbox

### Step 3: Verify Email
1. Check your email inbox
2. Open the verification email from Supabase
3. Click the verification link

**Expected Results:**
- Browser opens to `http://localhost:3000?verified=true`
- Loading spinner shows with "Creating your campaign..." message
- Automatic redirect to campaign page: `/[campaignId]?autostart=true`

### Step 4: Verify Auto-Processing
1. Watch the AI chat panel
2. Your original prompt should appear automatically
3. AI starts processing immediately

**Expected Results:**
- Prompt appears in chat: "I run a fitness coaching business and need more clients"
- AI responds with campaign suggestions
- No need to re-type anything

### Step 5: Verify Cleanup
1. Open DevTools → Application → Local Storage
2. Check for `temp_prompt_id`

**Expected Results:**
- `temp_prompt_id` should be gone (cleaned up)

## Test Scenario 2: Already Signed In

### Steps:
1. Sign in to your account
2. Go to homepage
3. Enter prompt in hero section
4. Click Submit

**Expected Results:**
- No auth modal
- Campaign created immediately
- Redirected to campaign builder
- Prompt auto-submitted to AI

## Test Scenario 3: Email Click After 24+ Hours

### Steps:
1. Create a temp prompt
2. Wait 24+ hours (or manually update `expires_at` in database)
3. Sign up and click verification email

**Expected Results:**
- User still gets authenticated
- No auto-campaign creation (prompt expired)
- User lands on homepage or dashboard
- No errors in console

## Test Scenario 4: Prompt Already Used

### Steps:
1. Create temp prompt
2. Sign up successfully
3. Try to use the same `temp_prompt_id` again

**Expected Results:**
- Campaign not created
- Graceful error handling
- User can still use the app normally

## Test Scenario 5: Network Error

### Steps:
1. Enter prompt
2. Open DevTools → Network → Enable offline mode
3. Try to sign up

**Expected Results:**
- Error message shows
- localStorage still has `temp_prompt_id`
- Can retry when back online

## Debugging Checklist

If the flow doesn't work:

### Check Browser Console
```javascript
// Should see these logs in order:
1. POST /api/temp-prompt → 200
2. localStorage.getItem('temp_prompt_id') → "some-uuid"
3. (after email verification) GET /api/temp-prompt?id=... → 200
4. POST /api/campaigns → 201
5. Navigation to /[campaignId]?autostart=true
6. GET /api/campaigns/[id] → 200
```

### Check Network Tab
```
Request Flow:
POST /api/temp-prompt
  Response: { tempId: "abc-123" }

GET /api/temp-prompt?id=abc-123
  Response: { promptText: "I run a fitness..." }

POST /api/campaigns
  Body: { 
    name: "Campaign: I run a fitness...",
    tempPromptId: "abc-123",
    prompt: "I run a fitness..."
  }
  Response: { campaign: { id: "xyz-789", metadata: { initialPrompt: "..." } } }

GET /api/campaigns/xyz-789
  Response: { campaign: { metadata: { initialPrompt: "..." } } }
```

### Check Supabase Database

```sql
-- Check if prompt was stored
SELECT * FROM temp_prompts 
ORDER BY created_at DESC 
LIMIT 5;

-- Check if campaign was created
SELECT id, name, metadata, created_at 
FROM campaigns 
ORDER BY created_at DESC 
LIMIT 5;

-- Verify prompt was marked as used
SELECT id, prompt_text, used, expires_at 
FROM temp_prompts 
WHERE used = true 
ORDER BY created_at DESC;
```

### Check localStorage

Open DevTools → Application → Local Storage → `http://localhost:3000`

Should see (before verification):
```
temp_prompt_id: "abc-123-def-456-..."
```

Should NOT see (after successful flow):
```
temp_prompt_id: (removed)
```

## Common Issues and Solutions

### Issue: "Prompt not found or already used"
**Cause:** Prompt expired or was already used
**Solution:** Create a new prompt, don't reuse old ones

### Issue: Auth modal doesn't close after sign-up
**Cause:** Email confirmation screen is showing
**Solution:** This is expected - user needs to check email

### Issue: No redirect after email click
**Cause:** Redirect URL not configured in Supabase
**Solution:** Add redirect URLs in Supabase dashboard (see SUPABASE_AUTH_FLOW_SETUP.md)

### Issue: Campaign created but no auto-submit
**Cause:** `autostart=true` query param missing or metadata not saved
**Solution:** 
- Check URL has `?autostart=true`
- Verify campaign.metadata.initialPrompt exists
- Check Dashboard passes prop to AIChat

### Issue: Prompt submitted twice
**Cause:** `hasAutoSubmitted` flag not working
**Solution:** Check AIChat useEffect dependencies

### Issue: "Creating your campaign..." stuck forever
**Cause:** API error or network issue
**Solution:** Check console for errors, verify API endpoints work

## Performance Testing

Test with different prompt lengths:

1. **Short prompt:** "Fitness coaching"
   - Should work instantly

2. **Medium prompt:** "I run a fitness coaching business in Toronto and need more clients"
   - Should work smoothly

3. **Long prompt:** 500+ characters
   - Should still work, but verify no truncation

## Security Testing

1. **Expired Token:**
   - Manually set `expires_at` to past date
   - Verify rejection

2. **Used Token:**
   - Try to reuse same temp_prompt_id
   - Verify rejection

3. **Invalid Token:**
   - Try with random UUID
   - Verify graceful error

4. **XSS Attempt:**
   - Enter `<script>alert('xss')</script>` as prompt
   - Verify proper escaping in UI

## Monitoring

After deployment, monitor:

1. **Conversion Rate:**
   ```sql
   SELECT 
     COUNT(*) as total_prompts,
     COUNT(*) FILTER (WHERE used = true) as used_prompts,
     (COUNT(*) FILTER (WHERE used = true)::float / COUNT(*)) * 100 as conversion_rate
   FROM temp_prompts
   WHERE created_at > NOW() - INTERVAL '7 days';
   ```

2. **Average Time to Conversion:**
   ```sql
   SELECT 
     AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) / 60 as avg_minutes
   FROM temp_prompts
   WHERE used = true
   AND created_at > NOW() - INTERVAL '7 days';
   ```

3. **Expired Prompts:**
   ```sql
   SELECT COUNT(*) as expired_count
   FROM temp_prompts
   WHERE used = false 
   AND expires_at < NOW();
   ```

## Success Criteria

The flow is working correctly if:
- ✅ Prompt is stored before authentication
- ✅ User receives verification email
- ✅ Email link redirects back to app
- ✅ Campaign is created automatically
- ✅ AI starts processing without manual input
- ✅ No errors in console
- ✅ localStorage is cleaned up
- ✅ User has seamless experience

## Rollback Plan

If issues occur in production:

1. **Disable auto-submit:**
   - Comment out auto-submit useEffect in ai-chat.tsx
   - Users will need to manually submit prompt

2. **Disable temp prompt storage:**
   - Modify hero-section.tsx to require auth first
   - Fall back to original flow

3. **Clear localStorage:**
   ```javascript
   // Add to page.tsx temporarily
   useEffect(() => {
     localStorage.removeItem('temp_prompt_id');
   }, []);
   ```

## Next Steps After Testing

1. ✅ Complete all test scenarios above
2. ✅ Fix any issues found
3. ✅ Set up monitoring queries
4. ✅ Configure production redirect URLs
5. ✅ Set up cleanup job for temp_prompts
6. ✅ Deploy to production
7. ✅ Test in production with real email
8. ✅ Monitor conversion rates

## Support

If you need help:
1. Check this testing guide first
2. Review SUPABASE_AUTH_FLOW_SETUP.md
3. Check AUTH_FLOW_IMPROVEMENTS.md for implementation details
4. Review browser console and network logs
5. Check Supabase dashboard for database issues

