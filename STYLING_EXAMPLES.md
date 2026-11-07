# Styling Examples

Quick reference for using the universal styling system.

## Component Template

```typescript
import React from 'react';
import { useResponsive } from '../hooks/useResponsive';
import { commonStyles } from '../styles/commonStyles';
import { theme } from '../styles/theme';

export default function MyComponent(): React.ReactElement {
  const { isMobile } = useResponsive();

  return (
    <div style={commonStyles.container(isMobile)}>
      <h1 style={commonStyles.heading1(isMobile)}>My Title</h1>
      <p style={commonStyles.label(isMobile)}>Some text</p>
    </div>
  );
}
```

## Common Patterns

### Responsive Container
```typescript
<div style={commonStyles.container(isMobile)}>
  {/* Full width with responsive padding and max-width */}
</div>
```

### Flex Layouts
```typescript
// Column layout
<div style={commonStyles.flexColumn(theme.spacing.md)}>
  <Item />
  <Item />
</div>

// Row layout
<div style={commonStyles.flexRow(theme.spacing.lg, 'center')}>
  <Item />
  <Item />
</div>

// Centered flex
<div style={commonStyles.flexCenter()}>
  <Item />
</div>
```

### Responsive Layouts
```typescript
// Stack on mobile, side-by-side on desktop
<div style={isMobile ? commonStyles.flexColumn(theme.spacing.md) 
                    : commonStyles.flexRow(theme.spacing.lg, 'center')}>
  <Item />
  <Item />
</div>
```

### Form Elements
```typescript
// Input
<input style={commonStyles.input(isMobile)} placeholder="Enter text" />

// Button - Primary
<button style={commonStyles.button(isMobile, 'primary')}>
  Primary Button
</button>

// Button - Secondary
<button style={commonStyles.button(isMobile, 'secondary')}>
  Secondary Button
</button>
```

### Headings & Text
```typescript
// Large heading
<h1 style={commonStyles.heading1(isMobile)}>Page Title</h1>

// Section heading
<h3 style={commonStyles.heading3(isMobile)}>Section Title</h3>

// Label (bold)
<label style={commonStyles.label(isMobile, true)}>Form Label</label>

// Label (normal)
<label style={commonStyles.label(isMobile)}>Regular Label</label>

// Muted text
<p style={commonStyles.muted()}>Muted text color</p>
```

### Canvas Preview
```typescript
<div style={commonStyles.canvas(isMobile, theme.colors.background)}>
  <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
</div>
```

### Code Block
```typescript
<div style={commonStyles.codeBlock(isMobile)}>
  {codes.map((code, i) => (
    <div key={i} style={commonStyles.codeText(isMobile)}>
      {code}
    </div>
  ))}
</div>
```

## Using Theme Values Directly

```typescript
// Colors
style={{ color: theme.colors.primary }}
style={{ backgroundColor: theme.colors.surface }}
style={{ borderColor: theme.colors.border }}

// Spacing
style={{ padding: theme.spacing.md }}
style={{ gap: theme.spacing.lg }}
style={{ marginTop: theme.spacing.xl }}

// Font sizes
style={{ fontSize: theme.fontSizes.sm }}
style={{ fontSize: isMobile ? theme.fontSizes.h1 : theme.fontSizes.h1Lg }}

// Border radius
style={{ borderRadius: theme.borderRadius.sm }}
```

## Combining Styles

```typescript
// Merge multiple style objects
<div style={{
  ...commonStyles.flexColumn(theme.spacing.md),
  backgroundColor: theme.colors.surface,
  padding: theme.spacing.lg,
  borderRadius: theme.borderRadius.md
}}>
  {/* content */}
</div>
```

## Conditional Styling

```typescript
// Simple conditional
<div style={isMobile ? 
  commonStyles.flexColumn(theme.spacing.sm) 
  : commonStyles.flexRow(theme.spacing.lg)}>
  {/* content */}
</div>

// With merged styles
<div style={{
  ...commonStyles.container(isMobile),
  backgroundColor: isActive ? theme.colors.primary : theme.colors.background
}}>
  {/* content */}
</div>
```

## Custom Style with Theme

```typescript
const customStyle = {
  ...commonStyles.flexColumn(theme.spacing.md),
  backgroundColor: theme.colors.surface,
  padding: isMobile ? theme.spacing.md : theme.spacing.lg,
  borderRadius: theme.borderRadius.sm,
  borderLeft: `4px solid ${theme.colors.primary}`
};

<div style={customStyle}>{/* content */}</div>
```

## Tips

- Always pass `isMobile` to responsive style functions
- Use `theme` constants instead of hardcoding values
- Combine style objects with `...` spread operator
- For complex layouts, consider creating a custom style utility function
- Keep mobile-first approach: style for mobile, then enhance for desktop

## Responsive Hook Usage

```typescript
const { isMobile, windowWidth } = useResponsive();

// Use isMobile for conditional styling
// Use windowWidth for more granular control if needed

if (windowWidth < 480) {
  // Extra small phone
} else if (isMobile) {
  // Mobile (< 768px)
} else {
  // Desktop (≥ 768px)
}
```

## Container Width Hook

```typescript
const containerRef = React.useRef<HTMLDivElement>(null);
const containerWidth = useContainerWidth(containerRef);

// Use containerWidth to scale canvas or other elements
const scale = Math.min(containerWidth / baseWidth);

<div ref={containerRef}>
  <canvas width={baseWidth * scale} />
</div>
```
