
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI, Type, Modality } from "@google/genai";
import Stripe from "stripe";

dotenv.config();

const app = express();

// Stripe kaliti bo'lmasa ham server ishga tushishi kerak. Aks holda
// `new Stripe("")` modul yuklanishida xato tashlab, butun /api/* ni
// (Gemini funksiyalarini ham) ishdan chiqaradi.
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, { apiVersion: "2025-02-24.acacia" as any })
  : null;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Gemini Setup
const getApiKey = () => {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === "undefined" || key === "") {
    console.error("GEMINI_API_KEY is missing. Please set it in the environment variables.");
    return "MISSING_KEY";
  }
  return key;
};

const ai = new GoogleGenAI({
  apiKey: getApiKey(),
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error("Gemini API timeout")), timeoutMs)
    )
  ]);
};

async function generateWithFallback(params: {
  contents: any;
  config?: any;
  preferredModel?: string;
  timeoutMs?: number;
}) {
  const models = [
    params.preferredModel || 'gemini-3.1-pro-preview',
    'gemini-3.8-flash',
    'gemini-flash-latest'
  ];
  const uniqueModels = [...new Set(models)];
  let lastError: any = null;

  for (const model of uniqueModels) {
    try {
      const response = await withTimeout(
        ai.models.generateContent({
          model,
          contents: params.contents,
          config: params.config,
        }),
        params.timeoutMs || 45000
      );
      return response;
    } catch (err: any) {
      console.warn(`Model ${model} failed:`, err?.message || err);
      lastError = err;
    }
  }
  throw lastError;
}

function sanitizeMistakeBoundingBox(m: any) {
  let box = Array.isArray(m.box_2d) && m.box_2d.length === 4
    ? [...m.box_2d]
    : (Array.isArray(m.boundingBox) && m.boundingBox.length === 4 ? [...m.boundingBox] : [0, 0, 0, 0]);

  if (box.length === 4) {
    let [c0, c1, c2, c3] = box.map((v: any) => Number(v) || 0);
    // 1. Agar 0.0 - 1.0 oralig'ida bo'lsa (kasr sonlar), 1000 ga ko'paytiramiz
    const maxVal = Math.max(c0, c1, c2, c3);
    if (maxVal > 0 && maxVal <= 1.0) {
      c0 *= 1000;
      c1 *= 1000;
      c2 *= 1000;
      c3 *= 1000;
    }

    // Gemini 2D koordinatalari: [ymin, xmin, ymax, xmax]
    let ymin = Math.min(c0, c2);
    let ymax = Math.max(c0, c2);
    let xmin = Math.min(c1, c3);
    let xmax = Math.max(c1, c3);

    ymin = Math.max(0, Math.min(1000, Math.round(ymin)));
    xmin = Math.max(0, Math.min(1000, Math.round(xmin)));
    ymax = Math.max(0, Math.min(1000, Math.round(ymax)));
    xmax = Math.max(0, Math.min(1000, Math.round(xmax)));

    // Agar juda tor bo'lsa, minimal 8 birlik bilan o'rtasidan ochamiz
    if (xmax - xmin < 8 && xmax - xmin >= 0) {
      const mid = (xmin + xmax) / 2;
      xmin = Math.max(0, Math.round(mid - 4));
      xmax = Math.min(1000, Math.round(mid + 4));
    }
    if (ymax - ymin < 8 && ymax - ymin >= 0) {
      const mid = (ymin + ymax) / 2;
      ymin = Math.max(0, Math.round(mid - 4));
      ymax = Math.min(1000, Math.round(mid + 4));
    }

    box = [ymin, xmin, ymax, xmax];
  } else {
    box = [0, 0, 0, 0];
  }
  return {
    ...m,
    box_2d: box,
    boundingBox: box,
    pageIndex: typeof m.pageIndex === 'number' ? m.pageIndex : 0
  };
}

