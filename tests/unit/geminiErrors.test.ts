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
