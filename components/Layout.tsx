
import React from 'react';
import { User, ViewType } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  user: User;
  currentView: ViewType;
  onLogout: () => void;
  onNavigate: (view: ViewType) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, user, currentView, onLogout, onNavigate }) => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          <div 
            className="flex items-center space-x-3 cursor-pointer group"
            onClick={() => onNavigate('home')}
          >
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 group-hover:scale-105 transition-transform">
              <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent leading-none">
                TeachTracker
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Raqamli Maktab</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center space-x-8">
            <button 
              onClick={() => onNavigate('home')}
              className={`text-sm font-bold transition-all ${currentView === 'home' ? 'text-indigo-600 border-b-2 border-indigo-600 pb-1' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Asosiy
            </button>
            <button 
              onClick={() => onNavigate('tasks')}
              className={`text-sm font-bold transition-all ${currentView === 'tasks' ? 'text-indigo-600 border-b-2 border-indigo-600 pb-1' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Vazifalar
            </button>
            <button 
              onClick={() => onNavigate('results')}
              className={`text-sm font-bold transition-all ${currentView === 'results' ? 'text-indigo-600 border-b-2 border-indigo-600 pb-1' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Natijalar
            </button>
          </nav>

          <div className="flex items-center space-x-4 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
            <div className="hidden sm:flex flex-col items-end px-3">
              <span className="text-sm font-black text-slate-900 leading-none">{user.name}</span>
              <span className="text-[9px] font-black text-indigo-500 uppercase tracking-tighter mt-1">{user.role === 'teacher' ? 'O\'qituvchi' : 'O\'quvchi'}</span>
            </div>
            <div className="relative">
              <img src={user.avatar} className="w-10 h-10 rounded-xl border-2 border-white shadow-sm" alt="Avatar" />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></div>
            </div>
            <button 
              onClick={onLogout} 
              className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
              title="Chiqish"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </header>
      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">
        {children}
      </main>
      <footer className="bg-white border-t border-slate-100 py-6">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em]">© 2025 TeachTracker • Bilim sari qadam</p>
        </div>
      </footer>
    </div>
  );
};
