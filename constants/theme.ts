export const theme = {
  bg: '#0a0a0a',
  card: '#141414',
  card2: '#1e1e1e',
  accent: '#7C3AED',
  accentLight: '#A78BFA',
  success: '#10B981',
  successBg: 'rgba(16, 185, 129, 0.15)',
  danger: '#EF4444',
  dangerBg: 'rgba(239, 68, 68, 0.15)',
  warning: '#F59E0B',
  text: '#FFFFFF',
  textMuted: '#6B7280',
  textSecondary: '#9CA3AF',
  border: '#262626',
  borderLight: '#333333',
} as const;

export type AppTheme = typeof theme;
