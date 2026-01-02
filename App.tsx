
import React, { useState, useEffect } from 'react';
import { AppStep, OutlineItem, Language, ExportFormat, VisualTheme, PresentationFormat, ModelTier } from './types';
import { InputStep } from './components/InputStep';
import { OutlineStep } from './components/OutlineStep';
import { PreviewStep } from './components/PreviewStep';
import { DefaultTheme } from './components/SlideRenderer'; // Fallback
import { ErrorBoundary } from './components/ErrorBoundary';
import { SunIcon, MoonIcon } from './components/Icons';
import { ToastProvider } from './components/Toast';

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>(AppStep.LANDING);
  const [apiKeyReady, setApiKeyReady] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  
  // Data State
  const [language, setLanguage] = useState<Language>('English');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('pptx');
  const [presentationFormat, setPresentationFormat] = useState<PresentationFormat>('presenter');
  const [modelTier, setModelTier] = useState<ModelTier>('efficient');
  const [topic, setTopic] = useState('');
  const [docContext, setDocContext] = useState('');
  const [styleDesc, setStyleDesc] = useState('');
  const [slideCount, setSlideCount] = useState(8);
  const [outline, setOutline] = useState<OutlineItem[]>([]);
  const [currentTheme, setCurrentTheme] = useState<VisualTheme>(DefaultTheme);
  const [styleImage, setStyleImage] = useState<string | undefined>(undefined);

  // Initialize Theme
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Check for API Key on mount
  useEffect(() => {
    const checkKey = async () => {
      const aistudio = (window as any).aistudio;
      if (aistudio) {
        const hasKey = await aistudio.hasSelectedApiKey();
        setApiKeyReady(hasKey);
      } else {
        setApiKeyReady(true);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    const aistudio = (window as any).aistudio;
    if (aistudio) {
      await aistudio.openSelectKey();
      setApiKeyReady(true);
    }
  };

  const handleApiKeyError = (err: any) => {
    console.error("API Key Error detected, resetting auth state:", err);
    setApiKeyReady(false);
  };

  if (!apiKeyReady) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 text-center">
        <h1 className="text-3xl font-bold text-white mb-4">LuminaPresent AI</h1>
        <p className="text-zinc-400 mb-8 max-w-md">
          To generate high-fidelity 4K images and use Gemini 3 Pro, please select a paid API key.
        </p>
        <button 
          onClick={handleSelectKey}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition-transform hover:scale-105"
        >
          Connect Google AI Studio
        </button>
        <a 
          href="https://ai.google.dev/gemini-api/docs/billing" 
          target="_blank" 
          rel="noreferrer"
          className="mt-6 text-sm text-zinc-500 hover:text-zinc-300 underline"
        >
          View Billing Documentation
        </a>
      </div>
    );
  }

  // --- Logic Flow ---

  const handleInputSubmit = (t: string, d: string, s: string, count: number, lang: Language, format: ExportFormat, theme: VisualTheme, pFormat: PresentationFormat, tier: ModelTier, sImg?: string) => {
    setTopic(t);
    setDocContext(d);
    setStyleDesc(s);
    setSlideCount(count);
    setLanguage(lang);
    setExportFormat(format);
    setCurrentTheme(theme);
    setPresentationFormat(pFormat);
    setModelTier(tier);
    setStyleImage(sImg);
    setStep(AppStep.OUTLINE);
  };

  const handleOutlineConfirm = (finalOutline: OutlineItem[]) => {
    setOutline(finalOutline);
    setStep(AppStep.PREVIEW); 
  };

  const handleRestart = () => {
    setStep(AppStep.LANDING);
    setTopic('');
    setDocContext('');
    setOutline([]);
    setStyleImage(undefined);
  };

  return (
    <ToastProvider>
      <div className={`min-h-screen ${isDarkMode ? 'bg-zinc-950 text-white' : 'bg-gray-100 text-gray-900'} transition-colors`}>
        <ErrorBoundary>
          <div className="absolute top-4 right-4 z-50">
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 dark:bg-zinc-800 dark:hover:bg-zinc-700 backdrop-blur border border-zinc-200 dark:border-zinc-700 transition-all text-zinc-600 dark:text-zinc-300"
            >
              {isDarkMode ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
            </button>
          </div>

          {step === AppStep.LANDING && (
            <InputStep onNext={handleInputSubmit} onError={handleApiKeyError} />
          )}
          
          {step === AppStep.OUTLINE && (
            <OutlineStep 
              topic={topic} 
              docContext={docContext} 
              slideCount={slideCount}
              language={language}
              onConfirm={handleOutlineConfirm} 
              onBack={() => setStep(AppStep.LANDING)}
              onError={handleApiKeyError}
            />
          )}

          {(step === AppStep.GENERATING || step === AppStep.PREVIEW) && (
            <PreviewStep 
              topic={topic}
              outline={outline}
              styleDesc={styleDesc}
              language={language}
              exportFormat={exportFormat}
              theme={currentTheme}
              presentationFormat={presentationFormat}
              tier={modelTier}
              styleImage={styleImage}
              onRestart={handleRestart}
              onError={handleApiKeyError}
            />
          )}
        </ErrorBoundary>
      </div>
    </ToastProvider>
  );
};

export default App;
