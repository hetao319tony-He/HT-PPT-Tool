import React, { useEffect, useState } from 'react';
import { OutlineItem, Language } from '../types';
import { generateOutline } from '../services/geminiService';
import { SparklesIcon, LayoutIcon } from './Icons';

interface Props {
  topic: string;
  docContext: string;
  slideCount?: number; 
  language: Language;
  onConfirm: (outline: OutlineItem[]) => void;
  onBack: () => void;
  onError?: (err: any) => void;
}

export const OutlineStep: React.FC<Props> = ({ topic, docContext, slideCount = 8, language, onConfirm, onBack, onError }) => {
  const [outline, setOutline] = useState<OutlineItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    // Pass the user-selected slide count and language
    generateOutline(topic, docContext, slideCount, language)
      .then(items => {
        if (mounted) {
          setOutline(items);
          setLoading(false);
        }
      })
      .catch(err => {
        console.error(err);
        if (mounted) setLoading(false);
        if (onError) onError(err);
      });
    return () => { mounted = false; };
  }, [topic, docContext, slideCount, language, onError]);

  const updateTitle = (index: number, newTitle: string) => {
    const newOutline = [...outline];
    newOutline[index].title = newTitle;
    setOutline(newOutline);
  };

  const updateIntent = (index: number, newIntent: string) => {
    const newOutline = [...outline];
    newOutline[index].intent = newIntent;
    setOutline(newOutline);
  };

  const removeSlide = (index: number) => {
    setOutline(outline.filter((_, i) => i !== index));
  };

  const addSlide = () => {
    setOutline([...outline, { id: `new-${Date.now()}`, title: "New Slide", intent: "Add custom content" }]);
  };

  if (loading) {
    return (
       <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <div className="relative w-24 h-24 mb-6">
             <div className="absolute inset-0 border-4 border-zinc-800 rounded-full"></div>
             <div className="absolute inset-0 border-4 border-t-indigo-500 rounded-full animate-spin"></div>
             <SparklesIcon className="absolute inset-0 m-auto text-indigo-400 w-8 h-8 animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Thinking...</h2>
          <p className="text-zinc-400">Gemini 3 Pro is structuring your {slideCount}-slide narrative in {language}.</p>
       </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto mt-10 p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
           <h2 className="text-2xl font-bold text-white">Outline Editor</h2>
           <p className="text-zinc-400 text-sm mt-1">Add, remove, or modify slides and their intent before generation.</p>
        </div>
        <div className="flex gap-3">
           <button onClick={onBack} className="px-4 py-2 text-zinc-400 hover:text-white transition-colors">Back</button>
           <button 
             onClick={() => onConfirm(outline)}
             className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium shadow-lg shadow-indigo-500/20"
           >
             Generate {outline.length} Slides
           </button>
        </div>
      </div>

      <div className="space-y-4">
         {outline.map((item, index) => (
           <div key={item.id} className="group flex flex-col md:flex-row gap-4 bg-zinc-900 border border-zinc-800 p-4 rounded-xl hover:border-zinc-700 transition-colors">
              <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500 font-mono text-sm shrink-0">
                     {index + 1}
                  </div>
              </div>
              <div className="flex-1 space-y-2">
                 <input 
                   value={item.title}
                   onChange={(e) => updateTitle(index, e.target.value)}
                   className="w-full bg-transparent text-lg font-semibold text-white outline-none placeholder-zinc-600"
                   placeholder="Slide Title"
                 />
                 <textarea
                   value={item.intent}
                   onChange={(e) => updateIntent(index, e.target.value)}
                   className="w-full bg-zinc-950/50 text-zinc-400 text-sm p-2 rounded border border-zinc-800/50 outline-none focus:border-indigo-500/50 resize-y min-h-[60px]"
                   placeholder="Describe what should be on this slide..."
                 />
              </div>
              <div className="flex items-center">
                  <button 
                    onClick={() => removeSlide(index)}
                    className="p-2 text-zinc-600 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-all"
                    title="Remove Slide"
                  >
                     <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
              </div>
           </div>
         ))}

         <button 
           onClick={addSlide}
           className="w-full py-4 border-2 border-dashed border-zinc-800 text-zinc-500 rounded-xl hover:border-zinc-700 hover:text-zinc-400 transition-all flex items-center justify-center gap-2"
         >
            <div className="w-5 h-5 rounded-full border border-current flex items-center justify-center">+</div>
            Add Slide
         </button>
      </div>
    </div>
  );
};