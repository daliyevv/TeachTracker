import { AnalysisResult, SubmissionFile } from "../types";

export const detectPaperBounds = async (base64Image: string): Promise<[number, number, number, number] | null> => {
  try {
    const response = await fetch('/api/gemini/detect-paper-bounds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64Image })
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text);
    }
    const data = await response.json();
    return data.bounds;
  } catch (error) {
    console.error("Detect Bounds Error:", error);
    return null;
  }
};

export const analyzeDictation = async (base64Images: string[], originalText: string): Promise<AnalysisResult> => {
  const response = await fetch('/api/gemini/analyze-dictation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base64Images, originalText })
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text);
  }
  return await response.json() as AnalysisResult;
};

export const analyzeAssignment = async (files: SubmissionFile[], instruction: string): Promise<AnalysisResult> => {
  const response = await fetch('/api/gemini/analyze-assignment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ files, instruction })
  });
  if (!response.ok) {
    const text = await response.text();
    if (text.includes("Gemini API timeout")) {
      throw new Error("Tahlil qilish vaqti tugadi (60s). Fayllar juda katta bo'lishi mumkin.");
    }
    throw new Error(text);
  }
  return await response.json() as AnalysisResult;
};

export const generateEducationalMaterial = async (prompt: string, type: 'lesson_plan' | 'test' | 'worksheet' | 'crossword'): Promise<any> => {
  try {
    const response = await fetch('/api/gemini/generate-material', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, type })
    });
    if (!response.ok) {
        const text = await response.text();
        throw new Error(text);
    }
    const data = await response.json();
    return type === 'crossword' ? data : data.text;
  } catch (error) {
    console.error("Generate Material Error:", error);
    return type === 'crossword' ? null : "Material yaratishda xatolik yuz berdi.";
  }
};
