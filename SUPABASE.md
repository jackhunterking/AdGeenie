# Supabase Integration Plan for Meta Marketing Pro

## 🎯 Overview

This document provides step-by-step guidance for integrating Supabase as the backend for your Meta Marketing Pro application. Since the MCP tool doesn't work properly with Supabase, you'll use **Supabase AI** to help build, test, and verify each requirement.

---

## 📊 Recommended Database Schema

### 1. **images** table
Stores all generated and edited images with metadata.

```sql
CREATE TABLE images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id),
  
  -- Image details
  image_url TEXT NOT NULL,
  original_prompt TEXT NOT NULL,
  enhanced_prompt TEXT, -- The prompt after guardrails enhancement
  image_type TEXT CHECK (image_type IN ('generated', 'edited')),
  
  -- Format information
  format TEXT CHECK (format IN ('square', 'vertical')),
  aspect_ratio TEXT DEFAULT '1:1',
  dimensions TEXT, -- e.g., "1080x1080"
  
  -- Brand context
  brand_name TEXT,
  caption TEXT,
  
  -- Generation metadata
  model_used TEXT DEFAULT 'google/gemini-2.5-flash-image-preview',
  generation_time_ms INTEGER,
  
  -- Parent reference for edits
  parent_image_id UUID REFERENCES images(id),
  
  -- Performance tracking
  approved BOOLEAN DEFAULT false,
  download_count INTEGER DEFAULT 0,
  edit_count INTEGER DEFAULT 0,
  
  -- Indexing
  INDEX idx_user_created (user_id, created_at DESC),
  INDEX idx_format (format),
  INDEX idx_approved (approved)
);
```

### 2. **user_preferences** table
Stores user brand settings and default preferences.

```sql
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Brand defaults
  default_brand_name TEXT,
  default_caption_template TEXT,
  brand_colors JSONB, -- e.g., {"primary": "#FF5733", "secondary": "#33FF57"}
  brand_logo_url TEXT,
  
  -- Style preferences
  preferred_style TEXT CHECK (preferred_style IN ('lifestyle', 'product_hero', 'testimonial', 'bts', 'custom')),
  industry TEXT, -- e.g., "e-commerce", "real-estate", "food-beverage"
  
  -- Safe zone preferences
  safe_zone_percentage INTEGER DEFAULT 12, -- 10-12% margin
  
  -- Generation preferences
  auto_generate_both_formats BOOLEAN DEFAULT true, -- square + vertical
  default_format TEXT CHECK (default_format IN ('square', 'vertical', 'both')),
  
  INDEX idx_user (user_id)
);
```

### 3. **guardrail_configs** table
Dynamic guardrail configuration (allows updates without redeploying).

```sql
CREATE TABLE guardrail_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Configuration details
  config_name TEXT UNIQUE NOT NULL,
  config_type TEXT CHECK (config_type IN ('visual_style', 'composition', 'safe_zone', 'format', 'industry')),
  active BOOLEAN DEFAULT true,
  
  -- Guardrail rules
  rules JSONB NOT NULL,
  -- Example: {
  --   "style": "super-realistic",
  --   "text_overlays": false,
  --   "margins": {"top": 12, "bottom": 12, "left": 12, "right": 12}
  -- }
  
  -- Application scope
  applies_to_industries TEXT[], -- NULL = all industries
  priority INTEGER DEFAULT 100, -- Higher priority = applied first
  
  INDEX idx_active (active),
  INDEX idx_type (config_type)
);
```

### 4. **performance_metrics** table
Track creative performance and A/B test results.

```sql
CREATE TABLE performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_id UUID REFERENCES images(id) NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Engagement metrics
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  ctr DECIMAL(5,2), -- Click-through rate
  
  -- Platform metrics
  platform TEXT CHECK (platform IN ('facebook_feed', 'instagram_feed', 'instagram_stories', 'instagram_reels')),
  placement_type TEXT CHECK (placement_type IN ('feed', 'stories', 'reels', 'carousel')),
  
  -- Cost metrics
  spend DECIMAL(10,2),
  cpc DECIMAL(10,2), -- Cost per click
  cpm DECIMAL(10,2), -- Cost per thousand impressions
  
  -- Conversion metrics
  conversions INTEGER DEFAULT 0,
  conversion_value DECIMAL(10,2),
  
  -- A/B test reference
  ab_test_id UUID,
  variant_name TEXT,
  
  INDEX idx_image (image_id),
  INDEX idx_platform (platform),
  INDEX idx_recorded (recorded_at DESC)
);
```

