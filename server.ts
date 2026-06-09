
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type, Modality } from "@google/genai";
import Stripe from "stripe";

dotenv.config();

const app = express();
const PORT = 3000;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-02-24.acacia" as any,
});

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

const ai = new GoogleGenAI({ apiKey: getApiKey() });

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error("Gemini API timeout")), timeoutMs)
    )
  ]);
};

// API Routes
app.post("/api/gemini/detect-paper-bounds", async (req, res) => {
  try {
    const { base64Image } = req.body;
    if (!base64Image) {
      return res.status(400).json({ error: "base64Image is required" });
    }
    const response = await withTimeout(ai.models.generateContent({
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
    }), 15000);

    const result = JSON.parse(response.text || "{\"bounds\": null}");
    res.json({ bounds: result.bounds });
  } catch (error: any) {
    console.error("Detect Bounds Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/gemini/analyze-dictation", async (req, res) => {
  try {
    const { base64Images, originalText } = req.body;
    
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
              word: { type: Type.STRING },
              correction: { type: Type.STRING },
              description: { type: Type.STRING },
              type: { type: Type.STRING, enum: ["imlo", "tinish_belgisi", "uslub"] },
              lineNumber: { type: Type.INTEGER },
              boundingBox: { type: Type.ARRAY, items: { type: Type.NUMBER } },
              pageIndex: { type: Type.INTEGER }
            },
            required: ["word", "correction", "description", "type", "lineNumber", "boundingBox", "pageIndex"]
          }
        },
        grade: { type: Type.NUMBER },
        handwritingScore: { type: Type.NUMBER },
        feedback: { type: Type.STRING },
        improvementTips: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ["extractedText", "correctedText", "mistakes", "grade", "handwritingScore", "feedback", "improvementTips"]
    };

    const imageParts = base64Images.map((img: string) => ({
      inlineData: { mimeType: 'image/jpeg', data: img.split(',')[1] || img }
    }));

    const response = await withTimeout(ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          ...imageParts,
          { text: `Diktantni "${originalText}" matni asosida tekshir. Jami ${base64Images.length} ta sahifa yuklandi.` }
        ],
      },
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema,
      },
    }), 45000);

    const result = JSON.parse(response.text || "{}");
    if (!result.mistakes) result.mistakes = [];
    res.json(result);
  } catch (error: any) {
    console.error("Analyze Dictation Error:", error);
    res.status(500).json({ error: error.message });
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
      4. Agar bu PDF yoki rasm bo'lsa, uning mazmunini tahlil qil.
      4. Xatolarni aniq ko'rsat va qanday tuzatish kerakligini tushuntir.
      5. Baholashda adolatli bo'l (1-5 ball tizimida).
      
      DIQQAT: 'mistakes' massivida 'lineNumber' maydoni matnli bo'lmagan fayllar uchun 0 bo'lishi mumkin.
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
              boundingBox: { type: Type.ARRAY, items: { type: Type.NUMBER } },
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
        return {
          inlineData: {
            mimeType: f.mimeType,
            data: f.data
          }
        };
      }
      return {
        text: `Fayl nomi: ${f.name}\nTil: ${f.language || 'noma\'lum'}\nKontent:\n${f.content || ''}`
      };
    });

    const response = await withTimeout(ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
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
    }), 60000);

    const result = JSON.parse(response.text || "{}");
    result.mistakes = result.mistakes || [];
    result.extractedText = result.extractedText || "";
    result.correctedText = result.correctedText || "";
    result.grade = result.grade || 0;
    result.handwritingScore = result.handwritingScore || 0;
    result.feedback = result.feedback || "";
    result.improvementTips = result.improvementTips || [];
    result.mistakes = result.mistakes.map((m: any) => ({
      ...m,
      boundingBox: m.boundingBox || [0,0,0,0],
      pageIndex: m.pageIndex || 0
    }));

    res.json(result);
  } catch (error: any) {
    console.error("Analyze Assignment Error:", error);
    res.status(500).json({ error: error.message });
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

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: isCrossword ? "application/json" : "text/plain",
      },
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
      model: "gemini-2.5-flash-preview-tts",
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

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*all", (req, res) => {
      res.sendFile("dist/index.html", { root: "." });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
