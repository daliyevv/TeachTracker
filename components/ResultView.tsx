
import React, { useState, useRef, useEffect } from 'react';
import { AnalysisResult } from '../types';
import { speakText } from '../services/ttsService';

interface Props { result: AnalysisResult; imageSrc: string; }

export const ResultView: React.FC<Props> = ({ result, imageSrc }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [highlightedMistake, setHighlightedMistake] = useState<number | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [dim, setDim] = useState({ w: 0, h: 0 });

  // Rasm o'lchamini kuzatib borish
  useEffect(() => {
    const updateDimensions = () => {
      if (imgRef.current) {
        setDim({ 
          w: imgRef.current.clientWidth, 
          h: imgRef.current.clientHeight 
        });
      }
    };

    window.addEventListener('resize', updateDimensions);
    // Rasm yuklangandan keyin ham o'lchamni olish
    if (imgRef.current?.complete) updateDimensions();

    return () => window.removeEventListener('resize', updateDimensions);
  }, [imageSrc]);

  const handleSpeak = async () => {
    setIsPlaying(true);
    await speakText(result.feedback);
    setIsPlaying(false);
  };

  const scrollToMistake = (index: number) => {
    setHighlightedMistake(index);
    // 3 soniyadan keyin highlightni o'chirish
    setTimeout(() => setHighlightedMistake(null), 3000);
    
    // Rasmga qarab skroll qilish (agar kerak bo'lsa)
    imgRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
      {/* Statistika va Feedback */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-emerald-50 border border-emerald-100 p-8 rounded-[2rem] text-center shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:rotate-12 transition-transform">
             <svg className="w-20 h-20 text-emerald-900" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
          </div>
          <p className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-2 relative z-10">Diktant Bahosi</p>
          <p className="text-7xl font-black text-emerald-700 relative z-10">{result.grade}</p>
        </div>
        
        <div className="bg-white border border-slate-200 p-8 rounded-[2rem] md:col-span-2 relative shadow-sm group">
          <button 
            onClick={handleSpeak} 
            disabled={isPlaying} 
            className={`absolute top-6 right-6 p-4 rounded-2xl transition-all shadow-lg ${isPlaying ? 'bg-indigo-600 text-white animate-pulse' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217z" /></svg>
          </button>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Ustoz sharhi</p>
          <p className="text-xl font-serif text-slate-700 italic leading-relaxed pr-12">"{result.feedback}"</p>
        </div>
      </div>

      {/* Rasm va Xatolar (SVG Overlay) */}
      <div className="relative bg-white rounded-[3rem] shadow-2xl overflow-hidden border-8 border-white group/paper">
        <img 
          ref={imgRef} 
          src={imageSrc} 
          className="w-full h-auto block" 
          onLoad={() => setDim({ w: imgRef.current!.clientWidth, h: imgRef.current!.clientHeight })} 
          alt="Diktant varog'i"
        />
        
        {dim.w > 0 && (
          <svg 
            className="absolute top-0 left-0 w-full h-full pointer-events-none" 
            viewBox={`0 0 ${dim.w} ${dim.h}`}
          >
            <defs>
              {/* Ruchka effekti uchun filtr */}
              <filter id="squiggle" x="-10%" y="-10%" width="120%" height="120%">
                <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="3" result="noise" />
                <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" />
              </filter>
              
              {/* Highlight effekti uchun glow */}
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {result.mistakes.map((m, i) => {
              const [ymin, xmin, ymax, xmax] = m.boundingBox;
              const x = (xmin / 1000) * dim.w;
              const y = (ymin / 1000) * dim.h;
              const w = ((xmax - xmin) / 1000) * dim.w;
              const h = ((ymax - ymin) / 1000) * dim.h;
              
              const isHighlighted = highlightedMistake === i;

              return (
                <g key={i} className={`transition-all duration-500 ${isHighlighted ? 'opacity-100 scale-105' : 'opacity-80'}`}>
                  {/* To'lqinli qizil chiziq (Wavy underline) */}
                  <path 
                    filter="url(#squiggle)" 
                    d={`M ${x} ${y + h} C ${x + w/4} ${y + h + 4}, ${x + w/2} ${y + h - 4}, ${x + w*0.75} ${y + h + 4}, ${x + w} ${y + h}`} 
                    fill="none" 
                    stroke="#ef4444" 
                    strokeWidth={isHighlighted ? "5" : "3"} 
                    strokeLinecap="round"
                    className={isHighlighted ? "animate-pulse" : ""}
                  />
                  
                  {/* Raqamli marker */}
                  <g filter={isHighlighted ? "url(#glow)" : ""}>
                    <circle cx={x - 10} cy={y + 5} r="12" fill="#ef4444" className={isHighlighted ? "animate-bounce" : ""} />
                    <text x={x - 10} y={y + 9} textAnchor="middle" fill="white" fontSize="11" fontWeight="900">{i + 1}</text>
                  </g>
                </g>
              );
            })}
          </svg>
        )}
      </div>

      {/* Xatolar Ro'yxati */}
      <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-rose-100 text-rose-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <h3 className="font-bold text-slate-800 uppercase tracking-wider text-sm">Xatolar va tavsiyalar</h3>
          </div>
          <span className="bg-rose-100 text-rose-600 px-4 py-1.5 rounded-full text-xs font-black shadow-sm shadow-rose-50 border border-rose-200">
            {result.mistakes.length} ta xato aniqlandi
          </span>
        </div>
        
        <div className="divide-y divide-slate-100">
          {result.mistakes.length > 0 ? result.mistakes.map((m, i) => (
            <div 
              key={i} 
              onClick={() => scrollToMistake(i)}
              className={`p-6 flex items-start space-x-6 cursor-pointer transition-all ${highlightedMistake === i ? 'bg-indigo-50 ring-2 ring-inset ring-indigo-200' : 'hover:bg-slate-50'}`}
            >
              <div className="flex flex-col items-center">
                <span className="text-2xl font-black text-slate-200 font-mono">{(i+1).toString().padStart(2, '0')}</span>
                {highlightedMistake === i && <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full mt-1 animate-ping"></div>}
              </div>
              <div className="flex-grow">
                <div className="flex items-center space-x-3 mb-2">
                  <span className="text-rose-500 font-bold line-through decoration-2 bg-rose-50 px-2 py-0.5 rounded-lg">{m.word}</span>
                  <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 5l7 7m0 0l-7 7m7-7H3" /></svg>
                  <span className="text-emerald-600 font-black bg-emerald-50 px-2 py-0.5 rounded-lg">{m.correction}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${m.type === 'imlo' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                    {m.type === 'imlo' ? 'Imlo xatosi' : m.type === 'tinish_belgisi' ? 'Tinish belgisi' : 'Uslubiy'}
                  </span>
                  <p className="text-sm text-slate-500 font-medium">{m.description}</p>
                </div>
              </div>
              <div className="text-slate-300 group-hover:text-indigo-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              </div>
            </div>
          )) : (
            <div className="p-20 text-center">
              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
              </div>
              <p className="text-slate-500 font-bold">Ajoyib! Hech qanday xato topilmadi.</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Tavsiyalar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-indigo-600 rounded-[2.5rem] p-8 text-white shadow-xl shadow-indigo-100">
          <h4 className="text-xl font-black mb-6 flex items-center space-x-3">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            <span>Qanday yaxshilash mumkin?</span>
          </h4>
          <ul className="space-y-4">
            {result.improvementTips.map((tip, i) => (
              <li key={i} className="flex items-start space-x-3 bg-white/10 p-4 rounded-2xl backdrop-blur-sm">
                <span className="bg-white text-indigo-600 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0">{i+1}</span>
                <span className="font-medium text-sm leading-relaxed">{tip}</span>
              </li>
            ))}
          </ul>
        </div>
        
        <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm">
          <h4 className="text-xl font-black text-slate-800 mb-6 flex items-center space-x-3">
             <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
             <span>Husnihat tahlili</span>
          </h4>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
               <span className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Sifat darajasi</span>
               <span className="text-2xl font-black text-indigo-600">{result.handwritingScore}%</span>
            </div>
            <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden p-1">
              <div 
                className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-1000" 
                style={{ width: `${result.handwritingScore}%` }} 
              />
            </div>
            <p className="text-sm text-slate-500 font-medium leading-relaxed italic border-l-4 border-indigo-100 pl-4">
              Harflarning o'lchami va qiyaligi standartlarga juda yaqin. "o‘" va "g‘" harflari husnihat qoidalariga ko'ra to'g'ri yozilgan.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
