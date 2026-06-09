
import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { User, UserRole, ViewType } from './types';
import { DB, getServiceStatus, resetServiceStatus, setServiceDegraded } from './services/dbService';
import { auth } from './services/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { TeacherDashboard } from './components/TeacherDashboard';
import { StudentDashboard } from './components/StudentDashboard';
import { LoginScreen } from './components/LoginScreen';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [pendingUser, setPendingUser] = useState<any | null>(null);
  const [currentView, setCurrentView] = useState<ViewType>('home');
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Firebase ichki xatoliklarini (masalan, suspended API key) tutish uchun global listener
    const handleGlobalError = (event: any) => {
      const reason = event.reason?.message || event.message || "";
      if (
        reason.includes('suspended') || 
        reason.includes('permission-denied') || 
        reason.includes('installations/request-failed') ||
        reason.includes('API key has been suspended') ||
        reason.includes('403') ||
        reason.includes('PERMISSION_DENIED')
      ) {
        console.warn("Global Firebase error detected, switching to local mode:", reason);
        localStorage.setItem('firebase_suspended', 'true');
        setServiceDegraded(true);
      }
    };

    window.addEventListener('unhandledrejection', handleGlobalError);
    window.addEventListener('error', handleGlobalError);

    // Agar avvaldan suspended bo'lsa, darhol degraded rejimga o'tamiz
    if (localStorage.getItem('firebase_suspended')) {
      setServiceDegraded(true);
    }

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
            name: firebaseUser.displayName || "Mehmon",
            email: firebaseUser.email || "",
            picture: firebaseUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${firebaseUser.uid}`
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
      window.removeEventListener('unhandledrejection', handleGlobalError);
      window.removeEventListener('error', handleGlobalError);
    };
  }, []);

  const handleAuthenticated = (payload: any) => {
    setPendingUser(payload);
  };

  const handleRoleSelect = async (role: UserRole) => {
    if (!pendingUser) return;

    const userData: User = {
      id: pendingUser.uid,
      name: pendingUser.name,
      email: pendingUser.email,
      role: role,
      avatar: pendingUser.picture,
      badges: []
    };

    await DB.setUser(userData);
    setUser(userData);
    setPendingUser(null);
    setCurrentView('home');
  };

  const handleLogout = async () => {
    if (auth) {
      await signOut(auth);
    }
    setUser(null);
    setPendingUser(null);
    setCurrentView('home');
  };

  const handleNavigate = (view: ViewType) => {
    setCurrentView(view);
    setRefreshKey(prev => prev + 1);
  };

  const handleUserUpdate = async (updatedUser: User) => {
    await DB.setUser(updatedUser);
    setUser(updatedUser);
  };

  const isDegraded = getServiceStatus();

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
    >
      {isDegraded && (
        <div className="fixed bottom-4 right-4 z-50 bg-amber-500 text-white px-4 py-3 rounded-2xl text-xs font-bold shadow-2xl flex flex-col space-y-2 max-w-xs border border-amber-400">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
            <span>Mahalliy Rejim Faol</span>
          </div>
          <p className="font-normal opacity-90">
            Firebase API kaliti to'xtatilgan yoki tarmoq xatosi bor. Ilova ma'lumotlarni brauzerda saqlaydi.
          </p>
          <button 
            onClick={() => {
              resetServiceStatus();
              window.location.reload();
            }}
            className="bg-white text-amber-600 px-3 py-1 rounded-lg hover:bg-amber-50 transition-colors self-start"
          >
            Qayta urinish
          </button>
        </div>
      )}
      <div key={refreshKey + user.id + currentView} className="animate-in fade-in duration-500">
        {user.role === 'teacher' ? (
          <TeacherDashboard user={user} view={currentView} onUserUpdate={handleUserUpdate} />
        ) : (
          <StudentDashboard user={user} view={currentView} onUserUpdate={handleUserUpdate} />
        )}
      </div>
    </Layout>
  );
}
