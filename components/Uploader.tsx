
import React, { useRef, useState, useEffect } from 'react';
import { compressImageDataUrl, readAndCompressImage, appendWithinLimit, MAX_PAGES } from '../services/imageService';

interface UploaderProps {
  onImagesSelect: (base64Array: string[]) => void;
  isLoading: boolean;
}


export const Uploader: React.FC<UploaderProps> = ({ onImagesSelect, isLoading }) => {
  const [previews, setPreviews] = useState<string[]>([]);
  const [isCamera, setIsCamera] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  /** Faol kamera oqimi. Komponent yopilganda to'xtatish uchun kerak. */
  const streamRef = useRef<MediaStream | null>(null);
  /** Rasmlar ro'yxatining joriy holati (asinxron qo'shishlar uchun). */
  const previewsRef = useRef<string[]>([]);

  /**
   * Rasmlar ro'yxatini bitta joydan yangilaymiz: chegarani tekshiradi va
   * ota komponentga xabar beradi.
   *
   * MUHIM: `setPreviews` ning funksiya shakli ishlatiladi. Ilgari
   * `[...previews, ...]` yozilgan edi — `previews` esa render paytida
   * "muzlatilgan" qiymat. Fayl o'qish va siqish asinxron bo'lgani uchun
   * foydalanuvchi ketma-ket ikki marta fayl tanlasa, ikkinchi natija
   * BIRINCHISINI o'chirib tashlardi.
   */
  const appendImages = (incoming: string[]) => {
    if (incoming.length === 0) return;
    // `previewsRef` joriy ro'yxatni saqlaydi. Nega ref: hisoblashni
    // `setPreviews` ning yangilovchi funksiyasi ICHIDA qilib bo'lmaydi —
    // u toza bo'lishi shart, React uni ikki marta chaqirishi mumkin.
    // Oddiy `previews` o'zgaruvchisi esa render paytida muzlatilgan va
    // ketma-ket asinxron chaqiruvlarda eskirib qolardi.
    const { next, rejected } = appendWithinLimit(previewsRef.current, incoming);
    if (rejected > 0) {
      setUploadError(`Eng ko'pi bilan ${MAX_PAGES} sahifa yuborish mumkin, ortig'i qabul qilinmadi.`);
    }
    if (next === previewsRef.current) return;
    previewsRef.current = next;
    setPreviews(next);
    onImagesSelect(next);
  };

  // Kamera oqimini komponent yopilganda to'xtatamiz.
  //
  // Ilgari bunday tozalash YO'Q edi: o'quvchi kamerani ochib, keyin butun
  // oynani yopsa (masalan "Orqaga"), oqim ochiq qolar va telefon
  // kamerasining chirog'i yonib turardi.
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    };
  }, []);

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
            reader.onerror = () => setUploadError("Rasmni o'qib bo'lmadi.");
            reader.onloadend = async () => {
              // Yuborishdan oldin siqamiz (Vercel 4,5MB chegarasi)
              const base64 = await compressImageDataUrl(reader.result as string);
              appendImages([base64]);
            };
            reader.readAsDataURL(blob);
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isLoading, isCamera, onImagesSelect]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const files = Array.from(input.files || []) as File[];
    // Qiymatni darhol tozalaymiz: aks holda AYNI o'sha faylni qayta tanlash
    // `change` hodisasini uyg'otmaydi va hech narsa bo'lmaydi.
    input.value = '';
    if (files.length === 0) return;

    setUploadError(null);
    try {
      // readAndCompressImage faylni o'qib, darhol siqadi
      const base64s = await Promise.all(files.map((file: File) => readAndCompressImage(file)));
      appendImages(base64s);
    } catch (err: any) {
      // Ilgari `.catch` yo'q edi: fayl o'qilmasa, va'da jimgina yiqilar va
      // foydalanuvchi nima bo'lganini bilmasdi.
      console.error("Rasmni o'qib bo'lmadi:", err);
      setUploadError("Rasmni o'qib bo'lmadi. Boshqa fayl tanlab ko'ring.");
    }
  };

  const startCamera = async () => {
    setUploadError(null);
    try {
      setIsCamera(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      } else {
        // Komponent oqim kelgunicha yopilgan — oqimni darhol to'xtatamiz,
        // aks holda kamera ochiq qolib ketardi.
        stream.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        setIsCamera(false);
      }
    } catch (err) {
      console.error("Camera error:", err);
      setIsCamera(false);
      setUploadError("Kameraga ruxsat berilmadi. Brauzer sozlamalarini tekshiring.");
    }
  };

  const capture = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    ctx.drawImage(videoRef.current, 0, 0);

    // Ilgari bu yerda `toDataURL('image/jpeg')` chaqirilardi — sifat
    // ko'rsatilmaganda brauzer 0.92 ni oladi, ya'ni telefon kamerasining
    // to'liq o'lchamli rasmi bir necha MB bo'lib qolardi. Siqish faqat
    // fayl tanlash yo'lida ishlar, KAMERA yo'li esa uni butunlay chetlab
    // o'tardi — telefonda asosiy yo'l aynan kamera.
    const raw = canvasRef.current.toDataURL('image/jpeg', 0.9);
    const compressed = await compressImageDataUrl(raw);
    appendImages([compressed]);
    // Kamerani yopmaymiz, yana rasm olishi mumkin
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsCamera(false);
  };

  const removeImage = (index: number) => {
    setUploadError(null);
    const next = previewsRef.current.filter((_, i) => i !== index);
    previewsRef.current = next;
    setPreviews(next);
    onImagesSelect(next);
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

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
        {previews.map((p, i) => (
          <div key={i} className="relative rounded-2xl overflow-hidden border-2 border-white shadow-md bg-white group aspect-square">
            <img src={p} className="w-full h-full object-cover" alt={`Sahifa ${i + 1}`} />
            {!isLoading && (
              <button 
                onClick={() => removeImage(i)}
                className="absolute top-2 right-2 p-2 bg-rose-600/90 hover:bg-rose-600 text-white rounded-xl shadow-md opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity min-h-[36px] min-w-[36px] flex items-center justify-center"
                title="Rasmni o'chirish"
                aria-label="Rasmni o'chirish"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
            <div className="absolute bottom-2 left-2 bg-slate-900/70 text-white text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-xs">
              {i + 1}-bet
            </div>
          </div>
        ))}
        
        {!isLoading && !isCamera && (
          <>
            <button 
              onClick={() => inputRef.current?.click()} 
              className="aspect-square border-2 border-dashed border-slate-200 rounded-2xl bg-white hover:bg-indigo-50 hover:border-indigo-300 transition-all flex flex-col items-center justify-center p-3 sm:p-4 min-h-[48px]"
            >
              <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center mb-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              </div>
              <span className="font-bold text-slate-700 text-xs">Fayl qo'shish</span>
            </button>
            <button 
              onClick={startCamera} 
              className="aspect-square border-2 border-dashed border-slate-200 rounded-2xl bg-white hover:bg-violet-50 hover:border-violet-300 transition-all flex flex-col items-center justify-center p-3 sm:p-4 min-h-[48px]"
            >
              <div className="w-10 h-10 bg-violet-100 text-violet-600 rounded-xl flex items-center justify-center mb-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /></svg>
              </div>
              <span className="font-bold text-slate-700 text-xs">Kameradan olish</span>
            </button>
          </>
        )}
      </div>

      {uploadError && (
        <div role="alert" className="p-4 bg-amber-50 border-2 border-amber-200 rounded-2xl">
          <p className="text-sm font-bold text-amber-900">{uploadError}</p>
        </div>
      )}

      <input type="file" ref={inputRef} className="hidden" accept="image/*" multiple onChange={handleFile} />
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};
