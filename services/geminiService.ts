
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { AnalysisResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function callWithRetry(fn: () => Promise<any>, maxRetries = 3): Promise<any> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      if (error.message?.includes('429') || error.status === 429) {
        const waitTime = Math.pow(2, i) * 2000 + Math.random() * 1000;
        await sleep(waitTime);
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

export const detectPaperBounds = async (base64Image: string): Promise<[number, number, number, number] | null> => {
  return callWithRetry(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Image.split(',')[1] || base64Image } },
          { text: "Ushbu rasmdagi yozuv yozilgan asosiy oq varoqni top. Uning [ymin, xmin, ymax, xmax] koordinatalarini 0-1000 oralig'ida faqat JSON formatida qaytar. 'bounds' kalitidan foydalan." }
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            bounds: { type: Type.ARRAY, items: { type: Type.NUMBER } }
          },
          required: ["bounds"]
        }
      }
    });
    const result = JSON.parse(response.text);
    return result.bounds;
  });
};

export const analyzeDictation = async (base64Image: string, originalText: string): Promise<AnalysisResult> => {
  const systemInstruction = `
    Sen 1-5 sinf o'quvchilari uchun eng qattiqqo'l lekin adolatli o'zbek tili o'qituvchisisan.
    
    DIQQAT! 'o‘' VA 'g‘' HARFLARI UCHUN MAXSUS KO'RSATMA:
    - O'zbek lotin alifbosida 'o‘' va 'g‘' harflari ustida teskari vergul (ʻ) ishlatiladi.
    - QO'LYOZMADA (HUSNIHATDA) bolalar bu belgini ko'pincha "to'lqinli chiziq" (~), "yotiq chiziq" (-) yoki "nuqta" shaklida yozishadi.
    - AGAR Rasmda 'o' yoki 'g' harfi ustida QANDAYDIR BELGI (to'lqin, chiziq, nuqta) bo'lsa, bu 100% TO'G'RI!
    - Buni imlo xatosi deb hisoblash QAT'IYAN TAQIQLANADI. 
    - Faqatgina 'o' yoki 'g' harfi ustida UMUMAN BELGI BO'LMASA, o'shanda imlo xatosi deb belgilashing mumkin.

    IMLO TEKSHIRISH (SPELLING):
    - Asl matn: "${originalText}"
    - O'quvchi yozgan har bir so'zni ushbu asl matn bilan harfma-harf solishtir.
    - Harf tushib qolishi (masalan: "maktab" o'rniga "matab") yoki ortiqcha harf qo'shilishini xato deb ol.
    - Tinish belgilariga (nuqta, vergul, so'roq) ham e'tibor ber.

    KOORDINATALAR:
    - Har bir xatoni rasmda [ymin, xmin, ymax, xmax] koordinatalari bilan aniq ko'rsat.
  `;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      extractedText: { type: Type.STRING },
      correctedText: { type: Type.STRING },
      mistakes: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            word: { type: Type.STRING },
            correction: { type: Type.STRING },
            description: { type: Type.STRING },
            type: { type: Type.STRING, enum: ["imlo", "tinish_belgisi", "uslub"] },
            lineNumber: { type: Type.INTEGER },
            boundingBox: { type: Type.ARRAY, items: { type: Type.NUMBER } }
          },
          required: ["word", "correction", "description", "type", "lineNumber", "boundingBox"]
        }
      },
      grade: { type: Type.NUMBER },
      handwritingScore: { type: Type.NUMBER },
      feedback: { type: Type.STRING },
      improvementTips: { type: Type.ARRAY, items: { type: Type.STRING } }
    },
    required: ["extractedText", "correctedText", "mistakes", "grade", "handwritingScore", "feedback", "improvementTips"]
  };

  return callWithRetry(async () => {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Image.split(',')[1] || base64Image } },
          { text: `Diktantni "${originalText}" matni asosida tekshir. Eslatma: 'o‘' va 'g‘' harflari ustidagi to'lqinli belgilarni to'g'ri deb qabul qil.` }
        ],
      },
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema,
      },
    });

    return JSON.parse(response.text);
  });
};
