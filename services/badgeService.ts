import { Submission, User } from "../types";

export type BadgeCategory = 'consistency' | 'accuracy';
export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface BadgeProgress {
  unlocked: boolean;
  current: number;
  target: number;
  unit: string;
  percentage: number;
}

export interface BadgeDefinition {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: BadgeCategory;
  tier: BadgeTier;
  points: number;
  requirement: string;
  checkProgress: (submissions: Submission[], user: User) => BadgeProgress;
}

export const ALL_BADGES: BadgeDefinition[] = [
  // 1. Consistency & Submissions
  {
    id: 'ilk_qadam',
    title: "Birinchi Qadam",
    description: "Birinchi vazifangizni muvaffaqiyatli topshiring",
    icon: "🚀",
    category: 'consistency',
    tier: 'bronze',
    points: 50,
    requirement: "1 ta vazifa topshirish",
    checkProgress: (subs) => {
      const current = Math.min(1, subs.length);
      return {
        unlocked: subs.length >= 1,
        current,
        target: 1,
        unit: "vazifa",
        percentage: Math.round((current / 1) * 100)
      };
    }
  },
  {
    id: 'uchlik_marra',
    title: "Faol O'quvchi",
    description: "Muntazam ravishda kamida 3 ta vazifani topshiring",
    icon: "🔥",
    category: 'consistency',
    tier: 'bronze',
    points: 100,
    requirement: "3 ta vazifa topshirish",
    checkProgress: (subs) => {
      const current = Math.min(3, subs.length);
      return {
        unlocked: subs.length >= 3,
        current,
        target: 3,
        unit: "vazifa",
        percentage: Math.round((current / 3) * 100)
      };
    }
  },
  {
    id: 'mehnatkash_talaba',
    title: "Tirishqoq Izlanuvchi",
    description: "Doimiy intizom bilan 5 ta topshiriqni yakunlang",
    icon: "📚",
    category: 'consistency',
    tier: 'silver',
    points: 200,
    requirement: "5 ta vazifa topshirish",
    checkProgress: (subs) => {
      const current = Math.min(5, subs.length);
      return {
        unlocked: subs.length >= 5,
        current,
        target: 5,
        unit: "vazifa",
        percentage: Math.round((current / 5) * 100)
      };
    }
  },
  {
    id: 'diktant_chempioni',
    title: "Vazifalar Chempioni",
    description: "10 ta turli topshiriq va diktantlarni topshirib faxriy maqomga ega bo'ling",
    icon: "🏆",
    category: 'consistency',
    tier: 'gold',
    points: 500,
    requirement: "10 ta vazifa topshirish",
    checkProgress: (subs) => {
      const current = Math.min(10, subs.length);
      return {
        unlocked: subs.length >= 10,
        current,
        target: 10,
        unit: "vazifa",
        percentage: Math.round((current / 10) * 100)
      };
    }
  },
  {
    id: 'intizomli_o‘quvchi',
    title: "Intizom Simvoli",
    description: "Kamida 2 ta turli xildagi topshiriqni (diktant yoki fayl/kod) topshiring",
    icon: "🎖️",
    category: 'consistency',
    tier: 'silver',
    points: 150,
    requirement: "2 xil formatdagi vazifani topshirish",
    checkProgress: (subs) => {
      const hasImages = subs.some(s => s.images && s.images.length > 0);
      const hasFiles = subs.some(s => s.files && s.files.length > 0);
      const count = (hasImages ? 1 : 0) + (hasFiles ? 1 : 0);
      return {
        unlocked: count >= 2,
        current: count,
        target: 2,
        unit: "format",
        percentage: Math.round((count / 2) * 100)
      };
    }
  },

  // 2. High Accuracy Scores
  {
    id: 'besh_yulduz',
    title: "5 Yulduz (A'lochi)",
    description: "Vazifadan a'lo (5 baho) natijaga erishing",
    icon: "⭐️",
    category: 'accuracy',
    tier: 'bronze',
    points: 100,
    requirement: "Kamida 1 ta vazifada 5 baho olish",
    checkProgress: (subs) => {
      const count = subs.filter(s => (s.teacherCorrection?.grade ?? s.ttResult?.grade ?? 0) >= 5).length;
      return {
        unlocked: count >= 1,
        current: Math.min(1, count),
        target: 1,
        unit: "a'lo baho",
        percentage: count >= 1 ? 100 : 0
      };
    }
  },
  {
    id: 'mutlaq_aniqlik',
    title: "Mutlaq Aniqlik",
    description: "Hech qanday xatosiz (0 ta xato) va 5 baho bilan diktant yozing",
    icon: "🎯",
    category: 'accuracy',
    tier: 'silver',
    points: 250,
    requirement: "0 ta xato bilan 5 baho olish",
    checkProgress: (subs) => {
      const perfect = subs.some(s => {
        const result = s.teacherCorrection || s.ttResult;
        return (result?.grade ?? 0) >= 5 && (result?.mistakes?.length ?? 99) === 0;
      });
      return {
        unlocked: perfect,
        current: perfect ? 1 : 0,
        target: 1,
        unit: "xatosiz ish",
        percentage: perfect ? 100 : 0
      };
    }
  },
  {
    id: 'imlo_ustasi',
    title: "Imlo Ustasi",
    description: "Kamida 2 ta vazifada imlo qoidalarini bekamu-ko'st bajaring",
    icon: "✍️",
    category: 'accuracy',
    tier: 'silver',
    points: 200,
    requirement: "2 ta topshiriqda imlo xatosiz yoki kam xato bilan topshirish",
    checkProgress: (subs) => {
      const goodSpellingCount = subs.filter(s => {
        const result = s.teacherCorrection || s.ttResult;
        const imloMistakes = (result?.mistakes || []).filter(m => m.type === 'imlo');
        return (result?.grade ?? 0) >= 4 && imloMistakes.length <= 1;
      }).length;
      const current = Math.min(2, goodSpellingCount);
      return {
        unlocked: goodSpellingCount >= 2,
        current,
        target: 2,
        unit: "ish",
        percentage: Math.round((current / 2) * 100)
      };
    }
  },
  {
    id: 'husnihat_qiroli',
    title: "Husnihat Qiroli",
    description: "Go'zal va ravon qo'lyozma uchun 5 ballik husnihat bahosini qo'lga kiriting",
    icon: "👑",
    category: 'accuracy',
    tier: 'gold',
    points: 300,
    requirement: "Diktantda 5/5 husnihat bahosi olish",
    checkProgress: (subs) => {
      const hasPerfectHandwriting = subs.some(s => {
        const result = s.teacherCorrection || s.ttResult;
        return (result?.handwritingScore ?? 0) >= 5;
      });
      return {
        unlocked: hasPerfectHandwriting,
        current: hasPerfectHandwriting ? 1 : 0,
        target: 1,
        unit: "husnihat 5/5",
        percentage: hasPerfectHandwriting ? 100 : 0
      };
    }
  },
  {
    id: 'oltin_qalam',
    title: "Oltin Qalam",
    description: "Ketma-ket 3 ta vazifada a'lo (5 baho) natija ko'rsating",
    icon: "🖋️",
    category: 'accuracy',
    tier: 'gold',
    points: 400,
    requirement: "Ketma-ket 3 ta topshiriqda 5 baho olish",
    checkProgress: (subs) => {
      // Sort submissions by submittedAt ascending
      const sorted = [...subs].sort((a, b) => a.submittedAt - b.submittedAt);
      let maxStreak = 0;
      let currentStreak = 0;
      for (const s of sorted) {
        const grade = s.teacherCorrection?.grade ?? s.ttResult?.grade ?? 0;
        if (grade >= 5) {
          currentStreak++;
          if (currentStreak > maxStreak) maxStreak = currentStreak;
        } else {
          currentStreak = 0;
        }
      }
      const current = Math.min(3, maxStreak);
      return {
        unlocked: maxStreak >= 3,
        current,
        target: 3,
        unit: "ketma-ket 5 baho",
        percentage: Math.round((current / 3) * 100)
      };
    }
  },
  {
    id: 'aniqlik_akademigi',
    title: "Aniqlik Akademigi",
    description: "Kamida 3 ta topshiriq bo'yicha umumiy o'rtacha 4.8+ bahoni saqlang",
    icon: "💎",
    category: 'accuracy',
    tier: 'platinum',
    points: 600,
    requirement: "Kamida 3 ta vazifa va 4.8+ o'rtacha ball",
    checkProgress: (subs) => {
      if (subs.length < 3) {
        return {
          unlocked: false,
          current: subs.length,
          target: 3,
          unit: "vazifa",
          percentage: Math.round((subs.length / 3) * 60)
        };
      }
      const sum = subs.reduce((acc, s) => acc + (s.teacherCorrection?.grade ?? s.ttResult?.grade ?? 0), 0);
      const avg = sum / subs.length;
      const isQualified = avg >= 4.8;
      return {
        unlocked: isQualified,
        current: Number(avg.toFixed(1)),
        target: 4.8,
        unit: "o'rtacha ball",
        percentage: isQualified ? 100 : Math.min(95, Math.round((avg / 4.8) * 100))
      };
    }
  }
];

