/**
 * `server/auth.ts` uchun testlar.
 *
 * Imzoni tekshirish uchun haqiqiy RSA kalit juftligi yaratiladi va tokenlar
 * shu kalit bilan imzolanadi. Ya'ni testlar "qoida yozilganmi" emas, balki
 * "soxta token haqiqatan rad etiladimi" degan savolga javob beradi.
 */
import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { SignJWT, generateKeyPair, exportJWK, type KeyObject } from 'jose';

import {
  bearerToken,
  verifyIdToken,
  checkQuota,
  resetQuota,
  buildAllowedOrigins,
  isOriginAllowed,
  previewOriginPattern,
  projectId,
} from '../../server/auth.ts';

const PROJECT = 'test-project-123';
const ISSUER = `https://securetoken.google.com/${PROJECT}`;

let privateKey: KeyObject;
let publicKey: KeyObject;

const nowSeconds = () => Math.floor(Date.now() / 1000);

/** Berilgan da'volar bilan RS256 token imzolaydi. */
const signToken = async (claims: Record<string, unknown> = {}, alg = 'RS256') => {
  const now = nowSeconds();
  const payload = {
    auth_time: now - 60,
    email: 'oquvchi@example.com',
    email_verified: true,
    ...claims,
  };
  let jwt = new SignJWT(payload as any)
    .setProtectedHeader({ alg })
    .setIssuedAt(now - 30)
    .setExpirationTime(now + 3600);

  if (!('iss' in payload)) jwt = jwt.setIssuer(ISSUER);
  if (!('aud' in payload)) jwt = jwt.setAudience(PROJECT);
  if (!('sub' in payload)) jwt = jwt.setSubject('uid_abc123');

  return jwt.sign(privateKey);
};

test('kalitlar tayyorlanadi', async () => {
  const pair = await generateKeyPair('RS256');
  privateKey = pair.privateKey as KeyObject;
  publicKey = pair.publicKey as KeyObject;
  assert.ok(await exportJWK(publicKey));
});

// --- projectId konfiguratsiya bilan mos ---

test("CONFIG_PROJECT_ID firebase-applet-config.json bilan mos", () => {
  const config = JSON.parse(readFileSync('firebase-applet-config.json', 'utf8'));
  // `projectId` muhit o'zgaruvchisi bo'lmaganda konfiguratsiyadagi qiymatga
  // teng bo'lishi shart. Aks holda hamma token "aud mos emas" deb rad etiladi.
  if (!process.env.FIREBASE_PROJECT_ID) {
    assert.equal(projectId, config.projectId);
  }
  const source = readFileSync('server/auth.ts', 'utf8');
  assert.ok(
    source.includes(`'${config.projectId}'`),
    'server/auth.ts dagi CONFIG_PROJECT_ID konfiguratsiyadan ajralib qolgan'
  );
});

// --- Authorization sarlavhasi ---

test('bearerToken sarlavhani to\'g\'ri ajratadi', () => {
  assert.equal(bearerToken('Bearer abc.def.ghi'), 'abc.def.ghi');
  assert.equal(bearerToken('bearer abc'), 'abc');
  assert.equal(bearerToken('Bearer    abc  '), 'abc');
  assert.equal(bearerToken('Basic abc'), null);
  assert.equal(bearerToken('Bearer'), null);
  assert.equal(bearerToken('Bearer    '), null);
  assert.equal(bearerToken(''), null);
  assert.equal(bearerToken(undefined), null);
  assert.equal(bearerToken(['Bearer a']), null);
});

// --- token tekshiruvi ---

test("to'g'ri imzolangan token qabul qilinadi", async () => {
  const token = await signToken();
  const user = await verifyIdToken(token, publicKey, PROJECT);
  assert.equal(user.uid, 'uid_abc123');
  assert.equal(user.email, 'oquvchi@example.com');
  assert.equal(user.emailVerified, true);
});

test('boshqa kalit bilan imzolangan token RAD ETILADI', async () => {
  const other = await generateKeyPair('RS256');
  const token = await new SignJWT({ auth_time: nowSeconds() - 60 })
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuer(ISSUER)
    .setAudience(PROJECT)
    .setSubject('uid_hacker')
    .setIssuedAt()
    .setExpirationTime(nowSeconds() + 3600)
    .sign(other.privateKey);

  await assert.rejects(() => verifyIdToken(token, publicKey, PROJECT), /yaroqsiz/);
});

test('imzosiz (alg: none) token RAD ETILADI', async () => {
  // Qo'lda yasalgan "alg: none" token — klassik hujum.
  const b64 = (o: unknown) =>
    Buffer.from(JSON.stringify(o)).toString('base64url');
  const token =
    `${b64({ alg: 'none', typ: 'JWT' })}.` +
    `${b64({ iss: ISSUER, aud: PROJECT, sub: 'uid_hacker', auth_time: nowSeconds() - 60, exp: nowSeconds() + 3600 })}.`;

  await assert.rejects(() => verifyIdToken(token, publicKey, PROJECT), /yaroqsiz/);
});

test("boshqa loyihaning tokeni (aud mos emas) RAD ETILADI", async () => {
  const token = await signToken({ aud: 'boshqa-loyiha' });
  await assert.rejects(() => verifyIdToken(token, publicKey, PROJECT), /yaroqsiz/);
});

test("noto'g'ri iss bilan token RAD ETILADI", async () => {
  const token = await signToken({ iss: 'https://evil.example.com/' });
  await assert.rejects(() => verifyIdToken(token, publicKey, PROJECT), /yaroqsiz/);
});

