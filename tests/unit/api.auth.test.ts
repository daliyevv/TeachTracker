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
