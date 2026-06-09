
import React, { useState } from 'react';
import { UserRole } from '../types';
import { auth, googleProvider, isFirebaseConfigured } from '../services/firebase';
import { signInWithPopup, signInAnonymously } from 'firebase/auth';
import { setServiceDegraded, getServiceStatus, resetServiceStatus } from '../services/dbService';

interface Props {
  onAuthenticated: (user: any) => void;
  onRoleSelect: (role: UserRole) => void;
  pendingUser: any | null;
}

export const LoginScreen: React.FC<Props> = ({ onAuthenticated, onRoleSelect, pendingUser }) => {
  const [loading, setLoading] = useState(false);
  const [roleLoading, setRoleLoading] = useState<UserRole | null>(null);
  const [authError, setAuthError] = useState<{title: string, message: string, steps: string[]} | null>(null);
  const isDegraded = getServiceStatus();

  const handleGoogleLogin = async () => {
    if (isDegraded) {
      alert("Firebase API kaliti to'xtatilganligi sababli Google orqali kirish imkonsiz. Iltimos, Demo rejimidan foydalaning.");
      return;
    }
    if (!isFirebaseConfigured || !auth) {
      alert("Firebase sozlanmagan yoki Auth xizmati mavjud emas.");
      return;
    }
    try {
      setLoading(true);
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      onAuthenticated({
        uid: user.uid,
        name: user.displayName,
        email: user.email,
        picture: user.photoURL
      });
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        console.warn("Google Auth Issue:", err.message);
      }
      
      if (err.code === 'auth/configuration-not-found') {
        alert("Google bilan kirish faollashtirilmagan. Avtomatik ravishda Demo rejimiga o'tilmoqda.");
        onAuthenticated({
          uid: "local-demo-user-" + Math.random().toString(36).substr(2, 5),
          name: "Demo Foydalanuvchi",
          email: "demo@teachtracker.uz",
          picture: `https://api.dicebear.com/7.x/avataaars/svg?seed=local-demo`
        });
      } else if (err.code === 'auth/unauthorized-domain') {
        setAuthError({
          title: "Domen ruxsat etilmagan",
          message: "Ushbu veb-sayt manzili Firebase-da ruxsat etilgan domenlar ro'yxatiga qo'shilmagan.",
          steps: [
            "Firebase Console -> Authentication -> Settings bo'limiga o'ting",
            "'Authorized domains' (Ruxsat etilgan domenlar) qismini toping",
            "'Add domain' tugmasini bosing va quyidagilarni qo'shing:",
            window.location.hostname,
            "ais-pre-qiiel5gzmmarkw72ytjvlt-488480667737.asia-southeast1.run.app"
          ]
        });
      } else if (err.code === 'auth/network-request-failed') {
        setAuthError({
          title: "Tarmoq yoki brauzer cheklovi",
          message: "Google bilan ulanish amalga oshmadi. Agar ilova iframe (AI Studio) ichida ishlayotgan bo'lsa, 'signInWithPopup' cheklangan bo'lishi mumkin. Iltimos, ilovani yangi oynada (New Tab) oching yoki hisobga kirmasdan Demo rejimidan foydalaning.",
          steps: [
            "Ilovani yangi tabda ochib ko'ring (Open in new tab)",
            "Reklama to'xtatuvchi (AdBlock) ni o'chiring",
            "Mahalliy demo rejimidan foydalaning"
          ]
        });
      } else if (err.message?.includes('api-key') && err.message?.includes('suspended')) {
        setServiceDegraded(true);
        alert("Firebase API kaliti to'xtatilgan (suspended). Iltimos, Google Cloud Console-da billing yoki kvotalarni tekshiring. Hozircha 'Demo' rejimida ishlashingiz mumkin.");
      } else {
        alert("Google orqali kirishda xatolik yuz berdi: " + (err.message || "Noma'lum xato"));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    if (!isFirebaseConfigured || !auth) {
      // Agar Firebase bo'lmasa, mahalliy demo rejimini ishga tushiramiz
      onAuthenticated({
        uid: "local-demo-user",
        name: "Mahalliy Mehmon",
        email: "local@demo.uz",
        picture: `https://api.dicebear.com/7.x/avataaars/svg?seed=local-demo`
      });
      return;
    }
    try {
      setLoading(true);
      if (isDegraded) throw new Error("Firebase suspended");
      // Demo uchun anonim kirishdan foydalanamiz
      const result = await signInAnonymously(auth);
      const user = result.user;
      onAuthenticated({
        uid: user.uid,
        name: "Mehmon Foydalanuvchi",
        email: "demo@teachtracker.uz",
        picture: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`
      });
    } catch (err: any) {
      console.warn("Demo Login Issue (Firebase):", err.message);
      
      if (err.message?.includes('api-key') && err.message?.includes('suspended')) {
        setServiceDegraded(true);
      }
      
      console.log("Switching to local demo mode due to Firebase limitation...");
      onAuthenticated({
        uid: "local-demo-user-" + Math.random().toString(36).substr(2, 5),
        name: "Demo Foydalanuvchi",
        email: "demo@teachtracker.uz",
        picture: `https://api.dicebear.com/7.x/avataaars/svg?seed=local-demo`
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans text-slate-900">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-10 text-center space-y-8 animate-in fade-in zoom-in duration-500 border border-slate-100">
        <div className="w-20 h-20 bg-indigo-600 rounded-3xl mx-auto flex items-center justify-center shadow-2xl shadow-indigo-200">
           <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
           </svg>
        </div>

        {isDegraded && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-800 text-left text-xs font-medium animate-in slide-in-from-top-2">
            <h4 className="font-bold text-sm mb-2">⚠️ Firebase xizmatiga ulanib bo'lmadi</h4>
            <p className="mb-2">Ilova avtomatik ravishda "Mahalliy Demo" rejimiga o'tdi. Ushbu xatoni to'g'irlash uchun Firebase Console'da quyidagilarni tekshiring:</p>
            <ul className="list-disc pl-5 space-y-1 opacity-90 font-mono text-[10px]">
              <li><b>Firestore Database</b> yaratilgan bo'lishi va "Test mode"da ekanligi.</li>
              <li>Google Authentication faollashtirilganligi.</li>
            </ul>
            <button 
              onClick={() => { resetServiceStatus(); window.location.reload(); }}
              className="mt-4 block w-full py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-bold text-center"
            >
              Qayta urinib ko'rish
            </button>
          </div>
        )}

        {(!isFirebaseConfigured || !auth) && !isDegraded && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-800 text-xs font-medium animate-pulse">
            ⚠️ Firebase to'liq sozlanmagan (API Key, Auth Domain yoki Project ID yetishmayapti). 
            <br/>
            <span className="opacity-70">Lekin "Demo" tugmasi orqali mahalliy rejimda sinab ko'rishingiz mumkin.</span>
          </div>
        )}

        {authError && (
          <div className="bg-blue-50 border border-blue-200 rounded-[2rem] p-6 text-left animate-in slide-in-from-top-4">
            <h3 className="text-blue-900 font-black text-lg mb-2 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {authError.title}
            </h3>
            <p className="text-blue-800 text-sm mb-4 font-medium">{authError.message}</p>
            <div className="space-y-2">
              {authError.steps.map((step, i) => (
                <div key={i} className="flex items-start space-x-3 text-xs text-blue-700 font-bold">
                  <span className="bg-blue-200 text-blue-800 w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center">{i+1}</span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 space-y-3">
              <button 
                onClick={() => setAuthError(null)}
                className="w-full py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
              >
                Tushunarli
              </button>
              <button 
                onClick={() => {
                  setAuthError(null);
                  onAuthenticated({
                    uid: "local-demo-user-" + Math.random().toString(36).substr(2, 5),
                    name: "Mahalliy Mehmon",
                    email: "local@demo.uz",
                    picture: `https://api.dicebear.com/7.x/avataaars/svg?seed=local-demo`
                  });
                }}
                className="w-full py-2 bg-white border border-blue-200 text-blue-600 rounded-xl font-bold hover:bg-blue-50 transition-colors text-xs"
              >
                Mahalliy demo rejimida davom etish
              </button>
            </div>
          </div>
        )}

        {!pendingUser ? (
          <>
            <div>
              <h1 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">TeachTracker</h1>
              <p className="text-slate-500 font-medium">Platformadan foydalanish uchun kirishingiz kerak.</p>
            </div>
            
            <div className="space-y-4">
              <button 
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full py-4 px-6 bg-white border-2 border-slate-100 rounded-full font-bold hover:bg-slate-50 transition-all flex items-center justify-center space-x-3 shadow-sm disabled:opacity-50"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
                <span>Google orqali kirish</span>
              </button>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-slate-400 font-bold">Yoki</span></div>
              </div>

              <button 
                onClick={handleDemoLogin}
                disabled={loading}
                className="w-full py-3 px-6 bg-slate-900 text-white rounded-full font-bold hover:bg-slate-800 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                )}
                <span>Demo rejimida sinab ko'rish</span>
              </button>
            </div>
            
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
                onClick={async () => {
                  setRoleLoading('teacher');
                  try {
                    await onRoleSelect('teacher');
                  } finally {
                    setRoleLoading(null);
                  }
                }}
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
                onClick={async () => {
                  setRoleLoading('student');
                  try {
                    await onRoleSelect('student');
                  } finally {
                    setRoleLoading(null);
                  }
                }}
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
          </div>
        )}
        
        <p className="text-[10px] text-slate-300 tracking-widest font-bold uppercase">© 2025 TeachTracker</p>
      </div>
    </div>
  );
};
