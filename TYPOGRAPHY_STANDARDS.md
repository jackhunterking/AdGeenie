# Typography Standards

This document outlines the standardized typography system applied across all tabs and components in the AI Elements application.

## Typography Hierarchy

### 1. Page Titles (Main Headings)
- **Class**: `text-2xl font-bold`
- **Usage**: Main canvas/tab titles
- **Examples**: 
  - "Location Targeting"
  - "Audience Targeting"
  - "Goal"
  - "Results"

### 2. Page Subtitles (Main Descriptions)
- **Class**: `text-sm text-muted-foreground`
- **Usage**: Description text directly under main page titles
- **Examples**: 
  - "Ask AI to set your location, or choose one manually below."
  - "View your campaign performance and collected leads"

### 3. Section Headings
- **Class**: `text-lg font-semibold`
- **Usage**: Section titles within a page, major card headings
- **Examples**: 
  - "Included" / "Excluded" location sections
  - "Leads" / "Analytics" in results tab
  - Card titles like "AI-Assisted", "Manual Selection"

### 4. Subsection Headings
- **Class**: `text-base font-semibold`
- **Usage**: Smaller section headings, form labels
- **Examples**: 
  - "Goal Configuration"
  - "Target Location"
  - "Generate" / "With" sections in goal tab

### 5. Body Text (Standard)
- **Class**: `text-sm`
- **Usage**: Regular body text, descriptions, list items
- **Examples**: 
  - Location names in cards
  - Caption text
  - Form descriptions

### 6. Body Text (Emphasized)
- **Class**: `text-sm font-semibold` or `text-sm font-medium`
- **Usage**: Emphasized regular text
- **Examples**: 
  - "Your Brand Name" in feed preview
  - Active state text

### 7. Caption / Meta Text
- **Class**: `text-xs text-muted-foreground`
- **Usage**: Small descriptive text, metadata, helper text
- **Examples**: 
  - "Sponsored" label
  - "Province/Region" location type
  - "Ads will show here" helper text
  - Form hints

### 8. Badge Text
- **Class**: `text-xs` (inside Badge component)
- **Usage**: All badges showing counts or status
- **Examples**: 
  - Location count badges
  - Lead count badges
  - Status badges

### 9. Button Text
- **Class**: Default button text sizes maintained
- **Usage**: All button labels
- **Note**: Button component handles sizing internally

### 10. Large Display Text (Preview Content)
- **Class**: `text-lg` to `text-2xl font-bold`
- **Usage**: Headlines within preview mockups
- **Examples**: 
  - "Your Ad Content" in feed preview
  - "Your Story" in story preview
  - "Your Reel" in reel preview

### 11. Budget Display
- **Class**: `text-xl font-bold`
- **Usage**: Daily budget amount display
- **Example**: "$20" budget display

## Spacing Standards

### Heading Groups
- Use `space-y-2` for title + subtitle groups
- Use `space-y-3` for larger spacing (deprecated, standardized to space-y-2)

### Content Sections
- Use `space-y-4` for major section spacing
- Use `space-y-2` for content within sections

## Implementation Notes

1. **Consistency**: All tabs now use the same typography hierarchy
2. **Readability**: Reduced extreme size variations (no more `text-3xl` for regular pages)
3. **Hierarchy**: Clear visual hierarchy with 3-4 main levels (2xl → lg → base → sm → xs)
4. **Accessibility**: Maintained proper contrast with `text-muted-foreground` for secondary text

## Files Updated

- `components/location-selection-canvas.tsx`
- `components/audience-selection-canvas.tsx`
- `components/goal-selection-canvas.tsx`
- `components/results-tab.tsx`
- `components/preview-panel.tsx`
- `components/budget-tab.tsx`
- `components/location-targeting.tsx`
- `components/goal-tab.tsx`

## Before & After Examples

### Page Titles
- **Before**: Mix of `text-3xl`, `text-2xl`, `text-xl`
- **After**: Consistent `text-2xl`

### Section Headings
- **Before**: Mix of `text-xl`, `text-base`, `text-lg`
- **After**: Consistent `text-lg` for major sections, `text-base` for subsections

### Body Text
- **Before**: Mix of default size, `text-sm`, `text-xs`, `text-[10px]`
- **After**: Consistent `text-sm` for body, `text-xs` for captions

### Badges
- **Before**: Default badge size (inconsistent)
- **After**: Explicit `text-xs` for all badges

