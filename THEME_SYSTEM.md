# Global Theme System Documentation

## Overview

This project uses a centralized, semantic theme system that automatically handles light and dark modes across all components. The system is built on CSS custom properties (CSS variables) and Tailwind CSS utilities.

## Architecture

### 1. Core Theme Files

- **`app/globals.css`** - Contains all theme token definitions
- **Tailwind Config** - Automatically picks up theme tokens via `@theme inline`

### 2. Theme Token Structure

#### Base Tokens (Automatically handled)
- `--background` / `bg-background` - Main page background
- `--foreground` / `text-foreground` - Main text color
- `--card` / `bg-card` - Card/panel surfaces
- `--card-foreground` / `text-card-foreground` - Card text
- `--popover` / `bg-popover` - Dropdown/popover backgrounds
- `--muted` / `bg-muted` - Subtle background areas
- `--muted-foreground` / `text-muted-foreground` - Secondary text
- `--accent` / `bg-accent` - Hover states
- `--border` / `border-border` - Border colors
- `--input` / `border-input` - Input border colors

#### App-Specific Semantic Tokens
- `--chat-panel` / `bg-chat-panel` - Left chat panel background
- `--preview-panel` / `bg-preview-panel` - Right preview panel background
- `--panel-header` / `bg-panel-header` - Panel header backgrounds

## Utility Classes

The theme system includes helper classes for common patterns:

### Component Utilities

```css
.panel-surface {
  @apply bg-card text-card-foreground border-border;
}

.hover-surface {
  @apply hover:bg-accent hover:text-accent-foreground;
}

.input-surface {
  @apply bg-background border-input text-foreground;
}

.dropdown-surface {
  @apply bg-popover text-popover-foreground border-border;
}
```

## Usage Guidelines

### ✅ DO: Use Semantic Theme Classes

```tsx
// Good - Theme-aware
<div className="bg-background text-foreground">
<div className="bg-card border-border">
<button className="hover-surface">
<input className="input-surface">
```

### ❌ DON'T: Use Hardcoded Colors

```tsx
// Bad - Not theme-aware
<div className="bg-white text-gray-900">
<div className="bg-gray-50 border-gray-300">
<button className="hover:bg-gray-100">
```

## Component-Specific Patterns

### Panels and Surfaces

```tsx
// Main containers
<div className="bg-background text-foreground">

// Cards and sections
<div className="panel-surface">

// Chat panel (left side)
<div className="bg-chat-panel text-chat-panel-foreground">

// Preview panel (right side)
<div className="bg-preview-panel text-preview-panel-foreground">
```

### Headers and Navigation

```tsx
// Panel headers
<div className="bg-panel-header text-panel-header-foreground border-b border-border">
```

### Interactive Elements

```tsx
// Buttons with hover
<button className="hover-surface">

// Dropdowns
<div className="dropdown-surface shadow-lg">

// Inputs
<input className="input-surface">
```

### Tab Colors (Colored Indicators)

For colored tab indicators that need to work in both themes:

```tsx
const TAB_COLORS = {
  preview: {
    bg: "bg-slate-500/10 dark:bg-slate-500/20",
    text: "text-slate-600 dark:text-slate-400",
    border: "border-slate-500"
  },
  // Use dark: prefix for dark mode variants
}
```

## Customizing the Theme

### Changing Colors

Edit `app/globals.css` to customize colors:

```css
:root {
  /* Light mode colors */
  --background: oklch(1 0 0);  /* Pure white */
  --foreground: oklch(0.147 0.004 49.25);  /* Near black */
  
  /* App-specific */
  --chat-panel: oklch(0.98 0.001 106.424);  /* Light gray */
  --preview-panel: oklch(1 0 0);  /* White */
}

.dark {
  /* Dark mode colors */
  --background: oklch(0.147 0.004 49.25);  /* Near black */
  --foreground: oklch(0.985 0.001 106.423);  /* Near white */
  
  /* App-specific */
  --chat-panel: oklch(0.18 0.006 56.043);  /* Dark gray */
  --preview-panel: oklch(0.147 0.004 49.25);  /* Near black */
}
```

### Adding New Semantic Tokens

1. Add CSS variable in `globals.css`:
```css
@theme inline {
  --color-my-token: var(--my-token);
}

:root {
  --my-token: oklch(/* light mode color */);
}

.dark {
  --my-token: oklch(/* dark mode color */);
}
```

2. Use in components:
```tsx
<div className="bg-my-token text-my-token-foreground">
```

## Migration Pattern

When updating old components:

1. **Identify hardcoded colors:**
   - `bg-white` → `bg-background` or `bg-card`
   - `bg-gray-50` → `bg-muted`
   - `text-gray-500` → `text-muted-foreground`
   - `text-gray-900` → `text-foreground`
   - `border-gray-300` → `border-border`
   - `hover:bg-gray-100` → `hover-surface` or `hover:bg-accent`

2. **Replace with semantic classes**
3. **Test in both light and dark modes**

## Testing

Toggle between themes to verify:

1. Click the theme switcher in the preview panel header
2. Check all components render correctly
3. Verify hover states work
4. Confirm dropdowns and modals are readable

## Benefits

✅ **Centralized Control** - Change app-wide colors in one place
✅ **Automatic Dark Mode** - All components adapt automatically  
✅ **Consistent UI** - Semantic tokens ensure visual consistency
✅ **Scalable** - Easy to add new theme tokens as needed
✅ **Maintainable** - No scattered hardcoded colors

## Components Updated

- ✅ `components/dashboard.tsx`
- ✅ `components/preview-panel.tsx`
- ✅ `components/location-targeting.tsx`
- ✅ `components/project-dropdown.tsx`
- ✅ `components/ui/slider.tsx`
- ✅ All AI Elements components (already theme-aware)

## Future Enhancements

Consider adding:
- Color scheme picker (multiple themes)
- Per-user theme preferences
- High contrast mode
- Custom accent color picker

