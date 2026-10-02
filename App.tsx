
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
  const [openBadgesDirectly, setOpenBadgesDirectly] = useState(false);

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
    };
  }, []);

  const handleAuthenticated = (payload: any) => {
    setPendingUser(payload);
  };

  const handleRoleSelect = async (role: UserRole) => {
    if (!pendingUser) return;

    const userData: User = {
      id: pendingUser.uid,
      name: pendingUser.name || "Foydalanuvchi",
      email: pendingUser.email || "",
      role: role,
      avatar: pendingUser.picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${pendingUser.uid}`,
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
      onOpenProfile={() => setOpenBadgesDirectly(prev => !prev)}
    >
      <div key={refreshKey + user.id + currentView} className="animate-in fade-in duration-500">
        {user.role === 'teacher' ? (
          <TeacherDashboard user={user} view={currentView} onUserUpdate={handleUserUpdate} />
        ) : (
          <StudentDashboard 
            user={user} 
            view={currentView} 
            onUserUpdate={handleUserUpdate}
            openBadgesDirectly={openBadgesDirectly}
          />
        )}
      </div>
    </Layout>
  );
}
