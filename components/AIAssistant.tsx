
import React, { useState } from 'react';
import { generateEducationalMaterial } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
import { Sparkles, FileText, CheckSquare, Layout, Download, Copy, RefreshCw, Printer } from 'lucide-react';
import { motion } from 'framer-motion';
import { CrosswordRenderer } from './CrosswordRenderer';
import { User } from '../types';

interface Props {
  user: User;
}

export const AIAssistant: React.FC<Props> = ({ user }) => {
  const [prompt, setPrompt] = useState('');
  const [type, setType] = useState<'lesson_plan' | 'test' | 'worksheet' | 'crossword'>('lesson_plan');
  const [result, setResult] = useState<any>('');
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!prompt) return;
    setLoading(true);
    try {
      const output = await generateEducationalMaterial(prompt, type);
      setResult(output);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    const textToCopy = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
    navigator.clipboard.writeText(textToCopy);
    alert('Nusxa olindi!');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const textToSave = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
    const blob = new Blob([textToSave], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${type}_material.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">AI Yordamchi</h1>
        <p className="text-xs sm:text-sm text-slate-500 font-medium">Professional dars materiallarini soniyalar ichida yarating</p>
      </div>

      <div className="bg-white p-5 sm:p-8 rounded-3xl sm:rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 space-y-5 sm:space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {[
              { id: 'lesson_plan', label: 'Dars Ishlanmasi', icon: Layout, color: 'text-indigo-600', bg: 'bg-indigo-50' },
              { id: 'test', label: 'Test Savollari', icon: CheckSquare, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { id: 'worksheet', label: 'Ish Varaqasi', icon: FileText, color: 'text-violet-600', bg: 'bg-violet-50' },
              { id: 'crossword', label: 'Krossvord', icon: Sparkles, color: 'text-amber-600', bg: 'bg-amber-50', pro: true },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setType(item.id as any)}
                className={`p-3 sm:p-4 rounded-2xl border-2 transition-all flex flex-col items-center space-y-1.5 sm:space-y-2 relative min-h-[48px] ${
                  type === item.id 
                    ? 'border-indigo-600 bg-indigo-50/50' 
                    : 'border-slate-50 hover:border-slate-200 bg-white'
                }`}
              >
                {item.pro && !user.isPro && (
                  <div className="absolute top-2 right-2">
                    <svg className="w-3 h-3 text-amber-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                  </div>
                )}
                <div className={`w-9 h-9 sm:w-10 sm:h-10 ${item.bg} ${item.color} rounded-xl flex items-center justify-center`}>
                  <item.icon className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <span className="text-[11px] sm:text-xs font-black text-slate-700">{item.label}</span>
              </button>
            ))}
        </div>

        <div className="space-y-2">
          <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Mavzu yoki Tavsif</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Masalan: 4-sinf uchun 'Ona tili' fanidan 'Ot so'z turkumi' mavzusida dars ishlanmasi..."
            className="w-full h-32 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-600 focus:bg-white transition-all text-slate-800 font-medium placeholder:text-slate-300 text-sm sm:text-base outline-none"
          />
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading || !prompt || (!user.isPro && type === 'crossword')}
          className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm sm:text-base flex items-center justify-center space-x-2 hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg shadow-indigo-200 min-h-[48px]"
        >
          {loading ? (
            <RefreshCw className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              <span>{(!user.isPro && type === 'crossword') ? "Pro tarifga o'ting" : "Material Yaratish"}</span>
            </>
          )}
        </button>
      </div>

      {result && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-5 sm:p-8 rounded-3xl sm:rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 space-y-6"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h2 className="text-lg sm:text-xl font-black text-slate-900">Natija</h2>
            <div className="flex items-center space-x-1 sm:space-x-2">
              <button 
                onClick={copyToClipboard}
                className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all min-h-[40px] min-w-[40px] flex items-center justify-center"
                title="Nusxa olish"
              >
                <Copy className="w-5 h-5" />
              </button>
              <button 
                onClick={handlePrint}
                className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all min-h-[40px] min-w-[40px] flex items-center justify-center"
                title="Chop etish"
              >
                <Printer className="w-5 h-5" />
              </button>
              <button 
                onClick={handleDownload}
                className="p-2.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all min-h-[40px] min-w-[40px] flex items-center justify-center"
                title="Yuklab olish"
              >
                <Download className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          <div className="prose prose-slate max-w-none prose-headings:font-black prose-p:font-medium prose-p:text-slate-600">
            {type === 'crossword' && typeof result === 'object' ? (
              <CrosswordRenderer data={result} />
            ) : (
              <ReactMarkdown>{result}</ReactMarkdown>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
};
