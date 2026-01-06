
import React, { useState } from 'react';
import { User, DictationTask, Submission, AnalysisResult } from '../types';
import { Uploader } from './Uploader';
import { detectPaperBounds, analyzeDictation } from '../services/geminiService';
import { DB } from '../services/mockDB';
import { ResultView } from './ResultView';

interface Props { task: DictationTask; user: User; onCancel: () => void; onSubmitted: () => void; }

export const DictationWorker: React.FC<Props> = ({ task, user, onCancel, onSubmitted }) => {
  const [img, setImg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [croppedImg, setCroppedImg] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!img) return;
    try {
      setLoading(true);
      setMsg('Diktant AI orqali tekshirilmoqda...');
      
      const bounds = await detectPaperBounds(img);
      let finalImg = img;
      
      if (bounds) {
        finalImg = await new Promise((resolve) => {
          const i = new Image();
          i.crossOrigin = "anonymous";
          i.onload = () => {
            const canvas = document.createElement('canvas');
            const [ymin, xmin, ymax, xmax] = bounds;
            const w = Math.max(1, (xmax - xmin) / 1000 * i.width);
            const h = Math.max(1, (ymax - ymin) / 1000 * i.height);
            canvas.width = w; canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(i, (xmin/1000)*i.width, (ymin/1000)*i.height, w, h, 0, 0, w, h);
              resolve(canvas.toDataURL('image/jpeg', 0.9));
            } else {
              resolve(img);
            }
          };
          i.onerror = () => resolve(img);
          i.src = img;
        });
      }

      setMsg('Xatolar tahlil qilinmoqda...');
      // Endi asl matnni ham yuboramiz
      const aiResult = await analyzeDictation(finalImg, task.content);
      
      const submission: Submission = {
        id: Math.random().toString(36).substr(2, 9),
        taskId: task.id,
        studentId: user.id,
        image: finalImg,
        aiResult: aiResult,
        status: 'pending',
        submittedAt: Date.now()
      };

      DB.addSubmission(submission);
      
      setCroppedImg(finalImg);
      setAnalysisResult(aiResult);
    } catch (e: any) {
      console.error("Submission error:", e);
      if (e.message?.includes('429')) {
        alert("Server band (429). Iltimos, bir ozdan keyin qaytadan urinib ko'ring.");
      } else {
        alert("Xatolik yuz berdi. Iltimos qaytadan yuklang.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (analysisResult && croppedImg) {
    return (
      <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-2xl z-[200] overflow-y-auto p-4 py-10 animate-in fade-in zoom-in duration-500">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="bg-white p-8 rounded-[3.5rem] shadow-2xl border-4 border-emerald-500 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-bl-[100px]"></div>
            
            <div className="flex flex-col md:flex-row items-center justify-between relative z-10">
              <div className="flex items-center space-x-6 mb-6 md:mb-0">
                 <div className="w-20 h-20 bg-emerald-500 text-white rounded-3xl flex items-center justify-center shadow-lg">
                   <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                 </div>
                 <div>
                   <h2 className="text-4xl font-black text-slate-900 italic">Qabul qilindi!</h2>
                   <p className="text-slate-500 font-bold text-lg">Diktantingiz AI tomonidan tahlil qilindi.</p>
                 </div>
              </div>
              <button 
                onClick={onSubmitted}
                className="group bg-indigo-600 text-white px-10 py-5 rounded-[2rem] font-black text-xl shadow-2xl hover:bg-indigo-700 hover:-translate-y-1 transition-all flex items-center space-x-4"
              >
                <span>Yopish</span>
                <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </button>
            </div>

            <div className="mt-8 p-6 bg-amber-50 border-2 border-amber-200 rounded-3xl flex items-center space-x-4">
              <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <p className="text-sm text-amber-800 font-bold italic text-center md:text-left">
                Eslatma: Hozirgi natijalar AI tahlili. Yakuniy bahoni ustozingiz tasdiqlashini kuting.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-[3.5rem] shadow-2xl overflow-hidden">
             <ResultView result={analysisResult} imageSrc={croppedImg} />
          </div>

          <div className="flex justify-center pb-10">
             <button onClick={onSubmitted} className="text-white/50 hover:text-white font-black uppercase tracking-widest text-sm transition-colors">[ Yopish uchun bosing ]</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-50 z-[150] overflow-y-auto animate-in slide-in-from-right duration-500">
      <div className="max-w-4xl mx-auto p-6 sm:p-10 space-y-10">
        <div className="flex items-center justify-between bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <button onClick={onCancel} className="group flex items-center space-x-3 px-6 py-3 bg-slate-100 text-slate-600 rounded-2xl font-black hover:bg-rose-50 hover:text-rose-600 transition-all">
            <svg className="w-6 h-6 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" /></svg>
            <span>Bekor qilish</span>
          </button>
          <div className="text-right">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">{task.title}</h2>
            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Diktantni yuklash</p>
          </div>
        </div>

        <div className="bg-white p-10 rounded-[3.5rem] border-2 border-slate-100 shadow-2xl space-y-10">
           <div className="space-y-4">
             <div className="flex items-center space-x-3">
               <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center">
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
               </div>
               <h3 className="font-black text-slate-800 uppercase tracking-wider text-sm">Diktant matni:</h3>
             </div>
             <div className="p-10 bg-slate-50 rounded-[2.5rem] border border-slate-100 font-serif italic text-xl text-slate-700 leading-relaxed shadow-inner">
               "{task.content}"
             </div>
           </div>

           <div className="space-y-6">
             <div className="flex items-center space-x-3">
               <div className="w-8 h-8 bg-violet-100 text-violet-600 rounded-lg flex items-center justify-center">
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /></svg>
               </div>
               <h3 className="font-black text-slate-800 uppercase tracking-wider text-sm">Rasmni yuklang:</h3>
             </div>
             <Uploader onImageSelect={setImg} isLoading={loading} />
           </div>

           {img && !loading && (
             <div className="pt-6 border-t border-slate-100 flex flex-col items-center">
               <button 
                 onClick={handleSubmit}
                 className="w-full py-6 bg-indigo-600 text-white rounded-[2.5rem] font-black text-2xl shadow-2xl shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-1 transition-all flex items-center justify-center space-x-4"
               >
                 <span>Tekshirishga yuborish</span>
                 <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 5l7 7m0 0l-7 7m7-7H3" /></svg>
               </button>
             </div>
           )}

           {loading && (
             <div className="flex flex-col items-center space-y-6 py-20 bg-indigo-50/50 rounded-[3rem] border-4 border-dashed border-indigo-100">
                <div className="w-24 h-24 border-8 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <div className="text-center">
                  <p className="text-3xl font-black text-indigo-900">{msg}</p>
                  <p className="text-indigo-400 font-bold mt-2 animate-pulse">Sun'iy intellekt ishlamoqda...</p>
                </div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};