test("muddati tugagan token RAD ETILADI", async () => {
  const past = nowSeconds() - 7200;
  const token = await new SignJWT({ auth_time: past })
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuer(ISSUER)
    .setAudience(PROJECT)
    .setSubject('uid_abc123')
    .setIssuedAt(past)
    .setExpirationTime(past + 3600) // bir soat oldin tugagan
    .sign(privateKey);

  await assert.rejects(() => verifyIdToken(token, publicKey, PROJECT), /yaroqsiz/);
});

test("sub bo'sh bo'lsa RAD ETILADI", async () => {
  const token = await signToken({ sub: '' });
  await assert.rejects(() => verifyIdToken(token, publicKey, PROJECT), /sub/);
});

test('sub 128 belgidan uzun bo\'lsa RAD ETILADI', async () => {
  const token = await signToken({ sub: 'u'.repeat(129) });
  await assert.rejects(() => verifyIdToken(token, publicKey, PROJECT), /sub/);
});

test("auth_time yo'q bo'lsa RAD ETILADI", async () => {
  const token = await signToken({ auth_time: undefined });
  await assert.rejects(() => verifyIdToken(token, publicKey, PROJECT), /auth_time/);
});

test('auth_time kelajakda bo\'lsa RAD ETILADI', async () => {
  const token = await signToken({ auth_time: nowSeconds() + 3600 });
  await assert.rejects(() => verifyIdToken(token, publicKey, PROJECT), /auth_time/);
});

test("bo'sh / buzilgan token RAD ETILADI", async () => {
  for (const bad of ['', 'abc', 'a.b.c', 'null', '...']) {
    await assert.rejects(() => verifyIdToken(bad, publicKey, PROJECT), /yaroqsiz/);
  }
});

// --- so'rov cheklovi ---

test('checkQuota chegaradan keyin rad etadi', () => {
  resetQuota();
  const opts = { windowMs: 60_000, max: 3 };
  const t0 = 1_000_000;

  for (let i = 0; i < 3; i++) {
    assert.equal(checkQuota('uid1', opts, t0 + i).allowed, true, `urinish ${i}`);
  }
  const denied = checkQuota('uid1', opts, t0 + 10);
  assert.equal(denied.allowed, false);
  assert.ok(denied.retryAfterSeconds > 0 && denied.retryAfterSeconds <= 60);
});

test('checkQuota foydalanuvchilarni aralashtirmaydi', () => {
  resetQuota();
  const opts = { windowMs: 60_000, max: 1 };
  assert.equal(checkQuota('uid1', opts, 1000).allowed, true);
  assert.equal(checkQuota('uid1', opts, 1001).allowed, false);
  // Boshqa foydalanuvchi birinchisining chegarasidan jabr ko'rmaydi.
  assert.equal(checkQuota('uid2', opts, 1002).allowed, true);
});

test('checkQuota oyna o\'tgandan keyin yana ruxsat beradi', () => {
  resetQuota();
  const opts = { windowMs: 60_000, max: 2 };
  assert.equal(checkQuota('uid1', opts, 0).allowed, true);
  assert.equal(checkQuota('uid1', opts, 1000).allowed, true);
  assert.equal(checkQuota('uid1', opts, 2000).allowed, false);
  // 60 soniyadan keyin eski urinishlar oynadan chiqadi.
  assert.equal(checkQuota('uid1', opts, 61_001).allowed, true);
});

// --- CORS ---

test('buildAllowedOrigins muhitdan ro\'yxat yig\'adi', () => {
  const list = buildAllowedOrigins({
    NODE_ENV: 'production',
    ALLOWED_ORIGINS: 'https://a.example.com, https://b.example.com/',
    VERCEL_PROJECT_PRODUCTION_URL: 'teach-tracker.vercel.app',
  } as any);

  assert.ok(list.includes('https://a.example.com'));
  // Oxiridagi `/` tozalanadi, aks holda manba hech qachon mos kelmaydi.
  assert.ok(list.includes('https://b.example.com'));
  assert.ok(list.includes('https://teach-tracker.vercel.app'));
  // Ishlab chiqarishda localhost ochilmaydi.
  assert.ok(!list.some((o) => o.includes('localhost')));
});

test('buildAllowedOrigins ishlab chiqarishdan tashqarida localhost ni qo\'shadi', () => {
  const list = buildAllowedOrigins({ NODE_ENV: 'development' } as any);
  assert.ok(list.includes('http://localhost:5173'));
});

test('isOriginAllowed begona manbani rad etadi', () => {
  const allowed = ['https://teach-tracker.vercel.app'];
  const pattern = previewOriginPattern({
    VERCEL_PROJECT_PRODUCTION_URL: 'teach-tracker.vercel.app',
  } as any);

  assert.equal(isOriginAllowed('https://teach-tracker.vercel.app', allowed, pattern), true);
  // Loyihaning o'z oldindan ko'rish manzili.
  assert.equal(isOriginAllowed('https://teach-tracker-abc123-daliyevv.vercel.app', allowed, pattern), true);
  // Vercel'da joylashgan BEGONA sayt o'tmaydi — `*.vercel.app` butunlay
  // ochiq qoldirilgan bo'lsa, o'tib ketardi.
  assert.equal(isOriginAllowed('https://zararli-sayt.vercel.app', allowed, pattern), false);
  assert.equal(isOriginAllowed('https://evil.example.com', allowed, pattern), false);
  // "teach-tracker.vercel.app.evil.com" kabi qo'shimchali manzil.
  assert.equal(isOriginAllowed('https://teach-tracker.vercel.app.evil.com', allowed, pattern), false);
  // Manbasiz so'rov (curl, mobil ilova) CORS bilan to'xtatilmaydi — himoya tokenda.
  assert.equal(isOriginAllowed(undefined, allowed, pattern), true);
});

test('previewOriginPattern manba bo\'lmasa null qaytaradi', () => {
  assert.equal(previewOriginPattern({} as any), null);
});
