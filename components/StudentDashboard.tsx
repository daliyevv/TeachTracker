
import React, { useState, useEffect } from 'react';
import { User, DictationTask, Submission, ViewType } from '../types';
import { DB } from '../services/mockDB';
import { DictationWorker } from './DictationWorker';
import { ResultView } from './ResultView';

interface Props {
  user: User;
  view?: ViewType;
}

export const StudentDashboard: React.FC<Props> = ({ user, view = 'home' }) => {
  const [tasks, setTasks] = useState<DictationTask[]>(DB.getTasks());
  const [subs, setSubs] = useState<Submission[]>([]);
  const [activeTask, setActiveTask] = useState<DictationTask | null>(null);
  const [viewResult, setViewResult] = useState<Submission | null>(null);

  const refreshData = () => {
    const allSubs = DB.getSubmissions();
    const userSubs = allSubs.filter(s => s.studentId === user.id);
    setSubs(userSubs);
    setTasks(DB.getTasks());
  };

  useEffect(() => {
    refreshData();
  }, [user.id, view]);

  const handleSubmitted = () => {
    refreshData();
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
            <p className="text-slate-500 font-medium mt-1">Bugun qaysi diktantni yozamiz?</p>
          </div>
          <div className="flex space-x-3">
             <div className="bg-white px-5 py-3 rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-3">
                <span className="text-2xl font-black text-indigo-600">{subs.length}</span>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Topshirildi</span>
             </div>
             <div className="bg-white px-5 py-3 rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-3">
                <span className="text-2xl font-black text-emerald-500">
                  {completedSubs.length ? (completedSubs.reduce((acc, s) => acc + (s.teacherCorrection?.grade || s.aiResult.grade), 0) / completedSubs.length).toFixed(1) : '0'}
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
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
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
                const grade = s.teacherCorrection?.grade || s.aiResult.grade;
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
                      <p className="font-bold text-slate-800 text-sm truncate group-hover:text-emerald-600 transition-colors">{task?.title || 'Diktant'}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">{isApproved ? 'Tasdiqlangan' : 'AI Tahlili'}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {activeTask && <DictationWorker task={activeTask} user={user} onCancel={() => setActiveTask(null)} onSubmitted={handleSubmitted} />}
        {viewResult && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[200] overflow-y-auto p-4 py-12 flex justify-center">
            <div className="max-w-5xl w-full relative animate-in zoom-in-95 duration-300">
              <div className="absolute -top-16 left-0 right-0 flex justify-between items-center text-white px-4">
                <h3 className="text-xl font-black uppercase tracking-widest">Natija tafsilotlari</h3>
                <button onClick={() => setViewResult(null)} className="p-3 bg-white/10 rounded-xl hover:bg-white/20 transition-colors">Yopish</button>
              </div>
              <ResultView result={viewResult.teacherCorrection || viewResult.aiResult} imageSrc={viewResult.image} />
            </div>
          </div>
        )}
      </div>
    );
  }

  // Boshqa viewlar (tasks, results) uchun mavjud kodlar o'zgarishsiz qoladi yoki bir xil ixcham uslubga moslanadi
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
                  <div className={`p-3 rounded-xl ${hasSubmitted ? 'bg-slate-200 text-slate-400' : 'bg-indigo-100 text-indigo-600'}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
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
        {activeTask && <DictationWorker task={activeTask} user={user} onCancel={() => setActiveTask(null)} onSubmitted={handleSubmitted} />}
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
            const grade = s.teacherCorrection?.grade || s.aiResult.grade;
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

  return null;
};
