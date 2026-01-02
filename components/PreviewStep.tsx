
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { Slide, OutlineItem, ImageSize, Language, ExportFormat, VisualTheme, PresentationFormat, ModelTier } from '../types';
import { generateSlideContent, generateSlideVisual, generateSlideImage, askAssistantStream } from '../services/geminiService';
import { SparklesIcon, ImageIcon, MessageCircleIcon, EditIcon, DownloadIcon, SendIcon, RefreshIcon, TypeIcon, XIcon, LayoutIcon, UndoIcon, RedoIcon } from './Icons';
import { SlideRenderer } from './SlideRenderer';
import { useToast } from './Toast';
import { ChartEditor } from './ChartEditor';

interface Props {
  topic: string;
  outline: OutlineItem[];
  styleDesc: string;
  language: Language;
  exportFormat: ExportFormat;
  theme: VisualTheme;
  presentationFormat: PresentationFormat;
  tier: ModelTier;
  styleImage?: string;
  onRestart: () => void;
  onError?: (err: any) => void;
}

type Tab = 'editor' | 'chat';

interface HistoryState {
  slides: Slide[];
  stack: Slide[][];
  index: number;
}

const ScaledSlide: React.FC<{ 
  slide: Slide; 
  theme: VisualTheme; 
  isActive: boolean;
  isPending: boolean;
  onClick: () => void; 
}> = ({ slide, theme, isActive, isPending, onClick }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        setScale(width / 1280);
      }
    };
    updateScale();
    const observer = new ResizeObserver(updateScale);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div 
      ref={containerRef}
      className={`aspect-video w-full bg-zinc-100 dark:bg-zinc-950 relative overflow-hidden cursor-pointer group transition-all duration-500 ${isActive ? 'ring-2 ring-indigo-500 shadow-lg shadow-indigo-500/20' : 'border border-zinc-200 dark:border-zinc-800'}`}
      onClick={onClick}
    >
        <div className="origin-top-left pointer-events-none select-none" style={{ width: '1280px', height: '720px', transform: `scale(${scale})` }}>
           <SlideRenderer slide={slide} theme={theme} disableAnimation={false} />
        </div>
        {isActive && <div className="absolute inset-0 pointer-events-none border-4 border-indigo-500/30 animate-pulse rounded-xl z-10"></div>}
        {isPending && <div className="absolute inset-0 bg-white/50 dark:bg-black/50 backdrop-blur-[1px] z-10 flex items-center justify-center"><SparklesIcon className="w-6 h-6 text-zinc-400 opacity-50" /></div>}
        <div className="absolute inset-0 bg-indigo-900/0 group-hover:bg-indigo-900/10 dark:group-hover:bg-indigo-500/10 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 backdrop-blur-[1px] z-20">
            <span className="bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white px-4 py-2 rounded-lg text-sm font-bold shadow-xl border border-zinc-200 dark:border-zinc-700 flex items-center gap-2 transform scale-90 group-hover:scale-100 transition-transform">
                <EditIcon className="w-4 h-4 text-indigo-500" /> Edit Slide
            </span>
        </div>
    </div>
  );
};

