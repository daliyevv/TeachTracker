
import React, { useState } from 'react';
import { UserRole } from '../types';
import { auth, googleProvider, isFirebaseConfigured } from '../services/firebase';
import { signInWithPopup, signInWithRedirect } from 'firebase/auth';
import { setServiceDegraded, getServiceStatus, resetServiceStatus } from '../services/dbService';

interface Props {
  onAuthenticated: (user: any) => void;
  onRoleSelect: (role: UserRole, teacherCode?: string) => Promise<void> | void;
  pendingUser: any | null;
}

export const LoginScreen: React.FC<Props> = ({ onAuthenticated, onRoleSelect, pendingUser }) => {
  const [loading, setLoading] = useState(false);
  const [roleLoading, setRoleLoading] = useState<UserRole | null>(null);
  const [showTeacherCode, setShowTeacherCode] = useState(false);
  const [teacherCode, setTeacherCode] = useState('');
  const [roleError, setRoleError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const describeRoleError = (err: any) =>
    err?.code === 'permission-denied'
      ? "Kod noto'g'ri yoki faol emas. Maktabingizdan tekshirib so'rang."
      : "Saqlashda xatolik yuz berdi. Qayta urinib ko'ring.";

  const submitTeacher = async () => {
    const code = teacherCode.trim();
    if (!code) return;
    setRoleLoading('teacher');
    setRoleError(null);
    try {
      await onRoleSelect('teacher', code);
    } catch (err: any) {
      setRoleError(describeRoleError(err));
    } finally {
      setRoleLoading(null);
    }
  };

  const submitStudent = async () => {
    setRoleLoading('student');
    setRoleError(null);
    try {
      await onRoleSelect('student');
    } catch (err: any) {
      setRoleError(describeRoleError(err));
    } finally {
      setRoleLoading(null);
    }
  };

  const handleGoogleLogin = async () => {
    if (!isFirebaseConfigured || !auth) {
      handleDemoLogin();
      return;
    }
    try {
      setLoading(true);
      setAuthError(null);
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      onAuthenticated({
        uid: user.uid,
        name: user.displayName || user.email?.split('@')[0] || "Foydalanuvchi",
        email: user.email || "",
        picture: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`
      });
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        // Foydalanuvchi popupni o'zi yopdi — xato emas
        return;
      }

      // MUHIM: ilgari bu yerda tasodifiy uid bilan SOXTA foydalanuvchi
      // yasalardi. Ilova normal ko'rinardi, lekin Firebase sessiyasi
      // bo'lmagani uchun topshirilgan ish hech qayerga saqlanmasdi —
      // o'quvchi "Qabul qilindi!" ni ko'rar, o'qituvchiga esa hech narsa
      // bormasdi. Endi soxta foydalanuvchi yaratilmaydi.
      //
      // Popup mobil brauzerlarda va Telegram/Instagram ichidagi
      // brauzerlarda tez-tez bloklanadi, shuning uchun redirect'ga o'tamiz.
      if (
        err.code === 'auth/popup-blocked' ||
        err.code === 'auth/operation-not-supported-in-this-environment' ||
        err.code === 'auth/web-storage-unsupported'
      ) {
        try {
          await signInWithRedirect(auth, googleProvider);
          return; // Sahifa Google'ga o'tadi va qaytib keladi
        } catch (redirectErr: any) {
          console.error("Redirect bilan kirish ham ishlamadi:", redirectErr);
        }
      }

      console.error("Google bilan kirishda xato:", err);
      setAuthError(
        err.code === 'auth/network-request-failed'
          ? "Internet aloqasi yo'q. Ulanishni tekshirib, qayta urinib ko'ring."
          : "Google bilan kirib bo'lmadi. Qayta urinib ko'ring."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    onAuthenticated({
      uid: "demo-user-" + Math.random().toString(36).substr(2, 6),
      name: "Demo Foydalanuvchi",
      email: "demo@teachtracker.uz",
      picture: `https://api.dicebear.com/7.x/avataaars/svg?seed=demo-user`
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-3 sm:p-6 font-sans text-slate-900">
      <div className="max-w-md w-full bg-white rounded-3xl sm:rounded-[2.5rem] shadow-2xl p-6 sm:p-10 text-center space-y-6 sm:space-y-8 animate-in fade-in zoom-in duration-500 border border-slate-100">
        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-indigo-600 rounded-2xl sm:rounded-3xl mx-auto flex items-center justify-center shadow-xl shadow-indigo-200">
           <svg className="h-8 w-8 sm:h-10 sm:w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
           </svg>
        </div>

        {!pendingUser ? (
          <>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mb-1.5 sm:mb-2 tracking-tight">TeachTracker</h1>
              <p className="text-slate-500 font-medium text-sm sm:text-base">Platformadan foydalanish uchun profilingizga kiring.</p>
            </div>
            
            <div className="space-y-3 sm:space-y-4">
              <button 
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full py-3.5 sm:py-4 px-6 bg-white border-2 border-slate-100 rounded-2xl sm:rounded-full font-bold text-sm sm:text-base hover:bg-slate-50 transition-all flex items-center justify-center space-x-3 shadow-xs disabled:opacity-50 min-h-[48px]"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5 shrink-0" alt="Google" />
                <span>Google orqali kirish</span>
              </button>
              
              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-3 text-slate-400 font-bold">Yoki</span></div>
              </div>

              <button 
                onClick={handleDemoLogin}
                disabled={loading}
                className="w-full py-3.5 px-6 bg-slate-900 text-white rounded-2xl sm:rounded-full font-bold text-sm sm:text-base hover:bg-slate-800 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 min-h-[48px]"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                )}
                <span>Demo rejimida sinab ko'rish</span>
              </button>
            </div>
            
            {authError && (
              <p role="alert" className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-100 rounded-2xl px-4 py-3">
                {authError}
              </p>
            )}

            <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
              * Demo rejimida "O'quvchi" bo'lib diktant topshirib, keyin "Ustoz" bo'lib uni tekshirishingiz mumkin.
            </p>
          </>
        ) : (
          <div className="space-y-6 animate-in slide-in-from-bottom-4">
            <div>
              <img src={pendingUser.picture} className="w-20 h-20 rounded-full mx-auto border-4 border-indigo-50 mb-4 shadow-sm" alt="User" />
              <h2 className="text-2xl font-black text-slate-900 leading-tight">Salom, {pendingUser.name?.split(' ')[0] || "Mehmon"}!</h2>
              <p className="text-slate-500 font-medium mt-2">Sizning rolingizni aniqlab olaylik:</p>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <button 
                onClick={() => { setRoleError(null); setShowTeacherCode(true); }}
                disabled={!!roleLoading}
                className="group p-6 bg-white border-2 border-slate-100 hover:border-indigo-600 rounded-[2rem] transition-all text-left flex items-center space-x-4 hover:shadow-lg hover:shadow-indigo-50 disabled:opacity-50"
              >
                <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  {roleLoading === 'teacher' ? (
                    <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin group-hover:border-white" />
                  ) : (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                  )}
                </div>
                <div>
                  <p className="font-bold text-slate-800">Men Ustozman</p>
                  <p className="text-xs text-slate-400 font-medium">Vazifa yaratish va tekshirish</p>
                </div>
              </button>
              <button 
                onClick={submitStudent}
                disabled={!!roleLoading}
                className="group p-6 bg-white border-2 border-slate-100 hover:border-violet-600 rounded-[2rem] transition-all text-left flex items-center space-x-4 hover:shadow-lg hover:shadow-violet-50 disabled:opacity-50"
              >
                <div className="w-12 h-12 bg-violet-100 text-violet-600 rounded-2xl flex items-center justify-center group-hover:bg-violet-600 group-hover:text-white transition-colors">
                  {roleLoading === 'student' ? (
                    <div className="w-5 h-5 border-2 border-violet-600 border-t-transparent rounded-full animate-spin group-hover:border-white" />
                  ) : (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  )}
                </div>
                <div>
                  <p className="font-bold text-slate-800">Men O'quvchiman</p>
                  <p className="text-xs text-slate-400 font-medium">Diktant yozish va topshirish</p>
                </div>
              </button>
            </div>

            {showTeacherCode && (
              <div className="p-5 bg-indigo-50 border-2 border-indigo-100 rounded-[2rem] text-left space-y-3 animate-in fade-in">
                <div>
                  <label htmlFor="teacher-code" className="block font-bold text-slate-800 text-sm">
                    Taklif kodi
                  </label>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    O'qituvchi bo'lish uchun maktabingiz bergan kodni kiriting.
                  </p>
                </div>
                <input
                  id="teacher-code"
                  type="text"
                  value={teacherCode}
                  onChange={(e) => { setTeacherCode(e.target.value); setRoleError(null); }}
                  placeholder="Masalan: MKTB-7A2F9K"
                  autoComplete="off"
                  autoCapitalize="characters"
                  disabled={!!roleLoading}
                  className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-indigo-600 focus:outline-none font-medium text-slate-800 min-h-[44px] disabled:opacity-50"
                />
                <div className="flex gap-2">
                  <button
                    onClick={submitTeacher}
                    disabled={!teacherCode.trim() || !!roleLoading}
                    className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-2xl font-bold text-sm min-h-[44px] disabled:opacity-40 hover:bg-indigo-700 transition-colors"
                  >
                    {roleLoading === 'teacher' ? 'Tekshirilmoqda...' : 'Tasdiqlash'}
                  </button>
                  <button
                    onClick={() => { setShowTeacherCode(false); setTeacherCode(''); setRoleError(null); }}
                    disabled={!!roleLoading}
                    className="px-5 py-3 bg-white text-slate-600 rounded-2xl font-bold text-sm border-2 border-slate-200 min-h-[44px] disabled:opacity-40 hover:border-slate-300 transition-colors"
                  >
                    Bekor
                  </button>
                </div>
              </div>
            )}

            {roleError && (
              <p role="alert" className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-100 rounded-2xl px-4 py-3 text-left">
                {roleError}
              </p>
            )}
          </div>
        )}
        
        <p className="text-[10px] text-slate-300 tracking-widest font-bold uppercase">© {new Date().getFullYear()} TeachTracker</p>
      </div>
    </div>
  );
};
