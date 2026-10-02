/**
 * Baholash va nishonlar mantig'i uchun testlar.
 *
 * Bu yerdagi har bir test Faza 4 da topilgan aniq bir nuqsonni qoplaydi.
 * Testlar brauzersiz ishlaydi, chunki tekshirilayotgan kod toza funksiya.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { MAX_GRADE, clampGrade, cloneResult } from '../../services/gradingService.ts';
import {
  evaluateBadges,
  submissionsSignature,
  verifiedGradeOf,
  isVerifiedSubmission,
} from '../../services/badgeService.ts';
import type { AnalysisResult, Submission, User } from '../../types.ts';

const emptyResult = (over: Partial<AnalysisResult> = {}): AnalysisResult => ({
  extractedText: '',
  correctedText: '',
  mistakes: [],
  grade: 0,
  handwritingScore: 0,
  feedback: '',
  improvementTips: [],
  ...over,
});

const submission = (over: Partial<Submission> = {}): Submission => ({
  id: 's1',
  taskId: 't1',
  studentId: 'u1',
  ttResult: emptyResult(),
  status: 'pending',
  submittedAt: 1000,
  ...over,
});

const student: User = { id: 'u1', name: 'Ali', email: 'a@b.uz', role: 'student', badges: [] };

// --- baho shkalasi ---

test('clampGrade bahoni 0-5 oralig\'ida saqlaydi', () => {
  assert.equal(MAX_GRADE, 5);
  // Tekshiruv panelida ilgari max="10" edi: ustoz 8 yozsa shu yerda 5 ga tushadi.
  assert.equal(clampGrade(8), 5);
  assert.equal(clampGrade(10), 5);
  assert.equal(clampGrade(-3), 0);
  assert.equal(clampGrade(4), 4);
  assert.equal(clampGrade(4.4), 4);
  assert.equal(clampGrade(4.6), 5);
  // Yaroqsiz kiritma butun sahifani yiqitmasligi kerak.
  assert.equal(clampGrade(NaN), 0);
  assert.equal(clampGrade(undefined), 0);
  assert.equal(clampGrade('abc'), 0);
  assert.equal(clampGrade(''), 0);
});

// --- chuqur nusxa ---

test("cloneResult asl xatolarga TEGMAYDI", () => {
  const original = emptyResult({
    grade: 4,
    mistakes: [{
      word: 'kitob',
      correction: 'kitob',
      description: '',
      type: 'imlo',
      lineNumber: 1,
      boundingBox: [0, 0, 10, 10],
      pageIndex: 0,
    }],
    improvementTips: ['koproq oqing'],
  });

  const copy = cloneResult(original);
  copy.mistakes[0].word = "O'ZGARTIRILDI";
  copy.mistakes.push({ ...copy.mistakes[0] });
  copy.improvementTips.push('yangi');

  // Nusxani tahrirlash ASL topshiriqni buzmasligi kerak — ilgari buzardi.
  assert.equal(original.mistakes[0].word, 'kitob');
  assert.equal(original.mistakes.length, 1);
  assert.equal(original.improvementTips.length, 1);
});

test('cloneResult bo\'sh natijadan ham yiqilmaydi', () => {
  const fromUndefined = cloneResult(undefined);
  assert.deepEqual(fromUndefined.mistakes, []);
  assert.equal(fromUndefined.grade, 0);
  assert.equal(fromUndefined.feedback, '');

  // Shkaladan chiqqan eski yozuv ham qamab olinadi.
  assert.equal(cloneResult(emptyResult({ grade: 9, handwritingScore: 11 })).grade, 5);
  assert.equal(cloneResult(emptyResult({ grade: 9, handwritingScore: 11 })).handwritingScore, 5);
});

// --- tasdiqlangan baho ---

test('tasdiqlanmagan ishning bahosi hisobga olinmaydi', () => {
  // AI natijasini o'quvchining brauzeri yozadi, ya'ni unga ishonib bo'lmaydi.
  const aiOnly = submission({ ttResult: emptyResult({ grade: 5 }), status: 'pending' });
  assert.equal(verifiedGradeOf(aiOnly), 0);
  assert.equal(isVerifiedSubmission(aiOnly), false);

  // `status` tasdiqlangan, lekin ustoz tuzatishi yo'q — baribir ishonmaymiz.
  const approvedNoCorrection = submission({ ttResult: emptyResult({ grade: 5 }), status: 'approved' });
  assert.equal(verifiedGradeOf(approvedNoCorrection), 0);

  const verified = submission({
    ttResult: emptyResult({ grade: 2 }),
    teacherCorrection: emptyResult({ grade: 5 }),
    status: 'approved',
  });
  assert.equal(verifiedGradeOf(verified), 5);
  assert.equal(isVerifiedSubmission(verified), true);
});

// --- nishon imzosi (asosiy nuqson) ---

test("ustoz tasdiqlaganda imzo O'ZGARADI (son o'zgarmasa ham)", () => {
  const before = [submission({ status: 'pending' })];
  const after = [submission({
    status: 'approved',
    teacherCorrection: emptyResult({ grade: 5 }),
  })];

  // Aynan shu yerda eski kod yiqilardi: `subs.length` ikkala holatda ham 1,
  // shuning uchun nishon effekti qayta ishlamas va aniqlik nishonlari
  // HECH QACHON berilmasdi.
  assert.equal(before.length, after.length);
  assert.notEqual(submissionsSignature(before), submissionsSignature(after));
});

test('imzo bir xil mazmunda o\'zgarmaydi', () => {
  const a = [
    submission({ id: 's1', status: 'approved', teacherCorrection: emptyResult({ grade: 5 }) }),
    submission({ id: 's2', status: 'pending' }),
  ];
  // Firestore kuzatuvchisi har yangilanishda YANGI massiv beradi, lekin
  // mazmun o'zgarmasa imzo o'zgarmasligi kerak — aks holda konfetti
  // takrorlanib turardi.
  const b = [
    submission({ id: 's2', status: 'pending' }),
    submission({ id: 's1', status: 'approved', teacherCorrection: emptyResult({ grade: 5 }) }),
  ];
  assert.equal(submissionsSignature(a), submissionsSignature(b));
});

test("ustoz bahoni o'zgartirsa imzo o'zgaradi", () => {
  const four = [submission({ status: 'approved', teacherCorrection: emptyResult({ grade: 4 }) })];
  const five = [submission({ status: 'approved', teacherCorrection: emptyResult({ grade: 5 }) })];
  assert.notEqual(submissionsSignature(four), submissionsSignature(five));
});

// --- nishonlar amalda ---

test("tasdiqlanmagan 5 baho aniqlik nishonini OCHMAYDI", () => {
  const subs = [submission({ ttResult: emptyResult({ grade: 5, handwritingScore: 5 }) })];
  const { updatedUser } = evaluateBadges(subs, student);

  // "Birinchi qadam" — topshirish nishoni, u ochilishi KERAK.
  assert.ok(updatedUser.badges?.includes('ilk_qadam'));
  // Aniqlik nishonlari esa ochilmasligi kerak: baho tasdiqlanmagan.
  assert.ok(!updatedUser.badges?.includes('besh_yulduz'));
  assert.ok(!updatedUser.badges?.includes('husnihat_qiroli'));
  assert.ok(!updatedUser.badges?.includes('mutlaq_aniqlik'));
});

test('ustoz tasdiqlagan 5 baho aniqlik nishonini ochadi', () => {
  const subs = [submission({
    status: 'approved',
    teacherCorrection: emptyResult({ grade: 5, handwritingScore: 5, mistakes: [] }),
  })];
  const { updatedUser } = evaluateBadges(subs, student);

  assert.ok(updatedUser.badges?.includes('besh_yulduz'));
  assert.ok(updatedUser.badges?.includes('husnihat_qiroli'));
  assert.ok(updatedUser.badges?.includes('mutlaq_aniqlik'));
});

test('ball yangi nishonsiz ham o\'sadi', () => {
  // Shuning uchun saqlash "yangi nishon bor" shartiga bog'lanmasligi kerak
  // edi — ilgari bog'langan va ballar hech qachon saqlanmasdi.
  const one = evaluateBadges([submission({ id: 's1' })], student);
  const two = evaluateBadges(
    [submission({ id: 's1' }), submission({ id: 's2' })],
    { ...student, badges: one.updatedUser.badges }
  );
  assert.ok((two.updatedUser.points || 0) > (one.updatedUser.points || 0));
});

// --- sahifa soni chegarasi ---

test('appendWithinLimit chegaradan oshirmaydi', async () => {
  const { appendWithinLimit, MAX_PAGES } = await import('../../services/imageService.ts');

  const ten = Array.from({ length: 10 }, (_, i) => `img${i}`);
  const result = appendWithinLimit(ten, ['a', 'b', 'c', 'd'], MAX_PAGES);
  // 10 + 4 = 14, chegara 12 -> 2 tasi qabul qilinadi, 2 tasi rad etiladi.
  assert.equal(result.next.length, MAX_PAGES);
  assert.equal(result.rejected, 2);
  // Tartib saqlanadi: `pageIndex` shu tartibga tayanadi.
  assert.equal(result.next[10], 'a');
  assert.equal(result.next[11], 'b');
});

test("appendWithinLimit joy bo'lmasa asl ro'yxatni qaytaradi", async () => {
  const { appendWithinLimit } = await import('../../services/imageService.ts');
  const full = Array.from({ length: 12 }, (_, i) => `img${i}`);
  const result = appendWithinLimit(full, ['x'], 12);
  assert.equal(result.rejected, 1);
  // Aynan o'sha havola — chaqiruvchi shundan "o'zgarish yo'q" deb biladi.
  assert.equal(result.next, full);
});

test("appendWithinLimit bo'sh ro'yxatga normal qo'shadi", async () => {
  const { appendWithinLimit } = await import('../../services/imageService.ts');
  const result = appendWithinLimit([], ['a', 'b'], 12);
  assert.deepEqual(result.next, ['a', 'b']);
  assert.equal(result.rejected, 0);
});

// --- kirish xatolari ---

test("har bir kirish xatosi O'Z matnini oladi", async () => {
  const { describeAuthError } = await import('../../services/authErrors.ts');

  // Ilgari bu uchta butunlay boshqa sabab bitta gapga yig'ilardi:
  // "Google bilan kirib bo'lmadi. Qayta urinib ko'ring."
  const domain = describeAuthError({ code: 'auth/unauthorized-domain' });
  const disabled = describeAuthError({ code: 'auth/operation-not-allowed' });
  const cookies = describeAuthError({ code: 'auth/internal-error' });

  assert.notEqual(domain.message, disabled.message);
  assert.notEqual(disabled.message, cookies.message);
  assert.notEqual(domain.message, cookies.message);

  // Sozlama muammosi va foydalanuvchi holati ajratiladi.
  assert.equal(domain.kind, 'config');
  assert.equal(disabled.kind, 'config');
  assert.equal(cookies.kind, 'user');
  assert.equal(describeAuthError({ code: 'auth/network-request-failed' }).kind, 'network');
});

test('kirish xatosining kodi har doim saqlanadi', async () => {
  const { describeAuthError } = await import('../../services/authErrors.ts');

  // Kod interfeysda ko'rsatiladi — telefondan konsolni ochish qiyin.
  assert.equal(describeAuthError({ code: 'auth/unauthorized-domain' }).code, 'auth/unauthorized-domain');
  // Notanish kod ham yo'qolmaydi: shu kod bo'yicha muammoni aniqlaymiz.
  assert.equal(describeAuthError({ code: 'auth/qandaydir-yangi-xato' }).code, 'auth/qandaydir-yangi-xato');
  assert.equal(describeAuthError({}).code, 'unknown');
  assert.equal(describeAuthError(null).code, 'unknown');
  // Notanish xato ham tushunarli matn bilan keladi, bo'sh emas.
  assert.ok(describeAuthError({ code: 'x' }).message.length > 0);
  assert.ok(describeAuthError({ code: 'x' }).hint);
});

test("foydalanuvchi o'zi bekor qilgani xato deb hisoblanmaydi", async () => {
  const { isUserCancelled } = await import('../../services/authErrors.ts');
  assert.equal(isUserCancelled({ code: 'auth/popup-closed-by-user' }), true);
  assert.equal(isUserCancelled({ code: 'auth/cancelled-popup-request' }), true);
  // Haqiqiy xato jim o'tkazilmasligi kerak.
  assert.equal(isUserCancelled({ code: 'auth/unauthorized-domain' }), false);
  assert.equal(isUserCancelled({ code: 'auth/internal-error' }), false);
  assert.equal(isUserCancelled(null), false);
});

test('redirect zaxirasi faqat popup ishlamaganda ishlaydi', async () => {
  const { shouldFallBackToRedirect } = await import('../../services/authErrors.ts');
  assert.equal(shouldFallBackToRedirect({ code: 'auth/popup-blocked' }), true);
  assert.equal(shouldFallBackToRedirect({ code: 'auth/operation-not-supported-in-this-environment' }), true);
  // Domen ruxsat etilmagan bo'lsa, redirect ham ishlamaydi — bekorga
  // sahifani Google'ga jo'natishning ma'nosi yo'q.
  assert.equal(shouldFallBackToRedirect({ code: 'auth/unauthorized-domain' }), false);
  assert.equal(shouldFallBackToRedirect({ code: 'auth/network-request-failed' }), false);
});
