/**
 * Google bilan kirishdagi xatolarni tushunarli matnga aylantirish.
 *
 * Nega alohida modul:
 * Ilgari `LoginScreen` deyarli hamma xatoni bitta gapga yig'ardi —
 * "Google bilan kirib bo'lmadi. Qayta urinib ko'ring." Bu gap
 * foydalanuvchiga ham, muammoni tuzatadigan odamga ham HECH NARSA
 * bermaydi: sabablar butunlay boshqa-boshqa va yechimlari ham boshqa.
 *
 *   - domen Firebase'da ruxsat etilmagan  -> boshqa manzildan kirish kerak
 *   - Google provayderi yoqilmagan        -> Firebase Console'da yoqish kerak
 *   - uchinchi tomon cookie'lari bloklangan -> oddiy brauzerda ochish kerak
 *   - internet yo'q                        -> ulanishni tekshirish kerak
 *
 * Shuning uchun endi har holat o'z matnini oladi va xato KODI ham
 * ko'rsatiladi: telefondan konsolni ochish qiyin, kod esa bitta
 * skrinshotda ko'rinadi.
 */

export interface AuthErrorInfo {
  /** Foydalanuvchiga ko'rsatiladigan asosiy matn. */
  message: string;
  /** Nima qilish kerakligi. Bo'lmasligi ham mumkin. */
  hint?: string;
  /** Firebase xato kodi — diagnostika uchun ko'rsatiladi. */
  code: string;
  /**
   * Bu xato sozlama muammosimi (loyiha egasi tuzatadi) yoki
   * foydalanuvchi holatimi. Interfeys shunga qarab ohangni tanlaydi.
   */
  kind: 'config' | 'user' | 'network' | 'unknown';
}

/**
 * Hozirgi domen. `auth/unauthorized-domain` da aynan shu qiymatni
 * Firebase'ga qo'shish kerak, shuning uchun uni ko'rsatamiz.
 */
const currentHost = (): string => {
  try {
    return typeof window !== 'undefined' ? window.location.hostname : '';
  } catch {
    return '';
  }
};

export const describeAuthError = (err: any): AuthErrorInfo => {
  const code = typeof err?.code === 'string' ? err.code : 'unknown';

  switch (code) {
    // TEKSHIRILGAN (2026-10-02): loyihaning ruxsat etilgan domenlari
    // identitytoolkit.googleapis.com/v1/projects orqali o'qildi va ularning
    // ichida Vercel domeni YO'Q edi — faqat *.firebaseapp.com, *.web.app va
    // Google AI Studio'ning ais-*.run.app domenlari bor edi. Ya'ni Google
    // bilan kirish Vercel'da hech qachon ishlamagan, faqat AI Studio
    // ko'rinishida ishlardi. Shuning uchun bu holat alohida va eng aniq
    // maslahat bilan ajratilgan.
    case 'auth/unauthorized-domain': {
      const host = currentHost();
      return {
        code,
        kind: 'config',
        message: host
          ? `Bu manzildan (${host}) kirishga ruxsat yo'q.`
          : "Bu manzildan kirishga ruxsat yo'q.",
        hint:
          "Loyiha egasi bu domenni Firebase'ga qo'shishi kerak: " +
          "Firebase Console -> Authentication -> Settings -> Authorized domains -> Add domain. " +
          "Shundan keyin Google bilan kirish ishlaydi.",
      };
    }

    case 'auth/operation-not-allowed':
    case 'auth/configuration-not-found':
      return {
        code,
        kind: 'config',
        message: "Google bilan kirish yoqilmagan.",
        hint: "Loyiha egasi Firebase Console'da Google provayderini yoqishi kerak.",
      };

    case 'auth/invalid-api-key':
    case 'auth/api-key-not-valid':
      return {
        code,
        kind: 'config',
        message: "Ilova sozlamasi noto'g'ri.",
        hint: "Loyiha egasiga xabar bering — Firebase kaliti ishlamayapti.",
      };

    case 'auth/network-request-failed':
      return {
        code,
        kind: 'network',
        message: "Internet aloqasi yo'q.",
        hint: "Ulanishni tekshirib, qayta urinib ko'ring.",
      };

    // Odatda uchinchi tomon cookie'lari bloklanganda yoki ilova ichidagi
    // brauzerda (Telegram, Instagram) chiqadi.
    case 'auth/internal-error':
    case 'auth/web-storage-unsupported':
      return {
        code,
        kind: 'user',
        message: "Brauzer kirishga to'sqinlik qilayapti.",
        hint:
          "Havolani oddiy brauzerda (Chrome yoki Safari) ochib ko'ring. " +
          "Telegram yoki Instagram ichidagi brauzerda Google bilan kirish ishlamaydi. " +
          "Brauzer sozlamalarida cookie'lar yoqilganini ham tekshiring.",
      };

    case 'auth/account-exists-with-different-credential':
      return {
        code,
        kind: 'user',
        message: "Bu email boshqa usul bilan ro'yxatdan o'tgan.",
        hint: "Ilgari qaysi usul bilan kirgan bo'lsangiz, o'sha bilan kiring.",
      };

    case 'auth/too-many-requests':
      return {
        code,
        kind: 'user',
        message: "Juda ko'p urinish bo'ldi.",
        hint: "Bir oz kutib, qayta urinib ko'ring.",
      };

    case 'auth/user-disabled':
      return {
        code,
        kind: 'user',
        message: "Bu hisob o'chirilgan.",
        hint: "Loyiha egasiga murojaat qiling.",
      };

    default:
      return {
        code,
        kind: 'unknown',
        message: "Google bilan kirib bo'lmadi.",
        hint: "Qayta urinib ko'ring. Takrorlansa, quyidagi kodni loyiha egasiga yuboring.",
      };
  }
};

