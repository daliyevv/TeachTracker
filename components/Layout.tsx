
import React, { useState } from 'react';
import { User, ViewType } from '../types';
import { Home, CheckSquare, BarChart3, Bot, BookOpen, Gamepad2, Menu, X, LogOut, Award, ChevronRight } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  user: User;
  currentView: ViewType;
  onLogout: () => void;
  onNavigate: (view: ViewType) => void;
  onOpenProfile?: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, user, currentView, onLogout, onNavigate, onOpenProfile }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (view: ViewType) => {
    onNavigate(view);
    setMobileMenuOpen(false);
  };

  const navItems = [
    { id: 'home' as ViewType, label: 'Asosiy', icon: Home },
    { id: 'tasks' as ViewType, label: 'Vazifalar', icon: CheckSquare },
    { id: 'results' as ViewType, label: 'Natijalar', icon: BarChart3 },
    { id: 'library' as ViewType, label: 'Kutubxona', icon: BookOpen },
    { id: 'games' as ViewType, label: "O'yinlar", icon: Gamepad2 },
    ...(user.role === 'teacher' ? [{ id: 'ai-assistant' as ViewType, label: 'AI Yordamchi', icon: Bot, isAi: true }] : []),
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased">
      {/* Top Header */}
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-3">
          
          {/* Brand Logo */}
          <div 
            className="flex items-center space-x-3 cursor-pointer group select-none min-h-[44px]"
            onClick={() => handleNavClick('home')}
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-md shadow-indigo-200 group-hover:scale-105 transition-transform shrink-0">
              <svg className="h-6 w-6 sm:h-7 sm:w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-lg sm:text-xl font-black bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-600 bg-clip-text text-transparent leading-none">
                TeachTracker
              </span>
              <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Raqamli Maktab</span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-6">
            <button 
              onClick={() => handleNavClick('home')}
              className={`text-xs font-black uppercase tracking-wider py-2 transition-all ${currentView === 'home' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Asosiy
            </button>
            <button 
              onClick={() => handleNavClick('tasks')}
              className={`text-xs font-black uppercase tracking-wider py-2 transition-all ${currentView === 'tasks' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Vazifalar
            </button>
            <button 
              onClick={() => handleNavClick('results')}
              className={`text-xs font-black uppercase tracking-wider py-2 transition-all ${currentView === 'results' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Natijalar
            </button>
            <div className="w-px h-4 bg-slate-200 mx-2"></div>
            {user.role === 'teacher' && (
              <button 
                onClick={() => handleNavClick('ai-assistant')}
                className={`text-xs font-black uppercase tracking-wider py-2 transition-all flex items-center space-x-1.5 ${currentView === 'ai-assistant' ? 'text-violet-600 border-b-2 border-violet-600' : 'text-slate-400 hover:text-violet-600'}`}
              >
                <Bot className="w-4 h-4" />
                <span>AI Yordamchi</span>
              </button>
            )}
            <button 
              onClick={() => handleNavClick('library')}
              className={`text-xs font-black uppercase tracking-wider py-2 transition-all ${currentView === 'library' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-slate-400 hover:text-emerald-600'}`}
            >
              Kutubxona
            </button>
            <button 
              onClick={() => handleNavClick('games')}
              className={`text-xs font-black uppercase tracking-wider py-2 transition-all ${currentView === 'games' ? 'text-amber-600 border-b-2 border-amber-600' : 'text-slate-400 hover:text-amber-600'}`}
            >
              O'yinlar
            </button>
          </nav>

          {/* Right Header: Profile, Logout & Mobile Menu Toggle */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* User Profile Pill */}
            <button 
              onClick={onOpenProfile}
              className="flex items-center space-x-2.5 p-1.5 sm:px-3 sm:py-1.5 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-200/80 transition-all text-left min-h-[44px]"
              title="Profil va nishonlar"
              aria-label="Profil va yutuqlar"
            >
              <div className="relative shrink-0">
                <img 
                  src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`} 
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl border border-white shadow-xs object-cover bg-white" 
                  alt={user.name} 
                />
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></div>
              </div>
              <div className="hidden sm:flex flex-col items-start leading-none pr-1">
                <span className="text-xs sm:text-sm font-black text-slate-900 truncate max-w-[130px]">{user.name}</span>
                <span className="text-[9px] font-black text-indigo-600 uppercase tracking-tighter mt-1">
                  {user.role === 'teacher' ? "Ustoz" : "O'quvchi"}
                  {user.points !== undefined && ` • ${user.points} ball`}
                </span>
              </div>
            </button>

            {/* Logout button (Desktop) */}
            <button 
              onClick={onLogout} 
              className="hidden lg:flex p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all min-h-[44px] min-w-[44px] items-center justify-center"
              title="Chiqish"
              aria-label="Tizimdan chiqish"
            >
              <LogOut className="w-5 h-5" />
            </button>

            {/* Mobile Hamburger Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Menyu ochish"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Menu Overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex flex-col justify-end animate-in fade-in duration-200">
          <div className="bg-white rounded-t-[2.5rem] p-6 max-h-[85vh] overflow-y-auto shadow-2xl space-y-6 animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <img 
                  src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`} 
                  className="w-12 h-12 rounded-2xl border-2 border-indigo-100 object-cover" 
                  alt={user.name} 
                />
                <div>
                  <h4 className="font-black text-slate-900 text-base">{user.name}</h4>
                  <p className="text-xs text-indigo-600 font-bold uppercase tracking-wider">
                    {user.role === 'teacher' ? "Ustoz" : "O'quvchi"} • {user.points || 0} ball
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile & Badges shortcut */}
            {onOpenProfile && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenProfile();
                }}
                className="w-full p-4 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-indigo-500/10 border border-amber-200/60 rounded-2xl flex items-center justify-between group transition-all"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-sm">
                    <Award className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="font-black text-slate-900 text-sm">Profil va Nishonlar</p>
                    <p className="text-[11px] text-slate-500 font-medium">Yutuqlar va reytingni ko'rish</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </button>
            )}

            {/* Navigation links */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3 mb-2">Bo'limlar</p>
              {navItems.map(item => {
                const isActive = currentView === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center justify-between p-3.5 rounded-2xl font-bold text-sm transition-all min-h-[48px] ${
                      isActive 
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' 
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </div>
                    {isActive && <div className="w-2 h-2 rounded-full bg-white" />}
                  </button>
                );
              })}
            </div>

            {/* Logout button */}
            <div className="pt-2 border-t border-slate-100">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onLogout();
                }}
                className="w-full flex items-center space-x-3 p-3.5 rounded-2xl font-bold text-sm text-rose-600 hover:bg-rose-50 transition-colors min-h-[48px]"
              >
                <LogOut className="w-5 h-5" />
                <span>Tizimdan chiqish</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content with bottom padding for mobile bar */}
      <main className="flex-grow max-w-7xl mx-auto w-full px-3 sm:px-6 py-4 sm:py-8 pb-24 lg:pb-8">
        {children}
      </main>

      {/* Mobile Bottom Navigation Bar (Visible only on < lg) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-2xl px-2 py-1.5 safe-area-bottom">
        <div className="flex items-center justify-around max-w-md mx-auto">
          <button
            onClick={() => handleNavClick('home')}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all min-h-[48px] min-w-[56px] ${
              currentView === 'home' ? 'text-indigo-600 font-black' : 'text-slate-400 hover:text-slate-600 font-medium'
            }`}
          >
            <Home className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] leading-tight">Asosiy</span>
          </button>

          <button
            onClick={() => handleNavClick('tasks')}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all min-h-[48px] min-w-[56px] ${
              currentView === 'tasks' ? 'text-indigo-600 font-black' : 'text-slate-400 hover:text-slate-600 font-medium'
            }`}
          >
            <CheckSquare className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] leading-tight">Vazifalar</span>
          </button>

          <button
            onClick={() => handleNavClick('results')}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all min-h-[48px] min-w-[56px] ${
              currentView === 'results' ? 'text-indigo-600 font-black' : 'text-slate-400 hover:text-slate-600 font-medium'
            }`}
          >
            <BarChart3 className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] leading-tight">Natijalar</span>
          </button>

          <button
            onClick={() => handleNavClick('games')}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all min-h-[48px] min-w-[56px] ${
              currentView === 'games' ? 'text-amber-600 font-black' : 'text-slate-400 hover:text-slate-600 font-medium'
            }`}
          >
            <Gamepad2 className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] leading-tight">O'yinlar</span>
          </button>

          {onOpenProfile && (
            <button
              onClick={onOpenProfile}
              className="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-slate-400 hover:text-indigo-600 transition-all min-h-[48px] min-w-[56px] font-medium"
              title="Profil va nishonlar"
            >
              <Award className="w-5 h-5 mb-0.5 text-amber-500" />
              <span className="text-[10px] leading-tight">Nishonlar</span>
            </button>
          )}
        </div>
      </div>

      {/* Footer (Desktop & Tablet) */}
      <footer className="bg-white border-t border-slate-100 py-6 mb-16 lg:mb-0">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em]">
            © {new Date().getFullYear()} TeachTracker • Bilim sari qadam
          </p>
        </div>
      </footer>
    </div>
  );
};