// API Routes
app.post("/api/gemini/detect-paper-bounds", async (req, res) => {
  try {
    const { base64Image } = req.body;
    if (!base64Image) {
      return res.status(400).json({ error: "base64Image is required" });
    }
    const mimeType = base64Image.startsWith('data:image/png') ? 'image/png' : 'image/jpeg';
    const cleanData = base64Image.split(',')[1] || base64Image;

    const response = await generateWithFallback({
      preferredModel: 'gemini-3.8-flash',
      contents: {
        parts: [
          { inlineData: { mimeType, data: cleanData } },
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
      },
      timeoutMs: 15000
    });

    const result = JSON.parse(response.text || "{\"bounds\": null}");
    res.json({ bounds: result.bounds || null });
  } catch (error: any) {
    console.warn("Detect Bounds Warn (falling back to full image):", error?.message || error);
    res.json({ bounds: null });
  }
});

app.post("/api/gemini/analyze-dictation", async (req, res) => {
  try {
    const { base64Images, originalText } = req.body;
    if (!base64Images || !Array.isArray(base64Images) || base64Images.length === 0) {
      return res.status(400).json({ error: "base64Images is required" });
    }
    
    const systemInstruction = `
      Sen 1-5 sinf o'quvchilari uchun eng qattiqqo'l lekin adolatli o'zbek tili o'qituvchisisan.
      
      DIQQAT! 'o‘' VA 'g‘' HARFLARI UCHUN MAXSUS KO'RSATMA:
      - O'zbek lotin alifbosida 'o‘' va 'g‘' harflari ustida teskari vergul (ʻ) ishlatiladi.
      - QO'LYOZMADA (HUSNIHATDA) bolalar bu belgini ko'pincha "to'lqinli chiziq" (~), "yotiq chiziq" (-) yoki "nuqta" shaklida yozishadi.
      - AGAR Rasmda 'o' yoki 'g' harfi ustida QANDAYDIR BELGI (to'lqin, chiziq, nuqta) bo'lsa, bu 100% TO'G'RI!
      - Buni imlo xatosi deb hisoblash QAT'IYAN TAQIQLANADI. 
      - Faqatgina 'o' yoki 'g' harfi ustida UMUMAN BELGI BO'LMASA, o'shanda imlo xatosi deb belgilashing mumkin.

      IMLO VA TINISH BELGILARINI TEKSHIRISH (SPELLING & PUNCTUATION):
      - Asl matn: "${originalText || ''}"
      - O'quvchi yozgan har bir so'zni ushbu asl matn bilan so'zma-so'z, harfma-harf solishtir.
      - Harf tushib qolishi, ortiqcha harf qo'shilishi yoki xato harf yozilishini aniq top.
      - Tinish belgilariga (nuqta, vergul, ikki nuqta ':', undov '!', so'roq '?') qat'iy e'tibor ber.

      2D SPATIAL GROUNDING (BOX_2D KOORDINATALARNI ANIQLASH):
      Detect the 2D bounding boxes of each misspelled word in the handwritten image in box_2d [ymin, xmin, ymax, xmax] normalized to 0-1000.
      
      QAT'IY QOIDALAR (XATO SO'ZNING O'RNINI 100% ANIQ CHIZISH UCHUN):
      1. KONTEKST VA ANKORLAR:
         - 'lineSnippet': Xato so'z joylashgan butun qator matnini yozing.
         - 'precedingWord': Xato so'zdan bevosita oldin kelgan so'zni yozing (chapdagi qo'shni so'z). Agar qator boshi bo'lsa '^' deb yozing.
         - 'word': O'quvchi yozgan aynan xato bitta so'z.
         - 'box_2d': [ymin, xmin, ymax, xmax] — Aynan shu bitta so'zning rasm ustidagi chegaralari.
      
      2. OLDINGI SO'ZNI YOKI BUTUN GAPNI QAMRASH QAT'IYAN TAQIQLANADI:
         - Masalan: Agar qatorda 'javob berdi:' iborasi bo'lib, xato faqat 'berdi:' so'zida bo'lsa:
           * precedingWord: "javob"
           * word: "berdi:"
           * box_2d: xmin nuqtasi 'javob' so'zidan keyin, 'berdi:' so'zining birinchi 'b' harfidan boshlanishi shart! xmax esa ':' belgisi tugagan joyda bo'lsin.
           * Qizil chiziq 'javob' so'ziga EMAS, aynan 'berdi:' so'ziga tushishi shart!
      
      3. TINISH BELGISI XATOLIKLARI:
         - Agar tinish belgisi (masalan ':') xato bo'lsa, xato o'sha tinish belgisi tegishli so'z ('berdi:') va uning belgisini o'rab tursin.
      
      4. KOORDINATA TA'RIFI (0 dan 1000 gacha butun sonlar):
         * ymin: So'z harflarining tepa nuqtasi (0-1000)
         * xmin: So'zning birinchi harfi boshlanish nuqtasi (0-1000)
         * ymax: So'z harflarining tagi / asosi (0-1000)
         * xmax: So'zning oxirgi harfi / belgisi tugash nuqtasi (0-1000)
      - AGAR BIR NECHTA RASM BO'LSA, xato qaysi rasmda ekanligini 'pageIndex' (0 dan boshlab) orqali ko'rsat.
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
              lineSnippet: { type: Type.STRING, description: "Xato qatnashgan butun qator matni" },
              precedingWord: { type: Type.STRING, description: "Xato so'zdan oldingi chapdagi so'z. Agar qator boshi bo'lsa '^'" },
              word: { type: Type.STRING, description: "O'quvchi daftarga yozgan aynan bitta xato so'z" },
              correction: { type: Type.STRING, description: "So'zning to'g'ri varianti" },
              description: { type: Type.STRING },
              type: { type: Type.STRING, enum: ["imlo", "tinish_belgisi", "uslub"] },
              lineNumber: { type: Type.INTEGER },
              box_2d: { 
                type: Type.ARRAY, 
                items: { type: Type.INTEGER },
                description: "Detect 2D bounding box [ymin, xmin, ymax, xmax] (0-1000) of the exact handwritten word"
              },
              pageIndex: { type: Type.INTEGER }
            },
            required: ["word", "correction", "description", "type", "lineNumber", "box_2d", "pageIndex"]
          }
        },
        grade: { type: Type.NUMBER },
        handwritingScore: { type: Type.NUMBER },
        feedback: { type: Type.STRING },
        improvementTips: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ["extractedText", "correctedText", "mistakes", "grade", "handwritingScore", "feedback", "improvementTips"]
    };

    const imageParts = base64Images.map((img: string) => {
      const mimeType = img.startsWith('data:image/png') ? 'image/png' : 'image/jpeg';
      const cleanData = img.split(',')[1] || img;
      return {
        inlineData: { mimeType, data: cleanData }
      };
    });

    const response = await generateWithFallback({
      preferredModel: 'gemini-3.8-flash',
      contents: {
        parts: [
          ...imageParts,
          { text: `Diktantni "${originalText || ''}" matni asosida tekshir. Detect 2D bounding boxes (box_2d) of each mistake in the handwritten images accurately.` }
        ],
      },
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema,
      },
      timeoutMs: 45000
    });

    const result = JSON.parse(response.text || "{}");
    if (!result.mistakes) result.mistakes = [];
    result.mistakes = result.mistakes.map(sanitizeMistakeBoundingBox);
    if (result.grade === undefined) result.grade = 3;
    if (result.handwritingScore === undefined) result.handwritingScore = 4;
    if (!result.feedback) result.feedback = "Vazifa qabul qilindi va tekshirildi.";
    if (!result.improvementTips) result.improvementTips = [];
    if (!result.extractedText) result.extractedText = originalText || "";
    if (!result.correctedText) result.correctedText = originalText || "";
    res.json(result);
  } catch (error: any) {
    console.error("Analyze Dictation Error:", error);
    res.status(500).json({ error: error.message || "Diktantni tahlil qilishda xatolik yuz berdi" });
  }
});

app.post("/api/gemini/analyze-assignment", async (req, res) => {
  try {
    const { files, instruction } = req.body;
    const systemInstruction = `
      Sen professional va zamonaviy o'qituvchisan. 
      Berilgan topshiriq shartlari (instruction) asosida o'quvchi topshirgan fayllarni (kod, PDF, rasm, matn, .ipynb Jupyter Notebook) tekshirishing kerak.
      
      TOPSHIRIQ SHARTLARI:
      "${instruction}"
      
      TEKSHIRISH QOIDALARI:
      1. Topshiriq shartlarini diqqat bilan o'rgan. O'quvchi shartlarni bajarganmi?
      2. Agar bu dasturlash vazifasi bo'lsa, kodning to'g'riligi, mantiqi va tozaligini tekshir.
      3. Agar bu .ipynb (Jupyter Notebook) fayli bo'lsa, u JSON formatida bo'ladi. Undagi 'cells' ichidan kod (code) va matn (markdown) kataklarini topib tahlil qil.
      4. Agar bu PDF yoki rasm bo'lsa, uning mazmunini tahlil qil. Rasmda imlo yoki yozuv xatolari bo'lsa, ularni [ymin, xmin, ymax, xmax] koordinatalari bilan 0-1000 oralig'idagi BUTUN SONLAR bilan aniq ko'rsat va 'pageIndex' (0 dan boshlab) orqali belgilab ber. BoundingBox aynan shu xato so'zni ixcham o'rab tursin!
      5. Xatolarni aniq ko'rsat va qanday tuzatish kerakligini tushuntir.
      6. Baholashda adolatli bo'l (1-5 ball tizimida).
      
      DIQQAT: 'mistakes' massivida 'lineNumber' maydoni matnli bo'lmagan fayllar uchun 0 bo'lishi mumkin. Agar fayllar rasm bo'lsa, har bir xatoga 'boundingBox' ([ymin, xmin, ymax, xmax] 0-1000 butun sonlar) va 'pageIndex' (0, 1...) ni kirit.
    `;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        extractedText: { type: Type.STRING, description: "O'quvchi kodining qisqacha mazmuni yoki asosiy qismlari" },
        correctedText: { type: Type.STRING, description: "Kodning to'g'rilangan yoki optimallashgan versiyasi" },
        mistakes: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              word: { type: Type.STRING, description: "Xato qilingan qism yoki qator" },
              correction: { type: Type.STRING, description: "To'g'ri variant" },
              description: { type: Type.STRING, description: "Nima uchun xato ekanligi haqida izoh" },
              type: { type: Type.STRING, enum: ["imlo", "tinish_belgisi", "uslub", "mantiq", "xavfsizlik", "sintaksis"] },
              lineNumber: { type: Type.INTEGER },
              box_2d: { 
                type: Type.ARRAY, 
                items: { type: Type.INTEGER },
                description: "Detect 2D bounding box [ymin, xmin, ymax, xmax] (0-1000) of the exact mistake"
              },
              pageIndex: { type: Type.INTEGER }
            },
            required: ["word", "correction", "description", "type", "lineNumber"]
          }
        },
        grade: { type: Type.NUMBER },
        handwritingScore: { type: Type.NUMBER, description: "Dasturlashda bu kod tozaligi (clean code) balli bo'lsin" },
        feedback: { type: Type.STRING },
        improvementTips: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ["extractedText", "correctedText", "mistakes", "grade", "handwritingScore", "feedback", "improvementTips"]
    };

    const fileParts = files.map((f: any) => {
      if (f.data && f.mimeType) {
        const cleanData = typeof f.data === 'string' && f.data.includes(',') ? f.data.split(',')[1] : f.data;
        return {
          inlineData: {
            mimeType: f.mimeType,
            data: cleanData
          }
        };
      }
      return {
        text: `Fayl nomi: ${f.name}\nTil: ${f.language || 'noma\'lum'}\nKontent:\n${f.content || ''}`
      };
    });

    const response = await generateWithFallback({
      preferredModel: 'gemini-3.8-flash',
      contents: {
        parts: [
          ...fileParts,
          { text: `Topshiriq shartlari: "${instruction}"\n\nYuqoridagi fayllarni topshiriq shartlari asosida tahlil qil.` }
        ],
      },
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema,
      },
      timeoutMs: 50000
    });

    const result = JSON.parse(response.text || "{}");
    result.mistakes = (result.mistakes || []).map(sanitizeMistakeBoundingBox);
    result.extractedText = result.extractedText || "";
    result.correctedText = result.correctedText || "";
    result.grade = result.grade || 0;
    result.handwritingScore = result.handwritingScore || 0;
    result.feedback = result.feedback || "";
    result.improvementTips = result.improvementTips || [];

    res.json(result);
  } catch (error: any) {
    console.error("Analyze Assignment Error:", error);
    res.status(500).json({ error: error.message || "Vazifani tahlil qilishda xatolik yuz berdi" });
  }
});

app.post("/api/gemini/generate-material", async (req, res) => {
  try {
    const { prompt, type } = req.body;
    const isCrossword = type === 'crossword';
    const systemInstruction = `
      Sen professional O'zbekistonlik pedagog-metodistsan. 
      Berilgan mavzu bo'yicha yuqori sifatli, zamonaviy metodikaga asoslangan ${type === 'lesson_plan' ? 'dars ishlanmasi' : type === 'test' ? 'test savollari' : type === 'worksheet' ? 'ish varaqasi' : 'krossvord'} yaratib ber.
      ${isCrossword ? `
      Krossvordni JSON formatida qaytar. 
      MUHIM: Grid 10x10 o'lchamda bo'lsin. Har bir so'z grid ichida to'g'ri joylashishi kerak.
      So'zlar bir-biri bilan kamida bitta harf orqali kesishishi shart.
      Format:
      {
        "title": "Krossvord nomi",
        "grid": [["M", "A", "K", "T", "A", "B", "", "", "", ""], ...], // 10x10 massiv, bo'sh joylar ""
        "clues": {
          "across": [{"number": 1, "clue": "Bilim maskani", "row": 0, "col": 0}],
          "down": [{"number": 2, "clue": "...", "row": 0, "col": 1}]
        }
      }
      ` : "Matnni chiroyli Markdown formatida qaytar."}
      O'zbek tilida yoz.
    `;

    const response = await generateWithFallback({
      preferredModel: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: isCrossword ? "application/json" : "text/plain",
      },
      timeoutMs: 40000
    });

    if (isCrossword) {
      return res.json(JSON.parse(response.text || "{}"));
    }
    
    res.json({ text: response.text || "Xatolik yuz berdi." });
  } catch (error: any) {
    console.error("Generate Material Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/gemini/tts", async (req, res) => {
  try {
    const { prompt, voiceName } = req.body;
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash-lite-tts",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { 
          voiceConfig: { 
            prebuiltVoiceConfig: { voiceName: voiceName || 'Zephyr' } 
          } 
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      res.json({ base64Audio });
    } else {
      res.status(500).json({ error: "Failed to generate audio" });
    }
  } catch (error: any) {
    console.error("TTS Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Stripe Checkout Session
app.post("/api/create-checkout-session", async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({ error: "To'lov tizimi sozlanmagan: STRIPE_SECRET_KEY yo'q." });
    }

    const { userId, userEmail, priceId } = req.body;
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId, // Masalan: 'price_12345'
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${process.env.APP_URL || 'http://localhost:3000'}/?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_URL || 'http://localhost:3000'}/?canceled=true`,
      customer_email: userEmail,
      client_reference_id: userId,
      metadata: {
        userId: userId,
      },
    });

    res.json({ url: session.url });
  } catch (error: any) {
    console.error("Stripe Checkout Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Stripe Webhook (Soddalashtirilgan versiya - haqiqiy ishlab chiqarishda webhook secret tekshirilishi kerak)
app.post("/api/webhook", express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // Haqiqiy ishlab chiqarishda: event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    // Hozircha sodda qilib qoldiramiz
    event = req.body;
    
    // Webhook logikasi bu yerda bo'ladi
    // Masalan: foydalanuvchi obunasini yangilash
    
    res.json({ received: true });
  } catch (err: any) {
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});

export default app;
export { app };
