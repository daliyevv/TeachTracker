/**
 * firestore.rules uchun xavfsizlik testlari.
 *
 * Ishga tushirish:  npm run test:rules
 * (Firebase emulyatori avtomatik ko'tariladi, Java kerak)
 *
 * Bu testlar auditda topilgan kritik kamchiliklarni qaytib kelmasligini
 * ta'minlaydi: rolni o'zini o'zi ko'tarish, o'quvchining o'ziga baho yozishi,
 * boshqa o'quvchining ishini o'qish va o'chirish.
 */
import { readFileSync } from 'node:fs';
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing';
import {
  doc, getDoc, setDoc, updateDoc, deleteDoc,
  collection, getDocs, query, where,
} from 'firebase/firestore';

let testEnv;

const STUDENT = 'student_aaa';
const STUDENT2 = 'student_bbb';
const TEACHER = 'teacher_zzz';

const baseUser = (id, role) => ({
  id,
  name: 'Test Foydalanuvchi',
  email: `${id}@example.com`,
  role,
  badges: [],
  points: 0,
});

const baseSubmission = (studentId, extra = {}) => ({
  taskId: 'task_1',
  studentId,
  status: 'pending',
  submittedAt: 1700000000000,
  ...extra,
});

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'teachtracker-rules-test',
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });

  // Boshlang'ich ma'lumotlar — qoidalardan o'tmasdan yoziladi
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'users', STUDENT), baseUser(STUDENT, 'student'));
    await setDoc(doc(db, 'users', STUDENT2), baseUser(STUDENT2, 'student'));
    await setDoc(doc(db, 'users', TEACHER), baseUser(TEACHER, 'teacher'));

    await setDoc(doc(db, 'teacherCodes', 'VALIDCODE1'), { active: true, label: 'Test maktab' });
    await setDoc(doc(db, 'teacherCodes', 'REVOKEDCODE'), { active: false, label: 'Bekor qilingan' });

    await setDoc(doc(db, 'tasks', 'task_1'), {
      teacherId: TEACHER,
      title: 'Diktant 1',
      content: 'Matn',
      status: 'published',
      createdAt: 1700000000000,
    });

    await setDoc(doc(db, 'submissions', 'sub_student1'), baseSubmission(STUDENT, {
      ttResult: { grade: 3, mistakes: [] },
    }));
    await setDoc(doc(db, 'submissions', 'sub_student2'), baseSubmission(STUDENT2, {
      ttResult: { grade: 4, mistakes: [] },
    }));
  });
});

after(async () => {
  if (testEnv) await testEnv.cleanup();
});

// ---------------------------------------------------------------- ROL

test("o'quvchi o'zini o'qituvchi qila OLMAYDI (kodsiz)", async () => {
  const db = testEnv.authenticatedContext(STUDENT).firestore();
  await assertFails(
    setDoc(doc(db, 'users', STUDENT), { ...baseUser(STUDENT, 'teacher') })
  );
});

test("o'quvchi noto'g'ri kod bilan o'qituvchi bo'la OLMAYDI", async () => {
  const db = testEnv.authenticatedContext(STUDENT).firestore();
  await assertFails(
    setDoc(doc(db, 'users', STUDENT), { ...baseUser(STUDENT, 'teacher'), teacherCode: 'YOLGON' })
  );
});

test("bekor qilingan kod bilan o'qituvchi bo'la OLMAYDI", async () => {
  const db = testEnv.authenticatedContext(STUDENT).firestore();
  await assertFails(
    setDoc(doc(db, 'users', STUDENT), { ...baseUser(STUDENT, 'teacher'), teacherCode: 'REVOKEDCODE' })
  );
});

test("amaldagi kod bilan o'qituvchi bo'lish MUMKIN", async () => {
  const db = testEnv.authenticatedContext(STUDENT2).firestore();
  await assertSucceeds(
    setDoc(doc(db, 'users', STUDENT2), { ...baseUser(STUDENT2, 'teacher'), teacherCode: 'VALIDCODE1' })
  );
  // Tozalab qo'yamiz, keyingi testlarga xalaqit bermasin
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'users', STUDENT2), baseUser(STUDENT2, 'student'));
  });
});

