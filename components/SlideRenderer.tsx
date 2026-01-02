
import React from 'react';
import { Slide, VisualTheme, Callout } from '../types';
import { clsx } from 'clsx';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, ComposedChart
} from 'recharts';
import { QuoteIcon, ProcessIcon, ImageIcon, TimelineIcon, GridIcon, HierarchyIcon, MapIcon, ComparisonIcon, CheckIcon, XIcon } from './Icons';

interface RendererProps {
  slide: Slide;
  theme: VisualTheme;
  width?: string;
  height?: string;
  disableAnimation?: boolean;
  onElementClick?: (data: any) => void;
}

export const DefaultTheme: VisualTheme = {
    id: 'corporate-light',
    backgroundColor: '#FFFFFF',
    textColor: '#1f2937',
    accentColor: '#1e40af',
    secondaryColor: '#f3f4f6',
    fontFamily: 'Inter, sans-serif',
    isDark: false
};

const GridOverlay: React.FC<{ color: string }> = ({ color }) => (
    <div className="absolute inset-0 pointer-events-none opacity-[0.05] z-0" style={{ 
        backgroundImage: `linear-gradient(${color} 1px, transparent 1px), linear-gradient(90deg, ${color} 1px, transparent 1px)`,
        backgroundSize: '40px 40px'
    }} />
);

const LogoHeader: React.FC = () => (
    <div className="absolute top-6 left-12 z-50 flex items-center gap-2">
        <div className="w-8 h-8 rounded bg-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-lg">LP</div>
        <span className="text-[10px] font-bold tracking-tighter uppercase opacity-40">LuminaPresent</span>
    </div>
);