export interface UserRank {
  title: string;
  tier: BadgeTier;
  level: number;
  minPoints: number;
  nextPoints: number;
  badge: string;
}

export function calculateUserRank(points: number = 0): UserRank {
  if (points >= 1500) {
    return { title: "Afsonaviy Akademik", tier: 'platinum', level: 5, minPoints: 1500, nextPoints: 2500, badge: "👑" };
  }
  if (points >= 800) {
    return { title: "Oliy Toifali Bilimdon", tier: 'gold', level: 4, minPoints: 800, nextPoints: 1500, badge: "💎" };
  }
  if (points >= 400) {
    return { title: "Iqtidorli O'quvchi", tier: 'silver', level: 3, minPoints: 400, nextPoints: 800, badge: "🥇" };
  }
  if (points >= 150) {
    return { title: "Harakatdagi Izlanuvchi", tier: 'bronze', level: 2, minPoints: 150, nextPoints: 400, badge: "🥈" };
  }
  return { title: "Boshlang'ich Qadam", tier: 'bronze', level: 1, minPoints: 0, nextPoints: 150, badge: "🥉" };
}

export function evaluateBadges(
  submissions: Submission[],
  currentUser: User
): {
  updatedUser: User;
  newlyUnlockedBadges: BadgeDefinition[];
  allProgress: { badge: BadgeDefinition; progress: BadgeProgress }[];
} {
  const existingBadges = new Set(currentUser.badges || []);
  const newlyUnlockedBadges: BadgeDefinition[] = [];
  const allProgress: { badge: BadgeDefinition; progress: BadgeProgress }[] = [];

  let calculatedPoints = 0;

  for (const badge of ALL_BADGES) {
    const progress = badge.checkProgress(submissions, currentUser);
    allProgress.push({ badge, progress });

    if (progress.unlocked) {
      calculatedPoints += badge.points;
      if (!existingBadges.has(badge.id)) {
        newlyUnlockedBadges.push(badge);
        existingBadges.add(badge.id);
      }
    }
  }

  // Har bir topshiriq uchun 15 ball + baho uchun qo'shimcha ball
  const submissionPoints = submissions.reduce((acc, s) => {
    const grade = s.teacherCorrection?.grade ?? s.ttResult?.grade ?? 0;
    return acc + 15 + Math.round(grade * 10);
  }, 0);

  const totalPoints = Math.max(currentUser.points || 0, calculatedPoints + submissionPoints);

  const updatedUser: User = {
    ...currentUser,
    badges: Array.from(existingBadges),
    points: totalPoints
  };

  return {
    updatedUser,
    newlyUnlockedBadges,
    allProgress
  };
}
