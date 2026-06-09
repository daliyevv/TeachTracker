
import React, { useState, useEffect } from 'react';
import { User, DictationTask, Submission, ViewType } from '../types';
import { DB } from '../services/dbService';
import { TaskCreator } from './TaskCreator';
import { SubmissionReviewer } from './SubmissionReviewer';
import { ManualChecker } from './ManualChecker';
import { AIAssistant } from './AIAssistant';
import { ResourceLibrary } from './ResourceLibrary';
import { GamesHub } from './GamesHub';
import Pricing from './Pricing';

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
    const updatedSubs = await DB.getSubmissions();
    setSubs(updatedSubs);
  };

  useEffect(() => {
    const unsubTasks = DB.subscribeToTasks(setTasks);
    const unsubSubs = DB.subscribeToSubmissions(setSubs);

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
  }, [user]);

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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Jami vazifalar</p>
            <p className="text-4xl font-black text-indigo-600">{tasks.length}</p>
          </div>
          <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tekshiruvda</p>
            <p className="text-4xl font-black text-rose-500">{pendingSubs.length}</p>
          </div>
          <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Bajarildi</p>
            <p className="text-4xl font-black text-emerald-500">{approvedSubs.length}</p>
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
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-black text-slate-900">Barcha vazifalar</h2>
          <button onClick={() => setShowCreator(true)} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold">+ Yangi</button>
        </div>
        <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden">
          <table className="w-full text-left">
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
                <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-8 py-6 font-bold text-slate-800">{t.title}</td>
                  <td className="px-8 py-6 text-sm text-slate-500">{new Date(t.createdAt).toLocaleDateString()}</td>
                  <td className="px-8 py-6 text-sm text-slate-500">{subs.filter(s => s.taskId === t.id).length} ta o'quvchi</td>
                  <td className="px-8 py-6">
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase rounded-lg">E'lon qilingan</span>
                  </td>
                  <td className="px-8 py-6 text-right">
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
      <div className="space-y-8">
        <h2 className="text-3xl font-black text-slate-900">O'zlashtirish natijalari</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm">
             <p className="text-[10px] font-black text-slate-400 uppercase mb-2">O'rtacha baho</p>
             <p className="text-3xl font-black text-indigo-600">
               {approvedSubs.length ? (approvedSubs.reduce((acc, s) => acc + (s.teacherCorrection?.grade || s.ttResult?.grade || 0), 0) / approvedSubs.length).toFixed(1) : '0'}
             </p>
          </div>
          {/* Qo'shimcha statistika bloklari qo'shish mumkin */}
        </div>
        
        <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h4 className="font-bold text-slate-800">Tasdiqlangan ishlar ro'yxati</h4>
          </div>
          <div className="divide-y divide-slate-100">
            {approvedSubs.map(s => {
              const task = tasks.find(t => t.id === s.taskId);
              const result = s.teacherCorrection || s.ttResult;
              return (
                <div key={s.id} className="p-6 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <img src={s.studentName ? `https://api.dicebear.com/7.x/initials/svg?seed=${s.studentName}` : `https://api.dicebear.com/7.x/avataaars/svg?seed=${s.studentId}`} className="w-10 h-10 rounded-full" />
                    <div>
                      <p className="font-bold text-slate-800">{s.studentName || `O'quvchi ID: ${s.studentId.substr(0,10)}`}</p>
                      <p className="text-xs text-slate-400">{task?.title}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-12">
                    <div className="text-center">
                      <p className="text-[10px] font-black text-slate-400 uppercase">Baho</p>
                      <p className="text-xl font-black text-emerald-600">{result.grade}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-black text-slate-400 uppercase">Xatolar</p>
                      <p className="text-xl font-black text-rose-500">{result.mistakes.length}</p>
                    </div>
                    <button onClick={() => setActiveSub(s)} className="text-indigo-600 font-bold hover:underline">Ko'rish</button>
                  </div>
                </div>
              );
            })}
            {approvedSubs.length === 0 && (
              <div className="p-10 text-center text-slate-400">Hali hech qanday natijalar yo'q.</div>
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
