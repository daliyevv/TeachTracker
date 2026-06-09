
import React, { useState, useEffect, useRef } from 'react';
import { User, DictationTask, Submission, AnalysisResult, SubmissionFile } from '../types';
import { Uploader } from './Uploader';
import { detectPaperBounds, analyzeDictation, analyzeAssignment } from '../services/geminiService';
import { DB } from '../services/dbService';
import { ResultView } from './ResultView';
import { dictateText, AudioController } from '../services/ttsService';
import { FileCode, Upload, X, CheckCircle2, Loader2, Play, Pause, Square, Volume2 } from 'lucide-react';

interface Props { 
  task: DictationTask; 
  user: User; 
  onCancel: () => void; 
  onSubmitted: () => void; 
  onUserUpdate?: (user: User) => void;
}

export const DictationWorker: React.FC<Props> = ({ task, user, onCancel, onSubmitted, onUserUpdate }) => {
  const [imgs, setImgs] = useState<string[]>([]);
  const [files, setFiles] = useState<SubmissionFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [croppedImgs, setCroppedImgs] = useState<string[]>([]);
  const [isDictating, setIsDictating] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(Math.max(1.0, task.minPlaybackSpeed || 1.0));
  const [audioController, setAudioController] = useState<AudioController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isCoding = task.type === 'coding';
  const isDictation = task.type === 'dictation';

  useEffect(() => {
    return () => {
      if (audioController) {
        audioController.stop();
      }
    };
  }, [audioController]);

  const handleDictate = async () => {
    if (audioController) {
      audioController.stop();
      setAudioController(null);
      setIsDictating(false);
      setIsPaused(false);
      return;
    }

    setIsDictating(true);
    const controller = await dictateText(task.content, playbackSpeed, () => {
      setAudioController(null);
      setIsDictating(false);
      setIsPaused(false);
    });
    if (controller) {
      controller.setSpeed(playbackSpeed);
      setAudioController(controller);
    } else {
      setIsDictating(false);
    }
  };

  const togglePause = () => {
    if (!audioController) return;
    if (isPaused) {
      audioController.resume();
      setIsPaused(false);
    } else {
      audioController.pause();
      setIsPaused(true);
    }
  };

  const handleSpeedChange = (newSpeed: number) => {
    const min = task.minPlaybackSpeed || 1.0;
    const speed = Math.max(min, newSpeed);
    setPlaybackSpeed(speed);
    if (audioController) {
      audioController.setSpeed(speed);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;

    Array.from(selectedFiles).forEach(file => {
      const reader = new FileReader();
      const extension = file.name.split('.').pop()?.toLowerCase() || '';
      const textExtensions = ['py', 'js', 'ts', 'html', 'css', 'java', 'cpp', 'c', 'php', 'rb', 'go', 'rs', 'txt', 'md', 'json', 'ipynb'];
      const isText = textExtensions.includes(extension) || file.type.startsWith('text/');

      reader.onload = (event) => {
        const result = event.target?.result as string;
        const languageMap: Record<string, string> = {
          'js': 'javascript',
          'ts': 'typescript',
          'py': 'python',
          'html': 'html',
          'css': 'css',
          'java': 'java',
          'cpp': 'cpp',
          'c': 'c',
          'php': 'php',
          'rb': 'ruby',
          'go': 'go',
          'rs': 'rust'
        };

        if (isText) {
          setFiles(prev => [...prev, {
            name: file.name,
            content: result,
            mimeType: file.type || 'text/plain',
            language: languageMap[extension] || 'text'
          }]);
        } else {
          const base64 = result.split(',')[1];
          setFiles(prev => [...prev, {
            name: file.name,
            data: base64,
            mimeType: file.type || 'application/octet-stream'
          }]);
        }
      };

      if (isText) {
        reader.readAsText(file);
      } else {
        reader.readAsDataURL(file);
      }
    });
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const resizeImage = (base64: string, maxSide = 1600): Promise<string> => {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(base64), 10000);
      const img = new Image();
      img.onload = () => {
        clearTimeout(timeout);
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
      img.onerror = () => {
        clearTimeout(timeout);
        resolve(base64);
      };
      img.src = base64;
    });
  };

  const processImage = async (img: string): Promise<string> => {
    const optimized = await resizeImage(img);
    try {
      // detectPaperBounds uchun ham timeout (10 soniya)
      const boundsPromise = detectPaperBounds(optimized);
      const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 10000));
      const bounds = await Promise.race([boundsPromise, timeoutPromise]);
      
      if (!bounds) return optimized;

      return new Promise((resolve) => {
        const timeout = setTimeout(() => resolve(optimized), 10000);
        const i = new Image();
        i.crossOrigin = "anonymous";
        i.onload = () => {
          clearTimeout(timeout);
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
        i.onerror = () => {
          clearTimeout(timeout);
          resolve(optimized);
        };
        i.src = optimized;
      });
    } catch (e) {
      console.error("Process image error:", e);
      return optimized;
    }
  };

  const handleSubmit = async () => {
    if (imgs.length === 0 && files.length === 0) return;
    try {
      setLoading(true);
      let ttResult: AnalysisResult;
      const imageUrls: string[] = [];
      const finalProcessedImages: string[] = [];
      
      if (imgs.length > 0) {
        for (let i = 0; i < imgs.length; i++) {
          setMsg(`${i + 1}-bet tayyorlanmoqda...`);
          const processed = await processImage(imgs[i]);
          finalProcessedImages.push(processed);

          setMsg(`${i + 1}-bet yuklanmoqda...`);
          const url = await DB.uploadImage(processed, `submissions/${user.id}/${Date.now()}_${i}.jpg`);
          imageUrls.push(url);
        }
      }

      if (isDictation) {
        setMsg('Xatolar tahlil qilinmoqda...');
        ttResult = await analyzeDictation(finalProcessedImages, task.content);
      } else {
        setMsg('Vazifa tahlil qilinmoqda...');
        ttResult = await analyzeAssignment(files, task.content);
      }
      
      const submission: Omit<Submission, "id"> = {
        taskId: task.id,
        studentId: user.id,
        images: imageUrls.length > 0 ? imageUrls : undefined,
        files: files.length > 0 ? files : undefined,
        ttResult: ttResult,
        status: 'pending',
        submittedAt: Date.now()
      };

      await DB.addSubmission(submission);
      
      if (ttResult.grade === 5 && onUserUpdate) {
        const currentBadges = user.badges || [];
        const newBadges = [...new Set([...currentBadges, 'imlo_ustasi', 'besh_yulduz'])];
        if (newBadges.length > currentBadges.length) {
          onUserUpdate({ ...user, badges: newBadges });
        }
      }
      
      setCroppedImgs(finalProcessedImages);
      setAnalysisResult(ttResult);
    } catch (e: any) {
      console.error("Submission error:", e);
      const errorMsg = e.message || "Xatolik yuz berdi. Iltimos qaytadan urinib ko'ring.";
      alert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (analysisResult) {
    return (
      <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-2xl z-[200] overflow-y-auto p-4 py-10 animate-in fade-in zoom-in duration-500">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="bg-white p-8 rounded-[3.5rem] shadow-2xl border-4 border-emerald-500 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-bl-[100px]"></div>
            
            <div className="flex flex-col md:flex-row items-center justify-between relative z-10">
              <div className="flex items-center space-x-6 mb-6 md:mb-0">
                 <div className="w-20 h-20 bg-emerald-500 text-white rounded-3xl flex items-center justify-center shadow-lg">
                   <CheckCircle2 className="w-12 h-12" />
                 </div>
                 <div>
                   <h2 className="text-4xl font-black text-slate-900 italic">Qabul qilindi!</h2>
                   <p className="text-slate-500 font-bold text-lg">Vazifangiz Teach Tracker tomonidan tahlil qilindi.</p>
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
          </div>

          <div className="bg-white rounded-[3.5rem] shadow-2xl overflow-hidden">
             <ResultView result={analysisResult} images={croppedImgs} files={files} />
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
            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">
              {isDictation ? 'Diktantni yuklash' : isCoding ? 'Kod fayllarini yuklash' : 'Vazifani yuklash'}
            </p>
          </div>
        </div>

        <div className="bg-white p-10 rounded-[3.5rem] border-2 border-slate-100 shadow-2xl space-y-10">
           <div className="space-y-6">
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
               <div className="flex items-center space-x-3">
                 <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center">
                   <FileCode className="w-5 h-5" />
                 </div>
                 <h3 className="font-black text-slate-800 uppercase tracking-wider text-sm">Topshiriq sharti:</h3>
               </div>
               
               {isDictation && (
                 <div className="flex flex-col space-y-4">
                   <div className="flex items-center space-x-3">
                     <button 
                       onClick={handleDictate}
                       className={`flex items-center space-x-3 px-6 py-3 rounded-2xl font-black transition-all shadow-lg ${audioController ? 'bg-rose-500 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                     >
                       {audioController ? (
                         <>
                           <Square className="w-6 h-6" />
                           <span>To'xtatish</span>
                         </>
                       ) : (
                         <>
                           <Volume2 className="w-6 h-6" />
                           <span>Teach Tracker Diktatori</span>
                         </>
                       )}
                     </button>

                     {audioController && (
                       <button 
                         onClick={togglePause}
                         className="p-3 bg-white border-2 border-slate-100 rounded-2xl text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
                       >
                         {isPaused ? <Play className="w-6 h-6" /> : <Pause className="w-6 h-6" />}
                       </button>
                     )}
                   </div>

                   <div className="flex flex-col space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                     <div className="flex justify-between items-center">
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">O'qish tezligi</span>
                       <span className="text-xs font-black text-indigo-600">{playbackSpeed.toFixed(1)}x</span>
                     </div>
                     <input 
                       type="range" min="0.5" max="2.0" step="0.1"
                       value={playbackSpeed}
                       onChange={e => handleSpeedChange(parseFloat(e.target.value))}
                       className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                     />
                   </div>
                 </div>
               )}
             </div>
             
             <div className="p-10 bg-slate-50 rounded-[2.5rem] border border-slate-100 font-serif italic text-xl text-slate-700 leading-relaxed shadow-inner">
               "{task.content}"
             </div>
           </div>

           {isDictation ? (
             <div className="space-y-6">
               <div className="flex items-center space-x-3">
                 <div className="w-8 h-8 bg-violet-100 text-violet-600 rounded-lg flex items-center justify-center">
                   <Upload className="w-5 h-5" />
                 </div>
                 <h3 className="font-black text-slate-800 uppercase tracking-wider text-sm">Rasmlarni yuklang (bir nechta bo'lishi mumkin):</h3>
               </div>
               <Uploader onImagesSelect={setImgs} isLoading={loading} />
             </div>
           ) : (
             <div className="space-y-6">
               <div className="flex items-center justify-between">
                 <div className="flex items-center space-x-3">
                   <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center">
                     <FileCode className="w-5 h-5" />
                   </div>
                   <h3 className="font-black text-slate-800 uppercase tracking-wider text-sm">Fayllarni yuklang:</h3>
                 </div>
                 <button 
                   onClick={() => fileInputRef.current?.click()}
                   className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-xs hover:bg-indigo-700 transition-all"
                 >
                   <Upload className="w-4 h-4" />
                   <span>Fayl tanlash</span>
                 </button>
                 <input 
                   type="file" 
                   ref={fileInputRef} 
                   onChange={handleFileChange} 
                   multiple 
                   className="hidden" 
                   accept=".py,.js,.ts,.html,.css,.java,.cpp,.c,.php,.rb,.go,.rs,.txt,.pdf,.doc,.docx,.png,.jpg,.jpeg,.ipynb"
                 />
               </div>

               {files.length > 0 && (
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                   {files.map((f, i) => (
                     <div key={i} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between group">
                       <div className="flex items-center space-x-3 overflow-hidden">
                         <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                           <FileCode className="w-5 h-5 text-indigo-600" />
                         </div>
                         <div className="overflow-hidden">
                           <p className="text-sm font-bold text-slate-800 truncate">{f.name}</p>
                           <p className="text-[10px] text-slate-400 font-black uppercase">{f.language}</p>
                         </div>
                       </div>
                       <button 
                         onClick={() => removeFile(i)}
                         className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                       >
                         <X className="w-5 h-5" />
                       </button>
                     </div>
                   ))}
                 </div>
               )}

               {files.length === 0 && (
                 <div 
                   onClick={() => fileInputRef.current?.click()}
                   className="py-12 border-4 border-dashed border-slate-100 rounded-[2.5rem] flex flex-col items-center justify-center space-y-4 cursor-pointer hover:bg-slate-50 transition-all"
                 >
                   <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center">
                     <Upload className="w-8 h-8" />
                   </div>
                   <p className="text-slate-400 font-bold italic">Fayllarni (kod, PDF, rasm, .ipynb) shu yerga yuklang...</p>
                 </div>
               )}
             </div>
           )}

           {(imgs.length > 0 || files.length > 0) && !loading && (
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
                <Loader2 className="w-24 h-24 text-indigo-600 animate-spin" />
                <div className="text-center">
                  <p className="text-3xl font-black text-indigo-900">{msg}</p>
                  <p className="text-indigo-400 font-bold mt-2 animate-pulse">Teach Tracker ishlamoqda...</p>
                </div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};
