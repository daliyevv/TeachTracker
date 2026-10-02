
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AnalysisResult, SubmissionFile } from '../types';
import { speakText, AudioController } from '../services/ttsService';
import confetti from 'canvas-confetti';
import { CodeBlock } from './CodeBlock';
import { FileCode, Image as ImageIcon, MessageSquare, AlertCircle, CheckCircle2 } from 'lucide-react';

const EMPTY_IMAGES: string[] = [];
const EMPTY_FILES: SubmissionFile[] = [];

interface Props { 
  result: AnalysisResult; 
  images?: string[]; 
  files?: SubmissionFile[]; 
  onUpdateResult?: (updated: AnalysisResult) => void;
}

export const ResultView: React.FC<Props> = ({ result, images = EMPTY_IMAGES, files = EMPTY_FILES, onUpdateResult }) => {
  // Rasmlarni ham images propidan, ham files ichidagi image/* fayllaridan aniqlaymiz (memoized)
  const extractedFileImages: string[] = useMemo(() => {
    if (!files || files.length === 0) return EMPTY_IMAGES;
    return files
      .filter(f => (f.mimeType?.startsWith('image/') || /\.(jpe?g|png|webp|gif|bmp)$/i.test(f.name)) && (f.data || f.content))
      .map(f => {
        if (f.data) {
          return f.data.startsWith('data:') ? f.data : `data:${f.mimeType || 'image/jpeg'};base64,${f.data}`;
        }
        return f.content || '';
      })
      .filter(Boolean);
  }, [files]);

  /**
   * Ko'rsatiladigan rasmlar.
   *
   * MUHIM: `images` ning TARTIBI va INDEKSLARI o'zgarmasligi kerak. Sun'iy
   * intellekt har xatoga `pageIndex` beradi va u aynan shu massivdagi
   * o'rinni bildiradi.
   *
   * Ilgari bu yerda `Array.from(new Set(allImages))` turardi. Takrorlangan
   * rasm bo'lsa (masalan o'quvchi bir varaqni ikki marta yuklasa), Set uni
   * olib tashlar va KEYINGI hamma sahifaning indeksi SURILIB ketardi —
   * qizil chiziqlar butunlay boshqa varaqqa tushardi.
   *
   * Endi `images` butunligicha qoladi; `files` ichidan chiqqan rasmlardan
   * esa faqat `images` da yo'qlari qo'shiladi (ular bir xil rasmning
   * nusxasi bo'lishi mumkin).
   */
  const displayImages: string[] = useMemo(() => {
    const base = (images || []).filter(Boolean);
    const seen = new Set(base);
    const extras = extractedFileImages.filter(src => {
      if (!src || seen.has(src)) return false;
      seen.add(src);
      return true;
    });
    const all = [...base, ...extras];
    return all.length === 0 ? EMPTY_IMAGES : all;
  }, [images, extractedFileImages]);

  const nonImageFiles = useMemo(() => {
    if (!files || files.length === 0) return EMPTY_FILES;
    return files.filter(f => !f.mimeType?.startsWith('image/') && !/\.(jpe?g|png|webp|gif|bmp)$/i.test(f.name));
  }, [files]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [audioController, setAudioController] = useState<AudioController | null>(null);
  const [highlightedMistake, setHighlightedMistake] = useState<number | null>(null);
  const [activePage, setActivePage] = useState(0);
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [selectedMode, setSelectedMode] = useState<'images' | 'files' | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const getNormalizedBox = (boundingBox: any): [number, number, number, number] => {
    let box = Array.isArray(boundingBox) ? [...boundingBox] : [0, 0, 0, 0];
    if (box.length !== 4) return [0, 0, 0, 0];
    let [c0, c1, c2, c3] = box.map((v: any) => Number(v) || 0);

    const maxVal = Math.max(c0, c1, c2, c3);
    if (maxVal > 0 && maxVal <= 1.0) {
      c0 *= 1000;
      c1 *= 1000;
      c2 *= 1000;
      c3 *= 1000;
    }

    let ymin = Math.max(0, Math.min(1000, Math.round(Math.min(c0, c2))));
    let ymax = Math.max(0, Math.min(1000, Math.round(Math.max(c0, c2))));
    let xmin = Math.max(0, Math.min(1000, Math.round(Math.min(c1, c3))));
    let xmax = Math.max(0, Math.min(1000, Math.round(Math.max(c1, c3))));

    // Minimal ko'rinish uchun nozik cheklov (boshqa so'zlarga siljimasligi uchun)
    if (xmax - xmin < 8 && xmax - xmin >= 0) {
      const mid = (xmin + xmax) / 2;
      xmin = Math.max(0, Math.round(mid - 4));
      xmax = Math.min(1000, Math.round(mid + 4));
    }
    if (ymax - ymin < 8 && ymax - ymin >= 0) {
      const mid = (ymin + ymax) / 2;
      ymin = Math.max(0, Math.round(mid - 4));
      ymax = Math.min(1000, Math.round(mid + 4));
    }

    return [ymin, xmin, ymax, xmax];
  };

  const viewMode = selectedMode || (displayImages.length > 0 ? 'images' : 'files');
  const mistakes = result?.mistakes || [];

  /**
   * Xato qaysi sahifada ekanini qaytaradi.
   *
   * `pageIndex` chegaradan chiqib ketgan bo'lsa (AI yo'q sahifani
   * ko'rsatsa yoki ustoz qo'lda katta son yozsa) 0 ga tushamiz. Ilgari
   * bunday xatoning chizig'i HECH QAYSI sahifada ko'rinmasdi: `pIndex`
   * hech qanday `activePage` ga teng bo'lmay qolardi.
   */
  const pageOf = (m: { pageIndex?: number }): number => {
    const raw = typeof m.pageIndex === 'number' && Number.isFinite(m.pageIndex) ? m.pageIndex : 0;
    if (displayImages.length === 0) return 0;
    return raw >= 0 && raw < displayImages.length ? raw : 0;
  };

  useEffect(() => {
    if (result && result.grade >= 4) {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#10b981', '#6366f1', '#f59e0b']
      });
    }
  }, [result?.grade]);

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
    const mistake = result?.mistakes?.[index];
    if (!mistake) return;
    if (displayImages.length > 0) {
      const page = pageOf(mistake);
      setActivePage(page);
      setSelectedMode('images');
    }
    setHighlightedMistake(index);
    setTimeout(() => setHighlightedMistake(null), 3000);
    
    if (displayImages.length > 0) {
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

  const filesToDisplay = nonImageFiles.length > 0 ? nonImageFiles : files;

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700 p-3 sm:p-6">
      {/* Statistika va Feedback */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-emerald-50 border border-emerald-100 p-6 sm:p-8 rounded-3xl text-center shadow-xs relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:rotate-12 transition-transform">
             <svg className="w-20 h-20 text-emerald-900" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
          </div>
          <p className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-1 sm:mb-2 relative z-10">Vazifa Bahosi</p>
          <p className="text-5xl sm:text-7xl font-black text-emerald-700 relative z-10">{result.grade}</p>
          {result.grade >= 4 && (
            <div className="mt-3 sm:mt-4 inline-flex items-center space-x-2 bg-emerald-500 text-white px-3 sm:px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter animate-bounce">
              <span>{result.grade === 5 ? 'Mukammal!' : 'Yaxshi!'}</span>
            </div>
          )}
        </div>
        
        <div className="bg-white border border-slate-200 p-6 sm:p-8 rounded-3xl md:col-span-2 relative shadow-xs group">
          <div className="absolute top-4 sm:top-6 right-4 sm:right-6 flex items-center space-x-2">
            <button 
              onClick={handleSpeak} 
              className={`p-3 sm:p-4 rounded-2xl transition-all shadow-md min-h-[44px] min-w-[44px] flex items-center justify-center ${audioController ? 'bg-rose-500 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
              title="Ovozli eshitish"
              aria-label="Sharhni ovozli eshitish"
            >
              {audioController ? (
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" /></svg>
              ) : (
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217z" /></svg>
              )}
            </button>
            {audioController && (
              <button 
                onClick={togglePause}
                className="p-3 sm:p-4 bg-white border-2 border-slate-100 rounded-2xl text-slate-600 hover:bg-slate-50 transition-all shadow-xs min-h-[44px] min-w-[44px] flex items-center justify-center"
                title="Pauza / Davom ettirish"
                aria-label="Pauza / Davom ettirish"
              >
                {isPaused ? (
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                ) : (
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                )}
              </button>
            )}
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Ustoz sharhi</p>
          <p className="text-base sm:text-xl font-serif text-slate-700 italic leading-relaxed pr-16">"{result.feedback}"</p>
          
          {result.grade === 5 && displayImages.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2 sm:gap-3">
              {badges.map(b => (
                <div key={b.id} className={`${b.color} text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-2xl flex items-center space-x-2 shadow-md animate-in zoom-in duration-500`}>
                  <span className="text-lg sm:text-xl">{b.icon}</span>
                  <span className="text-[10px] sm:text-xs font-black uppercase tracking-tight">{b.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Rejimlar navigatsiyasi */}
      {displayImages.length > 0 && nonImageFiles.length > 0 && (
        <div className="flex justify-center space-x-4">
          <button 
            onClick={() => setSelectedMode('images')}
            className={`px-6 py-3 rounded-2xl font-black transition-all flex items-center gap-2 ${viewMode === 'images' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200 hover:bg-slate-50'}`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>Rasmlar ({displayImages.length})</span>
          </button>
          <button 
            onClick={() => setSelectedMode('files')}
            className={`px-6 py-3 rounded-2xl font-black transition-all flex items-center gap-2 ${viewMode === 'files' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200 hover:bg-slate-50'}`}
          >
            <FileCode className="w-4 h-4" />
            <span>Fayllar ({nonImageFiles.length})</span>
          </button>
        </div>
      )}

      {/* Asosiy kontent - Rasmlar */}
      {viewMode === 'images' && displayImages.length > 0 && (
        <div className="space-y-6">
          {displayImages.length > 1 && (
            <div className="flex justify-center space-x-4">
              {displayImages.map((_, i) => (
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
              src={displayImages[activePage] || displayImages[0]} 
              className="w-full h-auto block select-none pointer-events-none" 
              alt={`Varaq ${activePage + 1}`}
            />
            
            <svg 
              className="absolute top-0 left-0 w-full h-full pointer-events-none"
              viewBox="0 0 1000 1000"
              preserveAspectRatio="none"
            >
              <defs>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {mistakes.filter(m => {
                const pIndex = pageOf(m);
                const isCurrentPage = displayImages.length === 1 || pIndex === activePage;
                const box = (m as any).box_2d || m.boundingBox;
                const hasValidCoords = Array.isArray(box) && box.length === 4 && 
                  (box[0] > 0 || box[1] > 0 || box[2] > 0 || box[3] > 0);
                return isCurrentPage && hasValidCoords;
              }).map((m, i) => {
                const [ymin, xmin, ymax, xmax] = getNormalizedBox((m as any).box_2d || m.boundingBox);
                const w = Math.max(6, xmax - xmin);
                const h = Math.max(6, ymax - ymin);
                const x = xmin;
                const y = ymin;

                // 1. So'z tagidagi daftarning chizig'i (underline baseline) - aynan harflar tagida
                const baselineY = Math.min(996, ymax + 2);

                // 2. So'z ustidan qizil chiziq (strikethrough) - harflar o'rtasidan
                const strikeY = y + h * 0.52;
                
                const mistakeIndex = mistakes.indexOf(m);
                const isHighlighted = highlightedMistake === mistakeIndex;

                // Haqiqiy o'qituvchi ruchkasi kabi toza to'lqinsimon chiziq
                const waveStep = Math.max(5, Math.min(10, w / 4));
                const waveCount = Math.max(2, Math.round(w / waveStep));
                const step = w / waveCount;
                let wavePath = `M ${x} ${baselineY}`;
                for (let k = 0; k < waveCount; k++) {
                  const xStart = x + k * step;
                  const xEnd = xStart + step;
                  const xMid = (xStart + xEnd) / 2;
                  const amp = k % 2 === 0 ? 1.8 : -1.8;
                  wavePath += ` Q ${xMid} ${baselineY + amp}, ${xEnd} ${baselineY}`;
                }

                // To'g'ri variant va raqam nishoni joylashuvi (so'zning tepasida ixcham)
                const pillWidth = Math.max(28, (m.correction ? m.correction.length * 8 + 24 : 32));
                const pillX = Math.max(4, Math.min(996 - pillWidth, x));
                const pillY = y > 24 ? y - 20 : baselineY + 8;

                return (
                  <g 
                    key={i} 
                    className="cursor-pointer pointer-events-auto"
                    onClick={() => scrollToMistake(mistakeIndex)}
                  >
                    {/* Katta teginish maydoni (Mobile/touch hitbox - barmoq bilan bosish qulayligi uchun) */}
                    <rect 
                      x={Math.max(0, x - 10)} 
                      y={Math.max(0, y - 14)} 
                      width={w + 20} 
                      height={h + 28} 
                      fill="transparent" 
                    />

                    {/* Hover yoki highlight paytida nozik e'tibor ramkasi */}
                    {isHighlighted && (
                      <rect
                        x={x - 2}
                        y={y - 2}
                        width={w + 4}
                        height={h + 4}
                        fill="rgba(239, 68, 68, 0.12)"
                        rx="3"
                        stroke="#dc2626"
                        strokeWidth="1.5"
                        strokeDasharray="3 3"
                      />
                    )}

                    {/* Qizil ruchka bilan AYNAN XATO SO'ZNING USTIDAN chizish (o'qituvchi chizig'i) */}
                    <line 
                      x1={x} 
                      y1={strikeY} 
                      x2={x + w} 
                      y2={strikeY} 
                      stroke="#ef4444" 
                      strokeWidth={isHighlighted ? "3" : "2.2"} 
                      strokeLinecap="round"
                    />

                    {/* Xato so'zning TAGIDAN daftardagi silliq to'lqinsimon qizil chiziq */}
                    <path 
                      d={wavePath}
                      fill="none" 
                      stroke="#ef4444" 
                      strokeWidth={isHighlighted ? "2.8" : "2"} 
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {/* Xato so'z tepasida ixcham to'g'ri variant va raqam nishoni */}
                    <g filter={isHighlighted ? "url(#glow)" : ""}>
                      <rect 
                        x={pillX} 
                        y={pillY} 
                        width={pillWidth} 
                        height="17" 
                        rx="4.5" 
                        fill={isHighlighted ? "#047857" : "#059669"} 
                        className="shadow-sm transition-all"
                      />
                      {/* Raqam doirasi (tepada, so'z ustida ixcham) */}
                      <circle 
                        cx={pillX + 8.5} 
                        cy={pillY + 8.5} 
                        r="6" 
                        fill="#ef4444" 
                      />
                      <text 
                        x={pillX + 8.5} 
                        y={pillY + 11.5} 
                        textAnchor="middle" 
                        fill="white" 
                        fontSize="7.5" 
                        fontWeight="900"
                        fontFamily="system-ui, sans-serif"
                      >
                        {mistakeIndex + 1}
                      </text>
                      {/* To'g'ri so'z varianti */}
                      {m.correction && (
                        <text 
                          x={pillX + 18} 
                          y={pillY + 12} 
                          fill="white" 
                          fontSize="9.5" 
                          fontWeight="bold" 
                          fontFamily="system-ui, sans-serif"
                        >
                          {m.correction}
                        </text>
                      )}
                    </g>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      )}

      {/* Fayllar ko'rinishi */}
      {viewMode === 'files' && filesToDisplay.length > 0 && (
        <div className="space-y-6">
          <div className="flex flex-wrap justify-center gap-3">
            {filesToDisplay.map((f, i) => (
              <button 
                key={i}
                onClick={() => setActiveFileIndex(i)}
                className={`px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${activeFileIndex === i ? 'bg-slate-800 text-white shadow-lg' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}
              >
                {f.mimeType?.startsWith('image/') || /\.(jpe?g|png|webp|gif|bmp)$/i.test(f.name) ? (
                  <ImageIcon className="w-4 h-4 text-emerald-500" />
                ) : (
                  <FileCode className="w-4 h-4" />
                )}
                <span>{f.name}</span>
              </button>
            ))}
          </div>

          <div className="bg-slate-900 rounded-[2rem] overflow-hidden shadow-2xl border-4 border-slate-800">
            <div className="bg-slate-800 px-6 py-3 flex items-center justify-between">
              <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{filesToDisplay[activeFileIndex]?.name || 'Fayl'}</span>
              <div className="flex space-x-1.5">
                <div className="w-2.5 h-2.5 bg-rose-500 rounded-full"></div>
                <div className="w-2.5 h-2.5 bg-amber-500 rounded-full"></div>
                <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></div>
              </div>
            </div>
            <div className="max-h-[600px] overflow-y-auto">
              {(() => {
                const currentFile = filesToDisplay[activeFileIndex];
                if (!currentFile) return null;
                const isImg = currentFile.mimeType?.startsWith('image/') || /\.(jpe?g|png|webp|gif|bmp)$/i.test(currentFile.name);
                
                if (isImg) {
                  const imgSrc = currentFile.data 
                    ? (currentFile.data.startsWith('data:') ? currentFile.data : `data:${currentFile.mimeType || 'image/jpeg'};base64,${currentFile.data}`)
                    : (currentFile.content || '');
                  return (
                    <div className="p-6 flex flex-col items-center justify-center bg-slate-950 space-y-4">
                      <img src={imgSrc} alt={currentFile.name} className="max-h-[500px] rounded-2xl shadow-xl object-contain border border-slate-800" />
                      <p className="text-slate-400 text-xs font-mono">{currentFile.name}</p>
                    </div>
                  );
                }

                if (currentFile.data) {
                  return (
                    <div className="flex flex-col items-center justify-center py-20 bg-slate-800 text-center px-6">
                      <div className="w-20 h-20 bg-slate-700 text-slate-400 rounded-3xl flex items-center justify-center mb-6">
                        <FileCode className="w-10 h-10" />
                      </div>
                      <h4 className="text-white font-black text-lg mb-2">{currentFile.name}</h4>
                      <p className="text-slate-400 text-sm mb-8 max-w-xs">Ushbu fayl formati ({currentFile.mimeType || 'ikkilik fayl'}) matn ko'rinishida ko'rsatib bo'lmaydi.</p>
                      <a 
                        href={`data:${currentFile.mimeType || 'application/octet-stream'};base64,${currentFile.data}`} 
                        download={currentFile.name}
                        className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-900/20"
                      >
                        Faylni yuklab olish
                      </a>
                    </div>
                  );
                }

                return (
                  <CodeBlock
                    language={currentFile.language || 'text'}
                    customStyle={{ margin: 0, padding: '2rem', fontSize: '14px', lineHeight: '1.6' }}
                    showLineNumbers
                  >
                    {currentFile.content || ''}
                  </CodeBlock>
                );
              })()}
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
              className={`p-4 sm:p-6 flex items-start space-x-3 sm:space-x-6 cursor-pointer transition-all ${highlightedMistake === i ? 'bg-indigo-50 ring-2 ring-inset ring-indigo-200' : 'hover:bg-slate-50'}`}
            >
              <div className="flex flex-col items-center shrink-0">
                <span className="text-xl sm:text-2xl font-black text-slate-300 font-mono">{(i+1).toString().padStart(2, '0')}</span>
                {displayImages.length > 0 && <span className="text-[8px] font-black text-slate-400 mt-0.5 sm:mt-1 uppercase tracking-tighter">{pageOf(m) + 1}-bet</span>}
              </div>
              <div className="flex-grow min-w-0">
                <div className="flex flex-wrap items-center gap-2 sm:space-x-3 mb-2">
                  <span className="text-rose-500 font-bold line-through decoration-2 bg-rose-50 px-2.5 py-0.5 rounded-lg text-sm sm:text-base">{m.word}</span>
                  <svg className="w-4 h-4 text-slate-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 5l7 7m0 0l-7 7m7-7H3" /></svg>
                  <span className="text-emerald-600 font-black bg-emerald-50 px-2.5 py-0.5 rounded-lg text-sm sm:text-base">{m.correction}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md shrink-0 ${
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
                  <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">{m.description}</p>
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

