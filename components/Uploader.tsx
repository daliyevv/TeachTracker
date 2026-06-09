
import React, { useRef, useState, useEffect } from 'react';

interface UploaderProps {
  onImagesSelect: (base64Array: string[]) => void;
  isLoading: boolean;
}

export const Uploader: React.FC<UploaderProps> = ({ onImagesSelect, isLoading }) => {
  const [previews, setPreviews] = useState<string[]>([]);
  const [isCamera, setIsCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Ctrl+V (Paste) orqali rasm yuklash imkoniyati
  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      if (isLoading || isCamera) return;

      const items = event.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64 = reader.result as string;
              const newPreviews = [...previews, base64];
              setPreviews(newPreviews);
              onImagesSelect(newPreviews);
            };
            reader.readAsDataURL(blob);
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isLoading, isCamera, previews, onImagesSelect]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length > 0) {
      const promises = files.map((file: File) => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      });

      Promise.all(promises).then(base64s => {
        const newPreviews = [...previews, ...base64s];
        setPreviews(newPreviews);
        onImagesSelect(newPreviews);
      });
    }
  };

  const startCamera = async () => {
    try {
      setIsCamera(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      console.error("Camera error:", err);
      setIsCamera(false);
      alert("Kameraga ruxsat berilmadi.");
    }
  };

  const capture = () => {
    if (videoRef.current && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      ctx?.drawImage(videoRef.current, 0, 0);
      const base64 = canvasRef.current.toDataURL('image/jpeg');
      const newPreviews = [...previews, base64];
      setPreviews(newPreviews);
      onImagesSelect(newPreviews);
      // Kamerani yopmaymiz, yana rasm olishi mumkin
    }
  };

  const stopCamera = () => {
    const stream = videoRef.current?.srcObject as MediaStream;
    stream?.getTracks().forEach(t => t.stop());
    setIsCamera(false);
  };

  const removeImage = (index: number) => {
    const newPreviews = previews.filter((_, i) => i !== index);
    setPreviews(newPreviews);
    onImagesSelect(newPreviews);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {isCamera && (
        <div className="relative rounded-3xl overflow-hidden bg-black aspect-[3/4] shadow-2xl max-w-md mx-auto">
          <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
          <div className="absolute bottom-8 left-0 right-0 flex justify-center items-center space-x-6">
            <button onClick={stopCamera} className="px-6 py-3 bg-white/20 backdrop-blur text-white rounded-2xl font-bold">Yopish</button>
            <button onClick={capture} className="w-20 h-20 bg-white rounded-full border-8 border-white/30 flex items-center justify-center">
              <div className="w-14 h-14 bg-indigo-600 rounded-full" />
            </button>
            <div className="w-12 h-12 bg-indigo-600 text-white rounded-full flex items-center justify-center font-black">
              {previews.length}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {previews.map((p, i) => (
          <div key={i} className="relative rounded-2xl overflow-hidden border-2 border-white shadow-md bg-white group aspect-square">
            <img src={p} className="w-full h-full object-cover" />
            {!isLoading && (
              <button 
                onClick={() => removeImage(i)}
                className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
            <div className="absolute bottom-2 left-2 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded-md backdrop-blur-sm">
              {i + 1}-bet
            </div>
          </div>
        ))}
        
        {!isLoading && !isCamera && (
          <>
            <button onClick={() => inputRef.current?.click()} className="aspect-square border-2 border-dashed border-slate-200 rounded-2xl bg-white hover:bg-indigo-50 hover:border-indigo-200 transition-all flex flex-col items-center justify-center p-4">
              <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center mb-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              </div>
              <span className="font-bold text-slate-700 text-xs">Fayl qo'shish</span>
            </button>
            <button onClick={startCamera} className="aspect-square border-2 border-dashed border-slate-200 rounded-2xl bg-white hover:bg-violet-50 hover:border-violet-200 transition-all flex flex-col items-center justify-center p-4">
              <div className="w-10 h-10 bg-violet-100 text-violet-600 rounded-xl flex items-center justify-center mb-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /></svg>
              </div>
              <span className="font-bold text-slate-700 text-xs">Kameradan olish</span>
            </button>
          </>
        )}
      </div>

      <input type="file" ref={inputRef} className="hidden" accept="image/*" multiple onChange={handleFile} />
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};
