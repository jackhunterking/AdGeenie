# Ad Copy Edit Implementation Guide

## Overview

This document describes the implementation of the Edit Ad Copy feature with Feed, Story, and Reel format tabs in the Ad Copy Selection section.

## Implementation Date

October 18, 2025

## Features Implemented

### 1. Format Tabs (Feed, Story, Reel)
- **Location**: Top of Ad Copy Selection Canvas
- **Functionality**: 
  - Switch between Feed and Story formats
  - Reel tab shows "Coming Soon" message
  - Visual consistency with Ad Creative section

### 2. Edit Ad Copy Button
- **Location**: Hover overlay on each ad copy card
- **Triggers**: AI chat with reference card
- **Editable Fields**:
  - Primary Text
  - Headline
  - Description

### 3. Format-Specific Rendering

#### Feed Format
- Square aspect ratio (1:1)
- Traditional social media feed layout
- Header with brand avatar
- Image/gradient creative
- Reaction icons
- Primary text with brand name
- Headline and description in card
- CTA button

#### Story Format
- Vertical aspect ratio (9:16)
- Immersive full-screen layout
- Progress bar at top
- Brand avatar in header
- Background image/gradient
- Copy overlays at bottom
- CTA button at bottom

## Files Modified

### 1. `/components/ad-copy-selection-canvas.tsx`

#### Added Imports
```typescript
import { useState } from "react"
import { Check, ImageIcon, Layers, Video, Sparkles, Edit2 } from "lucide-react"
```

#### Added State
```typescript
const [activeFormat, setActiveFormat] = useState("feed")
const [showReelMessage, setShowReelMessage] = useState(false)
```

#### New Functions

##### `handleEditCopy(index: number)`
Dispatches `openEditInChat` event with ad copy reference context:
- Copy index and number
- Current format
- Copy content (primaryText, headline, description)
- Preview data (gradient, imageUrl, dimensions)
- Metadata (timestamp, editMode, fields)

##### `renderFeedAdCopyCard(copyIndex: number)`
Renders ad copy in feed format:
- Square aspect ratio
- Select and Edit buttons on hover
- Traditional feed layout
- Shows all copy fields

##### `renderStoryAdCopyCard(copyIndex: number)`
Renders ad copy in story format:
- Vertical aspect ratio (9:16)
- Stacked buttons on hover
- Immersive story layout
- Copy overlays on background

#### Updated UI Structure
```
<AdCopySelectionCanvas>
  ├── Header (title and description)
  ├── Format Tabs (Feed, Story, Reel)
  ├── 3x2 Grid
  │   ├── renderFeedAdCopyCard() // if Feed
  │   └── renderStoryAdCopyCard() // if Story
  └── Info Section
</AdCopySelectionCanvas>
```

### 2. `/components/ad-reference-card-example.tsx`

#### Updated Interface
Added support for ad copy references:
```typescript
interface AdReferenceCardProps {
  reference: {
    type?: string // 'ad_copy_reference' or 'ad_variation_reference'
    variationNumber?: number
    variationTitle?: string
    copyNumber?: number // For ad copy references
    format: 'feed' | 'story' | 'reel'
    gradient?: string
    content?: { // Ad copy content
      primaryText: string
      headline: string
      description: string
    }
    preview?: {
      // ... preview data
    }
  }
  onDismiss?: () => void
}
```

#### Enhanced Display
- Detects reference type (creative vs copy)
- Shows thumbnail preview
- For ad copy: displays headline, primary text, and description
- Maintains consistent styling with existing references

## User Flow

### Editing Ad Copy

1. **Navigate to Ad Copy Section**
   - User completes Ad Creative selection
   - Proceeds to Step 2: Ad Copy

2. **View Format Options**
   - See Feed, Story, and Reel tabs at top
   - Switch between Feed and Story views
   - Reel shows "Coming Soon" message

3. **Select Format**
   - Click Feed or Story tab
   - Grid updates to show format-specific layouts
   - All 6 copy variations render in selected format

