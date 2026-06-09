
import React, { useState, useEffect } from 'react';
import { User, DictationTask, Submission, ViewType } from '../types';
import { DB } from '../services/dbService';
import { DictationWorker } from './DictationWorker';
import { ResultView } from './ResultView';
import { ResourceLibrary } from './ResourceLibrary';
import { GamesHub } from './GamesHub';
import { FileCode, PenTool, BookOpen } from 'lucide-react';

interface Props {
  user: User;
  view?: ViewType;
  onUserUpdate?: (user: User) => void;
}

export const StudentDashboard: React.FC<Props> = ({ user, view = 'home', onUserUpdate }) => {
  const [tasks, setTasks] = useState<DictationTask[]>([]);
  const [subs, setSubs] = useState<Submission[]>([]);
  const [activeTask, setActiveTask] = useState<DictationTask | null>(null);
  const [viewResult, setViewResult] = useState<Submission | null>(null);

  useEffect(() => {
    const unsubTasks = DB.subscribeToTasks(setTasks);
    const unsubSubs = DB.subscribeToSubmissions(setSubs, user.id);

    return () => {
      unsubTasks();
      unsubSubs();
    };
  }, [user.id]);

  const handleSubmitted = () => {
    setActiveTask(null);
  };

  const pendingTasks = tasks.filter(t => !subs.find(s => s.taskId === t.id));
  const completedSubs = subs.filter(s => s.status === 'approved');

  // HOME VIEW
  if (view === 'home') {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Salom, {user.name.split(' ')[0]}! 👋</h2>
            <p className="text-slate-500 font-medium mt-1">Bugun qaysi vazifani bajaramiz?</p>
          </div>
          <div className="flex space-x-3">
             {user.badges && user.badges.length > 0 && (
               <div className="bg-amber-50 px-5 py-3 rounded-2xl border border-amber-100 shadow-sm flex items-center space-x-3">
                  <span className="text-2xl">🏆</span>
                  <div className="flex flex-col">
                    <span className="text-xl font-black text-amber-600">{user.badges.length}</span>
                    <span className="text-[8px] font-black text-amber-400 uppercase tracking-widest leading-none">Mukofotlar</span>
                  </div>
               </div>
             )}
             <div className="bg-white px-5 py-3 rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-3">
                <span className="text-2xl font-black text-indigo-600">{subs.length}</span>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Topshirildi</span>
             </div>
             <div className="bg-white px-5 py-3 rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-3">
                <span className="text-2xl font-black text-emerald-500">
                  {completedSubs.length ? (completedSubs.reduce((acc, s) => acc + (s.teacherCorrection?.grade || s.ttResult.grade), 0) / completedSubs.length).toFixed(1) : '0'}
                </span>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">O'rtacha</span>
             </div>
          </div>
        </div>

        <section className="space-y-4">
          <div className="flex items-center space-x-3 ml-1">
             <div className="w-1.5 h-6 bg-indigo-600 rounded-full"></div>
             <h3 className="text-lg font-black text-slate-800 uppercase tracking-wider">Yangi vazifalar ({pendingTasks.length})</h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingTasks.map(t => (
              <div 
                key={t.id} 
                className="group bg-white p-6 rounded-[2rem] border-2 border-slate-100 hover:border-indigo-600 transition-all shadow-sm hover:shadow-xl hover:shadow-indigo-50 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      t.type === 'coding' ? 'bg-indigo-50 text-indigo-600' : 
                      t.type === 'dictation' ? 'bg-rose-50 text-rose-600' : 
                      'bg-emerald-50 text-emerald-600'
                    }`}>
                      {t.type === 'coding' ? <FileCode className="w-5 h-5" /> : 
                       t.type === 'dictation' ? <PenTool className="w-5 h-5" /> : 
                       <BookOpen className="w-5 h-5" />}
                    </div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{new Date(t.createdAt).toLocaleDateString()}</span>
                  </div>
                  <h4 className="font-black text-lg text-slate-800 line-clamp-1 mb-1">{t.title}</h4>
                  <p className="text-xs text-slate-400 font-medium line-clamp-2 italic">"{t.content}"</p>
                </div>
                <button 
                  onClick={() => setActiveTask(t)}
                  className="mt-6 w-full py-3 bg-indigo-600 text-white rounded-xl font-black text-sm shadow-lg shadow-indigo-100 group-hover:bg-indigo-700 transition-all"
                >
                  Boshlash
                </button>
              </div>
            ))}
            {pendingTasks.length === 0 && (
              <div className="col-span-full py-12 px-6 bg-slate-100/50 rounded-[2.5rem] border-2 border-dashed border-slate-200 text-center">
                <p className="text-slate-400 font-bold italic">Hozircha yangi vazifalar yo'q. Dam oling! 🌟</p>
              </div>
            )}
          </div>
        </section>

        {subs.length > 0 && (
          <section className="space-y-4 pt-4">
            <div className="flex items-center space-x-3 ml-1">
               <div className="w-1.5 h-6 bg-emerald-500 rounded-full"></div>
               <h3 className="text-lg font-black text-slate-800 uppercase tracking-wider">Topshirilganlar ({subs.length})</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {subs.slice(0, 4).map(s => {
                const task = tasks.find(t => t.id === s.taskId);
                const isApproved = s.status === 'approved';
                const grade = s.teacherCorrection?.grade || s.ttResult?.grade || 0;
                return (
                  <button 
                    key={s.id}
                    onClick={() => setViewResult(s)}
                    className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center space-x-3 hover:border-emerald-500 transition-all text-left group"
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isApproved ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                      {isApproved ? (
                        <span className="font-black text-lg">{grade}</span>
                      ) : (
                        <svg className="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 8v4l3 3" /></svg>
                      )}
                    </div>
                    <div className="overflow-hidden">
                      <p className="font-bold text-slate-800 text-sm truncate group-hover:text-emerald-600 transition-colors">{task?.title || 'Vazifa'}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">{isApproved ? 'Tasdiqlangan' : 'Teach Tracker Tahlili'}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {activeTask && <DictationWorker task={activeTask} user={user} onCancel={() => setActiveTask(null)} onSubmitted={handleSubmitted} onUserUpdate={onUserUpdate} />}
        {viewResult && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[200] overflow-y-auto p-4 py-12 flex justify-center">
            <div className="max-w-5xl w-full relative animate-in zoom-in-95 duration-300">
              <div className="absolute -top-16 left-0 right-0 flex justify-between items-center text-white px-4">
                <h3 className="text-xl font-black uppercase tracking-widest">Natija tafsilotlari</h3>
                <button onClick={() => setViewResult(null)} className="p-3 bg-white/10 rounded-xl hover:bg-white/20 transition-colors">Yopish</button>
              </div>
              <ResultView result={viewResult.teacherCorrection || viewResult.ttResult} images={viewResult.images} files={viewResult.files} />
            </div>
          </div>
        )}
      </div>
    );
  }
  if (view === 'tasks') {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <h2 className="text-3xl font-black text-slate-900">Barcha vazifalar</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tasks.map(t => {
            const hasSubmitted = subs.some(s => s.taskId === t.id);
            return (
              <div key={t.id} className={`p-6 rounded-[2.5rem] border-2 transition-all shadow-sm ${hasSubmitted ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-white border-white hover:border-indigo-600 hover:shadow-lg'}`}>
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-3 rounded-xl ${
                    hasSubmitted ? 'bg-slate-200 text-slate-400' : 
                    t.type === 'coding' ? 'bg-indigo-100 text-indigo-600' : 
                    t.type === 'dictation' ? 'bg-rose-100 text-rose-600' : 
                    'bg-emerald-100 text-emerald-600'
                  }`}>
                    {t.type === 'coding' ? <FileCode className="w-5 h-5" /> : 
                     t.type === 'dictation' ? <PenTool className="w-5 h-5" /> : 
                     <BookOpen className="w-5 h-5" />}
                  </div>
                  {hasSubmitted && <span className="bg-emerald-100 text-emerald-600 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider">Bajarilgan</span>}
                </div>
                <h4 className="font-black text-lg text-slate-800 mb-1">{t.title}</h4>
                <p className="text-xs text-slate-400 font-medium line-clamp-2 italic mb-6">"{t.content}"</p>
                {!hasSubmitted && (
                  <button 
                    onClick={() => setActiveTask(t)}
                    className="w-full py-3 bg-indigo-600 text-white rounded-xl font-black text-sm hover:bg-indigo-700 transition-all"
                  >
                    Boshlash
                  </button>
                )}
              </div>
            );
          })}
        </div>
        {activeTask && <DictationWorker task={activeTask} user={user} onCancel={() => setActiveTask(null)} onSubmitted={handleSubmitted} onUserUpdate={onUserUpdate} />}
      </div>
    );
  }

  if (view === 'results') {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <h2 className="text-3xl font-black text-slate-900">Mening natijalarim</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {subs.map(s => {
            const task = tasks.find(t => t.id === s.taskId);
            const isApproved = s.status === 'approved';
            const grade = s.teacherCorrection?.grade || s.ttResult?.grade || 0;
            return (
              <div key={s.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 flex items-center justify-between group">
                <div className="flex items-center space-x-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl ${isApproved ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                    {isApproved ? grade : '?'}
                  </div>
                  <div>
                    <h4 className="font-black text-slate-800">{task?.title || 'Diktant'}</h4>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{new Date(s.submittedAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setViewResult(s)} 
                  className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (view === 'library') return <ResourceLibrary />;
  if (view === 'games') return <GamesHub />;
  if (view === 'ai-assistant') {
    return (
      <div className="text-center py-20 space-y-6">
        <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mx-auto">
          <svg className="w-12 h-12 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
        </div>
        <h3 className="text-2xl font-black text-slate-900">Faqat Ustozlar uchun</h3>
        <p className="text-slate-500 font-medium max-w-sm mx-auto">AI Yordamchi vositasi faqat o'qituvchilar uchun dars materiallarini yaratishga mo'ljallangan.</p>
      </div>
    );
  }

  return null;
};
