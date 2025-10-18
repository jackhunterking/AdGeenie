# Supabase Setup for Authentication Flow

This document outlines the Supabase backend requirements for the authentication flow where users can enter a prompt before signing up, then automatically continue with their campaign after email verification.

## Overview

The flow works as follows:
1. User enters a prompt without being logged in
2. Prompt is stored temporarily in `temp_prompts` table
3. User signs up and receives verification email
4. User clicks verification link and is redirected back
5. Campaign is automatically created with the stored prompt
6. AI starts processing the prompt immediately

## Database Tables Required

### 1. temp_prompts Table

This table stores prompts from users who haven't signed up yet.

**Table Schema:**
```sql
CREATE TABLE temp_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_text TEXT NOT NULL,
  used BOOLEAN DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for faster lookups
CREATE INDEX idx_temp_prompts_id_used ON temp_prompts(id, used);
CREATE INDEX idx_temp_prompts_expires_at ON temp_prompts(expires_at);
```

**Row Level Security (RLS):**
```sql
-- Enable RLS
ALTER TABLE temp_prompts ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (for unauthenticated users)
CREATE POLICY "Allow insert for anyone" ON temp_prompts
  FOR INSERT
  WITH CHECK (true);

-- Allow select only for recent, unused prompts
CREATE POLICY "Allow select for unused prompts" ON temp_prompts
  FOR SELECT
  USING (used = false AND expires_at > NOW());

-- Only service role can update
CREATE POLICY "Service role can update" ON temp_prompts
  FOR UPDATE
  USING (auth.role() = 'service_role');
```

### 2. campaigns Table Update

Ensure your campaigns table has a `metadata` JSONB column to store the initial prompt:

```sql
-- Add metadata column if it doesn't exist
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS metadata JSONB;

-- The metadata will store: { "initialPrompt": "user's prompt text" }
```

## Supabase Auth Configuration

### Email Redirect URL

You need to configure the email redirect URL in your Supabase project:

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **URL Configuration**
3. Add your production domain to **Site URL**: `https://yourdomain.com`
4. Add to **Redirect URLs**:
   - Development: `http://localhost:3000?verified=true`
   - Production: `https://yourdomain.com?verified=true`

### Email Templates

Optionally, customize your email verification template:

1. Go to **Authentication** → **Email Templates**
2. Edit the "Confirm signup" template
3. Make sure the confirmation link uses `{{ .ConfirmationURL }}` which will automatically include the redirect URL

## Environment Variables

Ensure these environment variables are set in your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Cleanup Job (Optional but Recommended)

Set up a Supabase Edge Function or cron job to clean up expired temp prompts:

```sql
-- Delete expired temp prompts
DELETE FROM temp_prompts 
WHERE expires_at < NOW();

-- Or mark them as used to keep for analytics
UPDATE temp_prompts 
SET used = true 
WHERE expires_at < NOW() AND used = false;
```

You can run this as a periodic job using:
- Supabase pg_cron extension
- A scheduled Edge Function
- An external cron service

## Testing the Flow

1. **Test Prompt Storage:**
   ```bash
   curl -X POST http://localhost:3000/api/temp-prompt \
     -H "Content-Type: application/json" \
     -d '{"promptText": "Test prompt"}'
   ```

2. **Test Sign Up:**
   - Enter a prompt on the homepage without being logged in
   - Click submit to trigger sign-up modal
   - Sign up with a valid email
   - Check your email for verification link

3. **Test Verification:**
   - Click the verification link in your email
   - You should be redirected to your app with `?verified=true`
   - The campaign should be created automatically
   - The AI should start processing your original prompt

## Troubleshooting

### Prompt Not Found After Verification
- Check that `temp_prompts` table exists
- Verify RLS policies are set correctly
- Check browser localStorage for `temp_prompt_id`
- Ensure the prompt hasn't expired (24 hour default)

### Redirect Not Working
- Verify redirect URLs are configured in Supabase
- Check that the email template uses the correct confirmation URL
- Ensure CORS settings allow your domain

### Campaign Not Auto-Created
- Check browser console for errors
- Verify the campaign API endpoint is working
- Ensure user is authenticated after email verification
- Check that the `autostart=true` query param is present

## Security Considerations

1. **Prompt Expiration:** Prompts expire after 24 hours to prevent database bloat
2. **Rate Limiting:** Consider adding rate limiting to prevent abuse of temp_prompts
3. **Content Validation:** Add validation to prevent storing malicious content
4. **Cleanup:** Regularly clean up old temp_prompts to maintain performance

## Supabase AI Prompt

Use this prompt with Supabase AI to set up the database:

```
I need to create a temp_prompts table for storing temporary user prompts before authentication.

Requirements:
1. Create a table called temp_prompts with:
   - id (UUID, primary key, auto-generated)
   - prompt_text (TEXT, not null)
   - used (BOOLEAN, default false)
   - expires_at (TIMESTAMP, default 24 hours from now)
   - created_at (TIMESTAMP, default now)

2. Add indexes:
   - On (id, used) for fast lookups
   - On expires_at for cleanup queries

3. Enable Row Level Security with policies:
   - Allow anyone to insert (for unauthenticated users)
   - Allow anyone to select unused, non-expired prompts
   - Only service role can update

4. Add a metadata JSONB column to the campaigns table if it doesn't exist

Please generate the SQL migration for this setup.
```

## Next Steps

After setting up the Supabase backend:
1. Test the complete flow from prompt entry to email verification
2. Monitor the temp_prompts table for any issues
3. Set up the cleanup job for expired prompts
4. Consider adding analytics to track conversion rates

