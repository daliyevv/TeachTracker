import { AnalysisResult } from "../types";

/**
 * Baholash shkalasi va natija nusxalash — bitta joyda.
 *
 * Nega alohida fayl: shkala ilgari joylarga sochilgan edi. Tekshiruv
 * panelida `max="10"` va "Umumiy baho (0-10)" yozilgan, nishonlar esa
 * `grade >= 5` ni a'lo deb hisoblar, AI ko'rsatmasi "1-5 ball tizimida"
 * deyar, kartalarda baho bitta belgi bo'lib chiqardi. Ustoz 8 yozsa:
 * "5 yulduz" nishoni ochilar, o'rtacha baho buzilar, karta ichiga
 * sig'masdi. Endi shkala shu modulda, uni ishlatadigan hamma joy bir xil
 * qiymatni ko'radi.
 */

/** Eng yuqori baho. O'zbek maktab tizimi: 1-5. */
export const MAX_GRADE = 5;

/** Bahoni shkala ichiga qamab qo'yadi. Yaroqsiz qiymat 0 ga tushadi. */
export const clampGrade = (value: unknown): number => {
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.min(MAX_GRADE, Math.max(0, Math.round(num)));
};

/**
 * Tahrirlash uchun natijaning CHUQUR nusxasi.
 *
 * Nega chuqur: tekshiruv panelida ilgari `{ ...sub.ttResult }` — yuzaki
 * nusxa olinardi, keyin esa xato obyekti O'RNIDA o'zgartirilardi
 * (`newMistakes[idx][field] = val`). Massiv yangi bo'lsa ham, ichidagi
 * obyektlar ASL topshiriq bilan bir xil obyekt edi. Natijada ustoz
 * "Keyinroq" ni bosib chiqib ketsa ham, tahrirlari xotiradagi topshiriqda
 * qolib ketar va panelda ko'rinardi — saqlanmagan narsa saqlanganga
 * o'xshardi.
 */
export const cloneResult = (result: AnalysisResult | undefined | null): AnalysisResult => ({
  extractedText: result?.extractedText ?? '',
  correctedText: result?.correctedText ?? '',
  mistakes: (result?.mistakes ?? []).map(m => ({ ...m })),
  grade: clampGrade(result?.grade ?? 0),
  handwritingScore: clampGrade(result?.handwritingScore ?? 0),
  feedback: result?.feedback ?? '',
  improvementTips: [...(result?.improvementTips ?? [])],
});
