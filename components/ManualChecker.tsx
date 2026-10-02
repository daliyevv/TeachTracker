
import React, { useState } from 'react';
import { User, DictationTask, Submission, AnalysisResult } from '../types';
import { Uploader } from './Uploader';
import { analyzeDictation } from '../services/geminiService';
import { DB } from '../services/dbService';
import { ResultView } from './lazy';
import { compressImageDataUrl } from '../services/imageService';

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
  const [submitError, setSubmitError] = useState<string | null>(null);

  /**
   * Rasmni yuborishga tayyorlaydi.
   *
   * Ilgari bu yerda alohida `resizeImage` funksiyasi turardi — 1400px ga
   * kichraytirib, 0.8 sifat bilan JPEG qilardi, lekin HAJMNI tekshirmasdi.
   * `services/imageService.ts` esa aynan shu ishni maqsadli hajmga
   * (220KB) yetguncha bosqichma-bosqich qilади. Ikki nusxa logika bo'lishi
   * esa Faza 2 da tuzatilgan hajm muammosining qaytib kelishiga yo'l
   * ochardi: bitta joyda tuzatilgani ikkinchisida tuzatilmay qolardi.
   */
  const processImage = (img: string): Promise<string> => compressImageDataUrl(img);

  const handleSubmit = async () => {
    setSubmitError(null);
    if (imgs.length === 0) {
      setSubmitError("Iltimos, diktant rasmini yuklang.");
      return;
    }
    if (!studentName.trim()) {
      setSubmitError("Iltimos, o'quvchi ism-familiyasini kiriting.");
      return;
    }

    try {
      setLoading(true);
      const finalProcessedImages: string[] = [];

      for (let i = 0; i < imgs.length; i++) {
        setMsg(`${i + 1}-bet tayyorlanmoqda...`);
        finalProcessedImages.push(await processImage(imgs[i]));
      }

      // Tahlil YUKLASHDAN OLDIN. Ilgari tartib teskari edi: rasmlar avval
      // Storage'ga yuklanar, keyin tahlil qilinardi. Tahlil yiqilsa (vaqt
      // tugashi, kvota), yuklangan fayllar hech qaysi topshiriqqa
      // bog'lanmasdan Storage'da qolib ketardi — har qayta urinish yana
      // bir nusxa qoldirardi.
      setMsg('Xatolar tahlil qilinmoqda...');
      const ttResult = await analyzeDictation(finalProcessedImages, task.content);

      const imageUrls: string[] = [];
      for (let i = 0; i < finalProcessedImages.length; i++) {
        setMsg(`${i + 1}-bet saqlanmoqda...`);
        imageUrls.push(
          await DB.uploadImage(finalProcessedImages[i], `manual_submissions/${user.id}/${Date.now()}_${i}.jpg`)
        );
      }
      
      const submission: Omit<Submission, "id"> = {
        taskId: task.id,
        studentId: `manual_${Date.now()}`, // Manual submission uchun maxsus ID
        teacherId: user.id,
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
      // Ilgari xato matni butunlay tashlanar va umumiy xabar ko'rsatilardi —
      // o'qituvchi nima bo'lganini bilmasdi.
      setSubmitError(
        e?.message || "Xatolik yuz berdi. Internet aloqangizni tekshirib, qayta urinib ko'ring."
      );
    } finally {
      setLoading(false);
    }
  };

  if (analysisResult && croppedImgs.length > 0) {
    return (
      <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-2xl z-[200] overflow-y-auto p-3 sm:p-6 py-6 sm:py-10 animate-in fade-in zoom-in duration-500">
        <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8">
          <div className="bg-white p-5 sm:p-8 rounded-3xl sm:rounded-[2.5rem] shadow-2xl border-4 border-emerald-500 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-5">
                 <div className="w-14 h-14 sm:w-16 sm:h-16 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-lg shrink-0">
                   <svg className="w-8 h-8 sm:w-10 sm:h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                 </div>
                 <div>
                   <h2 className="text-2xl sm:text-3xl font-black text-slate-900 italic">Tekshirildi!</h2>
                   <p className="text-slate-500 font-bold text-sm sm:text-base">{studentName} uchun natijalar saqlandi.</p>
                 </div>
              </div>
              <button 
                onClick={onSubmitted}
                className="w-full sm:w-auto bg-indigo-600 text-white px-8 py-3.5 sm:py-4 rounded-2xl font-black text-base sm:text-lg shadow-xl hover:bg-indigo-700 transition-all min-h-[44px]"
              >
                Yopish
              </button>
            </div>
          </div>
          <div className="bg-white rounded-3xl sm:rounded-[2.5rem] shadow-2xl overflow-hidden">
             <ResultView result={analysisResult} images={croppedImgs} onUpdateResult={setAnalysisResult} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-50 z-[150] overflow-y-auto animate-in slide-in-from-right duration-500">
      <div className="max-w-4xl mx-auto p-3 sm:p-6 md:p-10 space-y-6 sm:space-y-8">
        <div className="flex items-center justify-between bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-xs border border-slate-100">
          <button 
            onClick={onCancel} 
            className="flex items-center space-x-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-slate-100 text-slate-700 rounded-xl sm:rounded-2xl font-black text-sm sm:text-base hover:bg-rose-50 hover:text-rose-600 transition-all min-h-[44px]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" /></svg>
            <span>Orqaga</span>
          </button>
          <div className="text-right">
            <h2 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight">Qo'lda tekshirish</h2>
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest truncate max-w-[160px] sm:max-w-xs">{task.title}</p>
          </div>
        </div>

        <div className="bg-white p-5 sm:p-8 md:p-10 rounded-3xl sm:rounded-[2.5rem] border border-slate-100 shadow-xl space-y-6 sm:space-y-8">
           <div className="space-y-2 sm:space-y-3">
             <label className="block text-xs sm:text-sm font-black text-slate-700 uppercase tracking-widest">O'quvchi ism-familiyasi:</label>
             <input 
               type="text" 
               value={studentName}
               onChange={(e) => setStudentName(e.target.value)}
               placeholder="Masalan: Ali Valiyev"
               className="w-full px-4 sm:px-6 py-3.5 sm:py-4 bg-slate-50 border-2 border-slate-100 rounded-xl sm:rounded-2xl focus:border-indigo-600 focus:bg-white outline-hidden font-bold text-base sm:text-lg transition-all"
             />
           </div>

           <div className="space-y-4">
             <div className="flex items-center space-x-3">
               <div className="w-8 h-8 bg-violet-100 text-violet-600 rounded-lg flex items-center justify-center shrink-0">
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /></svg>
               </div>
               <h3 className="font-black text-slate-800 uppercase tracking-wider text-xs sm:text-sm">Diktant rasmini yuklang:</h3>
             </div>
             <Uploader onImagesSelect={setImgs} isLoading={loading} />
           </div>

           {submitError && !loading && (
             <div role="alert" className="p-5 bg-rose-50 border-2 border-rose-200 rounded-[2rem] space-y-2">
               <p className="font-black text-slate-900">Saqlab bo'lmadi</p>
               <p className="text-sm text-slate-600 font-medium">{submitError}</p>
               <p className="text-xs text-slate-500 font-medium">Rasmlar saqlanib turibdi — qaytadan tanlash shart emas.</p>
             </div>
           )}

           {imgs.length > 0 && !loading && (
             <button 
               onClick={handleSubmit}
               className="w-full py-4 sm:py-5 bg-indigo-600 text-white rounded-2xl sm:rounded-3xl font-black text-lg sm:text-xl shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center justify-center space-x-3 min-h-[48px]"
             >
               <span>{submitError ? "Qayta urinish" : "Tekshirish va Saqlash"}</span>
               <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
             </button>
           )}

           {loading && (
             <div className="flex flex-col items-center space-y-4 sm:space-y-6 py-12 sm:py-16 bg-indigo-50/50 rounded-2xl sm:rounded-3xl border-2 sm:border-4 border-dashed border-indigo-100">
                <div className="w-14 h-14 sm:w-20 sm:h-20 border-4 sm:border-8 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <div className="text-center px-4">
                  <p className="text-xl sm:text-2xl font-black text-indigo-900">{msg}</p>
                </div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};
