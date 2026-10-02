import React, { useState } from 'react';
import { User, Submission } from '../types';
import { ALL_BADGES, BadgeCategory, calculateUserRank, BadgeDefinition } from '../services/badgeService';
import { Trophy, Star, Target, CheckCircle2, Lock, Sparkles, X, Award, Flame, Zap } from 'lucide-react';

interface Props {
  user: User;
  submissions: Submission[];
  isOpen: boolean;
  onClose: () => void;
}

export const BadgesModal: React.FC<Props> = ({ user, submissions, isOpen, onClose }) => {
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'unlocked' | 'locked' | BadgeCategory>('all');
  const [activeBadge, setActiveBadge] = useState<BadgeDefinition | null>(null);

  if (!isOpen) return null;

  const userBadges = new Set(user.badges || []);
  const rank = calculateUserRank(user.points || 0);

  const filteredBadges = ALL_BADGES.filter(badge => {
    const isUnlocked = userBadges.has(badge.id);
    if (selectedFilter === 'unlocked') return isUnlocked;
    if (selectedFilter === 'locked') return !isUnlocked;
    if (selectedFilter === 'consistency') return badge.category === 'consistency';
    if (selectedFilter === 'accuracy') return badge.category === 'accuracy';
    return true;
  });

  const unlockedCount = ALL_BADGES.filter(b => userBadges.has(b.id)).length;
  const totalCount = ALL_BADGES.length;
  const progressToNextRank = Math.min(
    100,
    Math.round(((user.points || 0) - rank.minPoints) / Math.max(1, rank.nextPoints - rank.minPoints) * 100)
  );

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'platinum':
        return 'from-cyan-500 via-sky-400 to-indigo-500 text-cyan-600 border-cyan-200 bg-cyan-50/60 shadow-cyan-100';
      case 'gold':
        return 'from-amber-400 via-yellow-400 to-amber-600 text-amber-600 border-amber-200 bg-amber-50/60 shadow-amber-100';
      case 'silver':
        return 'from-slate-400 via-zinc-300 to-slate-500 text-slate-700 border-slate-200 bg-slate-50/70 shadow-slate-100';
      default:
        return 'from-orange-400 to-amber-600 text-orange-700 border-orange-200 bg-orange-50/60 shadow-orange-100';
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-[210] flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header: User Profile & Rank */}
        <div className="relative p-5 sm:p-8 bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 -mb-16 w-56 h-56 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          <button 
            onClick={onClose}
            className="absolute top-4 sm:top-6 right-4 sm:right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center z-20"
            aria-label="Yopish"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 relative z-10">
            <div className="relative shrink-0">
              <img 
                src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`} 
                alt={user.name} 
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl border-4 border-white/20 shadow-2xl object-cover bg-white/5"
              />
              <div className="absolute -bottom-2 -right-2 w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-base sm:text-lg shadow-lg border-2 border-slate-900">
                {rank.badge}
              </div>
            </div>

            <div className="flex-grow text-center sm:text-left space-y-1.5 sm:space-y-2 min-w-0">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h3 className="text-xl sm:text-3xl font-black tracking-tight truncate max-w-[220px] sm:max-w-none">{user.name}</h3>
                <span className="bg-white/10 text-indigo-200 text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  {user.role === 'teacher' ? 'Ustoz' : 'O\'quvchi'}
                </span>
              </div>
              <p className="text-slate-300 text-xs sm:text-sm font-medium truncate">{user.email}</p>

              {/* Rank and Points Bar */}
              <div className="pt-1.5 sm:pt-2 max-w-md mx-auto sm:mx-0">
                <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                  <span className="text-amber-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    {rank.title} (Level {rank.level})
                  </span>
                  <span className="text-slate-300 text-[11px]">
                    <strong className="text-white">{user.points || 0}</strong> / {rank.nextPoints} ball
                  </span>
                </div>
                <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden p-0.5 border border-white/10">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-400 to-indigo-400 rounded-full transition-all duration-700 shadow-sm"
                    style={{ width: `${Math.max(6, progressToNextRank)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Badges count pill */}
            <div className="shrink-0 bg-white/10 backdrop-blur-md rounded-2xl p-3 sm:p-4 border border-white/10 flex sm:flex-col items-center justify-center gap-2 sm:gap-0 min-w-[110px]">
              <Trophy className="w-5 h-5 text-amber-300 sm:mb-1" />
              <div className="text-center">
                <span className="text-lg sm:text-2xl font-black text-white">{unlockedCount} / {totalCount}</span>
                <span className="hidden sm:block text-[9px] font-black text-slate-300 uppercase tracking-widest">Nishonlar</span>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Navigation (Horizontal swipe on mobile) */}
        <div className="px-4 sm:px-6 py-3 bg-slate-50 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-2 text-xs font-black overflow-x-auto pb-1 max-w-full no-scrollbar">
            <button
              onClick={() => setSelectedFilter('all')}
              className={`px-3 py-1.5 rounded-xl transition-all shrink-0 min-h-[36px] ${selectedFilter === 'all' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'bg-white text-slate-500 hover:bg-slate-100'}`}
            >
              Hammasi ({ALL_BADGES.length})
            </button>
            <button
              onClick={() => setSelectedFilter('unlocked')}
              className={`px-3 py-1.5 rounded-xl transition-all shrink-0 flex items-center gap-1.5 min-h-[36px] ${selectedFilter === 'unlocked' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-100' : 'bg-white text-slate-500 hover:bg-slate-100'}`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Yutuqlar ({unlockedCount})
            </button>
            <button
              onClick={() => setSelectedFilter('locked')}
              className={`px-3 py-1.5 rounded-xl transition-all shrink-0 flex items-center gap-1.5 min-h-[36px] ${selectedFilter === 'locked' ? 'bg-slate-800 text-white shadow-md' : 'bg-white text-slate-500 hover:bg-slate-100'}`}
            >
              <Lock className="w-3.5 h-3.5" />
              Kutilayotgan ({totalCount - unlockedCount})
            </button>
            <button
              onClick={() => setSelectedFilter('consistency')}
              className={`px-3 py-1.5 rounded-xl transition-all shrink-0 flex items-center gap-1.5 min-h-[36px] ${selectedFilter === 'consistency' ? 'bg-orange-500 text-white shadow-md' : 'bg-white text-slate-500 hover:bg-slate-100'}`}
            >
              <Flame className="w-3.5 h-3.5 text-orange-400" />
              Izchillik
            </button>
            <button
              onClick={() => setSelectedFilter('accuracy')}
              className={`px-3 py-1.5 rounded-xl transition-all shrink-0 flex items-center gap-1.5 min-h-[36px] ${selectedFilter === 'accuracy' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-500 hover:bg-slate-100'}`}
            >
              <Target className="w-3.5 h-3.5 text-blue-400" />
              Aniqlik
            </button>
          </div>
          <div className="text-[10px] font-bold text-slate-400 hidden sm:block">
            Har bir nishon qo'shimcha ball keltiradi!
          </div>
        </div>

        {/* Badges Grid */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-grow space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredBadges.map(badge => {
              const progress = badge.checkProgress(submissions, user);
              const isUnlocked = progress.unlocked || userBadges.has(badge.id);

              return (
                <div 
                  key={badge.id}
                  onClick={() => setActiveBadge(badge)}
                  className={`group relative p-5 rounded-3xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                    isUnlocked 
                      ? 'bg-white border-slate-100 hover:border-indigo-400 shadow-sm hover:shadow-lg' 
                      : 'bg-slate-50/70 border-dashed border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0 transition-transform group-hover:scale-110 shadow-sm border ${
                      isUnlocked 
                        ? getTierColor(badge.tier)
                        : 'bg-slate-200/70 text-slate-400 border-slate-300 grayscale opacity-60'
                    }`}>
                      {badge.icon}
                    </div>

                    <div className="flex-grow min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className={`font-black text-base truncate ${isUnlocked ? 'text-slate-900' : 'text-slate-500'}`}>
                          {badge.title}
                        </h4>
                        <span className="shrink-0 text-xs font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100">
                          +{badge.points} ball
                        </span>
                      </div>

                      <p className="text-xs text-slate-500 font-medium mt-1 line-clamp-2">
                        {badge.description}
                      </p>

                      <div className="flex items-center gap-2 mt-2">
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                          badge.category === 'consistency' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'
                        }`}>
                          {badge.category === 'consistency' ? 'Izchillik' : 'Aniqlik'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                          {badge.tier}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Progress Indicator */}
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    {isUnlocked ? (
                      <div className="flex items-center justify-between text-xs font-bold text-emerald-600">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" />
                          Qo'lga kiritilgan
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">Faol</span>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                          <span className="flex items-center gap-1 text-slate-400">
                            <Lock className="w-3 h-3" />
                            {badge.requirement}
                          </span>
                          <span>{progress.current} / {progress.target} {progress.unit}</span>
                        </div>
                        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-indigo-500 rounded-full transition-all duration-500" 
                            style={{ width: `${progress.percentage}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 px-8 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0 text-xs text-slate-400">
          <span>Topshiriqlarni o'z vaqtida va a'lo baholarga topshirib barcha nishonlarni to'plang!</span>
          <button 
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors"
          >
            Yopish
          </button>
        </div>

      </div>
    </div>
  );
};
