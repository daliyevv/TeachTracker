
import React, { useState, useEffect } from 'react';
import { User, DictationTask, Submission, ViewType } from '../types';
import { DB } from '../services/dbService';
import {
  TaskCreator,
  SubmissionReviewer,
  ManualChecker,
  AIAssistant,
  ResourceLibrary,
  GamesHub,
  Pricing,
} from './lazy';

interface Props {
  user: User;
  view?: ViewType;
  onUserUpdate?: (user: User) => void;
}

export const TeacherDashboard: React.FC<Props> = ({ user, view = 'home', onUserUpdate }) => {
  const [tasks, setTasks] = useState<DictationTask[]>([]);
  const [subs, setSubs] = useState<Submission[]>([]);
  const [showCreator, setShowCreator] = useState(false);
  const [activeSub, setActiveSub] = useState<Submission | null>(null);
  const [manualCheckTask, setManualCheckTask] = useState<DictationTask | null>(null);
  const [editingTask, setEditingTask] = useState<DictationTask | null>(null);
  const [showPricing, setShowPricing] = useState(false);

  const refreshData = async () => {
    const updatedSubs = await DB.getSubmissions({ teacherId: user.id });
    setSubs(updatedSubs);
  };

  /**
   * Bo'lim o'zgarganda ochiq oynalarni yopamiz. Ilgari buni App.tsx dagi
   * `key` qilardi, lekin u butun panelni qayta yaratar va Firestore
   * kuzatuvchilarini ham uzib qo'yardi.
   */
  useEffect(() => {
    setActiveSub(null);
    setManualCheckTask(null);
    setEditingTask(null);
    setShowCreator(false);
    setShowPricing(false);
  }, [view]);

  useEffect(() => {
    const unsubTasks = DB.subscribeToTasks(setTasks);
    const unsubSubs = DB.subscribeToSubmissions(setSubs, { teacherId: user.id });

    // Stripe success check
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('session_id')) {
      // Haqiqiy ilovada bu yerda serverdan status tekshiriladi
      // Hozircha demo uchun foydalanuvchini Pro deb belgilaymiz
      if (!user.isPro) {
        const updatedUser = { ...user, isPro: true, subscriptionStatus: 'active' as const };
        DB.updateUser(user.id, { isPro: true, subscriptionStatus: 'active' });
        if (onUserUpdate) onUserUpdate(updatedUser);
        alert("Tabriklaymiz! Siz muvaffaqiyatli Pro tarifiga o'tdingiz.");
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }

    return () => {
      unsubTasks();
      unsubSubs();
    };
  }, [user.id]);

  const handleCreateTask = async (data: Partial<DictationTask>) => {
    try {
      if (editingTask) {
        await DB.updateTask(editingTask.id, {
          title: data.title,
          content: data.content,
          minPlaybackSpeed: data.minPlaybackSpeed
        });
      } else {
        const newTask: Omit<DictationTask, "id"> = {
          teacherId: user.id,
          title: data.title!,
          content: data.content!,
          minPlaybackSpeed: data.minPlaybackSpeed || 1.0,
          status: 'published',
          createdAt: Date.now()
        };
        await DB.addTask(newTask);
      }
    } catch (error) {
      console.error("Error saving task:", error);
    } finally {
      setShowCreator(false);
      setEditingTask(null);
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (window.confirm("Haqiqatan ham bu vazifani o'chirmoqchimisiz?")) {
      try {
        await DB.deleteTask(id);
      } catch (error) {
        console.error("Error deleting task:", error);
      }
    }
  };

  const pendingSubs = subs.filter(s => s.status === 'pending' || s.status === 'reviewing');
  const approvedSubs = subs.filter(s => s.status === 'approved');

  // HOME VIEW
  if (view === 'home') {
    return (
      <div className="space-y-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-3xl font-black text-slate-900">Xush kelibsiz, Ustoz!</h2>
              <p className="text-slate-500 font-medium">Bugungi ko'rsatkichlar va faollik.</p>
            </div>
            {user.isPro ? (
              <span className="bg-indigo-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                Pro
              </span>
            ) : (
              <button 
                onClick={() => setShowPricing(true)}
                className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider hover:bg-amber-200 transition-colors"
              >
                Upgrade to Pro
              </button>
            )}
          </div>
          <button 
            onClick={() => setShowCreator(true)}
            className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
            <span>Yangi vazifa</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          <div className="bg-white p-5 sm:p-8 rounded-3xl border border-slate-100 shadow-xs">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Jami vazifalar</p>
            <p className="text-3xl sm:text-4xl font-black text-indigo-600">{tasks.length}</p>
          </div>
          <div className="bg-white p-5 sm:p-8 rounded-3xl border border-slate-100 shadow-xs">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tekshiruvda</p>
            <p className="text-3xl sm:text-4xl font-black text-rose-500">{pendingSubs.length}</p>
          </div>
          <div className="bg-white p-5 sm:p-8 rounded-3xl border border-slate-100 shadow-xs">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Bajarildi</p>
            <p className="text-3xl sm:text-4xl font-black text-emerald-500">{approvedSubs.length}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-6">
             <h3 className="text-xl font-bold text-slate-800 flex items-center space-x-2">
               <span className="w-2 h-8 bg-indigo-600 rounded-full" />
               <span>So'nggi vazifalar</span>
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {tasks.slice(0, 4).map(t => (
                 <button 
                   key={t.id} 
                   onClick={() => { setEditingTask(t); setShowCreator(true); }}
                   className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:border-indigo-600 transition-all text-left group"
                 >
                   <div className="flex justify-between items-start mb-2">
                     <h4 className="font-bold text-lg text-slate-800 group-hover:text-indigo-600 transition-colors">{t.title}</h4>
                     <svg className="w-5 h-5 text-slate-300 group-hover:text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                   </div>
                   <div className="flex items-center justify-between">
                     <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase rounded-lg">Faol</span>
                     <span className="text-xs text-slate-400 font-medium">{new Date(t.createdAt).toLocaleDateString()}</span>
                   </div>
                 </button>
               ))}
             </div>
          </div>

          <div className="space-y-6">
             <h3 className="text-xl font-bold text-slate-800 flex items-center space-x-2">
               <span className="w-2 h-8 bg-rose-500 rounded-full" />
               <span>Kutilayotgan ishlar</span>
             </h3>
             <div className="space-y-4">
               {pendingSubs.slice(0, 5).map(s => (
                 <button 
                   key={s.id} 
                   onClick={() => setActiveSub(s)}
                   className="w-full bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:border-indigo-600 transition-all text-left flex items-center space-x-4"
                 >
                   <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                      <img src={s.studentName ? `https://api.dicebear.com/7.x/initials/svg?seed=${s.studentName}` : `https://api.dicebear.com/7.x/avataaars/svg?seed=${s.studentId}`} className="w-8 h-8" />
                   </div>
                   <div className="flex-grow">
                     <p className="font-bold text-slate-800 text-xs">{s.studentName || `O'quvchi: ${s.studentId.substr(0,8)}`}</p>
                     <p className="text-[10px] text-slate-400">Task: {tasks.find(t => t.id === s.taskId)?.title}</p>
                   </div>
                 </button>
               ))}
             </div>
          </div>
        </div>

        {showCreator && (
          <TaskCreator 
            task={editingTask}
            onCancel={() => { setShowCreator(false); setEditingTask(null); }} 
            onCreate={handleCreateTask} 
          />
        )}
        {activeSub && <SubmissionReviewer sub={activeSub} onClose={() => { setActiveSub(null); refreshData(); }} />}
        {showPricing && <Pricing user={user} onClose={() => setShowPricing(false)} onUserUpdate={onUserUpdate} />}
      </div>
    );
  }

  // TASKS VIEW
  if (view === 'tasks') {
    return (
      <div className="space-y-6 sm:space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Barcha vazifalar</h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">O'quvchilar uchun yaratilgan barcha topshiriqlar</p>
          </div>
          <button 
            onClick={() => setShowCreator(true)} 
            className="w-full sm:w-auto px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-md shadow-indigo-100 flex items-center justify-center space-x-2 transition-all min-h-[44px]"
          >
            <span>+ Yangi vazifa</span>
          </button>
        </div>

        {/* Mobile View: Cards */}
        <div className="lg:hidden space-y-3">
          {tasks.map(t => (
            <div key={t.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="font-black text-slate-900 text-base leading-snug">{t.title}</h4>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                    <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                    <span>·</span>
                    <span className="font-bold text-slate-600">{subs.filter(s => s.taskId === t.id).length} ta o'quvchi</span>
                  </div>
                </div>
                <span className="shrink-0 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase rounded-lg">
                  Faol
                </span>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-50">
                <button 
                  onClick={() => setManualCheckTask(t)}
                  className="flex-1 py-2.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl font-bold text-xs transition-colors text-center min-h-[40px] flex items-center justify-center"
                >
                  Qo'lda tekshirish
                </button>
                <button 
                  onClick={() => { setEditingTask(t); setShowCreator(true); }}
                  className="p-2.5 bg-slate-50 text-slate-600 hover:bg-amber-50 hover:text-amber-600 rounded-xl transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
                  title="Tahrirlash"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                </button>
                <button 
                  onClick={() => handleDeleteTask(t.id)}
                  className="p-2.5 bg-slate-50 text-slate-600 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
                  title="O'chirish"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </div>
          ))}
          {tasks.length === 0 && (
            <div className="py-12 bg-white rounded-3xl border border-dashed border-slate-200 text-center text-slate-400 p-6">
              Hali hech qanday vazifa yaratilmagan.
            </div>
          )}
        </div>

        {/* Desktop View: Table with horizontal scroll container */}
        <div className="hidden lg:block bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[700px]">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase">Mavzu</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase">Yaratilgan sana</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase">Topshiriqlar</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase">Holat</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase text-right">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tasks.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-8 py-5 font-bold text-slate-800">{t.title}</td>
                    <td className="px-8 py-5 text-sm text-slate-500">{new Date(t.createdAt).toLocaleDateString()}</td>
                    <td className="px-8 py-5 text-sm text-slate-500">{subs.filter(s => s.taskId === t.id).length} ta o'quvchi</td>
                    <td className="px-8 py-5">
                      <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase rounded-lg">E'lon qilingan</span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button 
                          onClick={() => setManualCheckTask(t)}
                          className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-bold text-xs hover:bg-indigo-600 hover:text-white transition-all"
                        >
                          Qo'lda tekshirish
                        </button>
                        <button 
                          onClick={() => { setEditingTask(t); setShowCreator(true); }}
                          className="p-2 bg-slate-50 text-slate-600 rounded-xl hover:bg-amber-50 hover:text-amber-600 transition-all"
                          title="Tahrirlash"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>
                        <button 
                          onClick={() => handleDeleteTask(t.id)}
                          className="p-2 bg-slate-50 text-slate-600 rounded-xl hover:bg-rose-50 hover:text-rose-600 transition-all"
                          title="O'chirish"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {showCreator && (
          <TaskCreator 
            task={editingTask}
            onCancel={() => { setShowCreator(false); setEditingTask(null); }} 
            onCreate={handleCreateTask} 
          />
        )}
        {manualCheckTask && (
          <ManualChecker 
            task={manualCheckTask} 
            user={user} 
            onCancel={() => setManualCheckTask(null)} 
            onSubmitted={() => { setManualCheckTask(null); refreshData(); }} 
          />
        )}
      </div>
    );
  }

  // RESULTS VIEW
  if (view === 'results') {
    return (
      <div className="space-y-6 sm:space-y-8">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">O'zlashtirish natijalari</h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">Barcha topshirilgan va tekshirilgan ishlar</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-6 bg-white rounded-3xl border border-slate-100 shadow-xs">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">O'rtacha baho</p>
             <p className="text-3xl font-black text-indigo-600">
               {approvedSubs.length ? (approvedSubs.reduce((acc, s) => acc + (s.teacherCorrection?.grade || s.ttResult?.grade || 0), 0) / approvedSubs.length).toFixed(1) : '0'}
             </p>
          </div>
          <div className="p-6 bg-white rounded-3xl border border-slate-100 shadow-xs">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tekshirilgan ishlar</p>
             <p className="text-3xl font-black text-emerald-600">{approvedSubs.length}</p>
          </div>
          <div className="p-6 bg-white rounded-3xl border border-slate-100 shadow-xs">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Kutilayotganlar</p>
             <p className="text-3xl font-black text-rose-500">{pendingSubs.length}</p>
          </div>
        </div>
        
        <div className="bg-white rounded-3xl sm:rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-xs">
          <div className="p-5 sm:p-6 border-b border-slate-100">
            <h4 className="font-bold text-slate-800 text-sm sm:text-base">Tasdiqlangan ishlar ro'yxati</h4>
          </div>
          <div className="divide-y divide-slate-100">
            {approvedSubs.map(s => {
              const task = tasks.find(t => t.id === s.taskId);
              const result = s.teacherCorrection || s.ttResult;
              return (
                <div key={s.id} className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center space-x-3 sm:space-x-4">
                    <img 
                      src={s.studentName ? `https://api.dicebear.com/7.x/initials/svg?seed=${s.studentName}` : `https://api.dicebear.com/7.x/avataaars/svg?seed=${s.studentId}`} 
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-slate-50 border border-slate-100" 
                      alt="" 
                    />
                    <div>
                      <p className="font-bold text-slate-800 text-sm sm:text-base">{s.studentName || `O'quvchi: ${s.studentId.substr(0,10)}`}</p>
                      <p className="text-xs text-slate-400 font-medium">{task?.title || "Diktant"}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-6 sm:gap-8 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-50">
                    <div className="text-center sm:text-right">
                      <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Baho</p>
                      <p className="text-lg sm:text-xl font-black text-emerald-600">{result?.grade || 0}</p>
                    </div>
                    <div className="text-center sm:text-right">
                      <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Xatolar</p>
                      <p className="text-lg sm:text-xl font-black text-rose-500">{result?.mistakes?.length || 0}</p>
                    </div>
                    <button 
                      onClick={() => setActiveSub(s)} 
                      className="px-4 py-2 bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white rounded-xl font-bold text-xs transition-all min-h-[36px]"
                    >
                      Ko'rish
                    </button>
                  </div>
                </div>
              );
            })}
            {approvedSubs.length === 0 && (
              <div className="p-10 text-center text-slate-400 font-medium text-sm">Hali hech qanday natijalar yo'q.</div>
            )}
          </div>
        </div>
        {activeSub && <SubmissionReviewer sub={activeSub} onClose={() => { setActiveSub(null); refreshData(); }} />}
      </div>
    );
  }

  if (view === 'ai-assistant') return <AIAssistant user={user} />;
  if (view === 'library') return <ResourceLibrary />;
  if (view === 'games') return <GamesHub />;

  return null;
};
