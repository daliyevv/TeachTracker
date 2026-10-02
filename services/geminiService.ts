import { AnalysisResult, SubmissionFile } from "../types";
import { postJson, ApiError } from "./apiClient";

// `ApiError` ilgari shu fayldan eksport qilinardi; komponentlar undan
// foydalanadi, shuning uchun qayta eksport qilamiz.
export { ApiError };

export const detectPaperBounds = async (base64Image: string): Promise<[number, number, number, number] | null> => {
  try {
    const data = await postJson<{ bounds: [number, number, number, number] | null }>(
      '/api/gemini/detect-paper-bounds',
      { base64Image }
    );
    return data.bounds;
  } catch (error) {
    // Varoq chegarasini topa olmaslik halokat emas — butun rasm ishlatiladi.
    console.error("Detect Bounds Error:", error);
    return null;
  }
};

export const analyzeDictation = (base64Images: string[], originalText: string): Promise<AnalysisResult> =>
  postJson<AnalysisResult>('/api/gemini/analyze-dictation', { base64Images, originalText });

export const analyzeAssignment = (files: SubmissionFile[], instruction: string): Promise<AnalysisResult> =>
  postJson<AnalysisResult>('/api/gemini/analyze-assignment', { files, instruction });

export const generateEducationalMaterial = async (
  prompt: string,
  type: 'lesson_plan' | 'test' | 'worksheet' | 'crossword'
): Promise<any> => {
  try {
    const data = await postJson<{ text?: string } & Record<string, any>>(
      '/api/gemini/generate-material',
      { prompt, type }
    );
    return type === 'crossword' ? data : data.text;
  } catch (error) {
    console.error("Generate Material Error:", error);
    // Xato matnini ko'rsatamiz: ilgari har qanday xatoda bir xil umumiy
    // gap chiqar va o'qituvchi sababini bilmasdi.
    const message = error instanceof ApiError ? error.message : "Material yaratishda xatolik yuz berdi.";
    return type === 'crossword' ? null : message;
  }
};
