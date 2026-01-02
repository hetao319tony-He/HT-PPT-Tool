import { VisualTheme } from './types';

export interface StylePreset {
  id: string;
  name: string;
  description: string; // Used for Gemini prompt context
  theme: VisualTheme;
  previewColor: string;
}

export const PRESET_STYLES: StylePreset[] = [
  // --- PPTX Compatible (First 5) ---
  {
    id: 'corporate-light',
    name: 'Corporate Light',
    description: 'Clean, professional, white background with deep blue accents. Minimalist and readable.',
    previewColor: '#ffffff',
    theme: {
      id: 'corporate-light',
      backgroundColor: '#FFFFFF',
      textColor: '#1f2937',
      accentColor: '#1e40af', // Blue-800
      secondaryColor: '#f3f4f6',
      fontFamily: 'Inter, sans-serif',
      isDark: false
    }
  },
  {
    id: 'corporate-dark',
    name: 'Tech Dark',
    description: 'Modern dark mode, sleek, high contrast with neon purple accents. Technology focused.',
    previewColor: '#18181b',
    theme: {
      id: 'corporate-dark',
      backgroundColor: '#18181b', // Zinc-950
      textColor: '#f4f4f5',
      accentColor: '#8b5cf6', // Violet-500
      secondaryColor: '#27272a',
      fontFamily: 'Inter, sans-serif',
      isDark: true
    }
  },
  {
    id: 'nature-forest',
    name: 'Forest Green',
    description: 'Eco-friendly, calming green tones, off-white background. Sustainable and organic.',
    previewColor: '#ecfdf5',
    theme: {
      id: 'nature-forest',
      backgroundColor: '#ecfdf5', // Green-50
      textColor: '#064e3b', // Green-900
      accentColor: '#059669', // Green-600
      secondaryColor: '#d1fae5',
      fontFamily: 'Inter, sans-serif',
      isDark: false
    }
  },
  {
    id: 'slate-minimal',
    name: 'Slate Minimal',
    description: 'Serious, slate grey monochrome, very structured and austere. Financial and data-heavy.',
    previewColor: '#f8fafc',
    theme: {
      id: 'slate-minimal',
      backgroundColor: '#f8fafc', // Slate-50
      textColor: '#0f172a', // Slate-900
      accentColor: '#475569', // Slate-600
      secondaryColor: '#e2e8f0',
      fontFamily: 'Inter, sans-serif',
      isDark: false
    }
  },
  {
    id: 'navy-gold',
    name: 'Executive Navy',
    description: 'Premium, deep navy background with gold/yellow accents. Trustworthy and executive.',
    previewColor: '#172554',
    theme: {
      id: 'navy-gold',
      backgroundColor: '#172554', // Blue-950
      textColor: '#ffffff',
      accentColor: '#facc15', // Yellow-400
      secondaryColor: '#1e3a8a',
      fontFamily: 'Inter, sans-serif',
      isDark: true
    }
  },
  // --- PDF Only (Additional 5) ---
  {
    id: 'sunset-warm',
    name: 'Warm Sunset',
    description: 'Warm gradients, orange and red tones. Energetic, creative, and bold.',
    previewColor: '#fff7ed',
    theme: {
      id: 'sunset-warm',
      backgroundColor: '#fff7ed', // Orange-50
      textColor: '#7c2d12', // Orange-900
      accentColor: '#ea580c', // Orange-600
      secondaryColor: '#ffedd5',
      fontFamily: 'Inter, sans-serif',
      isDark: false
    }
  },
  {
    id: 'luxury-serif',
    name: 'Luxury Serif',
    description: 'High-end fashion style, serif fonts, stark black and white. Elegant and timeless.',
    previewColor: '#000000',
    theme: {
      id: 'luxury-serif',
      backgroundColor: '#000000',
      textColor: '#FFFFFF',
      accentColor: '#e5e5e5', // Light gray
      secondaryColor: '#262626',
      fontFamily: 'Times New Roman, serif', // PDF/Web only support usually
      isDark: true
    }
  },
  {
    id: 'vibrant-pop',
    name: 'Vibrant Pop',
    description: 'Punchy pinks and cyans. Youthful, startup-vibe, and attention-grabbing.',
    previewColor: '#fdf2f8',
    theme: {
      id: 'vibrant-pop',
      backgroundColor: '#fdf2f8', // Pink-50
      textColor: '#831843', // Pink-900
      accentColor: '#db2777', // Pink-600
      secondaryColor: '#fce7f3',
      fontFamily: 'Inter, sans-serif',
      isDark: false
    }
  },
  {
    id: 'retro-paper',
    name: 'Retro Paper',
    description: 'Vintage paper texture color, brown text. Academic, historical, or craft feeling.',
    previewColor: '#fef3c7',
    theme: {
      id: 'retro-paper',
      backgroundColor: '#fef3c7', // Amber-100
      textColor: '#451a03', // Amber-900
      accentColor: '#d97706', // Amber-600
      secondaryColor: '#fde68a',
      fontFamily: 'Courier New, monospace',
      isDark: false
    }
  },
  {
    id: 'swiss-grid',
    name: 'Swiss Grid',
    description: 'International typographic style. Red and White. Clean, grid-based, objective.',
    previewColor: '#ef4444',
    theme: {
      id: 'swiss-grid',
      backgroundColor: '#ef4444', // Red-500
      textColor: '#ffffff',
      accentColor: '#ffffff',
      secondaryColor: '#f87171',
      fontFamily: 'Arial, sans-serif',
      isDark: true
    }
  }
];

export const DEFAULT_STYLE_ID = 'corporate-light';
