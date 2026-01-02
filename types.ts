
export enum AppStep {
  LANDING = 'LANDING',
  OUTLINE = 'OUTLINE',
  GENERATING = 'GENERATING',
  PREVIEW = 'PREVIEW',
}

export enum ImageSize {
  SIZE_1K = '1K',
  SIZE_2K = '2K',
  SIZE_4K = '4K',
}

export type Language = 'English' | 'Chinese';
export type ExportFormat = 'pptx' | 'pdf';
export type PresentationFormat = 'detailed' | 'presenter';
export type ModelTier = 'efficient' | 'quality';

export interface ChartData {
  label: string;
  value: number;
}

export interface Callout {
  text: string;
  value: string;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

export interface AdvancedChartConfig {
  type: 'composed' | 'pie' | 'treemap' | 'bar-horizontal'; 
  data: any[];
  xAxisKey?: string;
  series: {
    dataKey: string;
    name: string;
    type: 'bar' | 'line' | 'area' | 'cell';
    color?: string;
  }[];
  callouts?: Callout[];
}

export interface TimelineStep {
  date: string;
  title: string;
  description: string;
}

export interface GridItem {
  title: string;
  description: string;
  icon?: string;
}

export interface ProcessStep {
  title: string;
  description: string;
  subPoints?: string[];
}

export interface ComparisonItem {
  feature: string;
  myth: string;
  reality: string;
  realityValue?: string;
}

export interface Slide {
  id: string;
  title: string;
  subtitle?: string; // Leading summary text
  layout: 'title' | 'content' | 'two-column' | 'image' | 'image-center' | 'image-full' | 'data' | 'quote' | 'timeline' | 'grid' | 'big-number' | 'process' | 'comparison' | 'hierarchy' | 'map' | 'case-study';
  contentPoints: string[];
  imagePrompt?: string;
  imageUrl?: string | null;
  speakerNotes?: string;
  
  // Advanced Visual Data
  timelineSteps?: TimelineStep[];
  gridItems?: GridItem[];
  processSteps?: ProcessStep[];
  comparisonItems?: ComparisonItem[];
  bigNumber?: string;
  bigNumberLabel?: string;
  quoteAuthor?: string;
  
  chartData?: ChartData[];
  chartType?: 'bar' | 'line' | 'pie';
  advancedChartConfig?: AdvancedChartConfig;
  callouts?: Callout[]; // Unified callouts
  
  // Footer Conclusion
  conclusion?: string;
}

export interface VisualTheme {
  id: string;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  secondaryColor: string;
  fontFamily: string;
  isDark: boolean;
}

export interface AnalyzedStyle {
  description: string;
  colors: {
    backgroundColor: string;
    textColor: string;
    accentColor: string;
    secondaryColor: string;
    isDark: boolean;
  };
}

export interface OutlineItem {
  id: string;
  title: string;
  intent: string;
}