### 5. **generation_logs** table
Audit trail for debugging and improvement.

```sql
CREATE TABLE generation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Request details
  user_id UUID REFERENCES auth.users(id),
  image_id UUID REFERENCES images(id),
  
  -- Prompt history
  original_prompt TEXT NOT NULL,
  enhanced_prompt TEXT NOT NULL,
  guardrails_applied JSONB, -- Which guardrails were triggered
  
  -- Generation details
  model_used TEXT,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  generation_time_ms INTEGER,
  
  -- Context
  user_agent TEXT,
  ip_address INET,
  
  INDEX idx_user_created (user_id, created_at DESC),
  INDEX idx_success (success)
);
```

---

## 🔧 Implementation Steps

### Phase 1: Database Setup

**Prompt for Supabase AI:**
```
I'm building a Meta Marketing Pro ad generator. I need to create a Supabase database schema with the following tables:

1. images - stores generated/edited images with metadata
2. user_preferences - user brand settings and defaults
3. guardrail_configs - dynamic visual quality rules
4. performance_metrics - ad performance tracking
5. generation_logs - audit trail

Here's my schema design: [paste schema from above]

Please:
1. Review this schema for best practices
2. Create the tables with proper RLS (Row Level Security) policies
3. Add necessary indexes for performance
4. Set up proper foreign key relationships
```

### Phase 2: Row Level Security (RLS) Policies

**Prompt for Supabase AI:**
```
For my Meta Marketing Pro application, I need RLS policies that:

1. images table:
   - Users can only read/write their own images
   - Public read access for approved images (optional)

2. user_preferences table:
   - Users can only read/write their own preferences

3. guardrail_configs table:
   - Read access for all authenticated users
   - Write access only for admins

4. performance_metrics table:
   - Users can only read/write metrics for their own images

5. generation_logs table:
   - Users can only read their own logs
   - System can write for all users

Please generate the RLS policies with proper security.
```

### Phase 3: Database Functions

#### 3.1 Get Enhanced Prompt Function

**Prompt for Supabase AI:**
```
Create a PostgreSQL function that:
1. Takes a user's prompt as input
2. Fetches active guardrail configs from guardrail_configs table
3. Applies rules based on priority
4. Returns an enhanced prompt with guardrails

Function should be called: get_enhanced_prompt(user_prompt TEXT, user_id UUID)
```

#### 3.2 Log Generation Function

**Prompt for Supabase AI:**
```
Create a PostgreSQL function that logs every image generation:
1. Inserts into generation_logs table
2. Returns the log ID for reference
3. Handles errors gracefully

Function should be called: log_generation(
  user_id UUID,
  original_prompt TEXT,
  enhanced_prompt TEXT,
  guardrails_applied JSONB,
  model_used TEXT,
  success BOOLEAN,
  error_message TEXT DEFAULT NULL,
  generation_time_ms INTEGER DEFAULT NULL
)
```

#### 3.3 Update Performance Metrics Function

**Prompt for Supabase AI:**
```
Create a PostgreSQL function that updates or inserts performance metrics:
1. Upserts into performance_metrics table
2. Calculates CTR automatically from impressions/clicks
3. Returns the updated metrics

Function should be called: upsert_performance_metrics(
  image_id UUID,
  platform TEXT,
  impressions INTEGER,
  clicks INTEGER,
  spend DECIMAL,
  conversions INTEGER DEFAULT 0
)
```

---

## 💻 Client-Side Integration

### Step 1: Install Supabase Client

```bash
npm install @supabase/supabase-js
```

### Step 2: Create Supabase Client

Create `/lib/supabase.ts`:
```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### Step 3: Update Image Generation to Log to Supabase

Update `/server/images.ts`:

**Prompt for Cursor:**
```
Update the generateImage function in server/images.ts to:
1. Import supabase client
2. After successful image generation, insert a record into the images table
3. Log the generation in generation_logs table
4. Store the enhanced prompt for reference

