import { CSSProperties } from 'react';
import { theme } from './theme';

export interface ResponsiveStyles {
  mobile: CSSProperties;
  desktop: CSSProperties;
}

export const createResponsiveStyle = (mobile: CSSProperties, desktop: CSSProperties, isMobile: boolean): CSSProperties => {
  return isMobile ? mobile : desktop;
};

// Common reusable styles
export const commonStyles = {
  // Layout
  flexColumn: (gap?: number): CSSProperties => ({
    display: 'flex',
    flexDirection: 'column',
    gap: gap || theme.spacing.md,
  }),

  flexRow: (gap?: number, align?: 'center' | 'flex-start' | 'flex-end'): CSSProperties => ({
    display: 'flex',
    flexDirection: 'row',
    gap: gap || theme.spacing.md,
    alignItems: align || 'center',
  }),

  flexCenter: (gap?: number): CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: gap || theme.spacing.md,
  }),

  // Container
  container: (isMobile: boolean): CSSProperties => ({
    fontFamily: 'system-ui,Segoe UI,Roboto',
    padding: isMobile ? theme.spacing.md : theme.spacing.xxl,
    maxWidth: isMobile ? '100%' : 600,
    margin: '0 auto',
    minHeight: '100vh',
  }),

  // Form elements
  input: (isMobile: boolean): CSSProperties => ({
    width: '100%',
    padding: isMobile ? theme.spacing.md : theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    border: `1px solid ${theme.colors.border}`,
    fontSize: isMobile ? theme.fontSizes.sm : theme.fontSizes.sm,
    boxSizing: 'border-box',
  }),

  button: (isMobile: boolean, variant: 'primary' | 'secondary' = 'primary'): CSSProperties => ({
    padding: isMobile ? theme.spacing.lg : theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    background: variant === 'primary' ? theme.colors.primary : theme.colors.secondary,
    color: theme.colors.background,
    border: 'none',
    width: isMobile ? '100%' : 'auto',
    fontSize: theme.fontSizes.sm,
    fontWeight: 600,
  }),

  // Text
  heading1: (isMobile: boolean): CSSProperties => ({
    fontSize: isMobile ? theme.fontSizes.h1 : theme.fontSizes.h1Lg,
    marginBottom: theme.spacing.xs,
    lineHeight: 1.2,
  }),

  heading3: (isMobile: boolean): CSSProperties => ({
    marginTop: isMobile ? theme.spacing.md : theme.spacing.lg,
    fontSize: isMobile ? theme.fontSizes.h3 : theme.fontSizes.h3Lg,
    marginBottom: theme.spacing.sm,
  }),

  label: (isMobile: boolean, bold = false): CSSProperties => ({
    fontSize: isMobile ? theme.fontSizes.xs : theme.fontSizes.sm,
    fontWeight: bold ? 600 : 400,
  }),

  muted: (): CSSProperties => ({
    fontSize: theme.fontSizes.sm,
    color: theme.colors.textMuted,
  }),

  // Card/Box
  card: (isMobile: boolean): CSSProperties => ({
    borderRadius: theme.borderRadius.sm,
    overflow: 'hidden',
    background: theme.colors.background,
  }),

  // Canvas containers — square display (1:1) by default
  canvas: (isMobile: boolean, bgColor?: string): CSSProperties => ({
    width: '100%',
    maxWidth: isMobile ? '100%' : 400,
    aspectRatio: '1',
    overflow: 'hidden',
    background: bgColor || theme.colors.background,
    margin: '0 auto',
  }),

  // Code block
  codeBlock: (isMobile: boolean): CSSProperties => ({
    maxHeight: isMobile ? 250 : 200,
    overflow: 'auto',
    background: theme.colors.surface,
    padding: isMobile ? theme.spacing.lg : theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing.lg,
  }),

  codeText: (isMobile: boolean): CSSProperties => ({
    fontFamily: 'monospace',
    fontSize: isMobile ? theme.fontSizes.xs : theme.fontSizes.sm,
    marginBottom: theme.spacing.xs,
    wordBreak: 'break-all',
  }),
};

// Spacing utilities
export const getSpacing = (isMobile: boolean, key: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl'): number => {
  return theme.spacing[key];
};

// Font size utilities
export const getFontSize = (isMobile: boolean, key: keyof typeof theme.fontSizes): number => {
  return theme.fontSizes[key];
};
