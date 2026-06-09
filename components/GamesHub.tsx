
import React, { useState } from 'react';
import { Trophy, Star, Play, Gift, RotateCw, Box, HelpCircle, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const GAMES = [
  { id: 'wheel', title: 'Omad Charxi', description: 'O\'quvchilarni tasodifiy tanlash yoki mukofotlar berish uchun', icon: RotateCw, color: 'bg-indigo-600', shadow: 'shadow-indigo-200' },
  { id: 'box', title: 'Sirli Quti', description: 'Savollar yoki sovg\'alar yashiringan qutilar', icon: Box, color: 'bg-rose-600', shadow: 'shadow-rose-200' },
  { id: 'anagram', title: 'Anagram', description: 'Harflardan so\'z yasash o\'yini', icon: HelpCircle, color: 'bg-emerald-600', shadow: 'shadow-emerald-200' },
  { id: 'quiz', title: 'Tezkor Savol-Javob', description: 'Vaqtga qarshi bilim sinovi', icon: Zap, color: 'bg-amber-600', shadow: 'shadow-amber-200' },
];

export const GamesHub: React.FC = () => {
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [winner, setWinner] = useState<string | null>(null);

  const spinWheel = () => {
    if (spinning) return;
    setSpinning(true);
    setWinner(null);
    const newRotation = rotation + 1800 + Math.random() * 360;
    setRotation(newRotation);
    
    setTimeout(() => {
      setSpinning(false);
      setWinner("Azizbek"); // Mock winner
    }, 3000);
  };

  return (
    <div className="space-y-12">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-black text-slate-900">O'yinlar</h1>
          <p className="text-slate-500 font-medium">Darsni qiziqarli va interaktiv qiling</p>
        </div>
        <div className="flex items-center space-x-4 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
          <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Reyting</p>
            <p className="text-lg font-black text-slate-900">1,240 ball</p>
          </div>
        </div>
      </div>

      {!activeGame ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {GAMES.map((game) => (
            <button
              key={game.id}
              onClick={() => setActiveGame(game.id)}
              className="group bg-white p-8 rounded-[2.5rem] border border-slate-100 text-left hover:shadow-2xl hover:shadow-slate-200 transition-all flex items-center space-x-6"
            >
              <div className={`w-20 h-20 ${game.color} rounded-[2rem] flex items-center justify-center shadow-2xl ${game.shadow} group-hover:scale-110 transition-transform`}>
                <game.icon className="w-10 h-10 text-white" />
              </div>
              <div className="flex-grow space-y-2">
                <h3 className="text-xl font-black text-slate-900">{game.title}</h3>
                <p className="text-sm text-slate-500 font-medium leading-relaxed">{game.description}</p>
                <div className="flex items-center space-x-2 text-xs font-black text-indigo-600 pt-2">
                  <span>O'ynash</span>
                  <Play className="w-3 h-3 fill-current" />
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="bg-white p-12 rounded-[3rem] border border-slate-100 shadow-2xl space-y-12 relative overflow-hidden">
          <button 
            onClick={() => setActiveGame(null)}
            className="absolute top-8 left-8 text-xs font-black text-slate-400 hover:text-slate-900 uppercase tracking-widest flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
            <span>Orqaga</span>
          </button>

          {activeGame === 'wheel' && (
            <div className="flex flex-col items-center space-y-12">
              <h2 className="text-3xl font-black text-slate-900">Omad Charxi</h2>
              
              <div className="relative w-80 h-80">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10 w-8 h-12 bg-rose-600 clip-path-triangle shadow-lg"></div>
                <motion.div 
                  className="w-full h-full rounded-full border-8 border-slate-900 relative overflow-hidden shadow-2xl"
                  animate={{ rotate: rotation }}
                  transition={{ duration: 3, ease: "easeOut" }}
                  style={{ 
                    background: 'conic-gradient(#4f46e5 0deg 60deg, #7c3aed 60deg 120deg, #db2777 120deg 180deg, #ea580c 180deg 240deg, #ca8a04 240deg 300deg, #16a34a 300deg 360deg)' 
                  }}
                >
                  {[1,2,3,4,5,6].map((i) => (
                    <div 
                      key={i}
                      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white font-black text-sm"
                      style={{ transform: `translate(-50%, -50%) rotate(${i * 60 - 30}deg) translateY(-100px)` }}
                    >
                      {['Aziz', 'Sardor', 'Malika', 'Jasur', 'Lola', 'Bekzod'][i-1]}
                    </div>
                  ))}
                </motion.div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 bg-white rounded-full border-4 border-slate-900 shadow-xl z-20 flex items-center justify-center">
                    <div className="w-4 h-4 bg-slate-900 rounded-full"></div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center space-y-6">
                <button 
                  onClick={spinWheel}
                  disabled={spinning}
                  className="px-12 py-4 bg-indigo-600 text-white rounded-2xl font-black text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 disabled:opacity-50"
                >
                  {spinning ? 'Aylanmoqda...' : 'Aylantirish'}
                </button>

                <AnimatePresence>
                  {winner && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-center space-y-2"
                    >
                      <p className="text-sm font-black text-slate-400 uppercase tracking-widest">G'olib!</p>
                      <p className="text-4xl font-black text-indigo-600">{winner}</p>
                      <div className="flex justify-center space-x-1">
                        {[1,2,3,4,5].map(i => <Star key={i} className="w-5 h-5 text-amber-400 fill-current" />)}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}

          {activeGame !== 'wheel' && (
            <div className="text-center py-20 space-y-6">
              <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                <Gift className="w-12 h-12 text-slate-300" />
              </div>
              <h3 className="text-2xl font-black text-slate-900">Tez kunda!</h3>
              <p className="text-slate-500 font-medium max-w-sm mx-auto">Ushbu o'yin hozirda ishlab chiqilmoqda. Tez orada darslaringizni yanada qiziqarli qilamiz.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