4. **Hover to Edit**
   - Hover over any ad copy card
   - See Select and Edit buttons
   - Click Edit button

5. **AI Chat Opens**
   - Reference card appears in chat
   - Shows copy variation details
   - Displays current primary text, headline, and description
   - Input placeholder prompts for edits

6. **Request Changes**
   - Type desired changes
   - AI understands context from reference
   - Can edit individual fields or all at once

7. **Review and Apply**
   - AI generates updated copy
   - Preview changes
   - Select updated variation

## Event Communication

### openEditInChat Event
```typescript
window.dispatchEvent(new CustomEvent('openEditInChat', { 
  detail: {
    type: 'ad_copy_reference',
    action: 'edit',
    copyIndex: 0,
    copyNumber: 1,
    format: 'feed',
    content: {
      primaryText: "...",
      headline: "...",
      description: "..."
    },
    preview: {
      format: 'feed',
      gradient: '...',
      imageUrl: '...',
      dimensions: { width: 500, height: 500, aspect: '1:1' }
    },
    metadata: {
      timestamp: '...',
      editMode: true,
      canRegenerate: true,
      selectedFormat: 'feed',
      fields: ['primaryText', 'headline', 'description']
    }
  }
}))
```

## UI/UX Consistency

### With Ad Creative Section
- ✅ Same format tabs (Feed, Story, Reel)
- ✅ Same hover overlay pattern
- ✅ Same button styling and positioning
- ✅ Same selection indicator
- ✅ Same "Coming Soon" badge for Reel
- ✅ Same edit workflow via AI chat

### Design Patterns
- Hover reveals action buttons
- Selected items show blue border and check icon
- Edit button triggers AI chat with reference
- Format tabs control visual presentation
- Consistent color scheme and spacing

## Benefits

### For Users
1. **Visual Context**: See copy in actual format (Feed vs Story)
2. **Easy Editing**: Quick access to edit any copy variation
3. **AI Assistance**: Natural language editing with context
4. **Format Flexibility**: Preview how copy looks in different formats

### For No-Code Developers
1. **Consistent Patterns**: Same workflow as ad creative editing
2. **Clear UI**: Format tabs clearly show options
3. **Helpful References**: AI chat shows what's being edited
4. **No Manual Updates**: AI handles copy generation

## Technical Notes

### Format Rendering
- Feed and Story use separate render functions
- Different aspect ratios and layouts
- Conditional rendering based on `activeFormat` state
- Both formats show same copy content, different presentation

### AI Integration
- Event-driven architecture
- Reference context provides full edit capability
- AI can understand which fields to modify
- Supports partial or complete copy rewrites

### Future Enhancements
- Reel format support
- Copy regeneration button (similar to creative)
- Batch editing multiple variations
- Copy A/B testing suggestions
- Character count validation per platform

## Testing Checklist

- [x] Format tabs render correctly
- [x] Feed format displays all variations
- [x] Story format displays all variations
- [x] Reel tab shows "Coming Soon" message
- [x] Edit button appears on hover
- [x] Edit button triggers AI chat
- [x] Reference card displays copy content
- [x] Reference card can be dismissed
- [x] Format switching works smoothly
- [x] Selection state persists across formats
- [x] No linter errors
- [x] Responsive layout works

## Related Files

- `/components/ad-copy-selection-canvas.tsx` - Main component
- `/components/ad-reference-card-example.tsx` - Reference card
- `/components/ai-chat.tsx` - AI chat integration
- `/components/preview-panel.tsx` - Parent container
- `/lib/context/ad-copy-context.tsx` - State management

## Success Metrics

1. ✅ Feature parity with Ad Creative section
2. ✅ Format tabs functional and clear
3. ✅ Edit workflow integrated with AI
4. ✅ Visual consistency maintained
5. ✅ No breaking changes
6. ✅ Clean, maintainable code

## Conclusion

The Ad Copy Edit implementation successfully mirrors the Ad Creative editing workflow, providing users with a consistent, intuitive interface for editing ad copy across different formats. The integration with AI chat enables natural language editing while maintaining context through visual references.

