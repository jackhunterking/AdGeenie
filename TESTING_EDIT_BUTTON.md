# Testing the Edit Button Feature 🧪

## Quick Start Testing Guide

### Prerequisites
1. Dev server should be running: `npm run dev`
2. Open your browser to `http://localhost:3000`

---

## Test Flow

### Step 1: Navigate to the Ad Variations
1. Open the application
2. You should see the Preview Panel with ad variations (6 variations in a 3x2 grid)
3. Switch between Feed and Story formats using the format tabs

### Step 2: Hover Over Any Variation
1. Hover your mouse over any of the 6 ad variations
2. You'll see an overlay appear with three buttons:
   - **Select** - Selects the variation for your campaign
   - **Edit** - Opens edit mode in AI chat ⭐ (this is what we're testing)
   - **Regenerate** - Creates a new variation of the ad

### Step 3: Click the Edit Button
1. Click the **Edit** button on any variation (e.g., Variation 2)
2. Watch what happens in the AI chat panel on the left

### Step 4: Verify Reference Card Appears
**What You Should See in the AI Chat:**

```
┌─────────────────────────────────────────────┐
│ 🔄 EDITING REFERENCE        Feed • 1:1   [X]│
│                                             │
│ [Purple    Variation 2                     │
│  Preview]  Your Brand • Your headline...    │
└─────────────────────────────────────────────┘

Edit this ad variation →
```

**Check These Elements:**
- ✅ Blue reference card appears at the top
- ✅ Reply icon (🔄) is visible
- ✅ "EDITING REFERENCE" label is shown
- ✅ Format and aspect ratio are displayed (e.g., "Feed • 1:1")
- ✅ Mini preview thumbnail with gradient
- ✅ Variation title (e.g., "Variation 2")
- ✅ Dismiss button (X) in top-right corner
- ✅ Message "Edit this ad variation →" appears below
- ✅ Chat input is auto-focused
- ✅ Placeholder text says: "Describe the changes you'd like to make to Variation 2..."

### Step 5: Test Editing
1. Type an edit instruction in the chat input, for example:
   ```
   Make the headline bolder and use warmer orange colors
   ```
2. Press Enter or click the send button
3. Watch the reference card disappear after ~1 second
4. The placeholder should reset to "Type your message..."

### Step 6: Test Manual Dismiss
1. Click Edit on another variation
2. Reference card appears
3. Click the **X** button in the top-right corner
4. Reference card should disappear immediately
5. Placeholder resets to default

### Step 7: Test Multiple Variations
1. Click Edit on Variation 1 → Reference card shows "Variation 1"
2. Without sending a message, click Edit on Variation 3
3. Reference card should update to show "Variation 3" (replaces previous)
4. This confirms only one reference is active at a time

### Step 8: Test Different Formats
1. Switch to **Story** format in the Preview Panel
2. Click Edit on any Story variation
3. Reference card should show "Story • 9:16" (different aspect ratio)
4. Mini preview should be taller (story format)

---

## Expected Behaviors

### ✅ Correct Behavior

| Action | Expected Result |
|--------|----------------|
| Click Edit | Reference card appears instantly |
| Auto-focus | Chat input is focused and ready to type |
| Placeholder | Shows variation-specific placeholder |
| Send message | Reference card disappears after 1 second |
| Click X | Reference card disappears immediately |
| Edit different variation | Old reference is replaced with new one |
| Format change | Reference shows correct aspect ratio |

### ❌ Issues to Watch For

| Issue | What It Means |
|-------|---------------|
| Reference card doesn't appear | Event listener not working |
| Chat input not focused | Ref or focus logic issue |
| Placeholder not updating | State update issue |
| Reference doesn't dismiss | Auto-clear timeout issue |
| X button doesn't work | onDismiss handler issue |

---

## Visual Inspection Checklist

### Reference Card Design
- [ ] Blue background (#eff6ff in light, #172554 in dark)
- [ ] Blue border (#bfdbfe in light, #1e3a8a in dark)
- [ ] Reply icon is visible and colored blue
- [ ] Text is readable and properly aligned
- [ ] Dismiss button (X) is visible in top-right
- [ ] Mini preview thumbnail has correct gradient
- [ ] Hover effect on dismiss button works

### Layout
- [ ] Reference card appears at the top of conversation
- [ ] Doesn't overlap with messages
- [ ] Has proper spacing (margin-bottom)
- [ ] Responsive on smaller screens

---

## Browser Console Testing

### Open Developer Console
1. Press `F12` or `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows)
2. Go to Console tab

### Test Event Dispatching
```javascript
// Should see these events when you click Edit:
// 1. openEditInChat event
// 2. sendMessageToAI event

// You can manually test by dispatching:
window.dispatchEvent(new CustomEvent('openEditInChat', {
  detail: {
    variationNumber: 1,
    variationTitle: "Test Variation",
    format: "feed",
    gradient: "from-blue-500 to-cyan-500",
    preview: {
      brandName: "Test Brand",
      headline: "Test Headline",
      body: "Test body",
      dimensions: { width: 500, height: 500, aspect: "1:1" }
    }
  }
}));
```

### Check for Errors
- [ ] No console errors when clicking Edit
- [ ] No React warnings
- [ ] No TypeScript errors
- [ ] Network requests work properly

---

## Mobile/Responsive Testing

### Test on Smaller Screens
1. Open browser DevTools
2. Toggle device toolbar (mobile view)
3. Test on different screen sizes:
   - iPhone SE (375px)
   - iPhone 14 Pro (430px)
   - iPad (768px)

**Check:**
- [ ] Reference card fits properly
- [ ] Text doesn't overflow
- [ ] Mini preview scales correctly
- [ ] Dismiss button is tappable

---

## Accessibility Testing

### Keyboard Navigation
1. Use Tab key to navigate
2. Reference card should be accessible
3. Dismiss button should be focusable
4. Enter/Space should trigger dismiss

### Screen Reader Testing
1. Enable screen reader (VoiceOver on Mac, NVDA on Windows)
2. Navigate to reference card
3. Should announce: "Dismiss reference" for X button
4. Should read variation details

---

## Integration Testing

### With AI Chat
1. Click Edit on a variation
2. Type: "Make the text bigger"
3. AI should receive the message
4. (When AI backend is ready) AI should respond with context

### With Preview Panel
1. Generate an ad with the AI
2. Ad appears in preview panel
3. Click Edit on the generated ad
4. Reference should include the actual ad content
5. Edit instructions should work on the real ad

---

## Performance Testing

### Load Time
- [ ] Reference card appears instantly (<100ms)
- [ ] No lag when clicking Edit
- [ ] No jank or stuttering animations

### Multiple Edits
- [ ] Clicking Edit 10 times in a row works
- [ ] No memory leaks
- [ ] State updates properly each time

---

## Edge Cases to Test

### Empty States
- [ ] No ad content yet → Edit still works with default content
- [ ] No variations generated → Edit on mock variations works

### Rapid Actions
- [ ] Click Edit → Immediately click Edit on another variation
- [ ] Click Edit → Immediately click X
- [ ] Click Edit → Immediately send a message

### Long Content
- [ ] Variation with very long title
- [ ] Variation with very long headline
- [ ] Variation with very long body text

---

## Success Criteria

### ✅ Feature is Working if:
1. Clicking Edit on any variation shows reference card
2. Reference card displays correct variation details
3. Chat input is auto-focused
4. Placeholder text is customized
5. Reference card can be dismissed (auto or manual)
6. Multiple variations can be edited
7. No console errors or warnings
8. UI is responsive and accessible

---

## Troubleshooting

### Reference Card Not Appearing
**Solution:**
1. Check browser console for errors
2. Verify event listeners are registered in ai-chat.tsx
3. Ensure AdReferenceCard component is imported
4. Check if adEditReference state is being set

### Chat Input Not Auto-Focusing
**Solution:**
1. Verify chatInputRef is attached to textarea
2. Check if setTimeout in handleSendMessageToAI is executing
3. Ensure ref forwarding is working in PromptInputTextarea

### Reference Not Dismissing
**Solution:**
1. Check if onDismiss prop is passed to AdReferenceCard
2. Verify setTimeout in handleSubmit is executing
3. Check if setAdEditReference(null) is being called

---

## Video Demo Script

If you want to record a demo:

1. **Intro** (5 sec)
   - "Let me show you the Edit button feature"

2. **Show Preview Panel** (5 sec)
   - "Here we have 6 ad variations"

3. **Hover and Click Edit** (5 sec)
   - "When I hover, I see the Edit button"
   - "Click it..."

4. **Show Reference Card** (10 sec)
   - "A reference card appears in the AI chat"
   - "Shows the variation I'm editing"
   - "Chat input is ready for me to type"

5. **Edit and Send** (10 sec)
   - "I type my edit instructions"
   - "Send the message"
   - "Reference card disappears"

6. **Test Dismiss** (5 sec)
   - "Or I can click the X to dismiss"

7. **Outro** (5 sec)
   - "That's the Edit button feature!"

---

## Next Steps After Testing

### If Everything Works ✅
1. Mark feature as production-ready
2. Document for team/users
3. Plan backend integration with Supabase
4. Consider adding more features (see EDIT_BUTTON_IMPLEMENTATION.md)

### If Issues Found ❌
1. Document the issue
2. Check browser console for errors
3. Review the code in:
   - `components/preview-panel.tsx` (handleEditAd)
   - `components/ai-chat.tsx` (event listeners)
   - `components/ad-reference-card-example.tsx` (UI component)
4. Ask for help or file a bug report

---

**Happy Testing! 🎉**

If you encounter any issues or have questions, refer to:
- `EDIT_BUTTON_IMPLEMENTATION.md` - Complete implementation details
- `AI_CHAT_INTEGRATION_GUIDE.md` - Integration documentation


