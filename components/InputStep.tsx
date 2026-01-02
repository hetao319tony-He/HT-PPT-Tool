
import React, { useState } from 'react';
import { SparklesIcon, UploadIcon, ImageIcon, LightbulbIcon, XIcon, ProcessIcon } from './Icons';
import { analyzeVisualStyle, brainstormIdeasStream, generateStyleFromText } from '../services/geminiService';
import { Language, ExportFormat, VisualTheme, PresentationFormat, ModelTier } from '../types';
import { PRESET_STYLES, DEFAULT_STYLE_ID } from '../themes';

interface UploadedFile {
  name: string;
  content: string;
  type: string;
}

interface Props {
  onNext: (topic: string, docContext: string, styleDesc: string, slideCount: number, language: Language, format: ExportFormat, theme: VisualTheme, presentationFormat: PresentationFormat, tier: ModelTier, styleImage?: string) => void;
  onError?: (err: any) => void;
}

export const InputStep: React.FC<Props> = ({ onNext, onError }) => {
  const [topic, setTopic] = useState('');
  const [docs, setDocs] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [parsingFile, setParsingFile] = useState(false);
  const [slideCount, setSlideCount] = useState(8);
  const [language, setLanguage] = useState<Language>('English');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('pptx');
  const [presentationFormat, setPresentationFormat] = useState<PresentationFormat>('presenter');
  const [modelTier, setModelTier] = useState<ModelTier>('efficient');

  // Style Selection State
  const [selectedStyleId, setSelectedStyleId] = useState<string>(DEFAULT_STYLE_ID);
  const [isCustomStyle, setIsCustomStyle] = useState(false);
  
  // Custom Style State
  const [styleRef, setStyleRef] = useState<string | null>(null);
  const [customStyleDesc, setCustomStyleDesc] = useState('Modern Corporate Minimalist');
  const [customThemeColors, setCustomThemeColors] = useState<Partial<VisualTheme>>({});
  const [analyzing, setAnalyzing] = useState(false);
  
  // New State for Text Mode
  const [customMode, setCustomMode] = useState<'image' | 'text'>('image');
  const [customTextPrompt, setCustomTextPrompt] = useState('');

  // Brainstorming State
  const [isBrainstorming, setIsBrainstorming] = useState(false);
  const [brainstormQuery, setBrainstormQuery] = useState('');
  const [brainstormResult, setBrainstormResult] = useState('');
  const [isThinking, setIsThinking] = useState(false);

  // Filter available styles based on format
  const availableStyles = exportFormat === 'pptx' 
    ? PRESET_STYLES.slice(0, 5) 
    : PRESET_STYLES;

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParsingFile(true);
    const fileName = file.name.toLowerCase();
    
    try {
      let extractedText = "";

      if (file.type === "application/pdf" || fileName.endsWith('.pdf')) {
        const pdfjsLib = await import('pdfjs-dist');
        const pdfjs = (pdfjsLib as any).default ?? pdfjsLib;
        
        if (!pdfjs.GlobalWorkerOptions.workerSrc) {
            pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }
        
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjs.getDocument({
          data: arrayBuffer,
          cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
          cMapPacked: true,
        });
        
        const pdf = await loadingTask.promise;
        const maxPages = Math.min(pdf.numPages, 50); 
        
        for (let i = 1; i <= maxPages; i++) {
          try {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
              .map((item: any) => item.str || '')
              .join(' ')
              .replace(/\s+/g, ' ')
              .trim();
              
            if (pageText) {
              extractedText += `\n[Page ${i}]\n${pageText}\n`;
            }
          } catch (pageErr) {
            console.warn(`Error parsing PDF page ${i}:`, pageErr);
          }
        }
      } else if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || fileName.endsWith('.docx')) {
        const mammothLib = await import('mammoth');
        const mammoth = (mammothLib as any).default ?? mammothLib;
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        extractedText = result.value;
      } else if (file.type.includes('sheet') || file.type.includes('excel') || fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        const XLSXLib = await import('xlsx');
        const XLSX = (XLSXLib as any).default ?? XLSXLib;
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer);
        let xlsxText = "";
        workbook.SheetNames.forEach((sheetName: string) => {
          const sheet = workbook.Sheets[sheetName];
          const csv = XLSX.utils.sheet_to_csv(sheet);
          xlsxText += `\n--- Sheet: ${sheetName} ---\n${csv}`;
        });
        extractedText = xlsxText;
      } else {
        extractedText = await file.text();
      }

      if (extractedText.trim()) {
        setUploadedFiles(prev => [...prev, {
          name: file.name,
          content: extractedText,
          type: file.type || 'text/plain'
        }]);
      } else {
        alert("The file appeared to be empty or contains only images/scanned content.");
      }
    } catch (error) {
      console.error("File parsing error:", error);
      alert("Could not parse file. It may be password protected or corrupted.");
    } finally {
      setParsingFile(false);
      e.target.value = '';
    }
  };

  const removeUploadedFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAnalyzing(true);
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = (ev.target?.result as string).split(',')[1];
        setStyleRef(ev.target?.result as string);
        try {
          const result = await analyzeVisualStyle(base64);
          setCustomStyleDesc(result.description);
          setCustomThemeColors(result.colors);
        } catch (err) {
          if (onError) onError(err);
        } finally {
          setAnalyzing(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerateStyleFromText = async () => {
    if (!customTextPrompt) return;
    setAnalyzing(true);
    try {
      const result = await generateStyleFromText(customTextPrompt);
      setCustomStyleDesc(result.description);
      setCustomThemeColors(result.colors);
      setStyleRef(null);
    } catch (err) {
      if (onError) onError(err);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleBrainstorm = async () => {
     if (!brainstormQuery) return;
     setIsThinking(true);
     setBrainstormResult('');
     try {
       for await (const chunk of brainstormIdeasStream(brainstormQuery)) {
          setBrainstormResult(prev => prev + chunk);
       }
     } catch(err) {
       console.error(err);
     } finally {
       setIsThinking(false);
     }
  };

  const handleDemo = () => {
    const demoTopic = "AI-Driven Digital Transformation: 2025 Strategy for Global Consulting";
    const demoContext = `Executive Summary... (Demo content truncated)`;
    const demoStyle = "High-end corporate, sophisticated, minimalist, indigo and slate palette.";
    const demoTheme = PRESET_STYLES[0].theme; 
    onNext(demoTopic, demoContext, demoStyle, 8, 'English', 'pdf', demoTheme, 'presenter', 'efficient', undefined);
  };

  const handleSubmit = async () => {
    let finalStyleDesc = customStyleDesc;
    let finalTheme = PRESET_STYLES.find(s => s.id === DEFAULT_STYLE_ID)!.theme;

    if (isCustomStyle) {
      let generatedColors = customThemeColors;
      if (customMode === 'text' && customTextPrompt.trim().length > 0) {
          if (customStyleDesc === 'Modern Corporate Minimalist' || Object.keys(customThemeColors).length === 0) {
             setAnalyzing(true);
             try {
                const result = await generateStyleFromText(customTextPrompt);
                finalStyleDesc = result.description;
                generatedColors = result.colors;
             } catch (err) {
                finalStyleDesc = customTextPrompt;
             } finally {
                setAnalyzing(false);
             }
          }
      }
      finalTheme = { ...finalTheme, id: 'custom-cloned', fontFamily: 'Inter, sans-serif', ...generatedColors };
    } else {
      const preset = PRESET_STYLES.find(s => s.id === selectedStyleId);
      if (preset) {
        finalStyleDesc = preset.description;
        finalTheme = preset.theme;
      }
    }

    const finalStyleImage = (isCustomStyle && customMode === 'image' && styleRef) ? styleRef : undefined;

    // Merge manual text with all uploaded file content
    const mergedDocContext = [
        docs.trim() ? `[Pasted Text]\n${docs}` : null,
        ...uploadedFiles.map(f => `[File: ${f.name}]\n${f.content}`)
    ].filter(Boolean).join('\n\n');

    onNext(topic, mergedDocContext, finalStyleDesc, slideCount, language, exportFormat, finalTheme, presentationFormat, modelTier, finalStyleImage);
  };

  return (
    <div className="max-w-4xl mx-auto mt-10 p-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl transition-colors mb-10 relative">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-500 to-cyan-500 bg-clip-text text-transparent mb-4">
          LuminaPresent AI
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 font-medium tracking-tight">Enterprise-grade AI Presentation Engine for Consulting & Professional Education.</p>
        <button 
           onClick={handleDemo}
           className="mt-6 text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-full font-bold transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
        >
           ⚡ Run Strategy Consulting Demo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Presentation Topic</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Q3 Market Analysis & Growth Strategy"
                className="w-full bg-gray-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg p-3 text-zinc-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-colors"
              />
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                Knowledge Base (Pasted Text or Uploaded Docs)
                {parsingFile && <span className="ml-2 text-indigo-500 text-xs animate-pulse">Parsing file...</span>}
              </label>
              
              <div className="relative group">
                <textarea
                  value={docs}
                  onChange={(e) => setDocs(e.target.value)}
                  placeholder="Paste manual text or research notes here..."
                  className="w-full h-40 bg-gray-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg p-3 text-zinc-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none text-sm leading-relaxed transition-all"
                />
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {docs && (
                      <button onClick={() => setDocs('')} className="p-1.5 bg-white/80 dark:bg-zinc-800/80 rounded-md hover:text-red-500 transition-colors shadow-sm"><XIcon className="w-3.5 h-3.5" /></button>
                    )}
                </div>
              </div>

              {uploadedFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 animate-[fadeIn_0.3s_ease-out]">
                      {uploadedFiles.map((file, idx) => (
                          <div key={idx} className="flex items-center gap-2 px-2.5 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 rounded-lg text-[10px] font-bold text-indigo-700 dark:text-indigo-300 shadow-sm">
                              <UploadIcon className="w-3 h-3" />
                              <span className="truncate max-w-[120px]">{file.name}</span>
                              <button onClick={() => removeUploadedFile(idx)} className="hover:text-red-500 transition-colors"><XIcon className="w-3 h-3" /></button>
                          </div>
                      ))}
                  </div>
              )}

              <label className={`cursor-pointer w-full flex items-center justify-center gap-2 bg-gray-50 dark:bg-zinc-800/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 border border-zinc-200 dark:border-zinc-700 border-dashed rounded-lg py-3 transition-all group ${parsingFile ? 'opacity-50 pointer-events-none' : ''}`}>
                  <UploadIcon className="w-4 h-4 text-zinc-400 group-hover:text-indigo-500" />
                  <span className="text-zinc-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 text-xs font-bold uppercase tracking-wider">Add Support Document</span>
                  <input type="file" className="hidden" accept=".txt,.md,.csv,.pdf,.docx,.xlsx,.xls" onChange={handleDocUpload} />
              </label>
              
              <p className="text-[10px] text-zinc-500 text-center uppercase tracking-tighter font-bold opacity-60">PDF, Word, and Excel data will be processed in the background.</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2 flex items-center gap-2">
                <ProcessIcon className="w-4 h-4 text-indigo-500" />
                AI Engine Tier
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setModelTier('efficient')}
                  className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden group ${modelTier === 'efficient' ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-500' : 'bg-gray-50 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600'}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-2 h-2 rounded-full ${modelTier === 'efficient' ? 'bg-indigo-500' : 'bg-zinc-400 dark:bg-zinc-600'}`}></div>
                    <span className={`text-xs font-bold ${modelTier === 'efficient' ? 'text-indigo-900 dark:text-white' : 'text-zinc-700 dark:text-zinc-300'}`}>Nano Banana</span>
                  </div>
                  <p className="text-[10px] text-zinc-500 leading-tight">Optimized for speed. Uses Gemini 3 Flash.</p>
                </button>
                <button
                  onClick={() => setModelTier('quality')}
                  className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden group ${modelTier === 'quality' ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-500' : 'bg-gray-50 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600'}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-2 h-2 rounded-full ${modelTier === 'quality' ? 'bg-indigo-500' : 'bg-zinc-400 dark:bg-zinc-600'}`}></div>
                    <span className={`text-xs font-bold ${modelTier === 'quality' ? 'text-indigo-900 dark:text-white' : 'text-zinc-700 dark:text-zinc-300'}`}>Banana Pro</span>
                  </div>
                  <p className="text-[10px] text-zinc-500 leading-tight">Deep reasoning. Uses Gemini 3 Pro.</p>
                </button>
              </div>
            </div>
        </div>

        <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Content Depth</label>
              <div className="grid grid-cols-2 gap-3">
                 <button
                   onClick={() => setPresentationFormat('detailed')}
                   className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden group ${presentationFormat === 'detailed' ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-500' : 'bg-gray-50 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600'}`}
                 >
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-2 h-2 rounded-full ${presentationFormat === 'detailed' ? 'bg-indigo-500' : 'bg-zinc-400 dark:bg-zinc-600'}`}></div>
                      <span className={`text-sm font-bold ${presentationFormat === 'detailed' ? 'text-indigo-900 dark:text-white' : 'text-zinc-700 dark:text-zinc-300'}`}>Detailed Deck</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 leading-tight">Insight-heavy, for data review.</p>
                 </button>

                 <button
                   onClick={() => setPresentationFormat('presenter')}
                   className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden group ${presentationFormat === 'presenter' ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-500' : 'bg-gray-50 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600'}`}
                 >
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-2 h-2 rounded-full ${presentationFormat === 'presenter' ? 'bg-indigo-500' : 'bg-zinc-400 dark:bg-zinc-600'}`}></div>
                      <span className={`text-sm font-bold ${presentationFormat === 'presenter' ? 'text-indigo-900 dark:text-white' : 'text-zinc-700 dark:text-zinc-300'}`}>Executive Pitch</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 leading-tight">Visual hero slides for high-impact.</p>
                 </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Language</label>
                  <div className="flex flex-col gap-2">
                     <button onClick={() => setLanguage('English')} className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all ${language === 'English' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-gray-50 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800'}`}>🇺🇸 English</button>
                     <button onClick={() => setLanguage('Chinese')} className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all ${language === 'Chinese' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-gray-50 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800'}`}>🇨🇳 Chinese</button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Export Medium</label>
                  <div className="flex flex-col gap-2">
                     <button onClick={() => setExportFormat('pptx')} className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all ${exportFormat === 'pptx' ? 'bg-orange-600 border-orange-500 text-white' : 'bg-gray-50 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800'}`}>PowerPoint</button>
                     <button onClick={() => setExportFormat('pdf')} className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all ${exportFormat === 'pdf' ? 'bg-red-600 border-red-500 text-white' : 'bg-gray-50 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800'}`}>PDF Document</button>
                  </div>
                </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Executive Style</label>
                <div className="flex bg-gray-100 dark:bg-zinc-900 rounded-lg p-0.5 border border-zinc-300 dark:border-zinc-700">
                  <button onClick={() => setIsCustomStyle(false)} className={`text-[10px] px-2 py-1 rounded-md transition-all ${!isCustomStyle ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>Presets</button>
                  <button onClick={() => setIsCustomStyle(true)} className={`text-[10px] px-2 py-1 rounded-md transition-all ${isCustomStyle ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>Brand Clone</button>
                </div>
              </div>

              {!isCustomStyle ? (
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                  {availableStyles.map(style => (
                    <button key={style.id} onClick={() => setSelectedStyleId(style.id)} className={`relative p-3 rounded-lg border text-left transition-all hover:scale-[1.02] ${selectedStyleId === style.id ? 'border-indigo-500 ring-1 ring-indigo-500 bg-white dark:bg-zinc-800 shadow-sm' : 'border-zinc-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900/50 hover:bg-gray-100'}`}>
                       <div className="flex items-center gap-2 mb-1">
                          <div className="w-3 h-3 rounded-full border border-zinc-400 shadow-sm" style={{ backgroundColor: style.previewColor }}></div>
                          <span className={`text-xs font-bold ${selectedStyleId === style.id ? 'text-indigo-900 dark:text-white' : 'text-zinc-600 dark:text-zinc-400'}`}>{style.name}</span>
                       </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                   <div className="flex bg-gray-100 dark:bg-zinc-800 p-1 rounded-lg self-start">
                     <button onClick={() => setCustomMode('image')} className={`px-3 py-1 text-[10px] rounded-md transition-all ${customMode === 'image' ? 'bg-white dark:bg-zinc-700 shadow text-zinc-900 dark:text-white' : 'text-zinc-500'}`}>Upload Master</button>
                     <button onClick={() => setCustomMode('text')} className={`px-3 py-1 text-[10px] rounded-md transition-all ${customMode === 'text' ? 'bg-white dark:bg-zinc-700 shadow text-zinc-900 dark:text-white' : 'text-zinc-500'}`}>Tone Probe</button>
                   </div>
                   {customMode === 'image' ? (
                     <div className={`border-2 border-dashed ${styleRef ? 'border-indigo-500/50' : 'border-zinc-300 dark:border-zinc-700'} rounded-xl p-4 text-center transition-colors h-32 flex flex-col items-center justify-center relative overflow-hidden bg-gray-50 dark:bg-zinc-950`}>
                        {styleRef ? (
                          <>
                             <img src={styleRef} alt="Reference" className="h-full mx-auto rounded-lg object-contain relative z-10" />
                             <div className="absolute inset-0 bg-black/50 z-0"></div>
                             <button onClick={() => { setStyleRef(null); setCustomStyleDesc('Modern Corporate Minimalist'); setCustomThemeColors({}); }} className="absolute top-2 right-2 bg-red-500 rounded-full p-1 text-white hover:bg-red-600 z-20"><XIcon className="w-3 h-3" /></button>
                          </>
                        ) : (
                          <label className="cursor-pointer block w-full h-full flex flex-col items-center justify-center">
                             <ImageIcon className="w-8 h-8 mx-auto text-zinc-400 mb-1" />
                             <span className="text-zinc-500 text-[10px] font-bold">Upload Slide Style</span>
                             <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                          </label>
                        )}
                     </div>
                   ) : (
                     <div className="space-y-2">
                       <textarea value={customTextPrompt} onChange={(e) => setCustomTextPrompt(e.target.value)} placeholder="e.g. Sophisticated consulting style, midnight blue with gold gradients..." className="w-full bg-gray-50 dark:bg-zinc-950 border border-zinc-300 rounded-lg p-3 text-[10px] text-zinc-900 dark:text-white min-h-[80px] outline-none" />
                       <button onClick={handleGenerateStyleFromText} disabled={analyzing || !customTextPrompt} className="w-full bg-zinc-800 text-white text-[10px] font-bold py-2 rounded-lg disabled:opacity-50 transition-colors flex items-center justify-center gap-2"><SparklesIcon className="w-3 h-3"/>Generate Brand Palette</button>
                     </div>
                   )}
                </div>
              )}
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300">Target Narrative Length</label>
                <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{slideCount} Slides</span>
              </div>
              <input type="range" min="1" max="50" value={slideCount} onChange={(e) => setSlideCount(parseInt(e.target.value))} className="w-full h-2 bg-gray-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
            </div>

            <button
              onClick={handleSubmit}
              disabled={!topic || analyzing || parsingFile}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 mt-auto"
            >
              {analyzing ? <SparklesIcon className="w-5 h-5 animate-spin"/> : <SparklesIcon className="w-5 h-5" />}
              {analyzing ? 'Drafting Strategy...' : 'Construct Narrative Outline'}
            </button>
        </div>
      </div>

      <button onClick={() => setIsBrainstorming(true)} className="absolute -bottom-5 -right-5 bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white p-4 rounded-full shadow-xl hover:scale-110 transition-transform border border-zinc-100 dark:border-indigo-500 z-10 group">
         <LightbulbIcon className="w-6 h-6" />
      </button>

      {isBrainstorming && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 relative">
              <button onClick={() => setIsBrainstorming(false)} className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-white"><XIcon className="w-5 h-5" /></button>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2 flex items-center gap-2"><LightbulbIcon className="w-5 h-5 text-yellow-500" />Idea Hub</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">Gemini 3 Pro helps refine your narrative angle.</p>
              <div className="flex gap-2 mb-6">
                 <input value={brainstormQuery} onChange={(e) => setBrainstormQuery(e.target.value)} placeholder="Topic keyword..." className="flex-1 bg-gray-50 dark:bg-zinc-950 border border-zinc-300 rounded-lg px-3 py-2 text-xs text-zinc-900 dark:text-white outline-none focus:border-indigo-500" />
                 <button onClick={handleBrainstorm} disabled={isThinking || !brainstormQuery} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-indigo-500">Explore</button>
              </div>
              <div className="bg-gray-50 dark:bg-black/20 rounded-lg p-4 min-h-[150px] max-h-[300px] overflow-y-auto whitespace-pre-wrap text-xs text-zinc-700 dark:text-zinc-300 border border-zinc-100 dark:border-zinc-800/50">{brainstormResult || <span className="text-zinc-400 italic">Suggestions will appear here...</span>}</div>
           </div>
        </div>
      )}
    </div>
  );
};
