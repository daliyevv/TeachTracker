# TeachTracker

O'quvchilar vazifalarini sun'iy intellekt yordamida tekshiruvchi, xatolarni
tahlil qilib baholovchi ta'lim platformasi.

## Texnologiyalar

- **Frontend:** React 19 + Vite + Tailwind CSS 4
- **Backend:** Express (Gemini va Stripe chaqiruvlari uchun)
- **Ma'lumotlar:** Firebase (Auth, Firestore, Storage)
- **AI:** Google Gemini (`@google/genai`)

## Loyiha tuzilishi

```
components/        React komponentlari
services/          Frontend servislari (firebase, dbService, geminiService, ...)
server/app.ts      Express ilovasi va barcha /api/* route'lari
server.ts          Lokal/standalone ishga tushirish (vite dev yoki statik)
api/index.ts       Vercel serverless funksiyasi (server/app.ts ni export qiladi)
vercel.json        Vercel sozlamalari (/api/* rewrite, maxDuration)
```

Express ilovasi ataylab `server/app.ts` ichida va `listen` chaqirmaydi.
Shu sababli u ikki xil muhitda ham ishlaydi: lokal serverda `server.ts`
uni `listen` bilan ishga tushiradi, Vercel'da esa `api/index.ts` uni
serverless funksiya sifatida export qiladi.

## API endpointlari

Hammasi `server/app.ts` ichida:

| Endpoint | Vazifasi |
|---|---|
| `POST /api/gemini/detect-paper-bounds` | Rasmdagi varaq chegarasini aniqlash |
| `POST /api/gemini/analyze-dictation` | Diktant tahlili |
| `POST /api/gemini/analyze-assignment` | Vazifa tekshirish |
| `POST /api/gemini/generate-material` | O'quv materiali generatsiyasi |
| `POST /api/gemini/tts` | Matnni ovozga aylantirish |
| `POST /api/create-checkout-session` | Stripe checkout |
| `POST /api/webhook` | Stripe webhook |

## Lokal ishga tushirish

```bash
npm install
cp .env.example .env        # qiymatlarni to'ldiring
npm run dev                 # http://localhost:3000
```

Boshqa buyruqlar:

```bash
npm run lint    # tsc --noEmit
npm run build   # vite build + server bundle
npm start       # build qilingan standalone serverni ishga tushirish
```

## Environment o'zgaruvchilar

To'liq ro'yxat `.env.example` faylida.

| O'zgaruvchi | Qayerda kerak | Izoh |
|---|---|---|
| `GEMINI_API_KEY` | Server | **Majburiy.** Bo'lmasa AI funksiyalari ishlamaydi |
| `VITE_FIREBASE_*` (6 ta) | Build | Build vaqtida kodga singdiriladi |
| `STRIPE_SECRET_KEY` | Server | Bo'lmasa checkout 503 qaytaradi, qolgani ishlaydi |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Build | To'lov kerak bo'lsa |
| `STRIPE_WEBHOOK_SECRET` | Server | Webhook imzosini tekshirish uchun |
| `APP_URL` | Server | Checkout'dan keyin qaytish manzili |

`VITE_` bilan boshlanadigan o'zgaruvchilar **build paytida** bundle ichiga
yoziladi. Shuning uchun ular deploy'dan oldin o'rnatilgan bo'lishi kerak —
keyin qo'shilsa, qayta build qilish shart.

## Vercel'ga deploy

`vercel.json` quyidagilarni belgilaydi:

- `buildCommand: vite build` — faqat frontend quriladi, server bundle
  `dist/` ichiga tushmaydi (aks holda u ommaga ochiq bo'lib qolardi)
- `/api/(.*)` → `/api` rewrite — barcha API so'rovlari serverless
  funksiyaga yo'naltiriladi
- `maxDuration: 60` — Gemini chaqiruvlari standart 10 soniyaga sig'maydi

Deploy'dan oldin yuqoridagi env o'zgaruvchilar Vercel loyihasida
o'rnatilganiga ishonch hosil qiling.

## Ma'lum cheklovlar

- Vercel serverless funksiyasining so'rov tanasi **4.5MB** bilan
  cheklangan, kod esa `express.json({ limit: '50mb' })` ishlatadi va
  rasmlarni base64 ko'rinishida yuboradi. Katta rasmlar 413 qaytarishi
  mumkin — frontendda siqish kerak bo'ladi.
- `/api/webhook`: `express.json()` global qo'llanilgani uchun raw body
  allaqachon parse bo'ladi, shu sababli Stripe imzo tekshiruvi hozirgi
  holatda ishlamaydi (kodda izohga olingan).
