/**
 * `/api/*` uchun Firebase ID token tekshiruvi.
 *
 * Nega kerak:
 * Ilgari `/api/gemini/*` yo'llari butunlay ochiq edi. Loyihaning Gemini
 * kaliti serverda turgani uchun istalgan odam manzilni topib, cheksiz
 * so'rov yuborib, kalitning kvotasini (va hisobni) sarflab yubora olardi.
 * Hech qanday autentifikatsiya, hech qanday cheklov yo'q edi.
 *
 * Nega Admin SDK emas:
 * Admin SDK xizmat hisobi (service account) kalitini talab qiladi. Loyiha
 * egasi uni qo'shmaslikka qaror qildi. Firebase ID token esa oddiy RS256
 * JWT — uni Google'ning ochiq kalitlari bilan, hech qanday maxfiy kalitsiz
 * tekshirish mumkin. Faqat `projectId` kerak, u esa allaqachon ochiq.
 *
 * Tekshirilayotgan shartlar (Firebase hujjatlaridagi ro'yxat):
 *   alg = RS256, imzo Google'ning joriy ochiq kaliti bilan mos
 *   aud = projectId
 *   iss = https://securetoken.google.com/<projectId>
 *   exp kelajakda, iat o'tmishda, auth_time o'tmishda
 *   sub bo'sh emas va 128 belgidan oshmaydi
 */
import { createRemoteJWKSet, jwtVerify, type JWTPayload, type JWTVerifyGetKey, type KeyObject } from 'jose';
import type { Request, Response, NextFunction } from 'express';

/**
 * firebase-applet-config.json dagi `projectId` ning nusxasi.
 *
 * Nega nusxa: JSON faylni serverless funksiyaga import qilish Vercel'ning
 * fayl kuzatuvchisiga (file tracing) bog'liq, u esa sovuq ishga tushishda
 * butun `/api/*` ni yiqitadigan nozik nuqta. Shuning uchun qiymat shu yerda
 * doimiy sifatida turadi, mos kelishini esa `tests/unit/auth.test.mjs`
 * tekshiradi — ikkisi bir-biridan ajralsa, test yiqiladi.
 */
const CONFIG_PROJECT_ID = 'gen-lang-client-0974120258';

export const projectId = (process.env.FIREBASE_PROJECT_ID || '').trim() || CONFIG_PROJECT_ID;

/**
 * Google'ning Firebase ID tokenlarini imzolaydigan ochiq kalitlari.
 * `jose` kalitlarni keshlaydi, shuning uchun har so'rovda tashqi chaqiruv
 * bo'lmaydi — faqat kalit almashganda yangilanadi.
 */
const JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'),
  {
    cacheMaxAge: 6 * 60 * 60 * 1000, // 6 soat
    cooldownDuration: 30 * 1000,
    timeoutDuration: 5 * 1000,
  }
);

export interface AuthUser {
  uid: string;
  email: string | null;
  emailVerified: boolean;
}

export interface AuthedRequest extends Request {
  auth?: AuthUser;
}

export class AuthError extends Error {
  readonly status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}

/** `Authorization: Bearer <token>` sarlavhasidan tokenni ajratadi. */
export const bearerToken = (header: unknown): string | null => {
  if (typeof header !== 'string') return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  if (!match) return null;
  const token = match[1].trim();
  return token.length > 0 ? token : null;
};

/**
 * Firebase ID tokenni tekshiradi. Xato bo'lsa `AuthError` tashlaydi.
 * Hech qachon tekshirilmagan tokenni "ehtimol to'g'ri" deb o'tkazmaydi.
 */
