
import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { User, UserRole, ViewType } from './types';
import { DB, getServiceStatus, resetServiceStatus, setServiceDegraded } from './services/dbService';
import { auth } from './services/firebase';
import { clearDemoSession, resolveUserId } from './services/demoMode';
import { onAuthStateChanged, signOut } from 'firebase/auth';
// Panellar alohida bo'laklarda yuklanadi — qarang components/lazy.tsx
import { TeacherDashboard, StudentDashboard } from './components/lazy';
import { LoginScreen } from './components/LoginScreen';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [pendingUser, setPendingUser] = useState<any | null>(null);
  const [currentView, setCurrentView] = useState<ViewType>('home');
  const [loading, setLoading] = useState(true);
  // Profil tugmasi bosilgan sonini sanaymiz. Ilgari bu `boolean` edi va har
  // bosishda teskarisiga o'zgarardi — natijada nishonlar oynasi faqat
  // BIR BOSISHDA OCHILIB, keyingisida ochilmasdi. Sanoq esa har doim
  // o'sadi, ya'ni har bosish yangi hodisa.
  const [profileOpenCount, setProfileOpenCount] = useState(0);

  useEffect(() => {
    // Eski loyihaning to'xtatilgan holati qolgan bo'lsa, tozalaymiz
    localStorage.removeItem('firebase_suspended');
    resetServiceStatus();

    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const dbUser = await DB.getUser(firebaseUser.uid);
        if (dbUser) {
          setUser(dbUser);
        } else {
          // Agar baza foydalanuvchi bo'lmasa, lekin auth bo'lsa, demak hali rol tanlanmagan
          setPendingUser({
            uid: firebaseUser.uid,
            // Anonim (demo) sessiyada ism bo'lmaydi.
            name: firebaseUser.displayName || (firebaseUser.isAnonymous ? "Demo foydalanuvchi" : "Mehmon"),
            email: firebaseUser.email || "",
            picture: firebaseUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${firebaseUser.uid}`,
            // Demo rejimini shu belgi aniqlaydi: LoginScreen taklif kodini
            // so'ramaydi, dbService esa ma'lumotni mahalliy saqlaydi.
            isAnonymous: firebaseUser.isAnonymous,
          });
        }
      } else {
        setUser(null);
        setPendingUser(null);
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleAuthenticated = (payload: any) => {
    setPendingUser(payload);
  };

  const handleRoleSelect = async (role: UserRole, teacherCode?: string) => {
    if (!pendingUser) return;

    // DEMO: shaxs o'zgarmas bo'ladi.
    //
    // Anonim sessiya har kirishda yangi uid beradi, rol almashtirish uchun
    // esa chiqib qaytadan kirish kerak. Shuning uchun uid'ni ishlatsak demo
    // ustoz demo o'quvchining topshirig'ini KO'RMAYDI: panel
    // `{ teacherId: user.id }` so'raydi, topshiriqda esa vazifa egasi
    // (`DEMO_TASK.teacherId` = 'demo') yozilgan va ular hech qachon mos
    // kelmaydi. Barqaror `'demo'` ikki tomonni bir-biriga bog'laydi.
    //
    // Haqiqiy hisobda hech narsa o'zgarmaydi — o'z uid'i qoladi.
    const userData: User = {
      id: resolveUserId(pendingUser.uid, pendingUser.isAnonymous === true),
      name: pendingUser.name || "Foydalanuvchi",
      email: pendingUser.email || "",
      role: role,
      avatar: pendingUser.picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${pendingUser.uid}`,
      badges: [],
      ...(role === 'teacher' && teacherCode ? { teacherCode: teacherCode.trim() } : {})
    };

    await DB.setUser(userData);
    setUser(userData);
    setPendingUser(null);
    setCurrentView('home');
  };

  const handleLogout = async () => {
    // Demo belgisini tozalaymiz, aks holda chiqqandan keyin ham
    // `apiClient` anonim sessiyani qayta tiklab turardi.
    clearDemoSession();
    if (auth) {
      await signOut(auth);
    }
    setUser(null);
    setPendingUser(null);
    setCurrentView('home');
  };

  const handleNavigate = (view: ViewType) => {
    setCurrentView(view);
  };

  const handleUserUpdate = async (updatedUser: User) => {
    try {
      await DB.setUser(updatedUser);
    } catch (err) {
      // Profil yangilanishi muvaffaqiyatsiz bo'lsa ham interfeys ishlashda
      // davom etsin. Ro'yxatdan o'tish xatosi esa LoginScreen'da ko'rsatiladi.
      console.error("Foydalanuvchi profilini saqlab bo'lmadi:", err);
    }
    setUser(updatedUser);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <LoginScreen 
        onAuthenticated={handleAuthenticated} 
        onRoleSelect={handleRoleSelect}
        pendingUser={pendingUser} 
      />
    );
  }

  return (
    <Layout 
      user={user} 
      currentView={currentView} 
      onLogout={handleLogout} 
      onNavigate={handleNavigate}
      onOpenProfile={() => setProfileOpenCount(prev => prev + 1)}
    >
      {/*
        Ilgari kalit `refreshKey + user.id + currentView` edi. `refreshKey`
        har navigatsiyada o'sardi, ya'ni panel HAR MARTA noldan qayta
        yaratilardi: Firestore kuzatuvchilari uzilib qayta ulanardi, ochilgan
        ish yo'qolardi, yarim yozilgan narsa o'chib ketardi. Hatto shu
        bo'limning o'ziga qayta bosish ham shunday qilardi.

        Endi kalit faqat foydalanuvchi almashganda o'zgaradi — bo'limlar
        orasida o'tish holatni saqlab qoladi. Bo'lim o'zgarishini `view`
        propi orqali paneldagi komponentlar o'zi hal qiladi.
      */}
      <div key={user.id} className="animate-in fade-in duration-500">
        {user.role === 'teacher' ? (
          <TeacherDashboard user={user} view={currentView} onUserUpdate={handleUserUpdate} />
        ) : (
          <StudentDashboard 
            user={user} 
            view={currentView} 
            onUserUpdate={handleUserUpdate}
            openProfileSignal={profileOpenCount}
          />
        )}
      </div>
    </Layout>
  );
}
