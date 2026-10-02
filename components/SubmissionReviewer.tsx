
import React, { useState } from 'react';
import { Submission, AnalysisResult } from '../types';
import { DB } from '../services/dbService';
import { ResultView } from './ResultView';
import { MAX_GRADE, clampGrade, cloneResult } from '../services/gradingService';

interface Props { sub: Submission; onClose: () => void; }

export const SubmissionReviewer: React.FC<Props> = ({ sub, onClose }) => {
  // Ustoz ilgari tekshirgan bo'lsa, uning o'z tuzatishidan boshlaymiz.
  const [editedResult, setEditedResult] = useState<AnalysisResult>(
    () => cloneResult(sub.teacherCorrection ?? sub.ttResult)
  );
  const [activeTab, setActiveTab] = useState<'preview' | 'edit'>('preview');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleApprove = async () => {
    setSaveError(null);
    setSaving(true);
    try {
      const updateData: Partial<Submission> = {
        teacherCorrection: { ...editedResult, grade: clampGrade(editedResult.grade) },
        status: 'approved',
        approvedAt: Date.now()
      };
      await DB.updateSubmission(sub.id, updateData);
      onClose();
    } catch (err: any) {
      // Ilgari xato umuman ushlanmasdi: `await` yiqilsa ham `onClose()`
      // ishlar va ustoz ishni tasdiqlangan deb o'ylardi. Aslida esa
      // o'quvchiga hech narsa yetib bormagan bo'lardi.
      console.error("Tasdiqlashni saqlab bo'lmadi:", err);
      setSaveError(
        err?.message || "Saqlab bo'lmadi. Internet aloqangizni tekshirib, qayta urinib ko'ring."
      );
    } finally {
      setSaving(false);
    }
  };

  const updateMistake = (idx: number, field: string, val: any) => {
    setEditedResult(prev => ({
      ...prev,
      // Faqat o'zgartirilayotgan xato obyekti qayta yaratiladi — asl
      // obyektga tegilmaydi.
      mistakes: prev.mistakes.map((m, i) => (i === idx ? { ...m, [field]: val } : m)),
    }));
  };

  const deleteMistake = (idx: number) => {
    setEditedResult(prev => ({
      ...prev,
      mistakes: prev.mistakes.filter((_, i) => i !== idx),
    }));
  };

  const mistakes = editedResult?.mistakes || [];

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] overflow-y-auto">
      <div className="min-h-screen flex flex-col p-2 sm:p-6 md:p-10">
        <div className="max-w-6xl mx-auto w-full bg-white rounded-3xl sm:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col flex-grow">
          <div className="p-4 sm:p-8 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50">
            <div className="flex items-center justify-between w-full sm:w-auto">
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900">Tekshiruv paneli</h3>
                <p className="text-xs sm:text-sm text-slate-500 font-medium">Teach Tracker natijalarini tahrirlang va tasdiqlang.</p>
              </div>
              <button 
                onClick={onClose} 
                className="sm:hidden p-2 bg-white rounded-xl text-slate-400 hover:text-rose-500 transition-colors shadow-xs min-h-[40px] min-w-[40px] flex items-center justify-center"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex items-center justify-between w-full sm:w-auto gap-3">
              <div className="flex space-x-1 sm:space-x-2 bg-white p-1.5 rounded-2xl border border-slate-200">
                <button 
                  onClick={() => setActiveTab('preview')}
                  className={`px-4 sm:px-6 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all min-h-[40px] ${activeTab === 'preview' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Ko'rib chiqish
                </button>
                <button 
                  onClick={() => setActiveTab('edit')}
                  className={`px-4 sm:px-6 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all min-h-[40px] ${activeTab === 'edit' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Tahrirlash
                </button>
              </div>
              <button 
                onClick={onClose} 
                className="hidden sm:flex p-3 bg-white rounded-full text-slate-400 hover:text-rose-500 transition-colors shadow-xs min-h-[44px] min-w-[44px] items-center justify-center"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </div>

          <div className="flex-grow overflow-y-auto p-4 sm:p-8">
            {activeTab === 'preview' ? (
              <ResultView result={editedResult} images={sub.images} files={sub.files} onUpdateResult={setEditedResult} />
            ) : (
              <div className="space-y-8 sm:space-y-10 animate-in fade-in duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">
                  <div className="space-y-2 sm:space-y-4">
                    {/*
                      Ilgali yozuv "0-10" va `max="10"` edi. Butun ilova esa
                      1-5 shkalasida ishlaydi: nishonlar "5 baho" ni a'lo deb
                      hisoblaydi, kartalarda baho bitta belgi bo'lib chiqadi,
                      AI ham "1-5 ball tizimida" baholaydi. Ustoz 8 yozsa,
                      nishonlar buzilar va karta ichiga sig'masdi.
                    */}
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Umumiy baho (0-5)</label>
                    <input 
                      type="number" 
                      min="0" 
                      max={MAX_GRADE} 
                      step="1"
                      value={editedResult.grade} 
                      onChange={e => setEditedResult({...editedResult, grade: clampGrade(Number(e.target.value))})} 
                      className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-2xl text-indigo-600 outline-none focus:border-indigo-600 transition-colors" 
                    />
                  </div>
                  <div className="space-y-2 sm:space-y-4">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">O'qituvchi fikri</label>
                    <textarea 
                      rows={3} 
                      value={editedResult.feedback} 
                      onChange={e => setEditedResult({...editedResult, feedback: e.target.value})} 
                      className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-medium outline-none focus:border-indigo-600 transition-colors" 
                    />
                  </div>
                </div>

                <div className="space-y-4 sm:space-y-6">
                  <div className="flex items-center justify-between">
                    <h4 className="font-black text-slate-800 uppercase tracking-wider text-sm">Xatolar ro'yxati:</h4>
                    <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-3 py-1 rounded-full">{mistakes.length} ta xato</span>
                  </div>
                  
                  <div className="space-y-4">
                    {mistakes.map((m, i) => (
                      <div key={i} className="group relative p-4 sm:p-6 bg-slate-50 rounded-2xl sm:rounded-3xl border border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 transition-all hover:bg-white hover:shadow-lg">
                         {/* O'chirish tugmasi - Mobile-friendly */}
                         <button 
                           onClick={() => deleteMistake(i)}
                           className="absolute -top-2 -right-2 w-8 h-8 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-md opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-all z-10"
                           title="Ushbu xatoni ro'yxatdan o'chirish"
                         >
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
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

          <div className="p-5 sm:p-8 bg-slate-50 border-t border-slate-100 space-y-4">
             {saveError && (
               <div role="alert" className="p-4 bg-rose-50 border-2 border-rose-200 rounded-2xl space-y-1">
                 <p className="font-black text-slate-900 text-sm">Tasdiqlab bo'lmadi</p>
                 <p className="text-sm text-slate-600 font-medium">{saveError}</p>
                 <p className="text-xs text-slate-500 font-medium">Tahrirlaringiz saqlanib turibdi — qaytadan kiritish shart emas.</p>
               </div>
             )}
             <div className="flex justify-end space-x-4">
               <button
                 onClick={onClose}
                 disabled={saving}
                 className="px-10 py-4 font-bold text-slate-500 hover:text-slate-700 transition-colors disabled:opacity-50"
               >
                 Keyinroq
               </button>
               <button 
                 onClick={handleApprove}
                 disabled={saving}
                 className="px-12 py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center space-x-3 disabled:opacity-60 disabled:cursor-not-allowed"
               >
                 {saving ? (
                   <>
                     <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                     <span>Saqlanmoqda...</span>
                   </>
                 ) : (
                   <>
                     <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                     <span>{saveError ? "Qayta urinish" : "Tasdiqlash va yuborish"}</span>
                   </>
                 )}
               </button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
