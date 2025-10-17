# Goal Setup Implementation Guide

## ✅ What Was Implemented

### 1. **Goal Context** (`lib/context/goal-context.tsx`)
- Centralized state management for goal setup
- Tracks goal selection, setup status, form data, and errors
- Provides methods: `setSelectedGoal`, `startSetup`, `setFormData`, `setError`, `resetGoal`

### 2. **Setup Goal Tool** (`tools/setup-goal-tool.ts`)
- AI tool that handles goal configuration
- Accepts: goalType, conversionMethod, formData, explanation
- Returns setup confirmation to be displayed in UI

### 3. **Goal Selection Canvas** (`components/goal-selection-canvas.tsx`)
- Visual interface for goal selection
- **5 States:**
  - **Idle**: Shows two goal cards (Leads, Calls)
  - **Selecting**: Shows selected goal with "Setup" button
  - **Setup In Progress**: Loading state while AI configures
  - **Completed**: Success state with summary
  - **Error**: Error state with retry option

### 4. **AI Integration** (`components/ai-chat.tsx`)
- Listens for `triggerGoalSetup` events from canvas
- Automatically sends setup message to AI
- Handles `setupGoal` tool responses
- Updates goal context based on AI results

### 5. **API Route Updates** (`app/api/chat/route.ts`)
- Added `setupGoal` tool to available tools
- Updated system prompt with goal setup instructions
- AI now knows how to guide users through setup

### 6. **Layout Updates** (`app/layout.tsx`)
- Wrapped app with `GoalProvider`
- Goal state now accessible throughout the app

### 7. **Preview Panel** (`components/preview-panel.tsx`)
- Replaced old `GoalTab` with new `GoalSelectionCanvas`
- Canvas takes full height for immersive experience

---

## 🎯 How It Works (User Flow)

### Step 1: User Opens Goal Tab
- Canvas shows two cards: **Leads** and **Calls**
- User can click either card or talk to AI

### Step 2: User Selects a Goal
- Clicking "Leads" card highlights it
- "Setup" button becomes active
- User can change mind or proceed

### Step 3: User Clicks "Setup"
- Canvas shows loading state
- Event triggers AI chat: "I want to set up leads goal with instant forms"
- Canvas displays "Setting up your goal..."

### Step 4: AI Takes Over
- AI asks: "Would you like me to create a new Instant Form or use an existing one?"
- User responds in chat
- AI calls `setupGoal` tool with configuration

### Step 5: Setup Completes
- Canvas shows success checkmark
- Displays goal summary (Goal type, Form name, Status)
- User can proceed to ad creation

---

## 🔄 Event Flow Diagram

```
User Clicks "Setup" Button
         ↓
Canvas dispatches 'triggerGoalSetup' event
         ↓
AI Chat receives event → sends message to AI
         ↓
AI responds conversationally (asks about form)
         ↓
User responds → AI calls setupGoal tool
         ↓
Tool result updates goal context
         ↓
Canvas displays completion state
```

---

## 🎨 UX Improvements

### Visual Hierarchy
- ✅ Large, clickable cards (easy to tap on mobile)
- ✅ Color coding: Blue for leads, Green for calls
- ✅ Clear icons for instant recognition

### Progressive Disclosure
- ✅ Start simple (just 2 choices)
- ✅ AI handles complexity conversationally
- ✅ Status indicators at each stage

### State Feedback
- ✅ Loading animations
- ✅ Success confirmations with checkmarks
- ✅ Error messages with retry options

### Escape Hatches
- ✅ "Change Goal" button when selected
- ✅ "Try Again" on errors
- ✅ Can always talk to AI directly

---

## 🗄️ Next Steps: Supabase Backend Integration

Since you mentioned needing Supabase for backend storage, here's what you need to build:

### Database Schema (Use Supabase AI to create these)

```sql
-- Goals table
CREATE TABLE goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  campaign_id UUID NOT NULL,
  goal_type TEXT NOT NULL CHECK (goal_type IN ('leads', 'calls')),
  conversion_method TEXT NOT NULL CHECK (conversion_method IN ('instant-forms', 'website', 'calls')),
  form_id UUID,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Instant Forms table
CREATE TABLE instant_forms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  thank_you_message TEXT DEFAULT 'Thank you for your submission!',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Form submissions table (for tracking leads)
CREATE TABLE form_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  form_id UUID NOT NULL,
  submission_data JSONB NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT fk_form FOREIGN KEY (form_id) REFERENCES instant_forms(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX idx_goals_user_id ON goals(user_id);
CREATE INDEX idx_goals_campaign_id ON goals(campaign_id);
CREATE INDEX idx_instant_forms_user_id ON instant_forms(user_id);
CREATE INDEX idx_form_submissions_form_id ON form_submissions(form_id);
```

