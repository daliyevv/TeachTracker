/**
 * `/api/*` yo'llarining himoyasi uchun integratsiya testlari.
 *
 * Haqiqiy Express ilovasi ishga tushiriladi va so'rovlar HTTP orqali
 * yuboriladi. Ya'ni test middleware'ning haqiqatan ulanganini tekshiradi —
 * `requireAuth` ni route'ga qo'shishni unutish shu yerda ushlanadi.
 *
 * Gemini'ga chaqiruv bo'lmaydi: tokensiz so'rov middleware'da to'xtaydi,
 * route'ning tanasiga yetib bormaydi.
 */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';

import app from '../../server/app.ts';

let server: Server;
let base: string;

/** Himoyalangan bo'lishi SHART bo'lgan yo'llar. */
const PROTECTED: Array<[string, unknown]> = [
  ['/api/gemini/analyze-dictation', { base64Images: ['x'], originalText: 'a' }],
  ['/api/gemini/analyze-assignment', { files: [], instruction: 'a' }],
  ['/api/gemini/detect-paper-bounds', { base64Image: 'x' }],
  ['/api/gemini/generate-material', { prompt: 'a', type: 'test' }],
  ['/api/gemini/tts', { prompt: 'a' }],
  ['/api/create-checkout-session', { priceId: 'price_1' }],
];

const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  fetch(base + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('port aniqlanmadi');
  base = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

for (const [path, body] of PROTECTED) {
  test(`${path} tokensiz so'rovni 401 bilan rad etadi`, async () => {
    const response = await post(path, body);
    assert.equal(response.status, 401, `${path} himoyalanmagan`);
    const json = await response.json();
    assert.match(json.error, /kiring/i);
  });

  test(`${path} soxta token bilan 401 qaytaradi`, async () => {
    const response = await post(path, body, { Authorization: 'Bearer aaa.bbb.ccc' });
    assert.equal(response.status, 401, `${path} soxta tokenni qabul qildi`);
  });

  test(`${path} "Bearer" so'zisiz tokenni qabul qilmaydi`, async () => {
    const response = await post(path, body, { Authorization: 'aaa.bbb.ccc' });
    assert.equal(response.status, 401);
  });
}

test("xato ishlovchisi JSON qaytaradi, HTML emas", async () => {
  // Buzilgan JSON — ilgari Express'ning standart HTML sahifasi qaytardi.
  const response = await fetch(base + '/api/gemini/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{ buzilgan',
  });
  assert.equal(response.status, 400);
  assert.match(response.headers.get('content-type') || '', /application\/json/);
  const json = await response.json();
  assert.ok(typeof json.error === 'string');
});

test('begona manbaga CORS ruxsati berilmaydi', async () => {
  const response = await fetch(base + '/api/gemini/tts', {
    method: 'OPTIONS',
    headers: { Origin: 'https://zararli.example.com', 'Access-Control-Request-Method': 'POST' },
  });
  assert.equal(response.headers.get('access-control-allow-origin'), null);
});

test("ishlab chiqarishdan tashqarida localhost ga CORS ruxsati beriladi", async () => {
  const response = await fetch(base + '/api/gemini/tts', {
    method: 'OPTIONS',
    headers: { Origin: 'http://localhost:5173', 'Access-Control-Request-Method': 'POST' },
  });
  assert.equal(response.headers.get('access-control-allow-origin'), 'http://localhost:5173');
});

// --- Gemini kaliti sozlanmaganda ---

test("GEMINI_API_KEY yo'q bo'lsa aniq xato qaytadi, umumiy emas", async () => {
  // Bu testda kalit atayin o'rnatilmagan (test muhitida .env yo'q), ya'ni
  // server `requireGemini` orqali to'xtatishi kerak.
  //
  // Ilgari bu holat "Xizmat vaqtincha ishlamayapti. Birozdan keyin urinib
  // ko'ring." bo'lib qaytardi — o'quvchiga yolg'on umid berar
  // ("kutsam ishlaydi"), loyiha egasiga esa nima buzilganini aytmasdi.
  if (process.env.GEMINI_API_KEY) {
    // Kalit mavjud muhitda bu testning ma'nosi yo'q.
    return;
  }

  // Tokensiz so'rov `requireAuth` da to'xtaydi, ya'ni `requireGemini` ga
  // yetib bormaydi. Shuning uchun bu yerda faqat xabarning MANBASINI
  // tekshiramiz: kod ichida aniq matn borligini.
  const { readFileSync } = await import('node:fs');
  const src = readFileSync('server/app.ts', 'utf8');

  assert.ok(src.includes('GEMINI_API_KEY yo\'q'), 'kalit yo\'qligi aytilishi kerak');
  assert.ok(
    src.includes('kutish yordam bermaydi'),
    "xabar kutishning foydasi yo'qligini aytishi kerak"
  );
  // Har bir Gemini yo'li himoyalangan bo'lishi kerak.
  const guarded = (src.match(/requireGemini/g) || []).length;
  // 1 ta ta'rif + 5 ta yo'l
  assert.ok(guarded >= 6, `requireGemini yetarli joyda yo'q (${guarded})`);
});

test('kalit rad etilgan holat kalit yo\'qligidan AJRATILGAN', async () => {
  const { readFileSync } = await import('node:fs');
  const src = readFileSync('server/app.ts', 'utf8');
  // Ikki holat ikki xil xabar olishi kerak — ilgari ikkisi ham bir xil edi.
  assert.ok(src.includes('kalitni qabul qilmadi'), 'rad etilgan kalit uchun alohida xabar');
  // Umumiy "xizmat ishlamayapti" matni endi JAVOB sifatida
  // qaytarilmasligi kerak. Izohlarda eslatma sifatida qolishi normal,
  // shuning uchun faqat `error:` qiymatlarini tekshiramiz.
  const errorValues = [...src.matchAll(/error:\s*\n?\s*"([^"]*)"/g)].map(m => m[1]);
  assert.ok(errorValues.length > 0, 'javob matnlari topilishi kerak');
  assert.ok(
    !errorValues.some(v => v.includes('Xizmat vaqtincha ishlamayapti')),
    "umumiy 'xizmat ishlamayapti' xabari javob sifatida qolmasligi kerak"
  );
});
