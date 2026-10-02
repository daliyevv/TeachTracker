import React from 'react';
import { User, Submission } from '../types';
import { ALL_BADGES, calculateUserRank } from '../services/badgeService';
import { Trophy, Star, Target, Sparkles, ChevronRight, Flame, Award, ArrowUpRight } from 'lucide-react';

interface Props {
  user: User;
  submissions: Submission[];
  onOpenModal: () => void;
}

export const BadgesShowcase: React.FC<Props> = ({ user, submissions, onOpenModal }) => {
  const userBadges = new Set(user.badges || []);
  const rank = calculateUserRank(user.points || 0);

  const unlockedBadges = ALL_BADGES.filter(b => userBadges.has(b.id));
  const lockedBadges = ALL_BADGES.filter(b => !userBadges.has(b.id));

  // Keyingi eng yaqin nishon (eng yuqori progress foiziga ega bo'lgan qolgan nishon)
  const nextBadgeWithProgress = lockedBadges
    .map(b => ({ badge: b, progress: b.checkProgress(submissions, user) }))
    .sort((a, b) => b.progress.percentage - a.progress.percentage)[0];

  // Aniqlik statistikasi
  const totalSubmissions = submissions.length;
  const highAccuracySubs = submissions.filter(s => (s.teacherCorrection?.grade ?? s.ttResult?.grade ?? 0) >= 5).length;
  const accuracyPercentage = totalSubmissions > 0 
    ? Math.round((highAccuracySubs / totalSubmissions) * 100) 
    : 0;

  return (
    <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-violet-950 rounded-3xl sm:rounded-[2.5rem] p-4 sm:p-8 text-white shadow-xl shadow-indigo-950/20 border border-indigo-800/40 relative overflow-hidden">
      {/* Background ambient blurs */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 space-y-5 sm:space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5 sm:space-x-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-xl sm:text-2xl shadow-xl shadow-amber-500/20 shrink-0">
              {rank.badge}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg sm:text-2xl font-black tracking-tight">{rank.title}</h3>
                <span className="bg-white/10 text-amber-300 text-[9px] sm:text-[10px] font-black uppercase px-2 sm:px-2.5 py-0.5 rounded-full border border-white/10">
                  Level {rank.level}
                </span>
              </div>
              <p className="text-slate-300 text-[11px] sm:text-xs font-medium mt-0.5">
                Topshiriqlarni izchil topshirish va yuqori aniqlik uchun mukofotlar
              </p>
            </div>
          </div>

          <button
            onClick={onOpenModal}
            className="group flex items-center justify-center space-x-2 bg-white/10 hover:bg-white text-white hover:text-slate-950 px-4 sm:px-5 py-2.5 rounded-2xl font-black text-xs transition-all border border-white/10 shadow-lg w-full sm:w-auto min-h-[44px]"
          >
            <span>Barcha Nishonlar ({unlockedBadges.length}/{ALL_BADGES.length})</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* 3 Metric Pills */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <p className="text-lg font-black text-white">{unlockedBadges.length} ta nishon</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Erishilgan yutuqlar</p>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center shrink-0">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <p className="text-lg font-black text-white">{totalSubmissions} ta vazifa</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Izchil topshirish</p>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <p className="text-lg font-black text-white">{highAccuracySubs} a'lo ({accuracyPercentage}%)</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Yuqori aniqlik</p>
            </div>
          </div>
        </div>

        {/* Lower Row: Unlocked Badges Reel + Next Upcoming Badge */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-1">
          {/* Unlocked Badges Reel */}
          <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-300" />
                So'nggi nishonlaringiz
              </span>
              <button onClick={onOpenModal} className="text-[11px] font-bold text-indigo-300 hover:text-white flex items-center gap-1">
                Profilni ochish <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {unlockedBadges.length > 0 ? (
              <div className="flex flex-wrap gap-2.5">
                {unlockedBadges.map(b => (
                  <div 
                    key={b.id}
                    onClick={onOpenModal}
                    className="group relative cursor-pointer bg-white/10 hover:bg-white/20 border border-white/15 px-3.5 py-2 rounded-2xl flex items-center space-x-2.5 transition-all hover:scale-105"
                    title={`${b.title}: ${b.description}`}
                  >
                    <span className="text-2xl">{b.icon}</span>
                    <div className="text-left">
                      <p className="text-xs font-black text-white leading-tight">{b.title}</p>
                      <p className="text-[10px] font-bold text-amber-300">+{b.points} ball</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-slate-400 text-xs font-medium">
                Hozircha nishonlar yo'q. Birinchi vazifani topshirib "Birinchi Qadam" nishonini oling! 🚀
              </div>
            )}
          </div>

          {/* Next Target Badge */}
          {nextBadgeWithProgress && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col justify-between">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5 mb-2">
                  <Target className="w-4 h-4 text-cyan-400" />
                  Keyingi nishon
                </span>
                <div className="flex items-center space-x-3 mb-2">
                  <span className="text-2xl p-2 bg-white/10 rounded-xl">{nextBadgeWithProgress.badge.icon}</span>
                  <div>
                    <h5 className="font-black text-sm text-white">{nextBadgeWithProgress.badge.title}</h5>
                    <p className="text-[11px] text-slate-400 line-clamp-1">{nextBadgeWithProgress.badge.description}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 pt-2">
                <div className="flex items-center justify-between text-[10px] font-black text-slate-300">
                  <span>{nextBadgeWithProgress.progress.current} / {nextBadgeWithProgress.progress.target} {nextBadgeWithProgress.progress.unit}</span>
                  <span className="text-cyan-400">{nextBadgeWithProgress.progress.percentage}%</span>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-cyan-400 to-indigo-400 rounded-full transition-all duration-500" 
                    style={{ width: `${Math.max(6, nextBadgeWithProgress.progress.percentage)}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
