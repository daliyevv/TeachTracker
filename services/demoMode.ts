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
 * Demo rejimining BARQAROR shaxsi.
 *
 * NEGA KERAK — bu aynan "demo o'quvchi topshirdi, demo ustoz ko'rmadi"
 * nuqsonining sababi edi:
 *
 * Firebase'ning anonim sessiyasi har kirishda YANGI uid beradi. Rolni
 * almashtirish uchun esa chiqib, qaytadan kirish kerak. Natijada:
 *
 *   demo o'quvchi  -> uid A -> topshiriq { teacherId: 'demo' }
 *   (chiqish, qayta kirish)
 *   demo ustoz     -> uid B -> panel { teacherId: uid B } so'raydi
 *
 * `uid B !== 'demo'`, ya'ni so'rov hech qachon mos kelmaydi va topshiriq
 * ustozning "tekshiruvda" ro'yxatida KO'RINMAYDI. Ustiga-ustak mahalliy
 * saqlash ham uid bo'yicha ajratilgan edi (`tt:<uid>:...`), ya'ni uid B
 * uid A yozgan narsani umuman o'qiy olmasdi.
 *
 * Yechim: demo rejimida shaxs ham, saqlash doirasi ham O'ZGARMAS
 * `'demo'` bo'ladi. Shunda demo o'quvchi va demo ustoz bitta qum
 * solinadigan maydonni bo'lishadi — demo rejimining butun maqsadi shu:
 * ilovani ikki tomondan ko'rib chiqish.
 *
 * Nega haqiqiy foydalanuvchiga zarar qilmaydi: bu doira FAQAT anonim
 * sessiyada ishlatiladi (`isDemoSession()`), haqiqiy hisoblar esa o'z
 * uid'ida qoladi. Demo ma'lumoti baribir Firestore'ga yozilmaydi, hatto
 * urinib ko'rilsa ham firestore.rules uni rad etadi: `'demo-diktant'`
 * vazifasi bazada mavjud emas.
 *
 * Nimani qabul qilamiz: bitta brauzerda demo rejimidan foydalangan ikki
 * kishi bir-birining SINOV ishlarini ko'radi. Bu haqiqiy ma'lumot emas va
 * o'quvchi/ustoz o'tishi uchun bu baham ko'rish SHART.
 */
export const DEMO_UID = 'demo';

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
  teacherId: DEMO_UID,
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

/**
 * Demo rejimi shu sessiyada boshlanganini eslab qoladi.
 *
 * NEGA KERAK: anonim sessiya yo'qolib qolishi mumkin (brauzer saqlashni
 * tozalaydi, sessiya muddati tugaydi, boshqa oynada chiqib ketiladi).
 * Bunda demo foydalanuvchi "Tizimga kirilmagan. Sahifani yangilab,
 * qaytadan kiring." degan xabarni oladi — demo rejimida bu xabarning
 * ma'nosi yo'q, chunki kiradigan hisob ham yo'q.
 *
 * Shu belgi bilan `apiClient` demo sessiyasini O'ZI qayta tiklaydi.
 * Belgi `sessionStorage` da: yangi yorliqda yoki brauzer yopilgandan
 * keyin qolmaydi, ya'ni haqiqiy foydalanuvchini tasodifan anonim
 * sessiyaga tushirib qo'ymaydi.
 */
const DEMO_FLAG = 'tt:demo-session';

export const markDemoSession = () => {
  try {
    sessionStorage.setItem(DEMO_FLAG, '1');
  } catch {
    // sessionStorage yopiq bo'lsa ham demo ishlashi kerak
  }
};

export const clearDemoSession = () => {
  try {
    sessionStorage.removeItem(DEMO_FLAG);
  } catch {
    // muhim emas
  }
};

/** Shu sessiyada demo rejimi boshlanganmi (sessiya yo'qolgan bo'lsa ham). */
export const wasDemoSession = (): boolean => {
  try {
    return sessionStorage.getItem(DEMO_FLAG) === '1';
  } catch {
    return false;
  }
};

/**
 * Foydalanuvchining ilova ichidagi shaxsi.
 *
 * Demo rejimida uid emas, barqaror `DEMO_UID` qaytadi. Nega — yuqoridagi
 * `DEMO_UID` izohida: anonim uid har kirishda o'zgaradi, rol almashtirish
 * esa chiqib-kirishni talab qiladi, ya'ni uid bo'yicha bog'lanish demo
 * o'quvchi bilan demo ustozni bir-biridan uzib qo'yadi.
 *
 * Alohida funksiya, chunki aynan shu qaror nuqsonga sabab bo'lgan va u
 * sinab ko'rilishi kerak: manbani grep qilish buni tekshirmaydi.
 */
export const resolveUserId = (uid: string, isAnonymous: boolean): string =>
  isAnonymous ? DEMO_UID : uid;

/**
 * Mahalliy saqlash doirasi (localStorage kalit prefiksi).
 *
 * Haqiqiy foydalanuvchi o'z uid'ida qoladi — maktabning umumiy
 * kompyuterida bir o'quvchining ishi boshqasiga ko'rinmasligi uchun.
 * Demo esa bitta umumiy qum maydonini oladi, aks holda demo ma'lumoti
 * o'zidan ham yashirinib qolardi.
 */
export const storageScope = (uid: string | null | undefined, isDemo: boolean): string =>
  isDemo ? DEMO_UID : (uid || 'anon');