Use server actions to interact with Supabase.
Handle errors gracefully.
```

### Step 4: Fetch User Preferences

Create `/server/preferences.ts`:

**Prompt for Cursor:**
```
Create a new file server/preferences.ts with these functions:

1. getUserPreferences(userId: string) - fetch user preferences
2. updateUserPreferences(userId: string, preferences: Partial<UserPreferences>) - update preferences
3. getDefaultBrandInfo(userId: string) - get brand name and caption templates

Use Supabase client for database operations.
Export as server actions.
```

### Step 5: Dynamic Guardrails from Database

Update `/server/images.ts`:

**Prompt for Cursor:**
```
Modify the enhancePromptWithMetaGuardrails function to:
1. Fetch active guardrail configs from Supabase
2. Apply rules based on priority
3. Merge with hardcoded defaults as fallback
4. Cache configs for 5 minutes to reduce DB calls

Use the guardrail_configs table.
```

---

## 📈 Testing & Verification Workflow

### Test 1: Database Setup
**Prompt for Supabase AI:**
```
Help me verify my database setup:
1. Check that all tables were created successfully
2. Verify RLS policies are working correctly
3. Test foreign key relationships
4. Confirm indexes are in place

Provide test queries I can run in the SQL Editor.
```

### Test 2: Insert Test Data
**Prompt for Supabase AI:**
```
Generate SQL to insert test data for:
1. A sample user preference record
2. Default guardrail configurations
3. A test image record

This will help me verify the schema works correctly.
```

### Test 3: End-to-End Flow
**Prompt for Cursor:**
```
Help me test the complete flow:
1. User generates an image
2. Check if it's logged in generation_logs table
3. Verify image record is created in images table
4. Confirm guardrails were applied

Create a test script in tests/integration/supabase.test.ts
```

---

## 🔐 Environment Variables

Add to `.env.local`:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key # for server-side operations
```

**Security Note**: Never expose service role key to the client!

---

## 📊 Admin Dashboard (Future)

Once basic integration is working, you can build an admin dashboard to:

1. **Manage Guardrails**: Update visual rules without redeploying
2. **View Analytics**: Track which creative styles perform best
3. **User Management**: See user preferences and generation history
4. **A/B Test Results**: Compare performance across different creative approaches

**Prompt for Cursor (when ready):**
```
Create an admin dashboard at /admin/dashboard with:
1. Guardrail config management
2. User generation statistics
3. Top performing creatives
4. Recent generation logs

Use Supabase queries and Next.js server components.
```

---

## 🚀 Deployment Checklist

- [ ] Database schema created in Supabase
- [ ] RLS policies enabled and tested
- [ ] Database functions created
- [ ] Environment variables configured
- [ ] Supabase client integrated
- [ ] Image generation logs to database
- [ ] User preferences working
- [ ] Dynamic guardrails fetching from DB
- [ ] Error handling implemented
- [ ] Performance monitoring active

---

## 💡 Tips for Working with Supabase AI

1. **Be Specific**: Include table names, column types, and relationships
2. **Ask for Tests**: Request SQL queries to verify functionality
3. **Iterate**: Start simple, add complexity gradually
4. **Security First**: Always ask about RLS policies
5. **Use Examples**: Provide sample data structures
6. **Request Explanation**: Ask why certain approaches are recommended

---

## 📞 Common Issues & Solutions

### Issue: RLS blocking legitimate requests
**Solution**: Check policies with Supabase AI, ensure user ID is properly passed

### Issue: Slow guardrail fetching
**Solution**: Implement caching, use database functions for complex queries

### Issue: Image URLs not accessible
**Solution**: Verify Supabase Storage bucket permissions, consider using signed URLs

### Issue: Foreign key violations
**Solution**: Ensure parent records exist before inserting child records

---

## 🎯 Success Metrics

After integration, you should be able to:

✅ Generate images and automatically log to database
✅ Fetch user preferences and apply to generations
✅ Update guardrails without code changes
✅ Track performance metrics for generated ads
✅ View generation history and debug issues
✅ Scale to thousands of generations efficiently

---

**Next Steps:**
1. Set up your Supabase project
2. Use the prompts above with Supabase AI to create schema
3. Test each component individually
4. Integrate with existing image generation flow
5. Add admin dashboard for management

**Estimated Time**: 2-4 hours for basic integration, 1-2 days for complete feature set.

