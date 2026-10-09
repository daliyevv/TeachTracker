/**
 * `server/geminiErrors.ts` uchun testlar.
 *
 * Xato matnlari Gemini API ning haqiqiy javoblaridan olingan — shuning
 * uchun testlar "qoida yozilganmi" emas, "haqiqiy xato to'g'ri
 * tasniflanadimi" degan savolga javob beradi.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  describeGeminiError,
  sanitizeDetail,
  briefDetail,
} from '../../server/geminiErrors.ts';

// --- Kalit hech qayerda oshkor bo'lmasligi ---

test('kalit diagnostika matnidan OLIB TASHLANADI', () => {
  const withUrl =
    'Error fetching https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=AIzaSyA3QCNpxdui1Koq_qvTPmINJ8NhdCLMrQA';
  const clean = sanitizeDetail(withUrl);
  assert.ok(!clean.includes('AIzaSyA3QCNpxdui1Koq_qvTPmINJ8NhdCLMrQA'), 'kalit qolib ketdi');
  assert.ok(clean.includes('<yashirildi>') || clean.includes('<kalit yashirildi>'));

  // Faqat kalitning o'zi ham tozalanadi.
  assert.ok(!sanitizeDetail('key is AIzaSyDUMMYKEYVALUE1234567890').includes('AIzaSyDUMMY'));
  // Sarlavha ko'rinishida.
  assert.ok(!sanitizeDetail('x-goog-api-key: sk_live_abcdefghijklmnop').includes('abcdefghijklmnop'));
});

test('kalit TASNIFLANGAN xabarlarda ham oshkor bo\'lmaydi', () => {
  const detail =
    'API key not valid. Please pass a valid API key. url=...?key=AIzaSyLEAKEDKEY1234567890';
  const info = describeGeminiError(400, detail);
  assert.ok(info);
  assert.ok(!info.message.includes('AIzaSyLEAKEDKEY1234567890'), 'kalit xabarga tushib ketdi');
});

test('diagnostika matni qisqartiriladi', () => {
  const long = 'PERMISSION_DENIED ' + 'x'.repeat(1000);
  const brief = briefDetail(long);
  assert.ok(brief.length <= 301, `juda uzun: ${brief.length}`);
  assert.ok(brief.endsWith('…'));
});

// --- Tasniflash ---

test("yaroqsiz kalit — kalitni tekshirish kerakligi aytiladi", () => {
  const info = describeGeminiError(400, 'API key not valid. Please pass a valid API key.');
  assert.ok(info);
  assert.equal(info.reason, 'api_key_invalid');
  assert.equal(info.status, 503);
  assert.match(info.message, /kaliti yaroqsiz/i);
});

test("API yoqilmagan holat kalit muammosidan AJRATILADI", () => {
  // Bu yangi Google hisobida eng ko'p uchraydigan holat va aynan shu yerda
  // eski kod "kalitni tekshiring" deb NOTO'G'RI yo'lga solardi.
  const real =
    'Generative Language API has not been used in project 123456789 before or it is disabled. ' +
    'Enable it by visiting https://console.developers.google.com/apis/api/generativelanguage.googleapis.com/overview?project=123456789';
  const info = describeGeminiError(403, real);
  assert.ok(info);
  assert.equal(info.reason, 'api_not_enabled');
  // Xabar kalitni aybdor qilmasligi kerak.
  assert.match(info.message, /YOQILMAGAN/);
  assert.match(info.message, /kalit aybdor emas/i);
  assert.match(info.message, /Generative Language API/);
});

test('cheklangan kalit o\'z xabarini oladi', () => {
  const referrer =
    'Requests from referer <empty> are blocked. API_KEY_HTTP_REFERRER_BLOCKED';
  const info = describeGeminiError(403, referrer);
  assert.ok(info);
  assert.equal(info.reason, 'api_key_restricted');
  assert.match(info.message, /cheklov/i);
});

test('model topilmasligi alohida tasniflanadi', () => {
  const info = describeGeminiError(
    404,
    'models/gemini-3.8-flash is not found for API version v1beta, or is not supported for generateContent.'
  );
  assert.ok(info);
  assert.equal(info.reason, 'model_unavailable');
  assert.match(info.message, /model/i);
});

test("umumiy ruxsat xatosi Gemini'ning o'z matnini ko'rsatadi", () => {
  const info = describeGeminiError(403, 'PERMISSION_DENIED: something unexpected happened');
  assert.ok(info);
  assert.equal(info.reason, 'permission_denied');
  // Taxmin qilmasdan xom sababni ko'rsatadi.
  assert.match(info.message, /something unexpected happened/);
});

test('sozlamaga aloqasi yo\'q xato null qaytaradi', () => {
  // Bular `failure()` da boshqa yo'llar bilan ko'rib chiqiladi.
  assert.equal(describeGeminiError(500, 'internal server error'), null);
  assert.equal(describeGeminiError(0, 'Gemini API timeout'), null);
  assert.equal(describeGeminiError(0, 'socket hang up'), null);
});

test('har tasnif boshqasidan farqli xabar beradi', () => {
  const messages = [
    describeGeminiError(400, 'API key not valid')!.message,
    describeGeminiError(403, 'has not been used in project 1 before or it is disabled')!.message,
    describeGeminiError(403, 'API_KEY_HTTP_REFERRER_BLOCKED')!.message,
    describeGeminiError(404, 'is not found for API version v1beta')!.message,
  ];
  assert.equal(new Set(messages).size, messages.length, 'xabarlar takrorlanmasligi kerak');
});

// --- Kalit shakli haqidagi xavfsiz ma'lumot ---

test('kalit shakli xabarga qo\'shiladi, qiymati esa YO\'Q', () => {
  const info = describeGeminiError(
    400,
    'API key not valid',
    'uzunligi 40, AIza bilan boshlanadi, kutilgan uzunlik 39'
  );
  assert.ok(info);
  // Shakl ma'lumoti "noto'g'ri kalit" va "bo'sh joy bilan kalit"
  // holatlarini bir qarashda ajratadi.
  assert.match(info.message, /uzunligi 40/);
  assert.match(info.message, /kutilgan uzunlik 39/);
});

test('shakl berilmasa xabar baribir to\'liq bo\'ladi', () => {
  const info = describeGeminiError(400, 'API key not valid');
  assert.ok(info);
  assert.ok(!info.message.includes('[kalit:'), 'bo\'sh qavs qolmasligi kerak');
  assert.match(info.message, /yaroqsiz/i);
});

test('API yoqilmagan xabariga kalit shakli QO\'SHILMAYDI', () => {
  // Bu holatda kalit aybdor emas, shuning uchun uning uzunligini
  // ko'rsatish e'tiborni noto'g'ri tomonga tortadi.
  const info = describeGeminiError(
    403,
    'has not been used in project 1 before or it is disabled',
    'uzunligi 39, AIza bilan boshlanadi'
  );
  assert.ok(info);
  assert.ok(!info.message.includes('[kalit:'), 'kalit shakli bu yerda kerak emas');
});

// --- Limit (kvota) xatolari: kunlik va qisqa muddatli ---

test('KUNLIK limit kutishni TAVSIYA QILMAYDI', async () => {
  const { describeQuotaError } = await import('../../server/geminiErrors.ts');
  // Gemini bepul tarifda aynan shunday qaytaradi.
  const real =
    'You exceeded your current quota. ' +
    'quota_metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, ' +
    'quota_id: GenerateRequestsPerDayPerProjectPerModel-FreeTier, quota_value: 20';
  const info = describeQuotaError(429, real);
  assert.ok(info);
  assert.equal(info.reason, 'quota_daily');
  assert.equal(info.status, 429);
  // ENG MUHIMI: kutish yordam bermasligi aytilishi kerak. Ilgari bu yerda
  // "bir oz kutib, qayta urinib ko'ring" turardi — bu yolg'on edi.
  assert.match(info.message, /kutish yordam bermaydi/i);
  assert.ok(
    !/bir oz kutib/i.test(info.message),
    "kunlik limitda 'bir oz kutib' deyish yolg'on"
  );
  // Qachon yangilanishi aytilsin.
  assert.match(info.message, /yangilanadi/);
  // Kunlik limitda qayta urinish soniyasi berilmaydi.
  assert.equal(info.retryAfterSec, undefined);
});

test('qisqa muddatli limit ANIQ soniyani aytadi', async () => {
  const { describeQuotaError } = await import('../../server/geminiErrors.ts');
  const real =
    'Resource has been exhausted (e.g. check quota). ' +
    'quota_id: GenerateRequestsPerMinutePerProjectPerModel, retryDelay: "33s"';
  const info = describeQuotaError(429, real);
  assert.ok(info);
  assert.equal(info.reason, 'quota_short');
  assert.equal(info.retryAfterSec, 33);
  assert.match(info.message, /33 soniyadan keyin/);
});

test('soniya berilmasa xabar taxmin qilmasdan ikki ehtimolni aytadi', async () => {
  const { describeQuotaError } = await import('../../server/geminiErrors.ts');
  const info = describeQuotaError(429, 'RESOURCE_EXHAUSTED: too many requests');
  assert.ok(info);
  assert.equal(info.reason, 'quota_short');
  assert.equal(info.retryAfterSec, undefined);
  // Soniya noma'lum, demak qaysi limit ekani ham noma'lum. Xabar darhol
  // qilinadigan ishni ham, kunlik limit ehtimolini ham aytishi kerak.
  assert.match(info.message, /bir daqiqadan keyin/i);
  assert.match(info.message, /kunlik limit/i);
});

test('kunlik va qisqa limit xabarlari BIR XIL BO\'LMASLIGI kerak', async () => {
  const { describeQuotaError } = await import('../../server/geminiErrors.ts');
  const daily = describeQuotaError(429, 'quota_id: GenerateRequestsPerDayPerProjectPerModel')!;
  const short = describeQuotaError(429, 'quota_id: GenerateRequestsPerMinutePerProjectPerModel')!;
  assert.notEqual(daily.message, short.message, 'ikki holat ajratilishi kerak');
  assert.equal(daily.reason, 'quota_daily');
  assert.equal(short.reason, 'quota_short');
});

test('limitga aloqasi yo\'q xato null qaytaradi', async () => {
  const { describeQuotaError } = await import('../../server/geminiErrors.ts');
  // Bular `failure()` da boshqa yo'llar bilan ko'rib chiqiladi.
  assert.equal(describeQuotaError(500, 'internal server error'), null);
  assert.equal(describeQuotaError(400, 'API key not valid'), null);
  assert.equal(describeQuotaError(0, 'socket hang up'), null);
});

test('aql bovar qilmaydigan retryDelay ishonchli qiymatga keltiriladi', async () => {
  const { retryAfterSeconds } = await import('../../server/geminiErrors.ts');
  assert.equal(retryAfterSeconds('retryDelay: "7.2s"'), 8, 'kasr son yuqoriga yaxlitlanadi');
  assert.equal(retryAfterSeconds('retryDelay: "0s"'), undefined, '0 soniya maslahat emas');
  assert.equal(retryAfterSeconds('retryDelay: "999999s"'), 3600, 'bir soat bilan cheklanadi');
  assert.equal(retryAfterSeconds('hech narsa yo\'q'), undefined);
});

test("kunlik limit xabari eski YOLG'ON matnni ishlatmaydi", async () => {
  const { readFileSync } = await import('node:fs');
  const src = readFileSync('server/app.ts', 'utf8');
  // `failure()` endi tasniflovchini chaqirishi kerak, o'zi xabar yozmasligi.
  assert.ok(src.includes('describeQuotaError(status, detail)'), 'tasniflovchi ulanishi kerak');
  // Eski matn `error:` qiymati sifatida qolmasligi kerak (izohda bo'lishi mumkin).
  assert.ok(
    !/error:\s*"Server hozir band/.test(src),
    "eski 'Server hozir band' xabari olib tashlanishi kerak"
  );
  // Qisqa limitda standart sarlavha ham qo'yiladi.
  assert.ok(src.includes("res.setHeader('Retry-After'"), 'Retry-After qo\'yilishi kerak');
});

// --- Vaqtinchalik yuklama (503) va qayta urinish qarori ---

test('503 ALOHIDA tasniflanadi va kalitni aybdor qilmaydi', async () => {
  const { describeOverloadError } = await import('../../server/geminiErrors.ts');
  const real = 'The model is overloaded. Please try again later. [503 UNAVAILABLE]';
  const info = describeOverloadError(503, real);
  assert.ok(info);
  assert.equal(info.reason, 'model_overloaded');
  assert.equal(info.status, 503);
  assert.match(info.message, /band/i);
  // Foydalanuvchi o'zida yoki kalitida nuqson bor deb o'ylamasligi kerak.
  assert.match(info.message, /kalit yoki limit muammosi emas/i);
  assert.match(info.message, /qayta urinib/i);
});

test('503 xabari umumiy "xatolik yuz berdi" dan FARQ qiladi', async () => {
  const { describeOverloadError } = await import('../../server/geminiErrors.ts');
  const info = describeOverloadError(503, 'UNAVAILABLE')!;
  assert.ok(
    !/xatolik yuz berdi/i.test(info.message),
    'umumiy matn qolgan bo\'lsa, tuzatishning ma\'nosi yo\'q'
  );
});

test('KVOTA xatosi vaqtinchalik DEB HISOBLANMAYDI', async () => {
  const { isTransientError } = await import('../../server/geminiErrors.ts');
  // ENG MUHIM TEST. Bepul tarifda kunlik chegara 20 ta so'rov (loyiha
  // konsolida tasdiqlangan). Kvota xatosida qayta urinish o'sha 20 tani
  // bekorga sarflaydi va foydalanuvchi ertasigacha ishlay olmaydi.
  assert.equal(isTransientError(429, 'RESOURCE_EXHAUSTED'), false);
  assert.equal(isTransientError(429, 'quota exceeded, please try again later'), false,
    "matnda 'try again later' bo'lsa ham kvota qayta urinilmasligi kerak");
  assert.equal(isTransientError(0, 'You exceeded your current quota'), false);
});

test('sozlama xatolari ham qayta urinilmaydi', async () => {
  const { isTransientError } = await import('../../server/geminiErrors.ts');
  // Bular qayta urinishdan tuzalmaydi — faqat vaqt va kvota sarflanadi.
  assert.equal(isTransientError(400, 'API key not valid'), false);
  assert.equal(isTransientError(403, 'API_KEY_HTTP_REFERRER_BLOCKED'), false);
  assert.equal(isTransientError(403, 'has not been used in project 1 before or it is disabled'), false);
  assert.equal(isTransientError(404, 'models/x is not found for API version v1beta'), false);
});

test('faqat Google tomonidagi yuklama qayta uriniladi', async () => {
  const { isTransientError } = await import('../../server/geminiErrors.ts');
  assert.equal(isTransientError(503, 'Service Unavailable'), true);
  assert.equal(isTransientError(0, 'The model is overloaded. Please try again later.'), true);
  assert.equal(isTransientError(0, 'UNAVAILABLE: backend temporarily unavailable'), true);
  // Aloqasi yo'q xato qayta urinilmaydi.
  assert.equal(isTransientError(500, 'internal error'), false);
});

test('zanjir vaqtinchalik xatoda QAYTA URINADI, boshqasida yo\'q', async () => {
  const { readFileSync } = await import('node:fs');
  const src = readFileSync('server/app.ts', 'utf8');

  assert.ok(src.includes('MAX_ATTEMPTS_PER_MODEL'), 'urinishlar soni belgilanishi kerak');
  assert.ok(src.includes('isTransientError('), 'qaror tasniflovchidan olinishi kerak');
  // Vaqtinchalik bo'lmasa — darhol keyingi modelga, qayta urinmasdan.
  assert.ok(/if \(!transient\) break;/.test(src), 'vaqtinchalik bo\'lmaganda qayta urinmasligi kerak');
  // Kutish byudjetni buzmasligi kerak.
  assert.ok(
    src.includes('MIN_ATTEMPT_MS + RETRY_BACKOFF_MS'),
    'kutishdan keyin urinishga vaqt qolishini tekshirish kerak'
  );
  assert.ok(src.includes('await sleep(RETRY_BACKOFF_MS)'), 'qayta urinishdan oldin kutish kerak');
});

test('503 javobi mijozga yetib boradi va Retry-After qo\'yiladi', async () => {
  const { readFileSync } = await import('node:fs');
  const src = readFileSync('server/app.ts', 'utf8');
  assert.ok(src.includes('describeOverloadError(status, detail)'), 'tasniflovchi ulanishi kerak');
  assert.ok(src.includes("res.setHeader('Retry-After', String(OVERLOAD_RETRY_SEC))"));
  // Tartib muhim: kvota tekshiruvi 503 dan OLDIN bo'lishi kerak, aks holda
  // kvota xatosi "xizmat band" bo'lib ko'rinib qolardi.
  assert.ok(
    src.indexOf('describeQuotaError(status, detail)') < src.indexOf('describeOverloadError(status, detail)'),
    'kvota tekshiruvi oldin kelishi kerak'
  );
});

// --- To'lov xatosi (402) kvota deb tasniflanmasligi ---

test("402 LIMIT deb tasniflanmaydi, garchi matnida 'quota' bo'lsa ham", async () => {
  const { describeQuotaError, describeBillingError } =
    await import('../../server/geminiErrors.ts');

  // Gemini'ning HAQIQIY 402 javobi. Diqqat: ichida "quota" so'zi bor.
  // Aynan shu matn tufayli to'lov muammosi limit deb tasniflanar va
  // foydalanuvchiga "bir daqiqa kutib, qayta urinib ko'ring" deyilardi —
  // kutish esa hech qachon yordam bermasdi.
  const real =
    'You exceeded your current quota, please check your plan and billing details. [402]';

  assert.equal(
    describeQuotaError(402, real),
    null,
    "402 kvota tasniflovchisiga TUSHMASLIGI kerak"
  );

  const info = describeBillingError(402, real);
  assert.ok(info);
  assert.equal(info.reason, 'billing_required');
  assert.match(info.message, /to'lov/i);
  assert.match(info.message, /kutish yordam bermaydi/i);
  // Limit haqidagi eski matn chiqmasligi kerak.
  assert.ok(
    !/tez-tez keldi/i.test(info.message),
    "to'lov xatosi limit tilida gapirmasligi kerak"
  );
});

test('to\'lov xatosi matndan ham aniqlanadi', async () => {
  const { isBillingError } = await import('../../server/geminiErrors.ts');
  assert.equal(isBillingError(402, 'PAYMENT_REQUIRED'), true);
  assert.equal(isBillingError(0, 'check your plan and billing details'), true);
  assert.equal(isBillingError(0, 'billing account for project is not found'), true);
  // Oddiy limit xatosi to'lov deb hisoblanmasligi kerak.
  assert.equal(isBillingError(429, 'RESOURCE_EXHAUSTED: rate limit'), false);
  assert.equal(isBillingError(503, 'overloaded'), false);
});

test("402 qayta URINILMAYDI", async () => {
  const { isTransientError } = await import('../../server/geminiErrors.ts');
  // Qayta urinish to'lovni tuzatmaydi, faqat vaqt sarflaydi.
  assert.equal(isTransientError(402, 'You exceeded your current quota'), false);
});

test('qaysi limit ekani NOMA\'LUM bo\'lsa, xabar taxmin qilmaydi', async () => {
  const { describeQuotaError } = await import('../../server/geminiErrors.ts');
  // Gemini "PerDay" belgisini har doim yubormaydi. Belgisiz holatda kod
  // ilgari ishonchli "bir daqiqa kutib" derdi — kunlik limit bo'lsa bu
  // noto'g'ri yo'lga solardi.
  const info = describeQuotaError(429, 'RESOURCE_EXHAUSTED');
  assert.ok(info);
  assert.equal(info.reason, 'quota_short');
  assert.match(info.message, /kunlik limit tugagan bo'lishi mumkin/i,
    'noaniq holatda kunlik ehtimol ham aytilishi kerak');
  assert.match(info.message, /ertaga yangilanadi/i);
});

test('to\'lov tekshiruvi kvotadan OLDIN kelishi kerak', async () => {
  const { readFileSync } = await import('node:fs');
  const src = readFileSync('server/app.ts', 'utf8');
  assert.ok(src.includes('describeBillingError(status, detail)'), 'ulanishi kerak');
  assert.ok(
    src.indexOf('describeBillingError(status, detail)') <
    src.indexOf('describeQuotaError(status, detail)'),
    "402 kvotadan oldin ko'rib chiqilishi kerak"
  );
});
