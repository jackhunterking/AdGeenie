# AI Chat Integration Guide - Edit Ad Variations with Visual References

## Overview
When users click the **Edit** button on an ad variation, the system sends rich context to your AI chat component to display a visual reference card with a reply icon. This creates an engaging, conversational editing experience directly in the chat.

---

## Events Dispatched

### 1. `openEditInChat` Event
Prepares the chat to enter edit mode with the selected variation context.

```typescript
window.addEventListener('openEditInChat', (event: CustomEvent) => {
  const context = event.detail;
  // Handle the context to prepare chat UI
});
```

**Event Payload Structure:**
```typescript
{
  type: 'ad_variation_reference',
  action: 'edit',
  variationIndex: 0-5,                    // Which variation (0-based)
  variationNumber: 1-6,                   // Display number (1-based)
  variationTitle: "Variation 1",
  format: "feed" | "story" | "reel",
  gradient: "from-blue-600 to-cyan-500",  // Tailwind gradient class
  imageUrl: "...",                        // Current ad image if exists
  showAsReference: true,                  // Render as reference card
  
  preview: {
    format: "feed" | "story",
    gradient: "from-blue-600 to-cyan-500",
    title: "Variation 1",
    brandName: "Your Brand",
    headline: "Your headline here",
    body: "Your ad description...",
    dimensions: {
      width: 500,
      height: 500,
      aspect: "1:1"                       // "1:1" for feed, "9:16" for story
    }
  },
  
  metadata: {
    timestamp: "2024-01-01T00:00:00.000Z",
    editMode: true,
    canRegenerate: true,
    selectedFormat: "feed"
  }
}
```

---

### 2. `sendMessageToAI` Event
Sends the edit request with full reference data for rendering.

```typescript
window.addEventListener('sendMessageToAI', (event: CustomEvent) => {
  const { message, reference, showReferenceCard, focusChat, placeholder } = event.detail;
  // Render message with reference card
});
```

**Event Payload Structure:**
```typescript
{
  message: "Edit this ad variation →",
  reference: { /* same structure as openEditInChat payload */ },
  showReferenceCard: true,                // Signal to render visual reference
  focusChat: true,                        // Auto-focus chat input
  placeholder: "Describe the changes you'd like to make to Variation 1..."
}
```

---

## Implementation Guide

### Step 1: Listen for Events in Your Chat Component

```typescript
// In your AI chat component (e.g., components/ai-chat.tsx)
import { useEffect, useState } from 'react'

export function AIChat() {
  const [referenceCard, setReferenceCard] = useState(null)
  const [chatInput, setChatInput] = useState('')
  const [placeholder, setPlaceholder] = useState('Type your message...')
  
  useEffect(() => {
    // Handle edit mode initialization
    const handleOpenEdit = (event: CustomEvent) => {
      const context = event.detail
      setReferenceCard(context) // Store reference for rendering
      setEditMode(true)
    }
    
    // Handle message with reference
    const handleSendMessage = (event: CustomEvent) => {
      const { message, reference, showReferenceCard, focusChat, placeholder: customPlaceholder } = event.detail
      
      if (showReferenceCard && reference) {
        // Render the reference card in chat
        addMessageToChat({
          type: 'user_with_reference',
          text: message,
          reference: reference,
          timestamp: new Date()
        })
      }
      
      // Update placeholder
      if (customPlaceholder) {
        setPlaceholder(customPlaceholder)
      }
      
      // Focus chat input
      if (focusChat) {
        chatInputRef.current?.focus()
      }
    }
    
    window.addEventListener('openEditInChat', handleOpenEdit)
    window.addEventListener('sendMessageToAI', handleSendMessage)
    
    return () => {
      window.removeEventListener('openEditInChat', handleOpenEdit)
      window.removeEventListener('sendMessageToAI', handleSendMessage)
    }
  }, [])
  
  // ... rest of chat component
}
```

---

### Step 2: Render the Reference Card UI

Create a visual reference card component that displays the ad variation:

```tsx
// components/ad-reference-card.tsx
import { Reply } from 'lucide-react'

interface AdReferenceCardProps {
  reference: {
    variationNumber: number
    variationTitle: string
    format: string
    gradient: string
    preview: {
      brandName: string
      headline: string
      body: string
      dimensions: {
        width: number
        height: number
        aspect: string
      }
    }
  }
}

export function AdReferenceCard({ reference }: AdReferenceCardProps) {
  const { variationNumber, variationTitle, format, gradient, preview } = reference
  
  return (
    <div className="inline-flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800 mb-3 max-w-sm">
      {/* Reply icon indicator */}
      <Reply className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-1 flex-shrink-0" />
      
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
            Editing Reference
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {format.charAt(0).toUpperCase() + format.slice(1)} • {preview.dimensions.aspect}
          </span>
        </div>
        
        {/* Mini preview */}
        <div className="flex items-start gap-3">
          {/* Visual preview thumbnail */}
          <div 
            className={`relative rounded overflow-hidden flex-shrink-0 ${
              format === 'story' ? 'w-16 h-28' : 'w-24 h-24'
            }`}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`}>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-white text-xs font-medium">
                  {variationTitle}
                </span>
              </div>
            </div>
          </div>
          
          {/* Details */}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
              {variationTitle}
            </h4>
            <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
              {preview.brandName} • {preview.headline}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
