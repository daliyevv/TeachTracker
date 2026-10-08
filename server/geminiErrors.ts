/**
 * Gemini xatolarini aniq sabablarga ajratish.
 *
 * Nega kerak: "kalit rad etildi" degan xabar bitta sababga o'xshaydi,
 * aslida esa kamida to'rtta butunlay boshqa holat bor va yechimlari ham
 * boshqa:
 *
 *   1. Kalit noto'g'ri yoki buzilgan        -> kalitni qayta olish
 *   2. Generative Language API yoqilmagan   -> Google Cloud'da yoqish
 *   3. Kalit cheklangan (domen/IP/API)      -> cheklovni olib tashlash
 *   4. Model mavjud emas yoki ruxsat yo'q   -> model nomini tekshirish
 *
 * 2-holat yangi hisobda ENG KO'P uchraydi: kalit to'g'ri, lekin loyihada
 * API yoqilmagan. Agar xabar "kalitni tekshiring" deb aytsa, odam
 * kalitni qayta-qayta yaratib, muammoni topa olmaydi — aynan shu holat
 * yuz berdi.
 *
 * Shuning uchun Gemini'ning o'z xato matni ham (tozalangan va qisqartirilgan)
 * ko'rsatiladi: taxmin qilishdan ko'ra, sababni o'qish aniqroq.
 */

/**
 * Xato matnidan kalitga o'xshash narsalarni olib tashlaydi.
 *
 * Gemini xatosi ba'zan so'rov manzilini ham qaytaradi, manzilda esa
 * `?key=...` bo'lishi mumkin. Diagnostika uchun matn ko'rsatilayotgani
 * uchun kalit u yerga TUSHMASLIGI shart.
 */
