
import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { User, UserRole, ViewType } from './types';
import { DB } from './services/mockDB';
import { TeacherDashboard } from './components/TeacherDashboard';
import { StudentDashboard } from './components/StudentDashboard';
import { LoginScreen } from './components/LoginScreen';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [pendingGoogleUser, setPendingGoogleUser] = useState<any | null>(null);
  const [currentView, setCurrentView] = useState<ViewType>('home');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const savedUser = DB.getUser();
    if (savedUser) setUser(savedUser);
  }, []);

  const handleGoogleAuthenticated = (payload: any) => {
    setPendingGoogleUser(payload);
  };

  const handleRoleSelect = (role: UserRole) => {
    if (!pendingGoogleUser) return;

    const isDemo = pendingGoogleUser.sub === "demo_shared_user_id";
    const finalId = isDemo ? `demo_${role}_id` : pendingGoogleUser.sub;

    const userData: User = {
      id: finalId,
      name: isDemo ? (role === 'teacher' ? "Mehmon Ustoz" : "Mehmon O'quvchi") : pendingGoogleUser.name,
      email: pendingGoogleUser.email,
      role: role,
      avatar: pendingGoogleUser.picture
    };

    const allUsers = JSON.parse(localStorage.getItem('teachtracker_all_users') || '[]');
    const otherUsers = allUsers.filter((u: User) => u.id !== userData.id);
    localStorage.setItem('teachtracker_all_users', JSON.stringify([...otherUsers, userData]));

    DB.setUser(userData);
    setUser(userData);
    setPendingGoogleUser(null);
    setCurrentView('home');
  };

  const handleLogout = () => {
    DB.setUser(null);
    setUser(null);
    setPendingGoogleUser(null);
    setCurrentView('home');
  };

  const handleNavigate = (view: ViewType) => {
    setCurrentView(view);
    setRefreshKey(prev => prev + 1);
  };

  if (!user) {
    return (
      <LoginScreen 
        onAuthenticated={handleGoogleAuthenticated} 
        onRoleSelect={handleRoleSelect}
        pendingUser={pendingGoogleUser} 
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
      <div key={refreshKey + user.id + currentView} className="animate-in fade-in duration-500">
        {user.role === 'teacher' ? (
          <TeacherDashboard user={user} view={currentView} />
        ) : (
          <StudentDashboard user={user} view={currentView} />
        )}
      </div>
    </Layout>
  );
}
