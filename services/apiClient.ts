/**
 * `/api/*` ga murojaat qiladigan yagona joy.
 *
 * Server endi har bir so'rovda Firebase ID tokenini talab qiladi
 * (`server/auth.ts`). Token muddati bir soat, uni Firebase SDK o'zi
 * yangilaydi — lekin baribir "muddati tugadi" holati bo'lishi mumkin
 * (masalan noutbuk uyqudan qaytganda). Shuning uchun 401 javobida token
 * majburan yangilanib, so'rov bir marta qayta yuboriladi.
 */
import { auth } from './firebase';
import { wasDemoSession } from './demoMode';

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

export const messageFor = (status: number, detail: string): string => {
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

/**
 * Muvaffaqiyatsiz javobni foydalanuvchiga tushunarli xatoga aylantiradi.
 *
 * Server o'zbekcha `{ error: "..." }` qaytarsa, aynan shu matn ko'rsatiladi —
 * u aniqroq (masalan kvota tugaganda necha soniya kutish kerakligini aytadi).
 */
export const raiseForStatus = async (response: Response): Promise<never> => {
  let detail = '';
  try {
    detail = await response.text();
  } catch {
    // javobni o'qib bo'lmadi - muhim emas
  }
  console.error(`API ${response.status} ${response.url}:`, detail);

  let serverMessage = '';
  try {
    const parsed = JSON.parse(detail);
    if (parsed && typeof parsed.error === 'string') serverMessage = parsed.error;
  } catch {
    // JSON emas - umumiy matnga tushamiz
  }

  throw new ApiError(serverMessage || messageFor(response.status, detail), response.status, detail);
};

/** Tizimga kirilmaganda chiqadigan xato. */
export const notSignedIn = () =>
  new ApiError("Tizimga kirilmagan. Sahifani yangilab, qaytadan kiring.", 401, 'no current user');

/**
 * Demo sessiyasi yo'qolgan bo'lsa, uni qayta tiklaydi.
 *
 * Demo rejimida "Tizimga kirilmagan, qaytadan kiring" xabarining ma'nosi
 * yo'q — kiradigan hisob ham yo'q. Shuning uchun anonim sessiyani o'zimiz
 * qayta ochamiz. FAQAT demo rejimi shu sessiyada boshlangan bo'lsa:
 * haqiqiy foydalanuvchini tasodifan anonim sessiyaga tushirib
 * qo'ymasligimiz kerak.
 */
const restoreDemoSession = async () => {
  if (!auth || auth.currentUser || !wasDemoSession()) return;
  const { signInAnonymously } = await import('firebase/auth');
  await signInAnonymously(auth);
};

const buildHeaders = async (forceRefresh: boolean): Promise<Record<string, string>> => {
  if (!auth?.currentUser) {
    // Demo sessiyasi uzilib qolgan bo'lsa qayta tiklaymiz.
    try {
      await restoreDemoSession();
    } catch (err) {
      console.error("Demo sessiyasini qayta tiklab bo'lmadi:", err);
    }
  }
  const user = auth?.currentUser;
  if (!user) throw notSignedIn();
  const token = await user.getIdToken(forceRefresh);
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
};

/**
 * `/api/*` ga POST so'rov. Token qo'shadi, 401 da bir marta qayta urinadi.
 * Javob muvaffaqiyatli bo'lmasa `ApiError` tashlaydi.
 */
export const postJson = async <T>(path: string, body: unknown): Promise<T> => {
  const payload = JSON.stringify(body);

  let response = await fetch(path, {
    method: 'POST',
    headers: await buildHeaders(false),
    body: payload,
  });

  // Token eskirgan bo'lishi mumkin — majburan yangilab, bir marta qaytaramiz.
  if (response.status === 401) {
    console.warn(`API 401 ${path}: tokenni yangilab qayta urinilmoqda`);
    response = await fetch(path, {
      method: 'POST',
      headers: await buildHeaders(true),
      body: payload,
    });
  }

  if (!response.ok) await raiseForStatus(response);
  return (await response.json()) as T;
};