### Required Supabase Functions

**Prompt for Supabase AI:**

```
Please create the following database functions:

1. create_goal(p_user_id UUID, p_campaign_id UUID, p_goal_type TEXT, p_conversion_method TEXT, p_form_id UUID DEFAULT NULL)
   - Creates a new goal record
   - Returns the created goal

2. update_goal(p_goal_id UUID, p_status TEXT)
   - Updates goal status
   - Returns the updated goal

3. get_user_goals(p_user_id UUID)
   - Returns all goals for a user
   - Includes joined form data if applicable

4. create_instant_form(p_user_id UUID, p_name TEXT, p_description TEXT, p_fields JSONB)
   - Creates a new instant form
   - Returns the created form

5. get_user_forms(p_user_id UUID)
   - Returns all instant forms for a user
   - Orders by created_at DESC

6. submit_form(p_form_id UUID, p_submission_data JSONB)
   - Records a form submission
   - Returns the submission record
```

### Update `setup-goal-tool.ts` to use Supabase

Once Supabase functions are ready, update the tool:

```typescript
import { tool } from 'ai';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const setupGoalTool = tool({
  description: 'Set up a goal for the ad campaign (leads or calls)...',
  parameters: z.object({
    goalType: z.enum(['leads', 'calls']),
    conversionMethod: z.enum(['instant-forms', 'website', 'calls']),
    formData: z.object({
      formId: z.string().optional(),
      formName: z.string().optional(),
      createNew: z.boolean().optional(),
    }).optional(),
    userId: z.string().describe('User ID for the goal'),
    campaignId: z.string().describe('Campaign ID for the goal'),
    explanation: z.string(),
  }),
  execute: async ({ goalType, conversionMethod, formData, userId, campaignId, explanation }) => {
    try {
      let formId = formData?.formId;
      
      // Create new form if requested
      if (formData?.createNew) {
        const { data: newForm, error: formError } = await supabase
          .rpc('create_instant_form', {
            p_user_id: userId,
            p_name: formData.formName || 'New Instant Form',
            p_description: 'Lead collection form',
            p_fields: JSON.stringify([
              { name: 'full_name', label: 'Full Name', type: 'text', required: true },
              { name: 'email', label: 'Email', type: 'email', required: true },
              { name: 'phone', label: 'Phone', type: 'tel', required: false },
            ]),
          });
        
        if (formError) throw formError;
        formId = newForm.id;
      }
      
      // Create goal
      const { data: goal, error: goalError } = await supabase
        .rpc('create_goal', {
          p_user_id: userId,
          p_campaign_id: campaignId,
          p_goal_type: goalType,
          p_conversion_method: conversionMethod,
          p_form_id: formId,
        });
      
      if (goalError) throw goalError;
      
      return {
        success: true,
        goalId: goal.id,
        goalType,
        conversionMethod,
        formData: { formId, formName: formData?.formName || 'New Instant Form' },
        explanation,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Setup goal error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  },
});
```

---

## 🧪 Testing the Implementation

### Test Scenario 1: Visual Selection
1. Click on "Goal" tab
2. Click "Leads" card → should highlight
3. Click "Setup" button → should show loading
4. Check AI chat receives message
5. Respond to AI questions
6. Verify canvas shows completion

### Test Scenario 2: AI Direct Command
1. Type in chat: "Set up leads goal"
2. AI should guide through setup
3. Canvas should update automatically

### Test Scenario 3: Error Handling
1. Simulate an error (disconnect during setup)
2. Canvas should show error state
3. "Try Again" button should reset

---

## 📝 Key Features

- ✅ **True Agentic System**: Canvas triggers AI, AI handles logic
- ✅ **Visual Feedback**: Canvas shows every state change
- ✅ **Event-Driven**: Components communicate via CustomEvents
- ✅ **Context-Based State**: Goal state shared across app
- ✅ **Non-Technical Friendly**: Simple visual interface
- ✅ **Conversational AI**: AI guides user through complexity
- ✅ **Error Recovery**: Clear error messages and retry options

---

## 🎉 Summary

You now have a fully functional agentic goal setup system! The canvas provides visual feedback while the AI handles all the complex configuration conversationally. Once you integrate Supabase, the setup will persist to your database.

Next steps:
1. ✅ Test the current implementation
2. ⏳ Create Supabase schema using Supabase AI
3. ⏳ Update setup-goal-tool.ts with Supabase integration
4. ⏳ Add authentication context (userId, campaignId)
5. ⏳ Test end-to-end with real database

The foundation is solid and ready for backend integration! 🚀

