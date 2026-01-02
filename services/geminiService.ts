
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { ImageSize, OutlineItem, Slide, Language, PresentationFormat, VisualTheme, ExportFormat, AnalyzedStyle, ModelTier, Callout } from "../types";

const getClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

const safeJsonParse = (text: string | undefined | null, fallback: any = {}) => {
  if (!text || text === "undefined" || text === "null") return fallback;
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s+/, '').replace(/\s+```$/, '');
  }
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    console.warn("[Gemini Service] Initial JSON Parse failed, attempting repair...", e);
    try {
      let repaired = cleaned;
      const openQuotes = (repaired.match(/"/g) || []).length;
      if (openQuotes % 2 !== 0) {
        if (repaired.endsWith('\\')) repaired = repaired.slice(0, -1);
        repaired += '"';
      }
      let stack: string[] = [];
      let isInsideString = false;
      let i = 0;
      while (i < repaired.length) {
        const char = repaired[i];
        if (char === '"' && (i === 0 || repaired[i-1] !== '\\')) {
          isInsideString = !isInsideString;
        } else if (!isInsideString) {
          if (char === '{' || char === '[') stack.push(char);
          else if (char === '}') { if (stack.length > 0 && stack[stack.length - 1] === '{') stack.pop(); }
          else if (char === ']') { if (stack.length > 0 && stack[stack.length - 1] === '[') stack.pop(); }
        }
        i++;
      }
      while (stack.length > 0) {
        const last = stack.pop();
        if (last === '{') repaired += '}';
        else if (last === '[') repaired += ']';
      }
      repaired = repaired.replace(/,\s*([}\]])/g, '$1');
      return JSON.parse(repaired);
    } catch (repairError) {
      console.error("[Gemini Service] JSON Repair failed completely.", repairError);
      return fallback;
    }
  }
};

export const suggestChartCallouts = async (chartTitle: string, data: {label: string, value: number}[]): Promise<Callout[]> => {
  const ai = getClient();
  const prompt = `Analyze chart "${chartTitle}" data: ${JSON.stringify(data)}. Generate 2-3 insights. Return JSON array of {value, text, position: 'top-left'|'top-right'|'bottom-left'|'bottom-right'}.`;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              value: { type: Type.STRING },
              text: { type: Type.STRING },
              position: { type: Type.STRING, enum: ['top-left', 'top-right', 'bottom-left', 'bottom-right'] }
            },
            required: ['value', 'text', 'position']
          }
        }
      }
    });
    return safeJsonParse(response.text, []);
  } catch (err) {
    return [];
  }
};

export const generateSlideContent = async (
  topic: string, 
  outlineItem: OutlineItem, 
  styleDesc: string,
  language: Language,
  presentationFormat: PresentationFormat = 'presenter',
  exportFormat: ExportFormat = 'pdf',
  tier: ModelTier = 'quality',
  visualPlan?: any
): Promise<Slide> => {
  const ai = getClient();
  const model = tier === 'quality' ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';
  
  const properties: any = {
      title: { type: Type.STRING },
      subtitle: { type: Type.STRING },
      contentPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
      layout: { 
        type: Type.STRING, 
        enum: [
          'title', 'content', 'two-column', 'image', 'image-center', 
          'image-full', 'data', 'quote', 'timeline', 'grid', 
          'big-number', 'process', 'comparison', 'hierarchy', 'map', 'case-study'
        ] 
      },
      speakerNotes: { type: Type.STRING },
      conclusion: { type: Type.STRING },
      bigNumber: { type: Type.STRING },
      bigNumberLabel: { type: Type.STRING },
      quoteAuthor: { type: Type.STRING },
      imagePrompt: { type: Type.STRING, description: "Descriptive prompt for slide visual." }
  };

  const prompt = `
    Generate slide content for: "${outlineItem.title}"
    Context: ${topic.substring(0, 1000)}
    Style: ${styleDesc}
    Visual Context: ${visualPlan ? JSON.stringify(visualPlan) : 'None'}
    
    Language: ${language}. Return JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: { 
        responseMimeType: 'application/json', 
        responseSchema: { type: Type.OBJECT, properties, required: ['title', 'layout', 'contentPoints', 'imagePrompt'] }
      }
    });
    
    const defaultSlide = { title: outlineItem.title, layout: 'content', contentPoints: [], imagePrompt: '', chartData: [], chartType: 'bar' };
    const parsed = safeJsonParse(response.text, defaultSlide);
    
    return { ...defaultSlide, ...parsed, id: outlineItem.id };
  } catch (error) {
    return { id: outlineItem.id, title: outlineItem.title, layout: 'content', contentPoints: ['Error generating content.'], speakerNotes: '', imagePrompt: '', chartData: [] };
  }
};

