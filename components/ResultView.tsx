
import React, { useState, useRef, useEffect } from 'react';
import { AnalysisResult, SubmissionFile } from '../types';
import { speakText, AudioController } from '../services/ttsService';
import confetti from 'canvas-confetti';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { FileCode, Image as ImageIcon, MessageSquare, AlertCircle, CheckCircle2 } from 'lucide-react';

interface Props { result: AnalysisResult; images?: string[]; files?: SubmissionFile[]; }

export const ResultView: React.FC<Props> = ({ result, images = [], files = [] }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [audioController, setAudioController] = useState<AudioController | null>(null);
  const [highlightedMistake, setHighlightedMistake] = useState<number | null>(null);
  const [activePage, setActivePage] = useState(0);
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'images' | 'files'>(files.length > 0 ? 'files' : 'images');
  const imgRef = useRef<HTMLImageElement>(null);
  const [dim, setDim] = useState({ w: 0, h: 0 });

  const mistakes = result?.mistakes || [];

  useEffect(() => {
    if (result.grade >= 4) {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#10b981', '#6366f1', '#f59e0b']
      });
    }
  }, [result.grade]);

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
    if (imgRef.current?.complete) updateDimensions();

    return () => window.removeEventListener('resize', updateDimensions);
  }, [activePage, images, viewMode]);

  useEffect(() => {
    return () => {
      if (audioController) {
        audioController.stop();
      }
    };
  }, [audioController]);

  const handleSpeak = async () => {
    if (audioController) {
      audioController.stop();
      setAudioController(null);
      setIsPlaying(false);
      setIsPaused(false);
      return;
    }

    setIsPlaying(true);
    const controller = await speakText(result.feedback, 1.0, () => {
      setAudioController(null);
      setIsPlaying(false);
      setIsPaused(false);
    });
    if (controller) {
      setAudioController(controller);
    } else {
      setIsPlaying(false);
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

  const scrollToMistake = (index: number) => {
    const mistake = result.mistakes[index];
    if (images.length > 0) {
      setActivePage(mistake.pageIndex);
      setViewMode('images');
    }
    setHighlightedMistake(index);
    setTimeout(() => setHighlightedMistake(null), 3000);
    
    if (images.length > 0) {
      setTimeout(() => {
        imgRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  };

  const badges = [
    { id: 'imlo_ustasi', label: 'Imlo Ustasi', icon: '✍️', color: 'bg-amber-500' },
    { id: 'husnihat_qiroli', label: 'Husnihat Qiroli', icon: '👑', color: 'bg-indigo-500' },
    { id: 'besh_yulduz', label: '5 Yulduz', icon: '⭐️', color: 'bg-emerald-500' }
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700 p-6">
      {/* Statistika va Feedback */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-emerald-50 border border-emerald-100 p-8 rounded-[2rem] text-center shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:rotate-12 transition-transform">
             <svg className="w-20 h-20 text-emerald-900" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
          </div>
          <p className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-2 relative z-10">Vazifa Bahosi</p>
          <p className="text-7xl font-black text-emerald-700 relative z-10">{result.grade}</p>
          {result.grade >= 4 && (
            <div className="mt-4 inline-flex items-center space-x-2 bg-emerald-500 text-white px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter animate-bounce">
              <span>{result.grade === 5 ? 'Mukammal!' : 'Yaxshi!'}</span>
            </div>
          )}
        </div>
        
        <div className="bg-white border border-slate-200 p-8 rounded-[2rem] md:col-span-2 relative shadow-sm group">
          <div className="absolute top-6 right-6 flex items-center space-x-2">
            <button 
              onClick={handleSpeak} 
              className={`p-4 rounded-2xl transition-all shadow-lg ${audioController ? 'bg-rose-500 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
            >
              {audioController ? (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" /></svg>
              ) : (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217z" /></svg>
              )}
            </button>
            {audioController && (
              <button 
                onClick={togglePause}
                className="p-4 bg-white border-2 border-slate-100 rounded-2xl text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
              >
                {isPaused ? (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                ) : (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                )}
              </button>
            )}
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Ustoz sharhi</p>
          <p className="text-xl font-serif text-slate-700 italic leading-relaxed pr-12">"{result.feedback}"</p>
          
          {result.grade === 5 && images.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-3">
              {badges.map(b => (
                <div key={b.id} className={`${b.color} text-white px-4 py-2 rounded-2xl flex items-center space-x-2 shadow-lg animate-in zoom-in duration-500`}>
                  <span className="text-xl">{b.icon}</span>
                  <span className="text-xs font-black uppercase tracking-tight">{b.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Rejimlar navigatsiyasi */}
      {images.length > 0 && files.length > 0 && (
        <div className="flex justify-center space-x-4">
          <button 
            onClick={() => setViewMode('images')}
            className={`px-6 py-3 rounded-2xl font-black transition-all flex items-center gap-2 ${viewMode === 'images' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200'}`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>Rasmlar</span>
          </button>
          <button 
            onClick={() => setViewMode('files')}
            className={`px-6 py-3 rounded-2xl font-black transition-all flex items-center gap-2 ${viewMode === 'files' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200'}`}
          >
            <FileCode className="w-4 h-4" />
            <span>Fayllar</span>
          </button>
        </div>
      )}

      {/* Asosiy kontent */}
      {viewMode === 'images' && images.length > 0 && (
        <div className="space-y-6">
          {images.length > 1 && (
            <div className="flex justify-center space-x-4">
              {images.map((_, i) => (
                <button 
                  key={i}
                  onClick={() => setActivePage(i)}
                  className={`px-6 py-3 rounded-2xl font-black transition-all ${activePage === i ? 'bg-indigo-600 text-white shadow-lg scale-110' : 'bg-white text-slate-400 border border-slate-200 hover:bg-slate-50'}`}
                >
                  {i + 1}-bet
                </button>
              ))}
            </div>
          )}

          <div className="relative bg-white rounded-[3rem] shadow-2xl overflow-hidden border-8 border-white group/paper">
            <img 
              ref={imgRef} 
              src={images[activePage]} 
              className="w-full h-auto block" 
              onLoad={() => setDim({ w: imgRef.current!.clientWidth, h: imgRef.current!.clientHeight })} 
              alt={`Varaq ${activePage + 1}`}
            />
            
            {dim.w > 0 && (
              <svg 
                className="absolute top-0 left-0 w-full h-full pointer-events-none" 
                viewBox={`0 0 ${dim.w} ${dim.h}`}
              >
                <defs>
                  <filter id="squiggle" x="-10%" y="-10%" width="120%" height="120%">
                    <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="3" result="noise" />
                    <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" />
                  </filter>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {mistakes.filter(m => m.pageIndex === activePage && m.boundingBox && m.boundingBox.length === 4).map((m, i) => {
                  const [ymin, xmin, ymax, xmax] = m.boundingBox;
                  const x = (xmin / 1000) * dim.w;
                  const y = (ymin / 1000) * dim.h;
                  const w = ((xmax - xmin) / 1000) * dim.w;
                  const h = ((ymax - ymin) / 1000) * dim.h;
                  
                  const isHighlighted = highlightedMistake === mistakes.indexOf(m);

                  return (
                    <g key={i} className={`transition-all duration-500 ${isHighlighted ? 'opacity-100 scale-105' : 'opacity-80'}`}>
                      <path 
                        filter="url(#squiggle)" 
                        d={`M ${x} ${y + h} C ${x + w/4} ${y + h + 4}, ${x + w/2} ${y + h - 4}, ${x + w*0.75} ${y + h + 4}, ${x + w} ${y + h}`} 
                        fill="none" 
                        stroke="#ef4444" 
                        strokeWidth={isHighlighted ? "5" : "3"} 
                        strokeLinecap="round"
                        className={isHighlighted ? "animate-pulse" : ""}
                      />
                      <g filter={isHighlighted ? "url(#glow)" : ""}>
                        <circle cx={x - 10} cy={y + 5} r="12" fill="#ef4444" className={isHighlighted ? "animate-bounce" : ""} />
                        <text x={x - 10} y={y + 9} textAnchor="middle" fill="white" fontSize="11" fontWeight="900">{result.mistakes.indexOf(m) + 1}</text>
                      </g>
                    </g>
                  );
                })}
              </svg>
            )}
          </div>
        </div>
      )}

      {viewMode === 'files' && files.length > 0 && (
        <div className="space-y-6">
          <div className="flex flex-wrap justify-center gap-3">
            {files.map((f, i) => (
              <button 
                key={i}
                onClick={() => setActiveFileIndex(i)}
                className={`px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${activeFileIndex === i ? 'bg-slate-800 text-white shadow-lg' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}
              >
                <FileCode className="w-4 h-4" />
                <span>{f.name}</span>
              </button>
            ))}
          </div>

          <div className="bg-slate-900 rounded-[2rem] overflow-hidden shadow-2xl border-4 border-slate-800">
            <div className="bg-slate-800 px-6 py-3 flex items-center justify-between">
              <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{files[activeFileIndex].name}</span>
              <div className="flex space-x-1.5">
                <div className="w-2.5 h-2.5 bg-rose-500 rounded-full"></div>
                <div className="w-2.5 h-2.5 bg-amber-500 rounded-full"></div>
                <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></div>
              </div>
            </div>
            <div className="max-h-[600px] overflow-y-auto">
              {files[activeFileIndex].data ? (
                <div className="flex flex-col items-center justify-center py-20 bg-slate-800 text-center px-6">
                  <div className="w-20 h-20 bg-slate-700 text-slate-400 rounded-3xl flex items-center justify-center mb-6">
                    <FileCode className="w-10 h-10" />
                  </div>
                  <h4 className="text-white font-black text-lg mb-2">{files[activeFileIndex].name}</h4>
                  <p className="text-slate-400 text-sm mb-8 max-w-xs">Ushbu fayl formati ({files[activeFileIndex].mimeType}) matn ko'rinishida ko'rsatib bo'lmaydi.</p>
                  <a 
                    href={`data:${files[activeFileIndex].mimeType};base64,${files[activeFileIndex].data}`} 
                    download={files[activeFileIndex].name}
                    className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-900/20"
                  >
                    Faylni yuklab olish
                  </a>
                </div>
              ) : (
                <SyntaxHighlighter 
                  language={files[activeFileIndex].language || 'text'} 
                  style={vscDarkPlus}
                  customStyle={{ margin: 0, padding: '2rem', fontSize: '14px', lineHeight: '1.6' }}
                  showLineNumbers
                >
                  {files[activeFileIndex].content || ''}
                </SyntaxHighlighter>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Xatolar Ro'yxati */}
      <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-rose-100 text-rose-600 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-800 uppercase tracking-wider text-sm">Xatolar va tavsiyalar</h3>
          </div>
          <span className="bg-rose-100 text-rose-600 px-4 py-1.5 rounded-full text-xs font-black shadow-sm shadow-rose-50 border border-rose-200">
            {mistakes.length} ta xato aniqlandi
          </span>
        </div>
        
        <div className="divide-y divide-slate-100">
          {mistakes.length > 0 ? mistakes.map((m, i) => (
            <div 
              key={i} 
              onClick={() => scrollToMistake(i)}
              className={`p-6 flex items-start space-x-6 cursor-pointer transition-all ${highlightedMistake === i ? 'bg-indigo-50 ring-2 ring-inset ring-indigo-200' : 'hover:bg-slate-50'}`}
            >
              <div className="flex flex-col items-center">
                <span className="text-2xl font-black text-slate-200 font-mono">{(i+1).toString().padStart(2, '0')}</span>
                {images.length > 0 && <span className="text-[8px] font-black text-slate-400 mt-1 uppercase tracking-tighter">{m.pageIndex + 1}-bet</span>}
              </div>
              <div className="flex-grow">
                <div className="flex items-center space-x-3 mb-2">
                  <span className="text-rose-500 font-bold line-through decoration-2 bg-rose-50 px-2 py-0.5 rounded-lg">{m.word}</span>
                  <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 5l7 7m0 0l-7 7m7-7H3" /></svg>
                  <span className="text-emerald-600 font-black bg-emerald-50 px-2 py-0.5 rounded-lg">{m.correction}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                    m.type === 'imlo' ? 'bg-amber-100 text-amber-700' : 
                    m.type === 'sintaksis' ? 'bg-rose-100 text-rose-700' :
                    m.type === 'mantiq' ? 'bg-violet-100 text-violet-700' :
                    m.type === 'xavfsizlik' ? 'bg-red-100 text-red-700' :
                    m.type === 'tinish_belgisi' ? 'bg-blue-100 text-blue-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {m.type === 'imlo' ? 'Imlo' : 
                     m.type === 'tinish_belgisi' ? 'Tinish belgisi' : 
                     m.type === 'sintaksis' ? 'Sintaksis' : 
                     m.type === 'mantiq' ? 'Mantiq' : 
                     m.type === 'xavfsizlik' ? 'Xavfsizlik' : 
                     'Uslubiy'}
                  </span>
                  <p className="text-sm text-slate-500 font-medium">{m.description}</p>
                </div>
                {m.lineNumber > 0 && <p className="text-[10px] text-slate-400 mt-1 font-bold">Qator: {m.lineNumber}</p>}
              </div>
            </div>
          )) : (
            <div className="p-20 text-center">
              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <p className="text-slate-500 font-bold">Ajoyib! Hech qanday xato topilmadi.</p>
            </div>
          )}
        </div>
      </div>

      {/* Tavsiyalar */}
      {result.improvementTips && result.improvementTips.length > 0 && (
        <div className="bg-indigo-600 rounded-[2rem] p-8 text-white shadow-xl shadow-indigo-200">
          <div className="flex items-center space-x-3 mb-6">
            <MessageSquare className="w-6 h-6" />
            <h3 className="text-xl font-black uppercase tracking-wider">O'sish uchun tavsiyalar</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {result.improvementTips.map((tip, i) => (
              <div key={i} className="bg-white/10 p-4 rounded-2xl flex items-start space-x-3 border border-white/10">
                <span className="text-indigo-200 font-black">0{i+1}</span>
                <p className="text-sm font-medium leading-relaxed">{tip}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

