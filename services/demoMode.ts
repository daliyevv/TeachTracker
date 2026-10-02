/**
 * Demo rejimi.
 *
 * Demo rejimi — hech qanday ro'yxatdan o'tmasdan ilovani sinab ko'rish
 * imkoniyati: foydalanuvchi "O'quvchi" bo'lib diktant topshiradi, keyin
 * "Ustoz" bo'lib uni tekshiradi. Bu foydalanuvchi FAQAT brauzerining
 * o'zida yashaydi — Firestore'ga hech narsa yozilmaydi.
 *
 * Nega alohida modul: demo foydalanuvchining uid prefiksi ikki joyda
 * ishlatiladi — yaratilganda va tekshirilganda. Ular bir-biridan
 * AJRALIB QOLGAN edi: LoginScreen `demo-user-` bilan yaratar, dbService
 * esa `local-demo-` ni tekshirardi. Ya'ni tekshiruv hech qachon ishlamas,
 * demo yozuvlari faqat tasodifan (sessiya yo'qligi tufayli) Firestore'ga
 * ketmasdi. Endi prefiks bitta joyda.
 */

/** Demo foydalanuvchining uid prefiksi. */
export const DEMO_UID_PREFIX = 'demo-user-';

/** Shu uid demo foydalanuvchiga tegishlimi. */
export const isDemoUid = (uid: unknown): boolean =>
  typeof uid === 'string' && uid.startsWith(DEMO_UID_PREFIX);

/** Yangi demo foydalanuvchi uchun uid. */
export const newDemoUid = (): string =>
  DEMO_UID_PREFIX + Math.random().toString(36).slice(2, 8);
