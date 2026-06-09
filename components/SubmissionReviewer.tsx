
import React, { useState } from 'react';
import { Submission, AnalysisResult } from '../types';
import { DB } from '../services/dbService';
import { ResultView } from './ResultView';

interface Props { sub: Submission; onClose: () => void; }

export const SubmissionReviewer: React.FC<Props> = ({ sub, onClose }) => {
  const [editedResult, setEditedResult] = useState<AnalysisResult>({ ...sub.ttResult });
  const [activeTab, setActiveTab] = useState<'preview' | 'edit'>('preview');

  const handleApprove = async () => {
    const updateData: Partial<Submission> = {
      teacherCorrection: editedResult,
      status: 'approved',
      approvedAt: Date.now()
    };
    await DB.updateSubmission(sub.id, updateData);
    onClose();
  };

  const updateMistake = (idx: number, field: string, val: any) => {
    const newMistakes = [...editedResult.mistakes];
    (newMistakes[idx] as any)[field] = val;
    setEditedResult({ ...editedResult, mistakes: newMistakes });
  };

  const deleteMistake = (idx: number) => {
    const newMistakes = editedResult.mistakes.filter((_, i) => i !== idx);
    setEditedResult({ ...editedResult, mistakes: newMistakes });
  };

  const mistakes = editedResult?.mistakes || [];

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] overflow-y-auto">
      <div className="min-h-screen flex flex-col p-4 sm:p-10">
        <div className="max-w-6xl mx-auto w-full bg-white rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col flex-grow">
          <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <div>
              <h3 className="text-2xl font-black text-slate-900">Tekshiruv paneli</h3>
              <p className="text-slate-500 font-medium">Teach Tracker natijalarini tahrirlang va tasdiqlang.</p>
            </div>
            <div className="flex space-x-2 bg-white p-2 rounded-2xl border border-slate-200">
              <button 
                onClick={() => setActiveTab('preview')}
                className={`px-6 py-2 rounded-xl font-bold transition-all ${activeTab === 'preview' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Ko'rib chiqish
              </button>
              <button 
                onClick={() => setActiveTab('edit')}
                className={`px-6 py-2 rounded-xl font-bold transition-all ${activeTab === 'edit' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Tahrirlash
              </button>
            </div>
            <button onClick={onClose} className="p-4 bg-white rounded-full text-slate-400 hover:text-rose-500 transition-colors shadow-sm">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div className="flex-grow overflow-y-auto p-8">
            {activeTab === 'preview' ? (
              <ResultView result={editedResult} images={sub.images} />
            ) : (
              <div className="space-y-10 animate-in fade-in duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <label className="text-sm font-black text-slate-400 uppercase tracking-widest">Umumiy baho (0-10)</label>
                    <input 
                      type="number" 
                      min="0" 
                      max="10" 
                      value={editedResult.grade} 
                      onChange={e => setEditedResult({...editedResult, grade: Number(e.target.value)})} 
                      className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-2xl text-indigo-600" 
                    />
                  </div>
                  <div className="space-y-4">
                    <label className="text-sm font-black text-slate-400 uppercase tracking-widest">O'qituvchi fikri</label>
                    <textarea 
                      rows={3} 
                      value={editedResult.feedback} 
                      onChange={e => setEditedResult({...editedResult, feedback: e.target.value})} 
                      className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-medium outline-none focus:border-indigo-600 transition-colors" 
                    />
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h4 className="font-black text-slate-800 uppercase tracking-wider text-sm">Xatolar ro'yxati:</h4>
                    <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-3 py-1 rounded-full">{mistakes.length} ta xato</span>
                  </div>
                  
                  <div className="space-y-4">
                    {mistakes.map((m, i) => (
                      <div key={i} className="group relative p-6 bg-slate-50 rounded-3xl border border-slate-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 transition-all hover:bg-white hover:shadow-xl hover:shadow-slate-100">
                         {/* O'chirish tugmasi */}
                         <button 
                           onClick={() => deleteMistake(i)}
                           className="absolute -top-2 -right-2 w-8 h-8 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:scale-110 z-10"
                           title="Ushbu xatoni ro'yxatdan o'chirish"
                         >
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                         </button>

                         <div className="space-y-1">
                           <p className="text-[10px] font-black uppercase text-slate-400 ml-1">Asl so'z (Xato)</p>
                           <input 
                             value={m.word} 
                             onChange={e => updateMistake(i, 'word', e.target.value)} 
                             className="w-full p-3 rounded-xl border-2 border-white focus:border-rose-300 outline-none transition-all font-bold text-rose-600" 
                           />
                         </div>
                         <div className="space-y-1">
                           <p className="text-[10px] font-black uppercase text-slate-400 ml-1">To'g'ri shakli</p>
                           <input 
                             value={m.correction} 
                             onChange={e => updateMistake(i, 'correction', e.target.value)} 
                             className="w-full p-3 rounded-xl border-2 border-white focus:border-emerald-300 outline-none transition-all font-bold text-emerald-600" 
                           />
                         </div>
                         <div className="space-y-1">
                           <p className="text-[10px] font-black uppercase text-slate-400 ml-1">Izoh / Tavsiya</p>
                           <input 
                             value={m.description} 
                             onChange={e => updateMistake(i, 'description', e.target.value)} 
                             className="w-full p-3 rounded-xl border-2 border-white focus:border-indigo-300 outline-none transition-all text-sm text-slate-600" 
                           />
                         </div>
                         <div className="space-y-1">
                           <p className="text-[10px] font-black uppercase text-slate-400 ml-1">Sahifa (0-index)</p>
                           <input 
                             type="number"
                             value={m.pageIndex} 
                             onChange={e => updateMistake(i, 'pageIndex', Number(e.target.value))} 
                             className="w-full p-3 rounded-xl border-2 border-white focus:border-indigo-300 outline-none transition-all text-sm text-slate-600" 
                           />
                         </div>
                      </div>
                    ))}
                    
                    {mistakes.length === 0 && (
                      <div className="p-10 text-center bg-emerald-50 rounded-[2.5rem] border-2 border-dashed border-emerald-100">
                        <p className="text-emerald-600 font-bold">Barcha xatolar o'chirildi. Ish xatosiz deb hisoblanmoqda!</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end space-x-4">
             <button onClick={onClose} className="px-10 py-4 font-bold text-slate-500 hover:text-slate-700 transition-colors">Keyinroq</button>
             <button 
               onClick={handleApprove}
               className="px-12 py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center space-x-3"
             >
               <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
               <span>Tasdiqlash va yuborish</span>
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};
