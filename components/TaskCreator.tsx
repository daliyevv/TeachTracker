
import React, { useState, useEffect, useRef } from 'react';
import { speakText, AudioController } from '../services/ttsService';
import mammoth from 'mammoth';
import { FileText, Upload, Code, Type as TypeIcon, Music, X } from 'lucide-react';

import { DictationTask, TaskType } from '../types';

interface Props { 
  onCancel: () => void; 
  onCreate: (d: any) => void; 
  task?: DictationTask | null;
}

const TEST_SENTENCES = [
  "Bugun havo juda chiroyli va quyoshli.",
  "Maktabimizda yangi kutubxona ochildi.",
  "O'quvchilar darsga katta qiziqish bilan kelishdi."
];

export const TaskCreator: React.FC<Props> = ({ onCancel, onCreate, task }) => {
  const [title, setTitle] = useState(task?.title || '');
  const [content, setContent] = useState(task?.content || '');
  const [type, setType] = useState<TaskType>(task?.type || 'dictation');
  const [minSpeed, setMinSpeed] = useState(task?.minPlaybackSpeed || 1.0);
  const [isTesting, setIsTesting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [audioController, setAudioController] = useState<AudioController | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (audioController) {
      audioController.setSpeed(minSpeed);
    }
  }, [minSpeed, audioController]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    
    if (file.name.endsWith('.docx')) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const arrayBuffer = event.target?.result as ArrayBuffer;
        const result = await mammoth.extractRawText({ arrayBuffer });
        setContent(result.value);
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        setContent(event.target?.result as string);
      };
      reader.readAsText(file);
    }
  };

  const handleTestSpeed = async () => {
    if (isTesting) {
      audioController?.stop();
      setAudioController(null);
      setIsTesting(false);
      return;
    }

    setIsTesting(true);
    const controller = await speakText(TEST_SENTENCES.join(" "), minSpeed, () => {
      setIsTesting(false);
      setAudioController(null);
    });

    if (controller) {
      controller.setSpeed(minSpeed);
      setAudioController(controller);
    } else {
      setIsTesting(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      audioController?.stop();
    };
  }, [audioController]);

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-[3rem] p-10 shadow-2xl space-y-8 max-h-[90vh] overflow-y-auto">
        <div>
          <h3 className="text-2xl font-black text-slate-900">{task ? 'Vazifani tahrirlash' : 'Yangi topshiriq yaratish'}</h3>
          <p className="text-slate-500">{task ? 'Vazifa ma\'lumotlarini o\'zgartiring.' : 'O\'quvchilar uchun topshiriq turini va shartlarini belgilang.'}</p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { id: 'dictation', label: 'Diktant', icon: Music, color: 'text-indigo-600', bg: 'bg-indigo-50' },
            { id: 'coding', label: 'Dasturlash', icon: Code, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { id: 'general', label: 'Umumiy', icon: TypeIcon, color: 'text-amber-600', bg: 'bg-amber-50' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setType(item.id as TaskType)}
              className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center space-y-2 ${
                type === item.id 
                  ? 'border-indigo-600 bg-indigo-50/50' 
                  : 'border-slate-50 hover:border-slate-200 bg-white'
              }`}
            >
              <div className={`w-10 h-10 ${item.bg} ${item.color} rounded-xl flex items-center justify-center`}>
                <item.icon className="w-5 h-5" />
              </div>
              <span className="text-xs font-black text-slate-700">{item.label}</span>
            </button>
          ))}
        </div>
        
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-600 uppercase tracking-widest ml-1">Mavzu nomi</label>
            <input 
              value={title} onChange={e => setTitle(e.target.value)}
              className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-600 focus:bg-white transition-all outline-none font-medium"
              placeholder="Masalan: Python asoslari yoki Oltin kuz"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-bold text-slate-600 uppercase tracking-widest ml-1">Topshiriq matni / Shartlari</label>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 text-xs font-bold text-indigo-600 hover:text-indigo-700"
              >
                <Upload className="w-4 h-4" />
                <span>Word (.docx) yuklash</span>
              </button>
              <input 
                type="file" ref={fileInputRef} onChange={handleFileUpload} 
                accept=".docx,.txt" className="hidden" 
              />
            </div>
            
            {fileName && (
              <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-bold text-indigo-900 truncate max-w-[200px]">{fileName}</span>
                </div>
                <button onClick={() => { setFileName(null); setContent(''); }} className="text-indigo-400 hover:text-indigo-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <textarea 
              rows={6} value={content} onChange={e => setContent(e.target.value)}
              className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-600 focus:bg-white transition-all outline-none font-medium resize-none"
              placeholder="Topshiriq shartlarini shu yerga kiriting yoki fayl yuklang..."
            />
          </div>

          {type === 'dictation' && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-bold text-slate-600 uppercase tracking-widest ml-1">Minimal o'qish tezligi</label>
                <div className="flex items-center space-x-3">
                  <button 
                    onClick={handleTestSpeed}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center space-x-2 ${
                      isTesting ? 'bg-red-100 text-red-600' : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'
                    }`}
                  >
                    {isTesting ? (
                      <>
                        <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
                        <span>To'xtatish</span>
                      </>
                    ) : (
                      <>
                        <span>Sinab ko'rish</span>
                      </>
                    )}
                  </button>
                  <span className="text-indigo-600 font-black w-10 text-right">{minSpeed}x</span>
                </div>
              </div>
              <input 
                type="range" min="0.5" max="2.0" step="0.1"
                value={minSpeed} onChange={e => setMinSpeed(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">Sinov matni:</p>
                <p className="text-xs text-slate-600 italic leading-relaxed">
                  "{TEST_SENTENCES.join(" ")}"
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex space-x-4 pt-4">
          <button 
            onClick={onCancel} 
            disabled={isSubmitting}
            className="flex-1 py-4 font-bold text-slate-500 hover:bg-slate-50 rounded-2xl transition-all disabled:opacity-50"
          >
            Bekor qilish
          </button>
          <button 
            onClick={async () => {
              if (!title || !content || isSubmitting) return;
              setIsSubmitting(true);
              try {
                await onCreate({ title, content, type, minPlaybackSpeed: minSpeed });
              } catch (err) {
                console.error("Task creation failed:", err);
                setIsSubmitting(false);
              }
            }}
            disabled={!title || !content || isSubmitting}
            className="flex-grow py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Saqlanmoqda...</span>
              </>
            ) : (
              <span>{task ? 'Saqlash' : 'E\'lon qilish'}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
