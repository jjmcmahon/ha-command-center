/**
 * JJ McMahon design language — dark theme with neon accents
 * Matches the Command Center aesthetic.
 */

export const theme = {
  colors: {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a2e',
    bgCardHover: '#22223a',
    neonGreen: '#00ff88',
    neonCyan: '#00d4ff',
    neonPurple: '#b44aff',
    neonOrange: '#ff6b35',
    neonPink: '#ff3399',
    statusOnline: '#00ff88',
    statusOffline: '#ff4444',
    statusWarning: '#ffaa00',
    statusIdle: '#666680',
    textPrimary: '#e8e8f0',
    textSecondary: '#8888a0',
    textMuted: '#555570',
    borderDefault: '#2a2a40',
    borderGlow: 'rgba(0, 255, 136, 0.3)',
  },
  fonts: {
    heading: "'Inter', 'SF Pro Display', system-ui, sans-serif",
    body: "'Inter', 'SF Pro Text', system-ui, sans-serif",
    mono: "'JetBrains Mono', 'Fira Code', monospace",
  },
  radii: {
    sm: '6px',
    md: '12px',
    lg: '16px',
    xl: '24px',
  },
  shadows: {
    card: '0 4px 24px rgba(0, 0, 0, 0.4)',
    glow: (color: string) => `0 0 20px ${color}40, 0 0 40px ${color}20`,
    neonGreen: '0 0 20px rgba(0, 255, 136, 0.25)',
    neonCyan: '0 0 20px rgba(0, 212, 255, 0.25)',
  },
} as const;

export type Theme = typeof theme;
