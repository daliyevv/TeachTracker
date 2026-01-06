
import React, { useRef, useState, useEffect } from 'react';

interface UploaderProps {
  onImageSelect: (base64: string) => void;
  isLoading: boolean;
}

export const Uploader: React.FC<UploaderProps> = ({ onImageSelect, isLoading }) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [isCamera, setIsCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Ctrl+V (Paste) orqali rasm yuklash imkoniyati
  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      // Agar rasm yuklanayotgan bo'lsa yoki kamera ochiq bo'lsa, paste ishlamaydi
      if (isLoading || isCamera) return;

      const items = event.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        // Agar clipboarddagi element rasm bo'lsa
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64 = reader.result as string;
              setPreview(base64);
              onImageSelect(base64);
            };
            reader.readAsDataURL(blob);
          }
          // Birinchi topilgan rasmni olamiz va to'xtaymiz
          break;
        }
      }
    };

    // Global paste hodisasini tinglaymiz
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isLoading, isCamera, onImageSelect]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
        onImageSelect(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    setIsCamera(true);
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    if (videoRef.current) videoRef.current.srcObject = stream;
  };

  const capture = () => {
    if (videoRef.current && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      ctx?.drawImage(videoRef.current, 0, 0);
      const base64 = canvasRef.current.toDataURL('image/jpeg');
      setPreview(base64);
      onImageSelect(base64);
      stopCamera();
    }
  };

  const stopCamera = () => {
    const stream = videoRef.current?.srcObject as MediaStream;
    stream?.getTracks().forEach(t => t.stop());
    setIsCamera(false);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {isCamera ? (
        <div className="relative rounded-3xl overflow-hidden bg-black aspect-[3/4] shadow-2xl">
          <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
          <div className="absolute bottom-8 left-0 right-0 flex justify-center space-x-6">
            <button onClick={stopCamera} className="px-6 py-3 bg-white/20 backdrop-blur text-white rounded-2xl font-bold">Yopish</button>
            <button onClick={capture} className="w-20 h-20 bg-white rounded-full border-8 border-white/30 flex items-center justify-center">
              <div className="w-14 h-14 bg-indigo-600 rounded-full" />
            </button>
          </div>
        </div>
      ) : preview ? (
        <div className="relative rounded-3xl overflow-hidden border-4 border-white shadow-xl bg-white group">
          <img src={preview} className="w-full max-h-[500px] object-contain" />
          {!isLoading && (
            <button 
              onClick={() => {setPreview(null); onImageSelect('');}}
              className="absolute top-4 right-4 p-3 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button onClick={() => inputRef.current?.click()} className="p-12 border-4 border-dashed border-slate-200 rounded-[2.5rem] bg-white hover:bg-indigo-50 hover:border-indigo-200 transition-all flex flex-col items-center">
            <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            </div>
            <span className="font-bold text-slate-700">Fayl tanlash</span>
            <p className="text-[10px] text-slate-400 mt-2">yoki Ctrl+V orqali rasm joylang</p>
          </button>
          <button onClick={startCamera} className="p-12 border-4 border-dashed border-slate-200 rounded-[2.5rem] bg-white hover:bg-violet-50 hover:border-violet-200 transition-all flex flex-col items-center">
            <div className="w-16 h-16 bg-violet-100 text-violet-600 rounded-2xl flex items-center justify-center mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /></svg>
            </div>
            <span className="font-bold text-slate-700">Kamera</span>
          </button>
        </div>
      )}
      <input type="file" ref={inputRef} className="hidden" accept="image/*" onChange={handleFile} />
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};
