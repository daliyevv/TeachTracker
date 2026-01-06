
import React, { useEffect, useState } from 'react';
import { UserRole, User } from '../types';

interface Props {
  onAuthenticated: (googleUser: any) => void;
  onRoleSelect: (role: UserRole) => void;
  pendingUser: any | null;
}

export const LoginScreen: React.FC<Props> = ({ onAuthenticated, onRoleSelect, pendingUser }) => {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initGoogle = () => {
      const google = (window as any).google;
      if (!google) {
        setTimeout(initGoogle, 500);
        return;
      }

      const CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com"; 

      if (CLIENT_ID.includes("YOUR_GOOGLE_CLIENT_ID")) {
        setError("Google OAuth Client ID o'rnatilmagan.");
        return;
      }

      try {
        google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: (response: any) => {
            const base64Url = response.credential.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const payload = JSON.parse(window.atob(base64));
            onAuthenticated(payload);
          },
          auto_select: false,
          cancel_on_tap_outside: true
        });

        google.accounts.id.renderButton(
          document.getElementById("googleBtn")!,
          { theme: "outline", size: "large", width: "100%", shape: "pill", text: "signin_with" }
        );
      } catch (err) {
        console.error("Google Auth Initialization Error:", err);
      }
    };

    if (!pendingUser) {
      initGoogle();
    }
  }, [pendingUser]);

  const handleDemoLogin = () => {
    // Tasodifiy ID o'rniga barqaror demo ID ishlatamiz
    // Bu test qilishda o'quvchi va ustoz o'rtasidagi bog'liqlikni saqlaydi
    const demoPayload = {
      sub: "demo_shared_user_id", 
      name: "Mehmon Foydalanuvchi",
      given_name: "Mehmon",
      email: "demo@teachtracker.uz",
      picture: "https://api.dicebear.com/7.x/avataaars/svg?seed=demo"
    };
    onAuthenticated(demoPayload);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans text-slate-900">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-10 text-center space-y-8 animate-in fade-in zoom-in duration-500 border border-slate-100">
        <div className="w-20 h-20 bg-indigo-600 rounded-3xl mx-auto flex items-center justify-center shadow-2xl shadow-indigo-200">
           <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
           </svg>
        </div>

        {!pendingUser ? (
          <>
            <div>
              <h1 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">TeachTracker</h1>
              <p className="text-slate-500 font-medium">Platformadan foydalanish uchun kirishingiz kerak.</p>
            </div>
            
            <div className="space-y-4">
              <div id="googleBtn" className="w-full min-h-[44px]"></div>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-slate-400 font-bold">Yoki</span></div>
              </div>

              <button 
                onClick={handleDemoLogin}
                className="w-full py-3 px-6 bg-slate-900 text-white rounded-full font-bold hover:bg-slate-800 transition-all flex items-center justify-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                <span>Demo rejimida sinab ko'rish</span>
              </button>
            </div>
            
            {error && (
              <p className="text-[10px] text-rose-400 font-bold bg-rose-50 p-2 rounded-lg">
                Haqiqiy Google Auth faollashtirilmagan. Demo rejimidan foydalaning.
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
              <h2 className="text-2xl font-black text-slate-900 leading-tight">Salom, {pendingUser.given_name}!</h2>
              <p className="text-slate-500 font-medium mt-2">Sizning rolingizni aniqlab olaylik:</p>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <button 
                onClick={() => onRoleSelect('teacher')}
                className="group p-6 bg-white border-2 border-slate-100 hover:border-indigo-600 rounded-[2rem] transition-all text-left flex items-center space-x-4 hover:shadow-lg hover:shadow-indigo-50"
              >
                <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                </div>
                <div>
                  <p className="font-bold text-slate-800">Men Ustozman</p>
                  <p className="text-xs text-slate-400 font-medium">Vazifa yaratish va tekshirish</p>
                </div>
              </button>
              <button 
                onClick={() => onRoleSelect('student')}
                className="group p-6 bg-white border-2 border-slate-100 hover:border-violet-600 rounded-[2rem] transition-all text-left flex items-center space-x-4 hover:shadow-lg hover:shadow-violet-50"
              >
                <div className="w-12 h-12 bg-violet-100 text-violet-600 rounded-2xl flex items-center justify-center group-hover:bg-violet-600 group-hover:text-white transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
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
