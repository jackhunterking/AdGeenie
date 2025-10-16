# Meta Marketing Pro - Testing Prompts

## 🧪 Quick Testing Guide

Use these prompts to verify your Meta Marketing Pro implementation is working correctly.

---

## ✅ Test 1: Basic Identity Check
**Goal**: Verify the AI maintains Meta Marketing Pro identity

**Prompt:**
```
Hi! What can you help me with?
```

**Expected Behavior:**
- Should introduce itself as Meta Marketing Pro
- Mentions expertise in Facebook/Instagram advertising
- Offers to help create scroll-stopping ad creatives
- Friendly, action-oriented tone (not overly formal)

---

## ✅ Test 2: Simple Ad Generation
**Goal**: Check basic image generation flow

**Prompt:**
```
Create an ad for a coffee shop
```

**Expected Behavior:**
- Generates immediately (request is clear)
- Brief enthusiastic response: "Perfect! Creating a warm, inviting coffee shop creative..."
- May briefly explain creative direction naturally
- NO lengthy questions or interrogation
- After generation, invites refinement: "Want to adjust anything?"

---

## ✅ Test 3: Format-Specific Request
**Goal**: Test vertical format awareness

**Prompt:**
```
Generate a Stories ad for a fitness brand
```

**Expected Behavior:**
- Recognizes "Stories" = vertical format (1080×1920)
- May ask about brand name and concept
- Should mention safe zones for Stories UI
- Explains mobile-optimized composition
- Generates vertical format image with proper margins

---

## ✅ Test 4: Text Overlay Request
**Goal**: Test safe zone guidance

**Prompt:**
```
Create a feed ad for a clothing brand with the text "Summer Sale 50% Off" on the image
```

**Expected Behavior:**
- Provides guidance on text placement
- Explains safe zones (10-12% margins)
- Mentions why margins matter (Facebook buttons, captions)
- May suggest keeping it minimal
- Educates on testing different copy in Ads Manager

---

## ✅ Test 5: Logo Request
**Goal**: Test branding guidance

**Prompt:**
```
Make an Instagram ad for my restaurant with our logo in the corner
```

**Expected Behavior:**
- Asks about logo details and restaurant concept
- Guides on subtle, non-intrusive placement
- Explains safe zone requirements
- Suggests which corner works best
- Maintains educational tone

---

## ✅ Test 6: Product Photography
**Goal**: Test composition understanding

**Prompt:**
```
Create a product shot of wireless headphones for Instagram feed
```

**Expected Behavior:**
- Suggests square format (1080×1080)
- Mentions rule of thirds or centered composition
- Recommends neutral background
- Explains mobile-optimized framing
- Asks about brand name for preview

---

## ✅ Test 7: Image Editing
**Goal**: Test edit functionality with guardrails

**Prompt (after generating an image):**
```
Make the background brighter and add more natural lighting
```

**Expected Behavior:**
- Uses editImage tool appropriately
- Maintains Meta's native aesthetic in edit
- Keeps composition principles intact
- Explains the enhancement choices

---

## ✅ Test 8: Multiple Format Request
**Goal**: Test both format generation

**Prompt:**
```
Create ads for both feed and Stories showing a family enjoying a vacation
```

**Expected Behavior:**
- Recognizes need for two formats:
  - Square (1080×1080) for feed
  - Vertical (1080×1920) for Stories
- Explains how composition will adapt
- Maintains same concept across formats
- Ensures no stretching/distortion

---

## ✅ Test 9: Industry-Specific
**Goal**: Test context awareness

**Prompt:**
```
I need a real estate ad for a luxury apartment listing
```

**Expected Behavior:**
- Asks about property details
- Suggests showcasing space effectively
- Recommends natural lighting emphasis
- Maintains authentic, non-stock photo aesthetic
- May suggest multiple angle options

---

## ✅ Test 10: Conversational Guidance
**Goal**: Test natural, brief guidance

**Prompt:**
```
Why shouldn't I put text all over my ad image?
```

**Expected Behavior:**
- Brief, conversational explanation
- Natural tone, not overly educational
- Mentions A/B testing flexibility and platform UI
- Keeps it short and actionable
- Friendly expert tone

---

## 🔍 Visual Quality Checks

When images are generated, verify:

### ✅ Composition
- [ ] Subject is clearly visible
- [ ] Uses rule of thirds OR centered appropriately
- [ ] Balanced framing for mobile viewing

### ✅ Style
- [ ] Looks realistic, not stock photo
- [ ] Natural lighting and colors
- [ ] Authentic, not overly staged

### ✅ Safe Zones
- [ ] Clear margins around edges (approximately 10-12%)
- [ ] Important elements not too close to borders
- [ ] Text (if any) has breathing room

