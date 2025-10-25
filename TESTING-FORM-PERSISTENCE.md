# Form Backend Persistence - Testing Guide

## ✅ What Was Fixed

The form creation/selection in the Goal tab now properly saves to the Supabase database. 

### Changes Made:

1. **Updated `components/goal-tab.tsx`:**
   - Integrated with `GoalContext` using the `useGoal()` hook
   - Replaced local `selectedForm` state with context state (`goalState.formData`)
   - Updated `handleFormSelected()` to save form data via `setFormData()`
   - Updated `handleChangeGoal()` to clear form data via `resetGoal()`
   - Form data now auto-saves to database with 300ms debounce

### How It Works:

1. User creates/selects a form → `handleFormSelected()` is called
2. Form data is saved to `GoalContext` via `setFormData()`
3. `GoalContext` triggers auto-save with 300ms debounce
4. Auto-save calls `saveCampaignState('goal_data', state)`
5. Data is persisted to `campaign_states.goal_data` in Supabase
6. On page refresh, `GoalContext` restores state from database

---

## 🧪 Testing Instructions

### 1. Test Form Creation & Persistence

1. Start your dev server: `npm run dev`
2. Navigate to a campaign and go to the **Goal** tab
3. Click on **Leads** → **Instant Forms**
4. Click **Create New** tab
5. Fill in the form details:
   - Form name: "Test Lead Form"
   - Privacy policy: Use default or custom
   - Thank you page details
6. Click **Create and select form**
7. **Expected:** Form is created on Meta and you see the configuration summary

### 2. Verify Database Persistence

Open your browser's Developer Tools → Console. You should see:
```
[GoalContext] ✅ Saving goal state: { selectedGoal: 'leads', status: 'completed', formData: { ... } }
```

### 3. Test State Restoration

1. **Refresh the page** (F5 or Cmd+R)
2. Navigate back to the **Goal** tab
3. **Expected:** 
   - The form should still be selected
   - You should see the configuration summary with "Test Lead Form"
   - The "Selected Form:" section shows your form name

### 4. Verify in Supabase Database

**Option A: Using Supabase Dashboard**

1. Go to your Supabase project dashboard
2. Navigate to **Table Editor** → `campaign_states`
3. Find your campaign row
4. Check the `goal_data` column
5. **Expected JSON:**
```json
{
  "selectedGoal": "leads",
  "status": "completed",
  "formData": {
    "id": "123456789012345",
    "name": "Test Lead Form",
    "type": "instant-form"
  }
}
```

**Option B: Using SQL Editor**

Run this query in the SQL Editor:

```sql
-- Check goal_data for your campaigns
SELECT 
  c.id,
  c.name as campaign_name,
  cs.goal_data,
  cs.updated_at
FROM campaigns c
JOIN campaign_states cs ON cs.campaign_id = c.id
WHERE c.user_id = auth.uid()
ORDER BY c.updated_at DESC
LIMIT 5;
```

**Expected Result:**
- `goal_data` should contain an object with `selectedGoal`, `status`, and `formData`
- `formData` should have `id`, `name`, and `type` fields

### 5. Test Form Selection (Existing Form)

1. Click **Change Goal** button
2. Select **Leads** → **Instant Forms** again
3. Click **Select Existing** tab
4. Select a form from the list
5. Click **Use This Form**
6. **Expected:** Form is selected and persisted

### 6. Test Goal Reset

1. With a form selected, click **Change Goal**
2. Refresh the page
3. **Expected:** No form should be selected (goal state is cleared)

---

## 🐛 Troubleshooting

### Form not persisting after refresh?

**Check:**
1. Browser Console for errors
2. Network tab for failed API calls
3. Supabase logs for RLS policy issues

**Debug Query:**
```sql
-- Check if RLS policies allow access
SELECT * FROM campaign_states 
WHERE campaign_id = 'YOUR_CAMPAIGN_ID';
```

### Auto-save not triggering?

**Check:**
1. Console should show `[GoalContext]` logs
2. Verify `campaign.id` exists in the context
3. Check that `GoalContext` is initialized (logs should show "✅ Restoring goal state")

### Form data structure mismatch?

**Verify the structure matches:**
```typescript
{
  id: string,        // Meta form ID
  name: string,      // Form name
  type: 'instant-form'
}
```

---

## 📊 Expected Data Flow

```
User Action (Create/Select Form)
  ↓
handleFormSelected({ id, name })
  ↓
setFormData({ id, name, type: 'instant-form' })
  ↓
GoalContext state updated
  ↓
useAutoSave hook (300ms debounce)
  ↓
saveCampaignState('goal_data', goalState)
  ↓
API: PATCH /api/campaigns/[id]/state
  ↓
Supabase: UPDATE campaign_states SET goal_data = '...'
  ↓
✅ Data persisted
```

---

## ✨ Success Criteria

- [x] Form creation works and returns form ID
- [x] Form data saves to GoalContext
- [x] Auto-save persists to database
- [x] State restores after page refresh
- [x] Change Goal clears form data
- [x] No console errors or warnings

---

## 🔗 References

- GoalContext: `lib/context/goal-context.tsx`
- Goal Tab Component: `components/goal-tab.tsx`
- Meta Forms API: `app/api/meta/forms/route.ts`
- Campaign State Manager: `lib/services/state-manager.ts`
- Auto-save Hook: `lib/hooks/use-auto-save.ts`