test("o'quvchi boshqa foydalanuvchining profilini o'zgartira OLMAYDI", async () => {
  const db = testEnv.authenticatedContext(STUDENT).firestore();
  await assertFails(
    setDoc(doc(db, 'users', STUDENT2), { ...baseUser(STUDENT2, 'teacher'), teacherCode: 'VALIDCODE1' })
  );
});

test("o'quvchi boshqa foydalanuvchining profilini o'qiy OLMAYDI", async () => {
  const db = testEnv.authenticatedContext(STUDENT).firestore();
  await assertFails(getDoc(doc(db, 'users', STUDENT2)));
});

test("o'quvchi o'z profilini o'qiy OLADI", async () => {
  const db = testEnv.authenticatedContext(STUDENT).firestore();
  await assertSucceeds(getDoc(doc(db, 'users', STUDENT)));
});

test("hech kim foydalanuvchilar ro'yxatini ololmaydi (o'qituvchi ham)", async () => {
  const db = testEnv.authenticatedContext(TEACHER).firestore();
  await assertFails(getDocs(collection(db, 'users')));
});

test("taklif kodlari ro'yxatini olish MUMKIN EMAS", async () => {
  const db = testEnv.authenticatedContext(STUDENT).firestore();
  await assertFails(getDocs(collection(db, 'teacherCodes')));
});

test("taklif kodini to'g'ridan-to'g'ri o'qish MUMKIN EMAS", async () => {
  // Qoida ichidagi get() imtiyozli ishlaydi, shuning uchun kodni mijozga
  // umuman ochmasak ham tekshiruv ishlaydi. Shu xatti-harakat qotirilgan.
  const db = testEnv.authenticatedContext(STUDENT).firestore();
  await assertFails(getDoc(doc(db, 'teacherCodes', 'VALIDCODE1')));
});

test("taklif kodini yozish MUMKIN EMAS", async () => {
  const db = testEnv.authenticatedContext(TEACHER).firestore();
  await assertFails(setDoc(doc(db, 'teacherCodes', 'YANGI'), { active: true }));
});

// ---------------------------------------------------------------- BAHO

test("o'quvchi YARATISHDA o'ziga teacherCorrection yoza OLMAYDI", async () => {
  // Bu eng muhim test. Avval baho `ttResult` dan `teacherCorrection` ga
  // ko'chirilgan edi, lekin create qoidasi uni cheklamagani uchun o'quvchi
  // shunchaki yangi maydonni soxtalashtirardi.
  const db = testEnv.authenticatedContext(STUDENT).firestore();
  await assertFails(
    setDoc(doc(db, 'submissions', 'sub_forged'), baseSubmission(STUDENT, {
      teacherCorrection: { grade: 5, mistakes: [], handwritingScore: 5 },
    }))
  );
});

test("o'quvchi YARATISHDA approvedAt yoza OLMAYDI", async () => {
  const db = testEnv.authenticatedContext(STUDENT).firestore();
  await assertFails(
    setDoc(doc(db, 'submissions', 'sub_forged2'), baseSubmission(STUDENT, {
      approvedAt: 1700000009000,
    }))
  );
});

test("o'quvchi haqiqiy topshiriqni (DictationWorker shakli) yarata OLADI", async () => {
  // Ijobiy test: qoidalar ilovaning haqiqiy yozuvini rad etmasligi kerak.
  const db = testEnv.authenticatedContext(STUDENT).firestore();
  await assertSucceeds(
    setDoc(doc(db, 'submissions', 'sub_real'), {
      taskId: 'task_1',
      studentId: STUDENT,
      images: ['https://firebasestorage.example/a.jpg'],
      ttResult: { grade: 4, mistakes: [{ type: 'imlo' }], handwritingScore: 4 },
      status: 'pending',
      submittedAt: 1700000005000,
    })
  );
});

test("o'quvchi topshirgandan keyin ttResult ni o'zgartira OLMAYDI", async () => {
  const db = testEnv.authenticatedContext(STUDENT).firestore();
  await assertFails(
    updateDoc(doc(db, 'submissions', 'sub_student1'), {
      ttResult: { grade: 5, mistakes: [] },
    })
  );
});

test("o'quvchi o'z ishiga rasm qo'sha OLADI", async () => {
  const db = testEnv.authenticatedContext(STUDENT).firestore();
  await assertSucceeds(
    updateDoc(doc(db, 'submissions', 'sub_student1'), { images: ['https://example.com/a.jpg'] })
  );
});

