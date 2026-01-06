
import React, { useState, useEffect } from 'react';
import { User, DictationTask, Submission, ViewType } from '../types';
import { DB } from '../services/mockDB';
import { TaskCreator } from './TaskCreator';
import { SubmissionReviewer } from './SubmissionReviewer';

interface Props {
  user: User;
  view?: ViewType;
}

export const TeacherDashboard: React.FC<Props> = ({ user, view = 'home' }) => {
  const [tasks, setTasks] = useState<DictationTask[]>(DB.getTasks());
  const [subs, setSubs] = useState<Submission[]>(DB.getSubmissions());
  const [showCreator, setShowCreator] = useState(false);
  const [activeSub, setActiveSub] = useState<Submission | null>(null);

  // Ma'lumotlarni har safar view o'zgarganda yangilab olish
  useEffect(() => {
    setTasks(DB.getTasks());
    setSubs(DB.getSubmissions());
  }, [view]);

  const handleCreateTask = (data: Partial<DictationTask>) => {
    const newTask: DictationTask = {
      id: Math.random().toString(36).substr(2, 9),
      teacherId: user.id,
      title: data.title!,
      content: data.content!,
      status: 'published',
      createdAt: Date.now()
    };
    DB.addTask(newTask);
    setTasks(DB.getTasks());
    setShowCreator(false);
  };

  const pendingSubs = subs.filter(s => s.status === 'pending' || s.status === 'reviewing');
  const approvedSubs = subs.filter(s => s.status === 'approved');

  // HOME VIEW
  if (view === 'home') {
    return (
      <div className="space-y-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-3xl font-black text-slate-900">Xush kelibsiz, Ustoz!</h2>
            <p className="text-slate-500 font-medium">Bugungi ko'rsatkichlar va faollik.</p>
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
                 <div key={t.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                   <h4 className="font-bold text-lg text-slate-800 mb-2">{t.title}</h4>
                   <div className="flex items-center justify-between">
                     <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase rounded-lg">Faol</span>
                     <span className="text-xs text-slate-400 font-medium">{new Date(t.createdAt).toLocaleDateString()}</span>
                   </div>
                 </div>
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
                      <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${s.studentId}`} className="w-8 h-8" />
                   </div>
                   <div className="flex-grow">
                     <p className="font-bold text-slate-800 text-xs">O'quvchi: {s.studentId.substr(0,8)}</p>
                     <p className="text-[10px] text-slate-400">Task: {tasks.find(t => t.id === s.taskId)?.title}</p>
                   </div>
                 </button>
               ))}
             </div>
          </div>
        </div>

        {showCreator && <TaskCreator onCancel={() => setShowCreator(false)} onCreate={handleCreateTask} />}
        {activeSub && <SubmissionReviewer sub={activeSub} onClose={() => { setActiveSub(null); setSubs(DB.getSubmissions()); }} />}
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
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase text-right">Holat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tasks.map(t => (
                <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-8 py-6 font-bold text-slate-800">{t.title}</td>
                  <td className="px-8 py-6 text-sm text-slate-500">{new Date(t.createdAt).toLocaleDateString()}</td>
                  <td className="px-8 py-6 text-sm text-slate-500">{subs.filter(s => s.taskId === t.id).length} ta o'quvchi</td>
                  <td className="px-8 py-6 text-right">
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase rounded-lg">E'lon qilingan</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {showCreator && <TaskCreator onCancel={() => setShowCreator(false)} onCreate={handleCreateTask} />}
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
               {approvedSubs.length ? (approvedSubs.reduce((acc, s) => acc + (s.teacherCorrection?.grade || s.aiResult.grade), 0) / approvedSubs.length).toFixed(1) : '0'}
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
              const result = s.teacherCorrection || s.aiResult;
              return (
                <div key={s.id} className="p-6 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${s.studentId}`} className="w-10 h-10 rounded-full" />
                    <div>
                      <p className="font-bold text-slate-800">O'quvchi ID: {s.studentId.substr(0,10)}</p>
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
        {activeSub && <SubmissionReviewer sub={activeSub} onClose={() => { setActiveSub(null); setSubs(DB.getSubmissions()); }} />}
      </div>
    );
  }

  return null;
};
