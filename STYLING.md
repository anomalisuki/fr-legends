# Styling Architecture

This project uses a centralized, utility-based styling system for clean, maintainable responsive design.

## Structure

### Core Files

- **`styles/theme.ts`** - Centralized theme constants (colors, spacing, font sizes, breakpoints)
- **`styles/commonStyles.ts`** - Reusable style utility functions
- **`styles/globalStyles.ts`** - Global CSS styles applied via styled-components
- **`hooks/useResponsive.ts`** - Custom hooks for responsive behavior
- **`pages/_app.tsx`** - App wrapper that applies global styles

## Key Features

### Theme Constants

All design values are defined once in `theme.ts`:

```typescript
theme.colors     // All colors used in the app
theme.spacing    // Consistent spacing scale (xs, sm, md, lg, xl, xxl)
theme.fontSizes  // All font sizes
theme.breakpoints // Responsive breakpoints (mobile: 768px)
```

### Common Styles

Pre-built style objects for common components:

```typescript
commonStyles.container()    // Main page container with responsive padding
commonStyles.flexColumn()   // Flex column with gap
commonStyles.flexRow()      // Flex row with gap and alignment
commonStyles.button()       // Buttons with variants
commonStyles.input()        // Form inputs
commonStyles.heading1()     // H1 with responsive sizing
commonStyles.label()        // Labels with optional bold
commonStyles.canvas()       // Canvas containers with responsive sizing
```

### Custom Hooks

#### `useResponsive()`

Tracks window width and returns isMobile boolean:

```typescript
const { isMobile, windowWidth } = useResponsive();
```

#### `useContainerWidth(ref)`

Uses ResizeObserver to track element container width:

```typescript
const containerWidth = useContainerWidth(canvasContainerRef);
```

## Usage Example

```typescript
import { useResponsive, useContainerWidth } from '../hooks/useResponsive';
import { commonStyles } from '../styles/commonStyles';
import { theme } from '../styles/theme';

export default function MyComponent() {
  const { isMobile } = useResponsive();

  return (
    <div style={commonStyles.container(isMobile)}>
      <h1 style={commonStyles.heading1(isMobile)}>Title</h1>
      <button style={commonStyles.button(isMobile, 'primary')}>Click</button>
    </div>
  );
}
```

## Adding New Styles

1. **Colors/Spacing/Sizes**: Add to `theme.ts`
2. **Reusable components**: Add function to `commonStyles.ts`
3. **Global CSS**: Add to `globalStyles.ts`

## Responsive Breakpoints

- **Mobile**: < 768px
- **Desktop**: ≥ 768px

The `isMobile` boolean from `useResponsive()` automatically handles conditional styling.
