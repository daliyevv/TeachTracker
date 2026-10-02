/**
 * storage.rules uchun testlar.
 *
 * DIQQAT: Storage qoidalar ishlovchisi JAVA_TOOL_OPTIONS o'rnatilgan bo'lsa
 * jimgina ishdan chiqadi va HAMMA narsaga ruxsat beradi. Shuning uchun
 * package.json dagi test:rules skripti `env -u JAVA_TOOL_OPTIONS` bilan
 * ishga tushiriladi. Quyidagi "ruxsat yo'q" testlari shu holatni ham
 * ushlaydi: qoidalar o'chib qolsa, ular o'tmay qoladi.
 */
import { readFileSync } from 'node:fs';
import test, { before, after } from 'node:test';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing';
import { ref, uploadBytes, getBytes } from 'firebase/storage';

let testEnv;

const OWNER = 'student_aaa';
const OTHER = 'student_bbb';

const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const asImage = { contentType: 'image/jpeg' };

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'teachtracker-rules-test',
    storage: {
      rules: readFileSync('storage.rules', 'utf8'),
      host: '127.0.0.1',
      port: 9199,
    },
  });
});

after(async () => {
  if (testEnv) await testEnv.cleanup();
});

test('egasi o\'z papkasiga rasm yuklay OLADI', async () => {
  const s = testEnv.authenticatedContext(OWNER).storage();
  await assertSucceeds(
    uploadBytes(ref(s, `submissions/${OWNER}/a.jpg`), jpegBytes, asImage)
  );
});

test('boshqa foydalanuvchi o\'zga papkaga yuklay OLMAYDI', async () => {
  const s = testEnv.authenticatedContext(OTHER).storage();
  await assertFails(
    uploadBytes(ref(s, `submissions/${OWNER}/hack.jpg`), jpegBytes, asImage)
  );
});

test('boshqa foydalanuvchi o\'zga faylni SDK orqali o\'qiy OLMAYDI', async () => {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await uploadBytes(ref(ctx.storage(), `submissions/${OWNER}/secret.jpg`), jpegBytes, asImage);
  });
  const s = testEnv.authenticatedContext(OTHER).storage();
  await assertFails(getBytes(ref(s, `submissions/${OWNER}/secret.jpg`)));
});

test('egasi o\'z faylini o\'qiy OLADI', async () => {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await uploadBytes(ref(ctx.storage(), `submissions/${OWNER}/mine.jpg`), jpegBytes, asImage);
  });
  const s = testEnv.authenticatedContext(OWNER).storage();
  await assertSucceeds(getBytes(ref(s, `submissions/${OWNER}/mine.jpg`)));
});

test('rasm bo\'lmagan fayl qabul qilinmaydi', async () => {
  const s = testEnv.authenticatedContext(OWNER).storage();
  await assertFails(
    uploadBytes(ref(s, `submissions/${OWNER}/zararli.html`), jpegBytes, { contentType: 'text/html' })
  );
});

test('5MB dan katta fayl qabul qilinmaydi', async () => {
  const s = testEnv.authenticatedContext(OWNER).storage();
  const big = new Uint8Array(5 * 1024 * 1024 + 1024);
  await assertFails(
    uploadBytes(ref(s, `submissions/${OWNER}/katta.jpg`), big, asImage)
  );
});

test('autentifikatsiyasiz yuklab bo\'lmaydi', async () => {
  const s = testEnv.unauthenticatedContext().storage();
  await assertFails(
    uploadBytes(ref(s, `submissions/${OWNER}/anon.jpg`), jpegBytes, asImage)
  );
});

test('boshqa yo\'llar butunlay yopiq', async () => {
  const s = testEnv.authenticatedContext(OWNER).storage();
  await assertFails(
    uploadBytes(ref(s, `boshqa/${OWNER}/a.jpg`), jpegBytes, asImage)
  );
});

test('o\'qituvchi qo\'lda yuklash papkasiga yoza OLADI', async () => {
  const s = testEnv.authenticatedContext(OWNER).storage();
  await assertSucceeds(
    uploadBytes(ref(s, `manual_submissions/${OWNER}/a.jpg`), jpegBytes, asImage)
  );
});