export const SlideRenderer: React.FC<RendererProps> = ({ slide, theme, width = '100%', height = '100%', disableAnimation = false, onElementClick }) => {
    const renderLayout = () => {
        switch (slide.layout) {
            case 'title':
                return (
                    <div className="relative h-full w-full flex flex-col items-center justify-center p-20 text-center overflow-hidden">
                        <div className="absolute inset-0 z-0">
                            {slide.imageUrl && <img src={slide.imageUrl} className="w-full h-full object-cover opacity-80" alt="" />}
                            <div className="absolute inset-0 bg-gradient-to-b from-white/90 via-white/80 to-white dark:from-zinc-950/90 dark:via-zinc-950/80 dark:to-zinc-950" />
                        </div>
                        <GridOverlay color={theme.accentColor} />
                        <div className="relative z-10 space-y-8 max-w-5xl">
                            <div className="w-20 h-1 mx-auto bg-indigo-600 rounded-full" />
                            <h1 className="text-7xl font-black tracking-tight leading-[1.05]" style={{ color: theme.textColor }}>{slide.title}</h1>
                            <p className="text-2xl font-medium opacity-70 tracking-tight max-w-3xl mx-auto">{slide.subtitle || (slide.contentPoints && slide.contentPoints[0]) || ""}</p>
                        </div>
                    </div>
                );
            case 'data':
                const COLORS = [theme.accentColor, '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
                return (
                    <div className="h-full flex flex-col p-16 relative overflow-hidden">
                        <GridOverlay color={theme.accentColor} />
                        <h2 className="text-4xl font-black mb-10 tracking-tight" style={{ color: theme.textColor }}>{slide.title}</h2>
                        <div className="flex-1 relative bg-white/40 dark:bg-black/20 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-12">
                            <ResponsiveContainer width="100%" height="100%">
                                {slide.chartType === 'pie' ? (
                                    <PieChart>
                                        <Pie data={slide.chartData || []} dataKey="value" nameKey="label" innerRadius="60%" outerRadius="80%" paddingAngle={5}>
                                            {(slide.chartData || []).map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                ) : (
                                    <BarChart data={slide.chartData || []}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                                        <XAxis dataKey="label" stroke={theme.textColor} fontSize={12} />
                                        <YAxis stroke={theme.textColor} fontSize={12} />
                                        <Tooltip />
                                        <Bar dataKey="value" fill={theme.accentColor} radius={[6, 6, 0, 0]} />
                                    </BarChart>
                                )}
                            </ResponsiveContainer>
                        </div>
                    </div>
                );
            case 'grid':
                return (
                    <div className="h-full flex flex-col p-16 relative overflow-hidden">
                        <GridOverlay color={theme.accentColor} />
                        <h2 className="text-4xl font-black mb-12 tracking-tight">{slide.title}</h2>
                        <div className="flex-1 grid grid-cols-2 lg:grid-cols-3 gap-8">
                            {(slide.contentPoints || []).map((p, i) => (
                                <div key={i} className="bg-white/40 dark:bg-zinc-800/40 backdrop-blur-sm border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 flex flex-col gap-5 shadow-sm hover:shadow-xl transition-all group">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                                        <GridIcon className="w-6 h-6" />
                                    </div>
                                    <p className="text-xl font-bold leading-tight opacity-90">{p}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 'hierarchy':
                return (
                    <div className="h-full flex flex-col p-16 relative overflow-hidden items-center">
                        <GridOverlay color={theme.accentColor} />
                        <h2 className="text-4xl font-black mb-20 tracking-tight w-full text-left">{slide.title}</h2>
                        <div className="flex flex-col items-center gap-12 w-full max-w-4xl relative">
                            <div className="px-12 py-6 bg-indigo-600 text-white rounded-3xl font-black shadow-2xl z-10 relative">
                                CORE STRATEGY: {slide.contentPoints[0] || "Strategic Pillar"}
                            </div>
                            <div className="w-px h-12 bg-indigo-600/30" />
                            <div className="grid grid-cols-2 gap-24 w-full relative">
                                <div className="absolute top-0 left-1/4 right-1/4 h-px bg-indigo-600/30 -translate-y-px" />
                                <div className="flex flex-col items-center gap-4">
                                    <div className="w-px h-4 bg-indigo-600/30" />
                                    <div className="px-8 py-5 bg-white dark:bg-zinc-900 border-2 border-indigo-500/30 rounded-2xl font-bold shadow-xl w-full text-center">
                                        {slide.contentPoints[1] || "Execution Unit"}
                                    </div>
                                </div>
                                <div className="flex flex-col items-center gap-4">
                                    <div className="w-px h-4 bg-indigo-600/30" />
                                    <div className="px-8 py-5 bg-white dark:bg-zinc-900 border-2 border-indigo-500/30 rounded-2xl font-bold shadow-xl w-full text-center">
                                        {slide.contentPoints[2] || "Innovation Hub"}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'map':
                return (
                    <div className="h-full flex flex-col p-16 relative overflow-hidden">
                        <GridOverlay color={theme.accentColor} />
                        <h2 className="text-4xl font-black mb-12 tracking-tight">{slide.title}</h2>
                        <div className="flex-1 flex gap-12">
                            <div className="flex-1 bg-zinc-100 dark:bg-zinc-900/50 rounded-3xl flex items-center justify-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 relative group overflow-hidden">
                                <MapIcon className="w-24 h-24 text-zinc-300 dark:text-zinc-700 opacity-20" />
                                <div className="absolute top-1/4 left-1/3 w-6 h-6 bg-indigo-600 rounded-full animate-ping opacity-50" />
                                <div className="absolute top-1/4 left-1/3 w-4 h-4 bg-indigo-600 rounded-full shadow-lg" />
                                
                                <div className="absolute bottom-1/3 right-1/4 w-6 h-6 bg-indigo-600 rounded-full animate-ping opacity-50" />
                                <div className="absolute bottom-1/3 right-1/4 w-4 h-4 bg-indigo-600 rounded-full shadow-lg" />
                                
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent" />
                            </div>
                            <div className="w-2/5 space-y-8 flex flex-col justify-center">
                                {(slide.contentPoints || []).map((p, i) => (
                                    <div key={i} className="flex gap-5 items-start bg-white/40 dark:bg-zinc-800/40 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
                                        <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">{i+1}</div>
                                        <p className="text-lg font-bold leading-snug opacity-80">{p}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            case 'timeline':
                return (
                    <div className="h-full flex flex-col p-16 relative overflow-hidden">
                        <GridOverlay color={theme.accentColor} />
                        <h2 className="text-4xl font-black mb-24 tracking-tight">{slide.title}</h2>
                        <div className="flex-1 relative flex items-center">
                            <div className="absolute top-1/2 left-0 right-0 h-1 bg-zinc-200 dark:bg-zinc-800 -translate-y-1/2 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-600 w-full opacity-20" />
                            </div>
                            <div className="w-full flex justify-between items-center relative z-10">
                                {(slide.contentPoints || []).map((p, i) => (
                                    <div key={i} className={clsx("flex-1 flex flex-col items-center text-center px-4", i % 2 === 0 ? "mb-48" : "mt-48")}>
                                        <div className="w-8 h-8 rounded-full border-4 border-white dark:border-zinc-950 bg-indigo-600 shadow-xl mb-6 ring-4 ring-indigo-500/20" />
                                        <div className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-lg w-full max-w-[200px] hover:-translate-y-2 transition-transform">
                                            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-3 block">Phase 0{i+1}</span>
                                            <p className="text-sm font-black leading-tight">{p}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            case 'two-column':
                return (
                    <div className="h-full flex flex-col p-16 relative overflow-hidden">
                        <GridOverlay color={theme.accentColor} />
                        <h2 className="text-4xl font-black mb-12 tracking-tight">{slide.title}</h2>
                        <div className="flex-1 flex gap-12">
                            <div className="flex-1 space-y-6">
                                {slide.contentPoints.slice(0, Math.ceil(slide.contentPoints.length / 2)).map((p, i) => (
                                    <div key={i} className="text-2xl flex items-start gap-5">
                                        <div className="w-2.5 h-2.5 mt-3 rounded-full bg-indigo-600 shrink-0 shadow-lg shadow-indigo-500/20" />
                                        <p className="opacity-80 leading-relaxed font-medium">{p}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="flex-1 space-y-6">
                                {slide.contentPoints.slice(Math.ceil(slide.contentPoints.length / 2)).map((p, i) => (
                                    <div key={i} className="text-2xl flex items-start gap-5">
                                        <div className="w-2.5 h-2.5 mt-3 rounded-full bg-indigo-600 shrink-0 shadow-lg shadow-indigo-500/20" />
                                        <p className="opacity-80 leading-relaxed font-medium">{p}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            case 'big-number':
                return (
                    <div className="h-full flex flex-col items-center justify-center p-20 relative overflow-hidden text-center">
                        <GridOverlay color={theme.accentColor} />
                        <div className="text-[12rem] font-black leading-none bg-gradient-to-br from-indigo-500 to-cyan-500 bg-clip-text text-transparent drop-shadow-2xl">
                            {slide.bigNumber || "45%"}
                        </div>
                        <h2 className="text-5xl font-black tracking-tight mt-10">{slide.bigNumberLabel || slide.title}</h2>
                        <p className="text-2xl opacity-60 mt-6 max-w-3xl leading-relaxed italic">{slide.contentPoints[0] || ""}</p>
                    </div>
                );
            case 'quote':
                return (
                    <div className="h-full flex flex-col items-center justify-center p-24 relative overflow-hidden text-center">
                        <QuoteIcon className="w-24 h-24 opacity-10 absolute top-20 left-20 text-indigo-500" />
                        <h2 className="text-5xl font-black italic leading-[1.2] text-zinc-900 dark:text-white max-w-4xl">"{slide.contentPoints[0] || slide.title}"</h2>
                        {slide.quoteAuthor && (
                            <div className="mt-12 space-y-1">
                                <p className="text-2xl font-black text-indigo-600">— {slide.quoteAuthor}</p>
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Narrative Perspective</p>
                            </div>
                        )}
                        <QuoteIcon className="w-24 h-24 opacity-10 absolute bottom-20 right-20 text-indigo-500 rotate-180" />
                    </div>
                );
            case 'image':
            case 'image-center':
            case 'image-full':
                const isFull = slide.layout === 'image-full';
                const isCenter = slide.layout === 'image-center';
                return (
                    <div className={clsx("h-full relative overflow-hidden", isFull ? "" : "p-16 flex gap-12")}>
                        {isFull ? (
                            <div className="w-full h-full relative">
                                {slide.imageUrl && <img src={slide.imageUrl} className="w-full h-full object-cover" alt="" />}
                                <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px]" />
                                <div className="absolute bottom-24 left-24 max-w-4xl text-white space-y-8">
                                    <h2 className="text-7xl font-black tracking-tight leading-none drop-shadow-xl">{slide.title}</h2>
                                    <ul className="space-y-6">
                                        {slide.contentPoints.map((p, i) => (
                                            <li key={i} className="text-2xl font-bold flex items-center gap-5 drop-shadow-lg">
                                                <div className="w-3 h-3 rounded-full bg-indigo-500" /> {p}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className={clsx("flex-1 flex flex-col justify-center", isCenter && "text-center")}>
                                    <h2 className="text-6xl font-black mb-10 tracking-tight leading-tight">{slide.title}</h2>
                                    <ul className={clsx("space-y-8", isCenter && "mx-auto")}>
                                        {slide.contentPoints.map((p, i) => (
                                            <li key={i} className="text-2xl flex items-start gap-5">
                                                <div className="w-3 h-3 mt-3 rounded-full bg-indigo-600 shrink-0 shadow-lg" />
                                                <p className="opacity-80 leading-relaxed font-bold">{p}</p>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="flex-1 rounded-3xl overflow-hidden shadow-2xl relative border border-zinc-200 dark:border-zinc-800">
                                    {slide.imageUrl && <img src={slide.imageUrl} className="w-full h-full object-cover" alt="" />}
                                    <div className="absolute inset-0 ring-1 ring-inset ring-black/10" />
                                </div>
                            </>
                        )}
                    </div>
                );
            default:
                return (
                    <div className="h-full p-20 relative overflow-hidden">
                         <GridOverlay color={theme.accentColor} />
                         <h2 className="text-5xl font-black mb-12 tracking-tight leading-none">{slide.title}</h2>
                         <ul className="space-y-8 max-w-5xl">
                            {(slide.contentPoints || []).map((p, i) => (
                                <li key={i} className="text-3xl flex items-start gap-6">
                                    <div className="w-3 h-3 mt-4 rounded-full bg-indigo-600 shrink-0 shadow-xl" />
                                    <p className="opacity-80 leading-relaxed font-semibold">{p}</p>
                                </li>
                            ))}
                         </ul>
                    </div>
                );
        }
    };

    return (
        <div 
            className="relative overflow-hidden shadow-inner selection:bg-indigo-500/30"
            style={{ 
                backgroundColor: theme.backgroundColor, 
                color: theme.textColor, 
                fontFamily: theme.fontFamily, 
                width: width, 
                height: height, 
                aspectRatio: '16/9',
                display: 'block'
            }}
        >
            <LogoHeader />
            {renderLayout()}
            <div className="absolute bottom-8 left-12 right-12 flex justify-between items-center opacity-40 text-[10px] font-black uppercase tracking-[0.4em]">
                <span>Proprietary Narrative: {slide.title.substring(0, 20)}...</span>
                <span>Narrative Node {slide.id?.split('-').pop() || "0"}</span>
            </div>
        </div>
    );
};