### ✅ Format
- [ ] Correct aspect ratio (1:1 for square, 9:16 for vertical)
- [ ] No stretching or distortion
- [ ] Key elements visible in both formats (if generated)

### ✅ Meta Native Aesthetic
- [ ] Doesn't look like a traditional ad
- [ ] Clean, uncluttered composition
- [ ] Would fit naturally in Meta feed
- [ ] No heavy graphic design elements

### ✅ Default Behavior
- [ ] Text-free (unless explicitly requested)
- [ ] No logos (unless explicitly requested)
- [ ] No watermarks
- [ ] Ready for immediate use

---

## 🚨 Red Flags (Things That Shouldn't Happen)

If you see these, the guardrails may not be working:

- ❌ Generic "I'm an AI assistant" response (should be Meta Marketing Pro)
- ❌ Images with heavy text overlays by default
- ❌ Stock photo aesthetic (fake-looking, overly staged)
- ❌ Cluttered compositions with too many elements
- ❌ Banner-style layouts with heavy borders
- ❌ Images that look like traditional print ads
- ❌ Stretched or distorted images
- ❌ Text or logos placed at extreme edges
- ❌ No educational context or explanation
- ❌ Just generates without asking clarifying questions

---

## 🎯 Advanced Testing Scenarios

### Scenario 1: Iterative Refinement
```
1. "Create a coffee shop ad"
2. [After generation] "Make it more cozy and warm"
3. "Add a person in the background"
4. "Can we make this work for Stories too?"
```

**Check**: AI maintains context, provides guidance at each step

### Scenario 2: Brand Consistency
```
1. "Create an ad for my fitness brand, FitLife"
2. [After generation] "Create another one with a different scene but same vibe"
```

**Check**: Remembers brand name, maintains consistent aesthetic

### Scenario 3: Format Comparison
```
"Show me how the same concept looks in both feed and Stories format"
```

**Check**: Generates both, explains adaptation choices

### Scenario 4: Complex Request
```
"I need a full ad creative for my new sustainable fashion line targeting Gen Z on Instagram. The ad should show our eco-friendly materials and connect with environmentally conscious consumers."
```

**Check**: Asks strategic questions, provides creative direction, explains choices

---

## 📊 Testing Checklist

Before considering testing complete:

- [ ] AI identifies as Meta Marketing Pro
- [ ] Educational tone maintained throughout
- [ ] Asks clarifying questions before generating
- [ ] Explains visual choices and why they matter
- [ ] Generates text-free images by default
- [ ] Guides on safe zones when text requested
- [ ] Suggests both formats when appropriate
- [ ] Images follow super-realistic, natural aesthetic
- [ ] Compositions are mobile-optimized
- [ ] Edit functionality maintains guardrails
- [ ] Consistent experience across multiple conversations
- [ ] No linter errors in console
- [ ] Images save correctly to /public folder
- [ ] Preview component displays properly

---

## 🐛 Debugging Tips

### If AI doesn't maintain identity:
1. Check `app/api/chat/route.ts` - verify system prompt is loaded
2. Clear browser cache and restart dev server
3. Test with a fresh conversation

### If images don't follow visual guidelines:
1. Check `server/images.ts` - verify `enhancePromptWithMetaGuardrails` is called
2. Review generated image in `/public` folder
3. Check console for any errors during generation

### If safe zone guidance isn't working:
1. Verify tool description in `tools/generate-image-tool.ts`
2. Test with explicit text requests
3. Check that system prompt includes safe zone instructions

### If getting errors:
1. Check terminal for error messages
2. Verify all environment variables are set
3. Ensure Gemini API key is valid
4. Check network requests in browser dev tools

---

## 📞 Quick Test Command

Run through all basic tests quickly:

```
1. "Hi, what do you do?"
2. "Create a coffee shop ad"
3. "Make a Stories ad for fitness"
4. "Add text saying 'New Arrival' to an ad"
5. "Why should I keep my ad images text-free?"
```

This 5-prompt sequence covers: identity, generation, formats, text guidance, and education.

**Expected completion time**: ~5 minutes

---

## ✅ Success Criteria

Your implementation is working correctly if:

1. ✅ Meta Marketing Pro identity is consistent
2. ✅ Visual quality matches Meta's native aesthetic
3. ✅ Safe zones are respected (10-12% margins)
4. ✅ Educational guidance is provided
5. ✅ Images are text-free and unbranded by default
6. ✅ Format awareness (square vs vertical)
7. ✅ Composition follows best practices
8. ✅ No linter errors
9. ✅ Smooth user experience
10. ✅ Edit functionality maintains guardrails

---

**Happy Testing! 🚀**

If all tests pass, your Meta Marketing Pro implementation is production-ready.