/** Foydalanuvchi o'zi bekor qilgan — bu xato emas, jim turamiz. */
export const isUserCancelled = (err: any): boolean => {
  const code = err?.code;
  return (
    code === 'auth/popup-closed-by-user' ||
    code === 'auth/cancelled-popup-request' ||
    code === 'auth/user-cancelled'
  );
};

/**
 * Popup ishlamagani uchun redirect'ga o'tish kerakmi.
 *
 * Popup mobil brauzerlarda va ilova ichidagi brauzerlarda tez-tez
 * bloklanadi, redirect esa o'sha holatlarda ishlaydi.
 */
export const shouldFallBackToRedirect = (err: any): boolean => {
  const code = err?.code;
  return (
    code === 'auth/popup-blocked' ||
    code === 'auth/operation-not-supported-in-this-environment' ||
    code === 'auth/web-storage-unsupported'
  );
};

/**
 * Demo rejimiga (anonim sessiyaga) kirishdagi xatolar.
 *
 * Alohida funksiya, chunki xabarlar boshqacha: demo rejimida gap Google
 * hisobida emas, Firebase loyihasida anonim kirishning yoqilganida.
 * Umumiy `describeAuthError` `auth/operation-not-allowed` ni "Google
 * bilan kirish yoqilmagan" deb tarjima qiladi — demo yo'lida bu
 * NOTO'G'RI yo'lga solardi.
 */
export const describeDemoError = (err: any): AuthErrorInfo => {
  const code = typeof err?.code === 'string' ? err.code : 'unknown';

  if (
    code === 'auth/operation-not-allowed' ||
    code === 'auth/admin-restricted-operation'
  ) {
    return {
      code,
      kind: 'config',
      message: "Demo rejimi yoqilmagan.",
      hint:
        "Loyiha egasi Firebase Console -> Authentication -> Sign-in method " +
        "bo'limida 'Anonymous' usulini yoqishi kerak. Demo rejimi sun'iy " +
        "intellekt tekshiruvi uchun shu sessiyani ishlatadi.",
    };
  }

  if (code === 'auth/network-request-failed') {
    return {
      code,
      kind: 'network',
      message: "Internet aloqasi yo'q.",
      hint: "Ulanishni tekshirib, qayta urinib ko'ring.",
    };
  }

  // Qolgan holatlar umumiy tasniflovchiga mos keladi (domen, cookie va h.k.).
  return describeAuthError(err);
};
