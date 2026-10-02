/**
 * Rasmlarni yuborishdan oldin brauzerda siqish.
 *
 * Nega kerak:
 * - Vercel serverless funksiyasining so'rov tanasi 4,5MB bilan cheklangan,
 *   kod esa rasmlarni base64 ko'rinishida JSON ichida yuboradi
 * - Firestore hujjati 1MiB dan oshmasligi kerak
 * - Mobil internetda katta rasm yuklanishi uzoq davom etadi
 *
 * Telefon kamerasidan olingan rasm odatda 2-6MB bo'ladi, siqilgandan keyin
 * 200-400KB ga tushadi. Qo'lyozma matnni o'qish uchun bu yetarli.
 */

/** Rasmning eng uzun tomoni shu piksel qiymatiga keltiriladi. */
const MAX_DIMENSION = 1400;

/**
 * Maqsadli hajm. Firebase Storage yoqilmagan bo'lsa rasm Firestore hujjati
 * ichida base64 holida saqlanadi, base64 esa hajmni ~33% oshiradi.
 * 220KB rasm -> ~293KB base64, ya'ni ikki sahifa 900KB zahiraga bemalol
 * sig'adi. Qo'lyozma matnni o'qish uchun 1400px yetarli.
 */
const TARGET_BYTES = 220 * 1024;

const QUALITY_STEPS = [0.82, 0.72, 0.62, 0.5];

/** data URL ning taxminiy hajmi (bayt). */
const approxBytes = (dataUrl: string): number => {
  const comma = dataUrl.indexOf(',');
  const b64 = comma === -1 ? dataUrl : dataUrl.slice(comma + 1);
  return Math.floor((b64.length * 3) / 4);
};

export const mimeTypeFromDataUrl = (dataUrl: string, fallback = 'image/jpeg'): string => {
  const match = /^data:([^;,]+)/.exec(dataUrl);
  return match ? match[1] : fallback;
};

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Rasmni o'qib bo'lmadi"));
    img.src = src;
  });

/**
 * Rasmni siqadi. Har qanday xatoda asl rasmni qaytaradi — siqish
 * topshirishni to'xtatib qo'ymasligi kerak.
 */
export const compressImageDataUrl = async (dataUrl: string): Promise<string> => {
  // GIF animatsiyasini buzmaymiz; rasm bo'lmagan narsaga ham tegmaymiz.
  if (!dataUrl.startsWith('data:image/') || dataUrl.startsWith('data:image/gif')) {
    return dataUrl;
  }

  try {
    const img = await loadImage(dataUrl);
    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;
    if (!width || !height) return dataUrl;

    const originalBytes = approxBytes(dataUrl);
    let smallest = dataUrl;
    let scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));

    for (let attempt = 0; attempt < 3; attempt++) {
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) return smallest;

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      for (const quality of QUALITY_STEPS) {
        const candidate = canvas.toDataURL('image/jpeg', quality);
        if (approxBytes(candidate) < approxBytes(smallest)) smallest = candidate;
        if (approxBytes(smallest) <= TARGET_BYTES) return smallest;
      }

      // Hali katta — o'lchamni yanada kichraytiramiz
      scale *= 0.7;
    }

    return approxBytes(smallest) < originalBytes ? smallest : dataUrl;
  } catch {
    return dataUrl;
  }
};

/** Faylni o'qib, darhol siqadi. */
export const readAndCompressImage = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("Faylni o'qib bo'lmadi"));
    reader.onload = () => {
      const result = reader.result as string;
      compressImageDataUrl(result).then(resolve).catch(() => resolve(result));
    };
    reader.readAsDataURL(file);
  });

/**
 * Bir topshiriqdagi rasmlar soni chegarasi.
 *
 * Vercel so'rov tanasi 4,5MB bilan cheklangan. Har rasm siqilgandan keyin
 * ~220KB, base64 esa hajmni ~33% oshiradi (~293KB). 12 sahifa ~3,5MB —
 * zahira bilan sig'adi. Ilgari chegara umuman yo'q edi: o'quvchi 30 sahifa
 * tanlab, so'rov platformada kesilib, tushunarsiz xato olardi.
 */
export const MAX_PAGES = 12;

/**
 * Ro'yxatga chegaradan oshmaydigan qismini qo'shadi.
 *
 * `rejected` — joy yetmaganligi uchun qabul qilinmagan rasmlar soni.
 * Chaqiruvchi shunga qarab foydalanuvchiga xabar beradi.
 */
export const appendWithinLimit = (
  current: string[],
  incoming: string[],
  max = MAX_PAGES
): { next: string[]; rejected: number } => {
  const room = Math.max(0, max - current.length);
  const accepted = incoming.slice(0, room);
  return {
    next: accepted.length > 0 ? [...current, ...accepted] : current,
    rejected: incoming.length - accepted.length,
  };
};