test("o'quvchi o'zini tasdiqlangan qila OLMAYDI", async () => {
  const db = testEnv.authenticatedContext(STUDENT).firestore();
  await assertFails(
    updateDoc(doc(db, 'submissions', 'sub_student1'), { status: 'approved' })
  );
});

test("o'qituvchi bahoni tasdiqlay OLADI", async () => {
  const db = testEnv.authenticatedContext(TEACHER).firestore();
  await assertSucceeds(
    updateDoc(doc(db, 'submissions', 'sub_student1'), {
      status: 'approved',
      teacherCorrection: { grade: 5, mistakes: [] },
      approvedAt: 1700000001000,
    })
  );
});

// ---------------------------------------------------------- TOPSHIRIQLAR

test("o'quvchi boshqa o'quvchining ishini o'qiy OLMAYDI", async () => {
  const db = testEnv.authenticatedContext(STUDENT).firestore();
  await assertFails(getDoc(doc(db, 'submissions', 'sub_student2')));
});

test("o'quvchi faqat o'z ishlari bo'yicha so'rov bera OLADI", async () => {
  const db = testEnv.authenticatedContext(STUDENT).firestore();
  await assertSucceeds(
    getDocs(query(collection(db, 'submissions'), where('studentId', '==', STUDENT)))
  );
  await assertFails(
    getDocs(query(collection(db, 'submissions'), where('studentId', '==', STUDENT2)))
  );
});

test("o'qituvchi boshqa o'quvchining ishini o'chira OLMAYDI", async () => {
  const db = testEnv.authenticatedContext(TEACHER).firestore();
  await assertFails(deleteDoc(doc(db, 'submissions', 'sub_student2')));
});

test("o'quvchi TASDIQLANGAN ishini o'chira OLMAYDI", async () => {
  // Aks holda yomon bahoni o'chirib, qayta topshirish mumkin bo'lardi.
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'submissions', 'sub_approved'), baseSubmission(STUDENT, {
      status: 'approved',
      teacherCorrection: { grade: 2, mistakes: [] },
      approvedAt: 1700000002000,
    }));
  });
  const db = testEnv.authenticatedContext(STUDENT).firestore();
  await assertFails(deleteDoc(doc(db, 'submissions', 'sub_approved')));
});

test("o'qituvchi qo'lda yuklagan ishini o'chira OLADI", async () => {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'submissions', 'sub_manual'), {
      taskId: 'task_1',
      studentId: 'manual_1700000000000',
      status: 'approved',
      submittedAt: 1700000000000,
    });
  });
  const db = testEnv.authenticatedContext(TEACHER).firestore();
  await assertSucceeds(deleteDoc(doc(db, 'submissions', 'sub_manual')));
});

// --------------------------------------------------------------- VAZIFA

test("autentifikatsiyasiz vazifalarni o'qib bo'lmaydi", async () => {
  const db = testEnv.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(db, 'tasks', 'task_1')));
  await assertFails(getDocs(collection(db, 'tasks')));
});

test("kirgan o'quvchi vazifalarni o'qiy OLADI", async () => {
  const db = testEnv.authenticatedContext(STUDENT).firestore();
  await assertSucceeds(getDoc(doc(db, 'tasks', 'task_1')));
  await assertSucceeds(getDocs(collection(db, 'tasks')));
});

test("o'quvchi vazifa yarata OLMAYDI", async () => {
  const db = testEnv.authenticatedContext(STUDENT).firestore();
  await assertFails(
    setDoc(doc(db, 'tasks', 'task_fake'), {
      teacherId: STUDENT,
      title: 'Soxta',
      content: 'Matn',
      status: 'published',
      createdAt: 1700000000000,
    })
  );
});

test("o'qituvchi vazifa yarata OLADI", async () => {
  const db = testEnv.authenticatedContext(TEACHER).firestore();
  await assertSucceeds(
    setDoc(doc(db, 'tasks', 'task_2'), {
      teacherId: TEACHER,
      title: 'Diktant 2',
      content: 'Matn',
      status: 'published',
      createdAt: 1700000000000,
    })
  );
});

test("/test yo'li endi ommaga ochiq emas", async () => {
  const db = testEnv.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(db, 'test', 'connection')));
});