export const verifyIdToken = async (
  token: string,
  /**
   * Imzoni tekshiradigan kalitlar. Odatda Google'ning masofadagi kalitlari;
   * testlarda mahalliy kalit juftligi beriladi, shunda tekshiruv shartlarini
   * (iss, aud, alg, sub, auth_time) haqiqiy imzolangan token bilan sinash
   * mumkin bo'ladi.
   */
  keySet: JWTVerifyGetKey | KeyObject | Uint8Array = JWKS,
  /** Tekshirilayotgan loyiha. Odatda yuqoridagi `projectId`. */
  audience: string = projectId
): Promise<AuthUser> => {
  let payload: JWTPayload;
  try {
    ({ payload } = await jwtVerify(token, keySet as JWTVerifyGetKey, {
      algorithms: ['RS256'],
      issuer: `https://securetoken.google.com/${audience}`,
      audience,
      // Serverlar orasidagi kichik vaqt farqi tufayli yangi token rad
      // etilmasligi uchun.
      clockTolerance: 60,
    }));
  } catch (err: any) {
    throw new AuthError(`token yaroqsiz: ${err?.code || err?.message || 'noma\'lum'}`);
  }

  const uid = typeof payload.sub === 'string' ? payload.sub : '';
  if (!uid || uid.length > 128) {
    throw new AuthError('token sub maydoni yaroqsiz');
  }

  // auth_time — foydalanuvchi haqiqatan qachon kirgani. Kelajakdagi qiymat
  // soxta token belgisi.
  const nowSeconds = Math.floor(Date.now() / 1000);
  const authTime = payload.auth_time;
  if (typeof authTime !== 'number' || authTime > nowSeconds + 60) {
    throw new AuthError('token auth_time maydoni yaroqsiz');
  }

  return {
    uid,
    email: typeof payload.email === 'string' ? payload.email : null,
    emailVerified: payload.email_verified === true,
  };
};

/**
 * In-memory so'rov cheklovi (uid bo'yicha siljuvchi oyna).
 *
 * DIQQAT: serverless'da har bir nusxa o'z hisobini yuritadi, shuning uchun
 * bu qat'iy kafolat emas — maqsadi bitta hisobdan kelayotgan ketma-ket
 * so'rov toshqinini to'xtatish. Qat'iy cheklov uchun tashqi saqlagich
 * (masalan Upstash Redis) kerak bo'ladi.
 */
interface Window {
  hits: number[];
}

const windows = new Map<string, Window>();

export interface QuotaOptions {
  /** Oyna uzunligi (ms). */
  windowMs: number;
  /** Shu oynada ruxsat etilgan so'rov soni. */
  max: number;
}

/** Xotira cheksiz o'smasligi uchun kuzatiladigan kalitlar soni chegarasi. */
const MAX_TRACKED_KEYS = 5000;

export const checkQuota = (
  key: string,
  { windowMs, max }: QuotaOptions,
  now = Date.now()
): { allowed: boolean; retryAfterSeconds: number } => {
  const cutoff = now - windowMs;
  const entry = windows.get(key) ?? { hits: [] };
  entry.hits = entry.hits.filter((t) => t > cutoff);

  if (entry.hits.length >= max) {
    const oldest = entry.hits[0];
    windows.set(key, entry);
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((oldest + windowMs - now) / 1000)),
    };
  }

  entry.hits.push(now);

  if (!windows.has(key) && windows.size >= MAX_TRACKED_KEYS) {
    // Eng eski faolsiz kalitlarni tozalaymiz.
    for (const [k, v] of windows) {
      if (v.hits.length === 0 || v.hits[v.hits.length - 1] <= cutoff) windows.delete(k);
      if (windows.size < MAX_TRACKED_KEYS) break;
    }
  }
  windows.set(key, entry);
  return { allowed: true, retryAfterSeconds: 0 };
};

/** Testlar uchun: hisoblagichni tozalaydi. */
export const resetQuota = () => windows.clear();

/**
 * Tokenni tekshiradigan va uid bo'yicha cheklov qo'yadigan middleware.
 */
export const requireAuth = (quota?: QuotaOptions) =>
  async (req: AuthedRequest, res: Response, next: NextFunction) => {
    const token = bearerToken(req.headers.authorization);
    if (!token) {
      return res.status(401).json({ error: "Avtorizatsiya talab qilinadi. Tizimga qaytadan kiring." });
    }

    let user: AuthUser;
    try {
      user = await verifyIdToken(token);
    } catch (err: any) {
      // Sabab faqat server jurnalida qoladi — mijozga tafsilot bermaymiz.
      console.warn('Auth rad etildi:', err?.message || err);
      return res.status(401).json({ error: "Sessiya muddati tugagan. Tizimga qaytadan kiring." });
    }

    req.auth = user;

    if (quota) {
      const { allowed, retryAfterSeconds } = checkQuota(user.uid, quota);
      if (!allowed) {
        res.setHeader('Retry-After', String(retryAfterSeconds));
        return res.status(429).json({
          error: `Juda ko'p so'rov yubordingiz. ${retryAfterSeconds} soniyadan keyin qayta urinib ko'ring.`,
        });
      }
    }

    next();
  };

