import { AnalysisResult, SubmissionFile } from "../types";

/**
 * Server xatosi. `message` — foydalanuvchiga ko'rsatiladigan o'zbekcha matn,
 * `detail` esa faqat konsol uchun xom javob.
 *
 * Ilgari xom javob to'g'ridan-to'g'ri `throw` qilinar va `alert()` oynasida
 * ko'rsatilardi — o'quvchi HTML sahifa yoki o'zining uid va email'i bo'lgan
 * JSON ni ko'rardi.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly detail: string;
  constructor(message: string, status: number, detail: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

const messageFor = (status: number, detail: string): string => {
  if (detail.includes('Gemini API timeout') || status === 504 || status === 408) {
    return "Tahlil vaqti tugadi. Rasmlar sonini kamaytirib, qayta urinib ko'ring.";
  }
  if (status === 413) return "Rasm juda katta. Kichikroq rasm yuboring yoki kamroq sahifa tanlang.";
  if (status === 429) return "Server hozir band. Bir oz kutib, qayta urinib ko'ring.";
  if (status === 401 || status === 403) return "Ruxsat yo'q. Tizimdan chiqib, qaytadan kiring.";
  if (status === 503) return "Xizmat vaqtincha ishlamayapti. Birozdan keyin urinib ko'ring.";
  if (status >= 500) return "Serverda xatolik yuz berdi. Qayta urinib ko'ring.";
  return "So'rov bajarilmadi. Internet aloqangizni tekshirib, qayta urinib ko'ring.";
};

/** Muvaffaqiyatsiz javobni foydalanuvchiga tushunarli xatoga aylantiradi. */
const raiseForStatus = async (response: Response): Promise<never> => {
  let detail = '';
  try {
    detail = await response.text();
  } catch {
    // javobni o'qib bo'lmadi - muhim emas
  }
  console.error(`API ${response.status} ${response.url}:`, detail);
  throw new ApiError(messageFor(response.status, detail), response.status, detail);
};

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
  if (!response.ok) await raiseForStatus(response);
  return await response.json() as AnalysisResult;
};

export const analyzeAssignment = async (files: SubmissionFile[], instruction: string): Promise<AnalysisResult> => {
  const response = await fetch('/api/gemini/analyze-assignment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ files, instruction })
  });
  if (!response.ok) await raiseForStatus(response);
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