```

---

### Step 3: Integrate Reference Card into Chat Messages

```tsx
// In your chat message component
function ChatMessage({ message }) {
  return (
    <div className="chat-message">
      {message.type === 'user_with_reference' && message.reference && (
        <AdReferenceCard reference={message.reference} />
      )}
      
      <div className="message-text">
        {message.text}
      </div>
      
      {/* Chat input for user to describe edits */}
      {message.awaitingUserInput && (
        <div className="mt-2">
          <input 
            type="text"
            placeholder="Describe the changes you'd like to make..."
            className="w-full p-2 border rounded"
            autoFocus
          />
        </div>
      )}
    </div>
  )
}
```

---

## User Flow Example

### 1. User clicks "Edit" on Variation 2 (feed format)

**Chat displays:**
```
┌─────────────────────────────────────────┐
│ 🔄 Editing Reference                     │
│ Feed • 1:1                               │
│                                          │
│ ┌────┐  Variation 2                     │
│ │ V2 │  Your Brand • Your headline...   │
│ └────┘                                   │
└─────────────────────────────────────────┘

Edit this ad variation →

[Type here: Describe the changes you'd like to make to Variation 2...]
```

### 2. User types their edit request

```
User: Make the headline bolder and use warmer colors
```

### 3. AI processes with context

The AI receives:
- The user's prompt: "Make the headline bolder and use warmer colors"
- Full context of Variation 2 (format, gradient, current design)
- Edit mode flag to know this is modifying an existing variation

### 4. AI responds and updates the variation

```
AI: I've updated Variation 2 with a bolder headline and 
    warmer color scheme. The gradient now uses warm 
    orange-to-red tones. Would you like to see it?
    
[Preview Updated Variation 2]
```

---

## Benefits of This Approach

✅ **Visual Context**: User sees exactly which ad they're editing  
✅ **Engaging**: Keeps interaction in chat, not separate dialogs  
✅ **Conversational**: Natural back-and-forth editing flow  
✅ **Clear Reference**: Reply icon and card show the editing target  
✅ **Better UX**: No context switching between preview and dialog  
✅ **Chat Engagement**: Encourages users to use the AI chat more  

---

## Advanced: Handling Follow-up Edits

Users can continue editing the same variation:

```typescript
// Track active edit reference
const [activeReference, setActiveReference] = useState(null)

// When user sends follow-up message
const handleUserMessage = (userMessage: string) => {
  if (activeReference) {
    // Send message with continued reference
    sendToAI({
      message: userMessage,
      continueEditing: true,
      referenceContext: activeReference
    })
  }
}
```

---

## Testing the Integration

### 1. Click Edit on any variation
- ✅ Reference card appears in chat
- ✅ Reply icon is visible
- ✅ Variation details are shown
- ✅ Chat input is focused
- ✅ Placeholder text is customized

### 2. Type an edit request
- ✅ AI receives variation context
- ✅ AI can reference the specific design
- ✅ Changes apply to correct variation

### 3. Continue conversation
- ✅ Follow-up edits work
- ✅ Reference remains visible
- ✅ Can switch to editing different variation

---

## Complete Event Data Reference

```typescript
interface AdVariationReference {
  // Identification
  type: 'ad_variation_reference'
  action: 'edit'
  variationIndex: number          // 0-5
  variationNumber: number         // 1-6
  variationTitle: string          // "Variation 1"
  
  // Format & Style
  format: 'feed' | 'story' | 'reel'
  gradient: string                // Tailwind gradient class
  imageUrl?: string               // Optional image
  
  // UI Signals
  showAsReference: boolean        // Always true for edit mode
  
  // Visual Preview Data
  preview: {
    format: string
    gradient: string
    title: string
    brandName: string
    headline: string
    body: string
    dimensions: {
      width: number
      height: number
      aspect: '1:1' | '9:16'
    }
  }
  
  // Metadata
  metadata: {
    timestamp: string             // ISO string
    editMode: boolean             // Always true
    canRegenerate: boolean        // Always true
    selectedFormat: string
  }
}
```

---

## Next Steps

1. Implement event listeners in your AI chat component
2. Create the `AdReferenceCard` component
3. Add visual reference rendering to chat messages
4. Test the edit flow with different variations
5. Add follow-up conversation handling
6. Implement AI response with updated variation preview

For questions or issues, refer to the `preview-panel.tsx` component which dispatches these events.

