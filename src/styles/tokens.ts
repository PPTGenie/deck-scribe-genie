
// Design System Tokens
export const tokens = {
  colors: {
    light: {
      primary: '#6366F1', // Indigo 600
      accent: '#0EA5E9',  // Sky 500
      success: '#10B981', // Emerald 500
      error: '#F43F5E',   // Rose 500
      neutrals: {
        900: '#111827',
        800: '#1F2937',
        700: '#374151',
        600: '#4B5563',
        500: '#6B7280',
        400: '#9CA3AF',
        300: '#D1D5DB',
        200: '#E5E7EB',
        100: '#F3F4F6',
        50: '#F9FAFB',
      }
    },
    dark: {
      primary: '#7C3AED', // Primary +8% brightness
      accent: '#06B6D4',  // Accent +8% brightness  
      success: '#059669', // Success +8% brightness
      error: '#DC2626',   // Error +8% brightness
      neutrals: {
        50: '#111827',   // Flipped for dark mode
        100: '#1F2937',
        200: '#374151',
        300: '#4B5563',
        400: '#6B7280',
        500: '#9CA3AF',
        600: '#D1D5DB',
        700: '#E5E7EB',
        800: '#F3F4F6',
        900: '#F9FAFB',
      }
    }
  },
  spacing: {
    grid: '8px',
    subGrid: '4px',
    gutter: '24px',
    cardGap: '16px',
  },
  typography: {
    fontFamily: 'Inter',
    rootSize: {
      desktop: '15px',
      mobile: '14px'
    },
    scale: 1.333
  },
  motion: {
    duration: '200ms',
    easeOut: 'cubic-bezier(0.22, 1, 0.36, 1)',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)'
  },
  shadows: {
    card: '0 1px 3px rgba(0, 0, 0, 0.06), 0 4px 6px rgba(0, 0, 0, 0.08)',
    cardHover: '0 4px 12px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.08)'
  }
} as const;