export const generateSlideImage = async (prompt: string, size: ImageSize, tier: ModelTier = 'quality', styleImage?: string): Promise<string | null> => {
  const ai = getClient();
  const model = tier === 'quality' ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
  
  try {
    const cleanedPrompt = `High-fidelity professional presentation slide visual: ${prompt}. Professional corporate aesthetics, 4k, clean composition.`;
    const parts: any[] = [{ text: cleanedPrompt }];
    
    if (styleImage && styleImage.includes('base64,')) {
      const base64Data = styleImage.split('base64,')[1];
      const mimeType = styleImage.split(';')[0].split(':')[1] || 'image/png';
      parts.push({
        inlineData: {
          mimeType: mimeType,
          data: base64Data
        }
      });
    }

    const imageConfig: any = { aspectRatio: "16:9" };
    if (tier === 'quality') imageConfig.imageSize = size;

    const response = await ai.models.generateContent({
      model: model,
      contents: { parts },
      config: { imageConfig }
    });
    
    const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (part?.inlineData?.data) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  } catch (e) { 
    console.error("[Gemini Service] generateSlideImage Error:", e); 
  }
  return null;
};

export const generateSlideVisual = async (topic: string, outlineItem: OutlineItem, styleDesc: string): Promise<any> => {
  const ai = getClient();
  const prompt = `Determine best layout and image prompt for slide "${outlineItem.title}". Style: ${styleDesc}. Return JSON: {layout, imagePrompt}`;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { 
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            layout: { type: Type.STRING, enum: ['title', 'content', 'two-column', 'image', 'image-center', 'image-full', 'data', 'quote', 'timeline', 'grid', 'big-number', 'process', 'comparison', 'hierarchy', 'map', 'case-study'] },
            imagePrompt: { type: Type.STRING }
          }
        }
      }
    });
    return safeJsonParse(response.text, { layout: 'content', imagePrompt: '' });
  } catch (e) {
    return { layout: 'content', imagePrompt: '' };
  }
};

export const analyzeVisualStyle = async (base64Data: string): Promise<AnalyzedStyle> => {
  const ai = getClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/png', data: base64Data } },
          { text: "Analyze presentation style. Return JSON colors and description." }
        ]
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING },
            colors: {
              type: Type.OBJECT,
              properties: {
                backgroundColor: { type: Type.STRING },
                textColor: { type: Type.STRING },
                accentColor: { type: Type.STRING },
                secondaryColor: { type: Type.STRING },
                isDark: { type: Type.BOOLEAN }
              }
            }
          }
        }
      }
    });
    return safeJsonParse(response.text, { description: 'Corporate', colors: { backgroundColor: '#FFFFFF', textColor: '#1f2937', accentColor: '#1e40af', secondaryColor: '#f3f4f6', isDark: false } });
  } catch (e) {
    return { description: 'Corporate', colors: { backgroundColor: '#FFFFFF', textColor: '#1f2937', accentColor: '#1e40af', secondaryColor: '#f3f4f6', isDark: false } };
  }
};

export const generateStyleFromText = async (prompt: string): Promise<AnalyzedStyle> => {
  const ai = getClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate palette for: "${prompt}". Return JSON.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING },
            colors: {
              type: Type.OBJECT,
              properties: {
                backgroundColor: { type: Type.STRING },
                textColor: { type: Type.STRING },
                accentColor: { type: Type.STRING },
                secondaryColor: { type: Type.STRING },
                isDark: { type: Type.BOOLEAN }
              }
            }
          }
        }
      }
    });
    return safeJsonParse(response.text, { description: prompt, colors: { backgroundColor: '#FFFFFF', textColor: '#1f2937', accentColor: '#1e40af', secondaryColor: '#f3f4f6', isDark: false } });
  } catch (e) {
    return { description: prompt, colors: { backgroundColor: '#FFFFFF', textColor: '#1f2937', accentColor: '#1e40af', secondaryColor: '#f3f4f6', isDark: false } };
  }
};

export async function* brainstormIdeasStream(query: string) {
  const ai = getClient();
  try {
    const response = await ai.models.generateContentStream({
      model: 'gemini-3-flash-preview',
      contents: `Brainstorm angles for: ${query}.`
    });
    for await (const chunk of response) if (chunk.text) yield chunk.text;
  } catch (e) { yield "Error."; }
}

export async function* askAssistantStream(query: string, context: string) {
  const ai = getClient();
  try {
    const response = await ai.models.generateContentStream({
      model: 'gemini-3-flash-preview',
      contents: `Context: ${context}\n\nQuestion: ${query}`,
      config: { tools: [{ googleSearch: {} }] }
    });
    for await (const chunk of response) {
      yield {
        text: chunk.text || '',
        sources: chunk.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((c: any) => c.web?.uri).filter(Boolean) || []
      };
    }
  } catch (e) { yield { text: "Error.", sources: [] }; }
}

export const generateOutline = async (topic: string, docContext: string, slideCount: number, language: Language): Promise<OutlineItem[]> => {
  const ai = getClient();
  const prompt = `Create ${slideCount} slides in ${language} for topic: ${topic}. Context: ${docContext.substring(0, 5000)}. Return JSON array of {title, intent}.`;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { 
        responseMimeType: 'application/json', 
        responseSchema: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, intent: { type: Type.STRING } } } } 
      }
    });
    const parsed = safeJsonParse(response.text, []);
    return parsed.map((o: any, i: number) => ({ title: o.title || `Slide ${i+1}`, intent: o.intent || 'Details', id: `slide-${Date.now()}-${i}` }));
  } catch (e) { return []; }
};
