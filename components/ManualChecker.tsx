
import React, { useState } from 'react';
import { User, DictationTask, Submission, AnalysisResult } from '../types';
import { Uploader } from './Uploader';
import { detectPaperBounds, analyzeDictation } from '../services/geminiService';
import { DB } from '../services/dbService';
import { ResultView } from './ResultView';

interface Props { 
  task: DictationTask; 
  user: User; 
  onCancel: () => void; 
  onSubmitted: () => void; 
}

export const ManualChecker: React.FC<Props> = ({ task, user, onCancel, onSubmitted }) => {
  const [imgs, setImgs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [studentName, setStudentName] = useState('');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [croppedImgs, setCroppedImgs] = useState<string[]>([]);

  const resizeImage = (base64: string, maxSide = 1600): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxSide || height > maxSide) {
          if (width > height) {
            height = (height / width) * maxSide;
            width = maxSide;
          } else {
            width = (width / height) * maxSide;
            height = maxSide;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = () => resolve(base64);
      img.src = base64;
    });
  };

  const processImage = async (img: string): Promise<string> => {
    const optimized = await resizeImage(img);
    try {
      const bounds = await detectPaperBounds(optimized);
      if (!bounds) return optimized;

      return new Promise((resolve) => {
        const i = new Image();
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
            resolve(optimized);
          }
        };
        i.onerror = () => resolve(optimized);
        i.src = optimized;
      });
    } catch (e) {
      return optimized;
    }
  };

  const handleSubmit = async () => {
    if (imgs.length === 0) {
      alert("Iltimos, diktant rasmini yuklang.");
      return;
    }
    if (!studentName.trim()) {
      alert("Iltimos, o'quvchi ism-familiyasini kiriting.");
      return;
    }

    try {
      setLoading(true);
      const finalProcessedImages: string[] = [];
      const imageUrls: string[] = [];
      
      for (let i = 0; i < imgs.length; i++) {
        setMsg(`${i + 1}-bet tayyorlanmoqda...`);
        const processed = await processImage(imgs[i]);
        finalProcessedImages.push(processed);

        setMsg(`${i + 1}-bet yuklanmoqda...`);
        const url = await DB.uploadImage(processed, `manual_submissions/${user.id}/${Date.now()}_${i}.jpg`);
        imageUrls.push(url);
      }

      setMsg('Xatolar tahlil qilinmoqda...');
      const ttResult = await analyzeDictation(finalProcessedImages, task.content);
      
      const submission: Omit<Submission, "id"> = {
        taskId: task.id,
        studentId: `manual_${Date.now()}`, // Manual submission uchun maxsus ID
        studentName: studentName.trim(),
        images: imageUrls,
        ttResult: ttResult,
        status: 'approved', // Ustoz o'zi yuklagani uchun avtomatik tasdiqlangan
        submittedAt: Date.now(),
        approvedAt: Date.now()
      };

      await DB.addSubmission(submission);
      
      setCroppedImgs(finalProcessedImages);
      setAnalysisResult(ttResult);
    } catch (e: any) {
      console.error("Manual submission error:", e);
      alert("Xatolik yuz berdi. Iltimos qaytadan urinib ko'ring.");
    } finally {
      setLoading(false);
    }
  };

  if (analysisResult && croppedImgs.length > 0) {
    return (
      <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-2xl z-[200] overflow-y-auto p-4 py-10 animate-in fade-in zoom-in duration-500">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="bg-white p-8 rounded-[3.5rem] shadow-2xl border-4 border-emerald-500 relative overflow-hidden">
            <div className="flex flex-col md:flex-row items-center justify-between relative z-10">
              <div className="flex items-center space-x-6">
                 <div className="w-20 h-20 bg-emerald-500 text-white rounded-3xl flex items-center justify-center shadow-lg">
                   <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                 </div>
                 <div>
                   <h2 className="text-4xl font-black text-slate-900 italic">Tekshirildi!</h2>
                   <p className="text-slate-500 font-bold text-lg">{studentName} uchun natijalar saqlandi.</p>
                 </div>
              </div>
              <button 
                onClick={onSubmitted}
                className="bg-indigo-600 text-white px-10 py-5 rounded-[2rem] font-black text-xl shadow-2xl hover:bg-indigo-700 transition-all"
              >
                Yopish
              </button>
            </div>
          </div>
          <div className="bg-white rounded-[3.5rem] shadow-2xl overflow-hidden">
             <ResultView result={analysisResult} images={croppedImgs} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-50 z-[150] overflow-y-auto animate-in slide-in-from-right duration-500">
      <div className="max-w-4xl mx-auto p-6 sm:p-10 space-y-10">
        <div className="flex items-center justify-between bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <button onClick={onCancel} className="flex items-center space-x-3 px-6 py-3 bg-slate-100 text-slate-600 rounded-2xl font-black hover:bg-rose-50 hover:text-rose-600 transition-all">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" /></svg>
            <span>Orqaga</span>
          </button>
          <div className="text-right">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Qo'lda tekshirish</h2>
            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">{task.title}</p>
          </div>
        </div>

        <div className="bg-white p-10 rounded-[3.5rem] border-2 border-slate-100 shadow-2xl space-y-10">
           <div className="space-y-4">
             <label className="block text-sm font-black text-slate-700 uppercase tracking-widest">O'quvchi ism-familiyasi:</label>
             <input 
               type="text" 
               value={studentName}
               onChange={(e) => setStudentName(e.target.value)}
               placeholder="Masalan: Ali Valiyev"
               className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-600 outline-none font-bold text-lg transition-all"
             />
           </div>

           <div className="space-y-6">
             <div className="flex items-center space-x-3">
               <div className="w-8 h-8 bg-violet-100 text-violet-600 rounded-lg flex items-center justify-center">
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /></svg>
               </div>
               <h3 className="font-black text-slate-800 uppercase tracking-wider text-sm">Diktant rasmini yuklang:</h3>
             </div>
             <Uploader onImagesSelect={setImgs} isLoading={loading} />
           </div>

           {imgs.length > 0 && !loading && (
             <button 
               onClick={handleSubmit}
               className="w-full py-6 bg-indigo-600 text-white rounded-[2.5rem] font-black text-2xl shadow-2xl hover:bg-indigo-700 transition-all flex items-center justify-center space-x-4"
             >
               <span>Tekshirish va Saqlash</span>
               <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
             </button>
           )}

           {loading && (
             <div className="flex flex-col items-center space-y-6 py-20 bg-indigo-50/50 rounded-[3rem] border-4 border-dashed border-indigo-100">
                <div className="w-24 h-24 border-8 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <div className="text-center">
                  <p className="text-3xl font-black text-indigo-900">{msg}</p>
                </div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};