export const PreviewStep: React.FC<Props> = ({ topic, outline, styleDesc, language, exportFormat, theme, presentationFormat, tier, styleImage, onRestart, onError }) => {
  const { addToast } = useToast();
  const [historyState, setHistoryState] = useState<HistoryState>({ slides: [], stack: [], index: -1 });
  const [isDone, setIsDone] = useState(false);
  const [generatingIndex, setGeneratingIndex] = useState(0);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<Tab>('editor');
  const [chatQuery, setChatQuery] = useState('');
  const [chatHistory, setChatHistory] = useState<{role: 'user'|'ai', text: string, sources?: string[]}[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [isRegeneratingImage, setIsRegeneratingImage] = useState(false);
  const [imageSize, setImageSize] = useState<ImageSize>(ImageSize.SIZE_2K);
  const [isExporting, setIsExporting] = useState(false);

  const pushToHistory = useCallback((newSlides: Slide[]) => {
    setHistoryState(prev => {
        const truncatedStack = prev.stack.slice(0, prev.index + 1);
        const nextStack = [...truncatedStack, JSON.parse(JSON.stringify(newSlides))];
        if (nextStack.length > 50) nextStack.shift();
        const nextIndex = nextStack.length - 1;
        return { slides: newSlides, stack: nextStack, index: nextIndex };
    });
  }, []);

  const undo = useCallback(() => {
    setHistoryState(prev => {
        if (prev.index > 0) {
            const nextIndex = prev.index - 1;
            const newSlides = JSON.parse(JSON.stringify(prev.stack[nextIndex]));
            addToast("Undo successful", "info", 1500);
            return { ...prev, index: nextIndex, slides: newSlides };
        }
        return prev;
    });
  }, [addToast]);

  const redo = useCallback(() => {
    setHistoryState(prev => {
        if (prev.index < prev.stack.length - 1) {
            const nextIndex = prev.index + 1;
            const newSlides = JSON.parse(JSON.stringify(prev.stack[nextIndex]));
            addToast("Redo successful", "info", 1500);
            return { ...prev, index: nextIndex, slides: newSlides };
        }
        return prev;
    });
  }, [addToast]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
            if (e.shiftKey) redo(); else undo();
        } else if ((e.metaKey || e.ctrlKey) && e.key === 'y') redo();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  useEffect(() => {
    const processSlides = async () => {
      try {
        let currentDeck: Slide[] = outline.map(o => ({ id: o.id, title: o.title, layout: 'content' as const, contentPoints: [], speakerNotes: '' }));
        setHistoryState({ slides: currentDeck, stack: [JSON.parse(JSON.stringify(currentDeck))], index: 0 });
        for (let i = 0; i < outline.length; i++) {
          setGeneratingIndex(i);
          let slide: Slide;
          if (exportFormat === 'pdf') {
              const visualPlan = await generateSlideVisual(topic, outline[i], styleDesc);
              currentDeck = [...currentDeck];
              currentDeck[i] = { ...currentDeck[i], layout: visualPlan.layout as any, imagePrompt: visualPlan.imagePrompt };
              pushToHistory(currentDeck);
              const imageUrl = await generateSlideImage(visualPlan.imagePrompt, ImageSize.SIZE_1K, tier, styleImage);
              currentDeck = [...currentDeck];
              currentDeck[i] = { ...currentDeck[i], imageUrl: imageUrl || null };
              pushToHistory(currentDeck);
              slide = await generateSlideContent(topic, outline[i], styleDesc, language, presentationFormat, exportFormat, tier, visualPlan);
          } else {
              slide = await generateSlideContent(topic, outline[i], styleDesc, language, presentationFormat, exportFormat, tier);
              currentDeck = [...currentDeck];
              currentDeck[i] = slide;
              pushToHistory(currentDeck);
              if (slide.imagePrompt) {
                  const imageUrl = await generateSlideImage(slide.imagePrompt, ImageSize.SIZE_1K, tier, styleImage);
                  slide = { ...slide, imageUrl: imageUrl || null };
              }
          }
          currentDeck = [...currentDeck];
          currentDeck[i] = slide;
          pushToHistory(currentDeck);
        }
        setIsDone(true);
        addToast("Generation complete", "success");
      } catch (err) { addToast("Error generating presentation.", "error"); }
    };
    processSlides();
  }, []);

  const updateSlideContent = (index: number, updates: Partial<Slide>, skipHistory = false) => {
      setHistoryState(prev => {
          const newSlides = [...prev.slides];
          newSlides[index] = { ...newSlides[index], ...updates };
          if (!skipHistory) {
             const truncatedStack = prev.stack.slice(0, prev.index + 1);
             const nextStack = [...truncatedStack, JSON.parse(JSON.stringify(newSlides))];
             if (nextStack.length > 50) nextStack.shift();
             return { slides: newSlides, stack: nextStack, index: nextStack.length - 1 };
          }
          return { ...prev, slides: newSlides };
      });
  };

  const updateContentPoint = (slideIdx: number, pointIdx: number, newValue: string) => {
    const slide = historyState.slides[slideIdx];
    const newPoints = [...slide.contentPoints];
    newPoints[pointIdx] = newValue;
    updateSlideContent(slideIdx, { contentPoints: newPoints });
  };

  const addContentPoint = (slideIdx: number) => {
    const slide = historyState.slides[slideIdx];
    updateSlideContent(slideIdx, { contentPoints: [...slide.contentPoints, ""] });
  };

  const removeContentPoint = (slideIdx: number, pointIdx: number) => {
    const slide = historyState.slides[slideIdx];
    const newPoints = slide.contentPoints.filter((_, i) => i !== pointIdx);
    updateSlideContent(slideIdx, { contentPoints: newPoints });
  };

  const handleRegenerateImage = async () => {
      const slide = historyState.slides[currentSlideIndex];
      setIsRegeneratingImage(true);
      updateSlideContent(currentSlideIndex, { imageUrl: undefined }, true);
      try {
        const url = await generateSlideImage(slide.imagePrompt || slide.title, imageSize, tier, styleImage);
        updateSlideContent(currentSlideIndex, { imageUrl: url || null });
        addToast(url ? "Image updated" : "Generation failed", url ? "success" : "error");
      } catch (err) { updateSlideContent(currentSlideIndex, { imageUrl: null }); }
      finally { setIsRegeneratingImage(false); }
  };

  const handleChat = async () => {
    if(!chatQuery.trim()) return;
    setChatLoading(true);
    const context = JSON.stringify(historyState.slides[currentSlideIndex]);
    const userMsg = chatQuery;
    setChatQuery('');
    setChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);
    try {
      setChatHistory(prev => [...prev, { role: 'ai', text: '', sources: [] }]);
      const stream = askAssistantStream(userMsg, context);
      for await (const chunk of stream) {
          setChatHistory(prev => {
             const newHistory = [...prev];
             const lastMsg = newHistory[newHistory.length - 1];
             lastMsg.text = (lastMsg.text || '') + chunk.text; 
             if (chunk.sources) lastMsg.sources = Array.from(new Set([...(lastMsg.sources || []), ...chunk.sources]));
             return newHistory;
          });
      }
    } catch (err) { }
    finally { setChatLoading(false); }
  };

  const handleExport = async () => {
      setIsExporting(true);
      addToast("Exporting...", "loading");
      try {
          if (exportFormat === 'pptx') {
              const PptxGenJS = (await import('pptxgenjs')).default;
              const pres = new PptxGenJS();
              pres.layout = 'LAYOUT_16x9';
              historyState.slides.forEach(slide => {
                  const s = pres.addSlide();
                  s.addText(slide.title, { x: 0.5, y: 0.5, w: 9, h: 0.8, fontSize: 32, bold: true });
                  if (slide.imageUrl) s.addImage({ data: slide.imageUrl, x: 0, y: 0, w: '100%', h: '100%', sizing: { type: 'cover', w: '100%', h: '100%' } });
                  s.addText(slide.contentPoints.join('\n'), { x: 0.5, y: 1.5, w: 9, h: 4, fontSize: 18 });
              });
              await pres.writeFile({ fileName: `LuminaPresent.pptx` });
          } else {
              const html2canvas = (await import('html2canvas')).default;
              const { jsPDF } = await import('jspdf');
              const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [1280, 720] });
              const exportContainer = document.createElement('div');
              Object.assign(exportContainer.style, { position: 'fixed', top: '0', left: '-5000px', width: '1280px', height: '720px', backgroundColor: theme.backgroundColor });
              document.body.appendChild(exportContainer);
              const root = createRoot(exportContainer);
              for (let i = 0; i < historyState.slides.length; i++) {
                  await new Promise<void>((resolve) => {
                      root.render(<div style={{ width: 1280, height: 720 }}><SlideRenderer slide={historyState.slides[i]} theme={theme} disableAnimation={true} /></div>);
                      setTimeout(resolve, 1500); 
                  });
                  const canvas = await html2canvas(exportContainer, { scale: 1, useCORS: true, width: 1280, height: 720 });
                  if (i > 0) pdf.addPage([1280, 720], 'landscape');
                  pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, 1280, 720);
              }
              pdf.save(`Presentation.pdf`);
              root.unmount();
              document.body.removeChild(exportContainer);
          }
          addToast("Export finished", "success");
      } catch (err) { addToast("Export failed", "error"); }
      finally { setIsExporting(false); }
  };

  const currentSlide = historyState.slides[currentSlideIndex];

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-zinc-950 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 z-10 shrink-0">
          <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-500 to-cyan-500 bg-clip-text text-transparent">LuminaPresent AI</h1>
              <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-700"></div>
              <h2 className="text-sm font-medium text-zinc-600 dark:text-zinc-300 truncate max-w-md">{topic}</h2>
          </div>
          <div className="flex items-center gap-3">
               <div className="flex items-center bg-gray-100 dark:bg-zinc-800 rounded-lg p-0.5 border border-zinc-200 dark:border-zinc-700 mr-2 shadow-inner">
                  <button onClick={undo} disabled={historyState.index <= 0} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-white dark:hover:bg-zinc-700 disabled:opacity-30 transition-all text-xs font-bold text-zinc-600 dark:text-zinc-300">
                    <UndoIcon className="w-3.5 h-3.5" /> Undo
                  </button>
                  <button onClick={redo} disabled={historyState.index >= historyState.stack.length - 1} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-white dark:hover:bg-zinc-700 disabled:opacity-30 transition-all text-xs font-bold text-zinc-600 dark:text-zinc-300">
                    Redo <RedoIcon className="w-3.5 h-3.5" />
                  </button>
               </div>
               {!isDone && <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-full border border-indigo-100 shadow-sm"><SparklesIcon className="w-3.5 h-3.5 text-indigo-500 animate-spin" /><span className="text-xs font-bold text-indigo-600">Drafting {generatingIndex + 1}...</span></div>}
               <button onClick={handleExport} disabled={!isDone || isExporting} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black disabled:opacity-50 transition-all shadow-lg shadow-indigo-500/20 uppercase tracking-widest">
                <DownloadIcon className="w-4 h-4" /> Export Deck
               </button>
               <button onClick={onRestart} className="p-2 text-zinc-400 hover:text-red-500 transition-colors"><XIcon className="w-5 h-5" /></button>
          </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-20 max-w-7xl mx-auto">
             {historyState.slides.map((slide, idx) => (
               <div key={slide.id} id={`slide-card-${idx}`} className="flex flex-col bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all group">
                  <ScaledSlide slide={slide} theme={theme} isActive={idx === generatingIndex && !isDone} isPending={idx > generatingIndex} onClick={() => { setCurrentSlideIndex(idx); setIsEditorOpen(true); }} />
                  <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 flex gap-2">
                      <button onClick={() => { setCurrentSlideIndex(idx); setIsEditorOpen(true); setActiveTab('editor'); }} className="flex-1 py-2.5 bg-gray-50 dark:bg-zinc-800 rounded-lg text-xs font-bold hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all flex items-center justify-center gap-2 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                        <EditIcon className="w-3.5 h-3.5" /> Edit Studio
                      </button>
                      <button onClick={() => { setCurrentSlideIndex(idx); setIsEditorOpen(true); setActiveTab('chat'); }} className="flex-1 py-2.5 bg-gray-50 dark:bg-zinc-800 rounded-lg text-xs font-bold hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all flex items-center justify-center gap-2 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                        <SparklesIcon className="w-3.5 h-3.5" /> AI Copilot
                      </button>
                  </div>
               </div>
             ))}
          </div>
      </div>
      {isEditorOpen && currentSlide && (
        <div className="fixed inset-0 z-50 flex flex-col bg-gray-100 dark:bg-zinc-950 animate-[fadeIn_0.2s_ease-out]">
            <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 shrink-0 shadow-sm">
               <div className="flex items-center gap-4">
                  <button onClick={() => setIsEditorOpen(false)} className="p-2.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-500"><XIcon className="w-5 h-5" /></button>
                  <div>
                    <span className="block text-[10px] font-black uppercase tracking-widest text-zinc-400">Editing Narrative</span>
                    <span className="text-sm font-bold text-zinc-900 dark:text-white">{currentSlide.title}</span>
                  </div>
               </div>
               <div className="flex items-center gap-2">
                  <button disabled={currentSlideIndex === 0} onClick={() => setCurrentSlideIndex(i => i - 1)} className="px-4 py-2 text-xs font-bold rounded-lg border dark:border-zinc-700 disabled:opacity-30 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">Previous</button>
                  <button disabled={currentSlideIndex === historyState.slides.length - 1} onClick={() => setCurrentSlideIndex(i => i + 1)} className="px-4 py-2 text-xs font-bold rounded-lg border dark:border-zinc-700 disabled:opacity-30 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">Next Slide</button>
               </div>
            </div>
            <div className="flex-1 flex overflow-hidden">
                <div className="flex-1 p-8 flex items-center justify-center overflow-hidden bg-zinc-50 dark:bg-zinc-950/50">
                    <div className="aspect-video w-full max-w-5xl shadow-2xl rounded-xl overflow-hidden ring-1 ring-zinc-200 dark:ring-zinc-800">
                        <SlideRenderer slide={currentSlide} theme={theme} />
                    </div>
                </div>
                <div className="w-96 border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col shadow-2xl">
                    <div className="flex border-b border-zinc-200 dark:border-zinc-800">
                        <button onClick={() => setActiveTab('editor')} className={`flex-1 py-4 text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'editor' ? 'border-b-2 border-indigo-500 text-indigo-600 bg-indigo-50/20' : 'text-zinc-500'}`}>Visual Studio</button>
                        <button onClick={() => setActiveTab('chat')} className={`flex-1 py-4 text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'chat' ? 'border-b-2 border-indigo-500 text-indigo-600 bg-indigo-50/20' : 'text-zinc-500'}`}>Narrative Copilot</button>
                    </div>
                    {activeTab === 'editor' && (
                        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                             <div className="space-y-4">
                                <label className="text-[11px] font-black uppercase tracking-widest text-zinc-400">Structure & Layout</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {['title', 'content', 'two-column', 'image', 'image-center', 'image-full', 'data', 'quote', 'big-number', 'timeline', 'grid', 'process', 'comparison', 'hierarchy', 'map', 'case-study'].map(l => (
                                        <button key={l} onClick={() => updateSlideContent(currentSlideIndex, { layout: l as any })} className={`p-2.5 rounded-lg text-[10px] font-bold border capitalize transition-all ${currentSlide.layout === l ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-500/20' : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 text-zinc-600 dark:text-zinc-400'}`}>{l.replace('-', ' ')}</button>
                                    ))}
                                </div>
                             </div>
                             <div className="space-y-4">
                                <label className="text-[11px] font-black uppercase tracking-widest text-zinc-400">Content Points</label>
                                <input type="text" value={currentSlide.title} onChange={(e) => updateSlideContent(currentSlideIndex, { title: e.target.value })} className="w-full bg-gray-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm font-bold text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" />
                                <div className="space-y-3">
                                    {currentSlide.contentPoints.map((point, idx) => (
                                        <div key={idx} className="group relative">
                                            <textarea value={point} onChange={(e) => updateContentPoint(currentSlideIndex, idx, e.target.value)} className="w-full bg-gray-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-lg p-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500 resize-none min-h-[50px] pr-10" />
                                            <button onClick={() => removeContentPoint(currentSlideIndex, idx)} className="absolute top-2 right-2 text-zinc-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><XIcon className="w-4 h-4" /></button>
                                        </div>
                                    ))}
                                    <button onClick={() => addContentPoint(currentSlideIndex)} className="w-full py-2 border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-lg text-[10px] font-black text-zinc-400 hover:text-indigo-600 hover:border-indigo-500 transition-all uppercase tracking-widest">+ Add Narrative Phase</button>
                                </div>
                             </div>

                             {currentSlide.layout === 'quote' && (
                                <div className="space-y-4">
                                    <label className="text-[11px] font-black uppercase tracking-widest text-zinc-400">Attribution</label>
                                    <input type="text" value={currentSlide.quoteAuthor || ''} onChange={(e) => updateSlideContent(currentSlideIndex, { quoteAuthor: e.target.value })} placeholder="Author / Source" className="w-full bg-gray-50 dark:bg-zinc-950 border border-zinc-200 rounded-lg px-3 py-2 text-xs outline-none" />
                                </div>
                             )}

                             {currentSlide.layout === 'big-number' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[11px] font-black uppercase tracking-widest text-zinc-400 mb-2 block">Hero Metric</label>
                                        <input type="text" value={currentSlide.bigNumber || ''} onChange={(e) => updateSlideContent(currentSlideIndex, { bigNumber: e.target.value })} placeholder="45%" className="w-full bg-gray-50 dark:bg-zinc-950 border border-zinc-200 rounded-lg px-3 py-2 text-xs outline-none" />
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-black uppercase tracking-widest text-zinc-400 mb-2 block">Label</label>
                                        <input type="text" value={currentSlide.bigNumberLabel || ''} onChange={(e) => updateSlideContent(currentSlideIndex, { bigNumberLabel: e.target.value })} placeholder="Growth" className="w-full bg-gray-50 dark:bg-zinc-950 border border-zinc-200 rounded-lg px-3 py-2 text-xs outline-none" />
                                    </div>
                                </div>
                             )}

                             <div className="space-y-4">
                                <label className="text-[11px] font-black uppercase tracking-widest text-zinc-400">Visual Aesthetic</label>
                                <textarea value={currentSlide.imagePrompt || ''} onChange={(e) => updateSlideContent(currentSlideIndex, { imagePrompt: e.target.value })} placeholder="Describe the professional visual..." className="w-full bg-gray-50 dark:bg-zinc-950 border border-zinc-200 rounded-lg p-3 text-xs min-h-[100px] outline-none focus:ring-2 focus:ring-indigo-500" />
                                <button onClick={handleRegenerateImage} disabled={isRegeneratingImage} className="w-full bg-zinc-900 hover:bg-black text-white py-3 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 transition-all shadow-xl">
                                  <RefreshIcon className={`w-4 h-4 ${isRegeneratingImage ? 'animate-spin' : ''}`} /> Update High-Fidelity Visual
                                </button>
                             </div>
                        </div>
                    )}
                    {activeTab === 'chat' && (
                        <div className="flex-1 flex flex-col h-full bg-zinc-50 dark:bg-zinc-950/20">
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                                {chatHistory.map((msg, idx) => (
                                    <div key={idx} className={`p-4 rounded-2xl text-xs shadow-sm leading-relaxed ${msg.role === 'user' ? 'bg-white dark:bg-zinc-800 ml-8 border border-zinc-200 dark:border-zinc-700' : 'bg-indigo-600 text-white mr-8 font-medium'}`}>
                                        <p className="whitespace-pre-wrap">{msg.text}</p>
                                    </div>
                                ))}
                                <div ref={chatEndRef} />
                            </div>
                            <div className="p-4 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800">
                                <div className="relative">
                                    <input value={chatQuery} onChange={(e) => setChatQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleChat()} placeholder="Ask AI Copilot to refine this slide..." className="w-full bg-gray-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-2xl py-3.5 pl-5 pr-14 text-xs outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
                                    <button onClick={handleChat} disabled={chatLoading || !chatQuery} className="absolute right-2 top-2 bottom-2 aspect-square flex items-center justify-center bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-500/20 disabled:opacity-50 transition-all hover:scale-105 active:scale-95">
                                        <SendIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