export const sanitizeDetail = (detail: string): string =>
  detail
    // ?key=... yoki &key=...
    .replace(/([?&]key=)[^&\s"']+/gi, '$1<yashirildi>')
    // Google API kalitlari AIza bilan boshlanadi
    .replace(/AIza[0-9A-Za-z_\-]{10,}/g, '<kalit yashirildi>')
    // "x-goog-api-key: ..." kabi sarlavhalar
    .replace(/(api[_-]?key["'\s:=]+)[^\s",}]{10,}/gi, '$1<yashirildi>')
    .trim();

/** Diagnostika matnining eng ko'p uzunligi. */
const MAX_DETAIL = 300;

/** Bir qatorga keltirib qisqartiradi. */
export const briefDetail = (detail: string): string => {
  const clean = sanitizeDetail(detail).replace(/\s+/g, ' ');
  return clean.length > MAX_DETAIL ? clean.slice(0, MAX_DETAIL) + '…' : clean;
};

export interface GeminiErrorInfo {
  /** HTTP holat kodi. */
  status: number;
  /** Foydalanuvchiga ko'rsatiladigan matn. */
  message: string;
  /** Qisqa sabab belgisi — jurnal va diagnostika uchun. */
  reason: string;
}

/**
 * Gemini xatosini tasniflaydi.
 *
 * `null` qaytsa — bu sozlama muammosi EMAS, chaqiruvchi uni boshqa
 * yo'llar bilan (vaqt tugashi, kvota) ko'rib chiqadi.
 */
export const describeGeminiError = (
  status: number,
  detail: string,
  /**
   * Kalit haqida XAVFSIZ ma'lumot (uzunligi, shakli) — qiymati emas.
   * Kalitga tegishli xatolarda xabarga qo'shiladi: "noto'g'ri kalit",
   * "yarim nusxa olingan kalit" va "bo'sh joy bilan kalit" holatlarini
   * bir qarashda ajratadi.
   */
  keyShape?: string
): GeminiErrorInfo | null => {
  const brief = briefDetail(detail);
  const withDetail = (text: string) => (brief ? `${text} (Gemini: ${brief})` : text);
  const withKey = (text: string) => (keyShape ? `${text} [kalit: ${keyShape}]` : text);

  // 1. Kalitning o'zi yaroqsiz.
  if (/API_KEY_INVALID|API key not valid|api key is invalid/i.test(detail)) {
    return {
      status: 503,
      reason: 'api_key_invalid',
      message: withKey(
        withDetail(
          "AI kaliti yaroqsiz. Loyiha egasi GEMINI_API_KEY ni qayta olishi kerak — " +
            "qiymatda bo'sh joy yoki tushib qolgan belgi bo'lmasin."
        )
      ),
    };
  }

  // 2. Kalit to'g'ri, lekin loyihada Generative Language API yoqilmagan.
  //    Yangi Google hisobida ENG KO'P uchraydigan holat.
  if (
    /SERVICE_DISABLED|has not been used in project|is disabled|enable it by visiting|API has not been enabled/i.test(
      detail
    )
  ) {
    return {
      status: 503,
      reason: 'api_not_enabled',
      message: withDetail(
        "AI xizmati bu Google loyihasida YOQILMAGAN — kalit aybdor emas. " +
          "Loyiha egasi Google Cloud'da 'Generative Language API' ni yoqishi kerak."
      ),
    };
  }

  // 3. Kalitga cheklov qo'yilgan (domen, IP yoki boshqa API).
  if (
    /API_KEY_HTTP_REFERRER_BLOCKED|API_KEY_IP_ADDRESS_BLOCKED|API_KEY_SERVICE_BLOCKED|Requests from referer|blocked/i.test(
      detail
    )
  ) {
    return {
      status: 503,
      reason: 'api_key_restricted',
      message: withKey(
        withDetail(
          "AI kalitiga cheklov qo'yilgan. Loyiha egasi kalit sozlamalaridagi " +
            "cheklovlarni (domen, IP yoki API ro'yxati) olib tashlashi kerak — " +
            "server so'rovlari domen cheklovidan o'tmaydi."
        )
      ),
    };
  }

  // 4. Model topilmadi yoki bu kalit uchun ochiq emas.
  if (/is not found for API version|NOT_FOUND|is not supported for/i.test(detail) || status === 404) {
    return {
      status: 503,
      reason: 'model_unavailable',
      message: withDetail(
        "AI modeli bu kalit uchun mavjud emas. Loyiha egasi model nomini yoki " +
          "hisobning darajasini tekshirishi kerak."
      ),
    };
  }

  // 5. Umumiy ruxsat xatosi — sababini aytib bo'lmaydi, shuning uchun
  //    Gemini'ning o'z matnini ko'rsatamiz. Taxmin qilib noto'g'ri
  //    yo'lga solishdan ko'ra, xom sababni ko'rsatish foydali.
  if (status === 401 || status === 403 || /PERMISSION_DENIED|UNAUTHENTICATED/i.test(detail)) {
    return {
      status: 503,
      reason: 'permission_denied',
      message: withKey(withDetail("AI xizmati so'rovni rad etdi.")),
    };
  }

  return null;
};

/**
 * Limit (kvota) xatolari — kunlik va qisqa muddatli ALOHIDA.
 *
 * NEGA KERAK: ilgari har qanday 429 bitta xabar bilan qaytardi —
 * "Server hozir band. Bir oz kutib, qayta urinib ko'ring."
 *
 * Bu KUNLIK limit uchun YOLG'ON: kutish yordam bermaydi, limit ertaga
 * yangilanadi. Bola (yoki namoyish paytida hakam) xabarga ishonib qayta-qayta
 * urinadi va har urinish yana rad etiladi. Ilovaning boshqa joylarida
 * yolg'on umid beradigan xabarlar olib tashlangan — bu joy e'tibordan
 * chetda qolgan edi.
 *
 * Ikki holat Gemini javobidan ajratiladi:
 *   - kunlik  -> kvota nomida "PerDay" bo'ladi
 *               (masalan GenerateRequestsPerDayPerProjectPerModel-FreeTier)
 *   - qisqa   -> daqiqadagi chegara; Gemini `retryDelay` ni ham beradi
 */
export interface QuotaErrorInfo {
  status: number;
  message: string;
  /** Jurnal uchun: `quota_daily` yoki `quota_short`. */
  reason: 'quota_daily' | 'quota_short';
  /** Qisqa muddatli limitda necha soniyadan keyin urinish mumkin. */
  retryAfterSec?: number;
}

/** Kvota nomi kunlik chegarani bildiradimi. */
const DAILY_MARKER = /per[\s_-]*day|daily|requests?[\s_-]*per[\s_-]*day/i;

/**
 * Gemini bergan `retryDelay` dan soniyani oladi.
 *
 * Nega foydali: "bir oz kutib" noaniq, "33 soniyadan keyin" esa aniq.
 * Ilovaning o'z kvotasi ham aynan shunday aytadi (qarang server/auth.ts),
 * ya'ni ikki joy bir xil ohangda gapiradi.
 */
export const retryAfterSeconds = (detail: string): number | undefined => {
  const m = detail.match(/retry[_-]?delay["'\s:]*([0-9]+(?:\.[0-9]+)?)\s*s/i);
  if (!m) return undefined;
  const sec = Math.ceil(Number(m[1]));
  if (!Number.isFinite(sec) || sec <= 0) return undefined;
  // Bir soatdan ortiq "kutish" maslahati ma'nosiz — u holda kunlik deb qaraladi.
  return Math.min(sec, 3600);
};

export const describeQuotaError = (
  status: number,
  detail: string
): QuotaErrorInfo | null => {
  const isQuota =
    status === 429 || /RESOURCE_EXHAUSTED|\bquota\b|rate limit/i.test(detail);
  if (!isQuota) return null;

  if (DAILY_MARKER.test(detail)) {
    return {
      status: 429,
      reason: 'quota_daily',
      message:
        "Bugungi sun'iy intellekt limiti tugadi. Kutish yordam bermaydi — " +
        "limit Tinch okeani yarim tunida yangilanadi (O'zbekistonda taxminan " +
        "12:00). Loyiha egasi limitni Google AI Studio'da oshirishi mumkin.",
    };
  }

  const retryAfterSec = retryAfterSeconds(detail);
  return {
    status: 429,
    reason: 'quota_short',
    retryAfterSec,
    message: retryAfterSec
      ? `So'rovlar juda tez-tez keldi. ${retryAfterSec} soniyadan keyin qayta urinib ko'ring.`
      : "So'rovlar juda tez-tez keldi. Bir daqiqa kutib, qayta urinib ko'ring.",
  };
};

/**
 * Xato VAQTINCHALIKmi — ya'ni qayta urinish ma'nolimi.
 *
 * NEGA JUDA EHTIYOT BO'LISH KERAK: bepul tarifda kunlik chegara
 * `gemini-3.8-flash` uchun atigi 20 ta so'rov (loyiha konsolida
 * tasdiqlangan). Noto'g'ri xatoda qayta urinish o'sha 20 tani bekorga
 * sarflaydi va foydalanuvchi ertasigacha ishlay olmay qoladi.
 *
 * Shuning uchun kvota xatosi ATAYLAB birinchi bo'lib rad etiladi: uning
 * matnida "try again later" bo'lishi mumkin, lekin qayta urinish holatni
 * faqat YOMONLASHTIRADI. Sozlama xatolari (kalit, ruxsat, model nomi) ham
 * qayta urinishdan tuzalmaydi.
 *
 * Qayta urinish FAQAT Google tomonidagi vaqtinchalik yuklamada (503,
 * UNAVAILABLE, "overloaded") ma'noga ega — u o'z-o'zidan o'tib ketadi.
 */
export const isTransientError = (status: number, detail: string): boolean => {
  // Kvota — qayta urinib bo'lmaydi (yuqoridagi izohga qarang).
  if (status === 429 || /RESOURCE_EXHAUSTED|\bquota\b/i.test(detail)) return false;
  // Sozlama xatolari qayta urinishdan tuzalmaydi.
  if (status === 400 || status === 401 || status === 403 || status === 404) return false;
  if (status === 503) return true;
  return /\bUNAVAILABLE\b|overloaded|temporarily unavailable|try again later/i.test(detail);
};

/**
 * Google tomonidagi vaqtinchalik yuklama (503).
 *
 * NEGA ALOHIDA: ilgari 503 hech qayerda tasniflanmas va umumiy
 * "Diktantni tahlil qilishda xatolik yuz berdi" matniga tushardi.
 * Bu foydalanuvchini noto'g'ri yo'lga solardi — u o'zida yoki rasmda
 * nuqson bor deb o'ylardi, aslida esa model o'sha lahzada band edi va
 * bir necha soniyadan keyin ishlagan bo'lardi.
 *
 * Loyiha konsolida bu xato muvaffaqiyatli javoblar bilan TENG miqdorda
 * ko'rindi, ya'ni u kamdan-kam holat emas.
 */
export const describeOverloadError = (
  status: number,
  detail: string
): GeminiErrorInfo | null => {
  // Kvota boshqa yo'l bilan ko'rib chiqiladi (describeQuotaError).
  if (status === 429 || /RESOURCE_EXHAUSTED|\bquota\b/i.test(detail)) return null;
  const overloaded = status === 503 || /\bUNAVAILABLE\b|overloaded/i.test(detail);
  if (!overloaded) return null;
  return {
    status: 503,
    reason: 'model_overloaded',
    message:
      "Sun'iy intellekt xizmati hozir band — Google tomonida vaqtinchalik " +
      "yuklama. Bir necha soniyadan keyin qayta urinib ko'ring. Bu kalit " +
      "yoki limit muammosi emas.",
  };
};

/** Vaqtinchalik yuklamada mijozga tavsiya etiladigan kutish (soniya). */
export const OVERLOAD_RETRY_SEC = 10;
