import { DictationTask } from "../types";
import { auth } from "./firebase";

/**
 * Demo rejimi.
 *
 * Demo rejimi — hech qanday ro'yxatdan o'tmasdan ilovani sinab ko'rish:
 * diktant rasmini yuklab, sun'iy intellekt tekshiruvini ko'rish.
 *
 * NEGA ANONIM SESSIYA KERAK:
 * Faza 3 da `/api/*` yo'llari Firebase tokeni bilan yopildi — Gemini
 * kalitini begonalar sarflab yubormasligi uchun. Lekin demo rejimida
 * Firebase sessiyasi UMUMAN YO'Q edi, ya'ni `apiClient` tokenni ola
 * olmas va AI chaqiruvi serverga yetib ham bormasdi. Natijada demo
 * rejimida diktantni tekshirishning IMKONI YO'Q edi — "Demo rejimida
 * sinab ko'rish" tugmasi boshi berk ko'cha bo'lib qoldi.
 *
 * Yechim: demo foydalanuvchiga Firebase'ning ANONIM sessiyasi beriladi.
 * Shunda:
 *   - haqiqiy ID token bor, ya'ni `/api/*` ishlaydi;
 *   - uid bo'yicha so'rov cheklovi (kvota) baribir qo'llanadi, ya'ni
 *     kalitni sarflab yuborish mumkin emas;
 *   - Firestore qoidalari ham o'z kuchida qoladi.
 * Ya'ni himoya buzilmaydi, demo esa ishlaydi.
 *
 * MA'LUMOT ESA MAHALLIY QOLADI: demo topshiriqlari Firestore'ga
 * yozilmaydi (qarang `isDemoSession` ishlatilgan joylar). Aks holda
 * begonalarning sinov ishlari haqiqiy o'qituvchining paneliga tushib
 * ketardi.
 */

/**
 * Hozirgi sessiya demo (anonim) sessiyami.
 *
 * Firebase'ning o'zi `isAnonymous` belgisini beradi — bu uid prefiksini
 * taxmin qilishdan ancha ishonchli. Ilgari prefiks ikki joyda alohida
 * yozilgan va bir-biridan ajralib qolgan edi.
 */
export const isDemoSession = (): boolean => {
  try {
    return auth?.currentUser?.isAnonymous === true;
  } catch {
    return false;
  }
};

/**
 * Demo rejimida sinab ko'rish uchun diktant.
 *
 * Nega kerak: demo foydalanuvchining Firestore'dan vazifa olishi mumkin
 * emas (ma'lumot mahalliy qoladi), ya'ni tekshirib ko'radigan narsa
 * bo'lmay qolardi.
 *
 * Nega bu ilgarigi "namuna vazifalar"dan FARQ QILADI: eski
 * DEFAULT_SAMPLE_TASKS har qanday foydalanuvchiga HAQIQIY vazifa
 * sifatida ko'rsatilar va topshirilganda Firestore qoidasida rad
 * etilardi — bola diktantni bekorga yozardi. Bu esa:
 *   - FAQAT demo sessiyasida ko'rinadi;
 *   - nomida demo ekani aniq yozilgan;
 *   - topshirig'i mahalliy saqlanadi, ya'ni rad etilmaydi.
 */
export const DEMO_TASK: DictationTask = {
  id: 'demo-diktant',
  teacherId: 'demo',
  title: '[Demo] Ona yurtim',
  content:
    "O'zbekiston — go'zal va mehmondo'st o'lka. Uning keng dalalari, " +
    "baland tog'lari va serquyosh bog'lari bor.",
  type: 'dictation',
  status: 'published',
  createdAt: 0,
};

/**
 * Demo sessiyasida vazifalar ro'yxatiga demo diktantni qo'shadi.
 * Demo bo'lmasa ro'yxatga tegmaydi.
 */
export const withDemoTask = (tasks: DictationTask[]): DictationTask[] => {
  if (!isDemoSession()) return tasks;
  if (tasks.some(t => t.id === DEMO_TASK.id)) return tasks;
  return [DEMO_TASK, ...tasks];
};
