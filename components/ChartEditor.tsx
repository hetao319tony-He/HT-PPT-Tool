
import React, { useEffect, useState } from 'react';
import { Slide, ChartData, Callout } from '../types';
import { XIcon, RefreshIcon, SparklesIcon } from './Icons';
import { suggestChartCallouts } from '../services/geminiService';
import { useToast } from './Toast';

interface Props {
  slide: Slide;
  onChange: (updates: Partial<Slide>) => void;
}

export const ChartEditor: React.FC<Props> = ({ slide, onChange }) => {
  const { addToast } = useToast();
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [localChartType, setLocalChartType] = useState<'bar' | 'line' | 'pie'>(slide.chartType || 'bar');

  useEffect(() => {
    if (slide.chartType) {
      setLocalChartType(slide.chartType);
    }
  }, [slide.id, slide.chartType]);

  const handleDataChange = (index: number, field: keyof ChartData, value: string | number) => {
    const newData = [...(slide.chartData || [])];
    if (newData[index]) {
      newData[index] = { ...newData[index], [field]: value };
      onChange({ chartData: newData });
    }
  };

  const addRow = () => {
    const newData = [...(slide.chartData || []), { label: 'New Item', value: 10 }];
    onChange({ chartData: newData });
  };

  const removeRow = (index: number) => {
    const newData = (slide.chartData || []).filter((_, i) => i !== index);
    onChange({ chartData: newData });
  };

  const updateChartType = (type: 'bar' | 'line' | 'pie') => {
    setLocalChartType(type);
    onChange({ chartType: type });
  };

  const handleCalloutChange = (index: number, field: keyof Callout, value: string) => {
    const newCallouts = [...(slide.callouts || [])];
    if (newCallouts[index]) {
      newCallouts[index] = { ...newCallouts[index], [field]: value };
      onChange({ callouts: newCallouts });
    }
  };

  const addCallout = () => {
    const newCallouts = [...(slide.callouts || []), { text: 'New Insight', value: '0', position: 'top-left' as const }];
    onChange({ callouts: newCallouts });
  };

  const removeCallout = (index: number) => {
    const newCallouts = (slide.callouts || []).filter((_, i) => i !== index);
    onChange({ callouts: newCallouts });
  };

  const handleSuggestInsights = async () => {
    if (!slide.chartData || slide.chartData.length === 0) {
        addToast("Add some data first to generate insights.", "info");
        return;
    }
    setIsSuggesting(true);
    try {
        const insights = await suggestChartCallouts(slide.title, slide.chartData);
        if (insights.length > 0) {
            onChange({ callouts: insights });
            addToast("AI Insights generated!", "success");
        } else {
            addToast("Could not generate insights.", "error");
        }
    } catch (err) {
        addToast("Error contacting AI service.", "error");
    } finally {
        setIsSuggesting(false);
    }
  };

  const initializeData = () => {
    onChange({ 
        chartType: 'bar', 
        chartData: [
            { label: 'Category A', value: 45 }, 
            { label: 'Category B', value: 72 },
            { label: 'Category C', value: 38 }
        ],
        advancedChartConfig: undefined 
    });
  };

  if (!slide.chartData || slide.chartData.length === 0) {
      return (
          <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
              <p className="text-xs text-indigo-800 dark:text-indigo-200 mb-3">
                  This slide has no editable chart data. Click below to create a new chart.
              </p>
              <button 
                onClick={initializeData}
                className="w-full text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-lg font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
              >
                  <RefreshIcon className="w-3 h-3" />
                  Initialize Manual Chart
              </button>
          </div>
      );
  }

  return (
    <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
        <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Manual Chart Control</h4>
            </div>

            {/* Type Selector */}
            <div className="grid grid-cols-3 gap-2">
                {(['bar', 'line', 'pie'] as const).map(t => (
                    <button
                        key={t}
                        onClick={() => updateChartType(t)}
                        className={`py-1.5 px-2 rounded-md text-xs font-medium capitalize border transition-all ${localChartType === t ? 'bg-indigo-600 border-indigo-500 text-white shadow-md scale-[1.02]' : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400'}`}
                    >
                        {t}
                    </button>
                ))}
            </div>

            {/* Data Table */}
            <div className="space-y-2">
                <div className="grid grid-cols-[1fr_80px_30px] gap-2 text-[10px] font-bold text-zinc-400 uppercase tracking-wider px-1">
                    <div>Label</div>
                    <div>Value</div>
                    <div></div>
                </div>
                
                <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
                    {slide.chartData.map((item, idx) => (
                        <div key={idx} className="grid grid-cols-[1fr_80px_30px] gap-2 items-center">
                            <input 
                                value={item.label}
                                onChange={(e) => handleDataChange(idx, 'label', e.target.value)}
                                className="bg-gray-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-900 dark:text-white outline-none focus:border-indigo-500 transition-colors"
                            />
                            <input 
                                type="number"
                                value={item.value}
                                onChange={(e) => handleDataChange(idx, 'value', parseFloat(e.target.value) || 0)}
                                className="bg-gray-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-900 dark:text-white outline-none focus:border-indigo-500 transition-colors"
                            />
                            <button 
                                onClick={() => removeRow(idx)}
                                className="flex items-center justify-center h-full text-zinc-400 hover:text-red-500 transition-colors"
                            >
                                <XIcon className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                </div>
                
                <button 
                    onClick={addRow}
                    className="w-full py-2 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg text-xs text-zinc-500 hover:text-indigo-500 hover:border-indigo-500 transition-colors font-medium"
                >
                    + Add Data Row
                </button>
            </div>
        </div>

        {/* AI Insights / Callouts Section */}
        <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-2">
                    <SparklesIcon className="w-3.5 h-3.5 text-indigo-500" />
                    AI Insights & Callouts
                </h4>
                <button 
                    onClick={handleSuggestInsights}
                    disabled={isSuggesting}
                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-500 flex items-center gap-1.5 disabled:opacity-50"
                >
                    {isSuggesting ? <RefreshIcon className="w-3 h-3 animate-spin" /> : <SparklesIcon className="w-3 h-3" />}
                    Suggest AI Insights
                </button>
            </div>

            <div className="space-y-3">
                {(slide.callouts || []).map((callout, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl space-y-2 relative group/callout">
                        <button 
                            onClick={() => removeCallout(idx)}
                            className="absolute top-2 right-2 text-zinc-400 hover:text-red-500 opacity-0 group-hover/callout:opacity-100 transition-opacity"
                        >
                            <XIcon className="w-3 h-3" />
                        </button>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-[9px] font-bold text-zinc-400 uppercase block mb-1">Value</label>
                                <input 
                                    value={callout.value}
                                    onChange={(e) => handleCalloutChange(idx, 'value', e.target.value)}
                                    placeholder="e.g. 45%"
                                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded px-2 py-1 text-xs text-zinc-900 dark:text-white outline-none focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="text-[9px] font-bold text-zinc-400 uppercase block mb-1">Position</label>
                                <select 
                                    value={callout.position}
                                    onChange={(e) => handleCalloutChange(idx, 'position', e.target.value as any)}
                                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded px-2 py-1 text-xs text-zinc-900 dark:text-white outline-none focus:border-indigo-500"
                                >
                                    <option value="top-left">Top Left</option>
                                    <option value="top-right">Top Right</option>
                                    <option value="bottom-left">Bottom Left</option>
                                    <option value="bottom-right">Bottom Right</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="text-[9px] font-bold text-zinc-400 uppercase block mb-1">Label Text</label>
                            <input 
                                value={callout.text}
                                onChange={(e) => handleCalloutChange(idx, 'text', e.target.value)}
                                placeholder="e.g. Growth Velocity"
                                className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded px-2 py-1 text-xs text-zinc-900 dark:text-white outline-none focus:border-indigo-500"
                            />
                        </div>
                    </div>
                ))}
                
                <button 
                    onClick={addCallout}
                    className="w-full py-2 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg text-[10px] text-zinc-500 hover:text-indigo-500 hover:border-indigo-500 transition-colors font-bold uppercase"
                >
                    + Add Manual Insight
                </button>
            </div>
        </div>

        {slide.advancedChartConfig && (
            <p className="text-[10px] text-zinc-500 italic mt-2 text-center">
                Note: Manual edits will override the AI-generated advanced layout.
            </p>
        )}
    </div>
  );
};