/**
 * CORS uchun ruxsat etilgan manbalar ro'yxati.
 *
 * Ilgari `cors()` hech qanday ro'yxatsiz ishlatilardi — ya'ni istalgan sayt
 * foydalanuvchi brauzeridan bu API ga so'rov yuborishi mumkin edi.
 *
 * Vercel'da `VERCEL_PROJECT_PRODUCTION_URL` va `VERCEL_URL` avtomatik
 * o'rnatiladi, shuning uchun qo'lda hech narsa sozlash shart emas. O'z domeni
 * qo'shilsa, uni `ALLOWED_ORIGINS` ga yozish kerak.
 *
 * Ro'yxat bo'sh bo'lib qolsa ham ilova ishlashdan to'xtamaydi: frontend va
 * `/api/*` bir xil domenda (vercel.json dagi rewrite), ya'ni so'rov
 * same-origin bo'ladi va CORS unga umuman tegishli emas. Ruxsat etilmagan
 * manba serverda rad ETILMAYDI — shunchaki `Access-Control-Allow-Origin`
 * sarlavhasi qo'yilmaydi, cross-origin so'rovni brauzerning o'zi to'xtatadi.
 * Haqiqiy himoya `requireAuth` da (tests/unit/api.auth.test.ts).
 */
export const buildAllowedOrigins = (env: NodeJS.ProcessEnv = process.env): string[] => {
  const list = new Set<string>();

  for (const raw of (env.ALLOWED_ORIGINS || '').split(',')) {
    const origin = raw.trim().replace(/\/$/, '');
    if (origin) list.add(origin);
  }

  // Vercel o'rnatadigan manzillar.
  if (env.VERCEL_PROJECT_PRODUCTION_URL) list.add(`https://${env.VERCEL_PROJECT_PRODUCTION_URL}`);
  if (env.VERCEL_URL) list.add(`https://${env.VERCEL_URL}`);
  if (env.APP_URL) list.add(env.APP_URL.trim().replace(/\/$/, ''));

  if (env.NODE_ENV !== 'production') {
    list.add('http://localhost:3000');
    list.add('http://localhost:5173');
    list.add('http://127.0.0.1:3000');
    list.add('http://127.0.0.1:5173');
  }

  return [...list];
};

/**
 * Vercel har bir commit uchun `<loyiha>-<hash>-<hisob>.vercel.app` ko'rinishidagi
 * oldindan ko'rish manzilini yaratadi. Ularni ham qo'shish kerak, lekin
 * `*.vercel.app` ni butunlay ochib qo'ymasdan — aks holda Vercel'da joylashgan
 * istalgan begona sayt bu API ga brauzerdan so'rov yubora olardi.
 *
 * Shuning uchun faqat loyihaning o'z nomi bilan boshlanadigan manzillar
 * o'tadi. Nom ishlab chiqarish manzilidan olinadi (`teach-tracker.vercel.app`
 * -> `teach-tracker`).
 */
export const previewOriginPattern = (env: NodeJS.ProcessEnv = process.env): RegExp | null => {
  const source = env.VERCEL_PROJECT_PRODUCTION_URL || env.VERCEL_URL || '';
  const match = /^([a-z0-9]+(?:-[a-z0-9]+)*?)(?:-[a-z0-9]+){0,2}\.vercel\.app$/i.exec(source.trim());
  const name = match ? match[1] : source.split('.')[0];
  if (!name || !/^[a-z0-9][a-z0-9-]*$/i.test(name)) return null;
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^https://${escaped}(?:-[a-z0-9-]+)?\\.vercel\\.app$`, 'i');
};

/**
 * Manba ruxsat etilganmi.
 *
 * Manbasiz so'rov (same-origin fetch, mobil ilova, curl) brauzerning CORS
 * himoyasiga umuman bog'liq emas — ularni bu yerda to'xtatish hech narsa
 * bermaydi, chunki himoya tokenda. Shuning uchun `undefined` manba
 * o'tkaziladi; haqiqiy tekshiruv `requireAuth` da.
 */
export const isOriginAllowed = (
  origin: string | undefined,
  allowed: string[],
  previewPattern: RegExp | null = previewOriginPattern()
): boolean => {
  if (!origin) return true;
  const normalized = origin.replace(/\/$/, '');
  if (allowed.includes(normalized)) return true;
  return previewPattern ? previewPattern.test(normalized) : false;
};
