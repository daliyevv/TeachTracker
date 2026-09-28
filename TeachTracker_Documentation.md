# TeachTracker: Sun'iy Intellekt Asosidagi Zamonaviy Ta'lim Platformasi
**Loyiha Texnik va Funksional Hujjati (Ekspert Tahlili)**

## 1. Loyiha Haqida Umumiy Ma'lumot
**TeachTracker** — o'qituvchilarning kundalik vazifalarini optimallashtirish, ularning vaqtini tejash va o'quv jarayoni sifatini oshirish uchun mo'ljallangan sun'iy intellektga asoslangan kompleks platforma. Tizim o'quvchilarning yozma ishlarini tekshirish, xatolarni ko'rsatish, yangi o'quv materiallarini generatsiya qilish va natijalarni kuzatib borish imkonini beradi.

## 2. Asosiy Funksionalliklar (Capabilities)

1. **Diktant va Yozma Ishlarni Avtomatik Tekshirish:**
    - O'quvchilar yozgan diktant yoki erkin matnlarni rasmi (JPEG/PNG) tizimga yuklanadi.
    - Asl nusxa matni va o'quvchining yozma ishi AI tomonidan avtomatik taqqoslanadi.
    - Imlo, tinish belgilari va mantiqiy xatolar klassifikatsiya qilinib ko'rsatiladi (masalan, o'zbek lotin alifbosidagi `o‘`, `g‘` harflari xususiyatlari e'tiborga olingan holda). Xatolar aniq koordinatalari tekshiruv moduli yordamida o'qib olinadi.
    - Baholash, husnixat uchun ball va maslahatlar (improvement tips) shakllantiriladi.

2. **Turli Formatdagi Topshiriqlarni Tahlil Qilish:**
    - O'qituvchilar rasm, PDF, matn fayllari yoki Dasturlash kodlari (jumladan `.ipynb` fayllar) ni tizimga kiritadilar.
    - Gemini AI instruksiya shartlariga qarab talabaning vazifasini tekshiradi, kodning tozaligi (clean code) yoki mantiqiy aniqligiga qarab baholaydi.

3. **O'quv Materiallarini Generatsiya Qilish:**
    - **Krossvordlar:** Berilgan mavzu bo'yicha 10x10 katakdagi (grid) o'zbek tilidagi qiziqarli krossvordlar avtomat ravishda to'qiladi va JSON shaklida serverdan frontend ga yuborilib, o'yin holatiga keltiriladi.
    - **Test savollari, Ish varaqalari (Worksheets), va Dars ishlanmalari (Lesson plans):** Metodik jihatdan to'g'ri bo'lgan estetik sifatli, tayyor dars doc-rezumlari Markdown formatida generatsiya qilinadi.

4. **Speech Engine (Matnni Ovozga Aylantirish/Diktant):**
    - Google Gemini 2.5 Flash TTS modeli yordamida har xil tempolarda bolalarga diktantlarni, matnlarni yuqori animatsion vizual bilan birgalikda o'qib beruvchi interfeys qo'shilgan.

5. **Onlayn va Mahalliy Integratsiyalashgan Baza (Offline-first / Fallback mechanism):**
    - Firebase Firestore Database va Auth tizimidan foydalaniladi. Agar Firebase API limiti tugasa yoki xato bo'lsa (Missing Configuration), xavfsizlik va asabuzarliklarni oldini olish uchun tizim avtomat ravishda "Mahalliy Demo Rejim" (IndexedDB / LocalStorage) ga fallback qiladi. Bu funksionallikning uzluksiz ta'minlanishini daxlsiz saqlaydi.

## 3. Texnik Arxitektura va Stack (Texnologiyalar)

**Texnologik Yadro (Core): Hibrid Full-stack (React + Express + Vite)**
- **Frontend (Dizayn va Mantiq qismi):** 
    - **Kutubxonalar:** React 19 (Hooks, Functional components), Vite.
    - **UI/UX Standarti:** Tailwind CSS. Minimalistik va toza kartochkalar asosi (Clean UI principles).
- **Backend (Server qismi qatlami):**
    - **Muhit:** Node.js, Express.js (Port: 3000). Vite middleware sifatida dev-server ga biriktirilgan.
    - **Xavfsizlik:** API kalitlari hech qachon brauzerga ochiq jo'natilmaydi, barchasi `/api/gemini/...` rest endpointlari orqali proxy qilib jo'natiladi.
- **Sun'iy Intellekt:**
    - **SDK:** Tizim eng so'nggi `@google/genai` (v1.x) API da ulanish qiladi.
    - **Modellar:** `gemini-3.1-pro-preview` / `gemini-3-flash-preview` vizual va kompleks kodli materiallar (Structured schema JSON output), `gemini-2.5-flash-preview-tts` esa ovoz xizmatlari uchun foydalaniladi.
- **Autentifikatsiya va DB:**
    - Google Firebase Auth (signInWithPopup), Firebase Storage, Firestore. LocalDB fallback bilan asinxron zaxira orkali ishlaydi.

## 4. Platforma Qanday Ishlaydi (Tizimli Oqim / Execution Flow)

1. **Jarayonga Kirish:** Foydalanuvchi tizimga Google orqali yoki lokal demo foydalanuvchi orqali autentifikatsiya qilinadi.
2. **So'rov va Media jo'natilishi:** Foydalanuvchi taqdim qilgan hujjat (yozma rasmlar yoki kompyuter kodlari) Base64 enkodlanib backenddagi tegishli Gemini Endpointga tushadi.
3. **Qat'iy Prompt (Strict Instructions):** 
    - AI'ga aniq "System Instruction" berilgan (masalan o'zbek tiliga xos o' va g' belgilari bo'yicha tolerantlik, e'tibor qiling: kodda "g' va o' ustida qanaqa belgi qo'yilsa ham xato hisoblanmaydi" buyrug'i bor).
    - `responseSchema` orqali AI'dan erkin yozma emas, aynan `[word, correction, description, boundingBox]` dan iborat JSON so'raladi.
4. **Dizaynga Qaytuvchi Javob:** Server javobini API orqali olgan Frontend, uni UI da chiroyli shaklda — krossvord bo'lsa chizilgan jadval sifatida, test bo'lsa savollar, xato bo'lsa qizil fonda yoritilgan belgilar sifatida render qiladi.

## 5. Ekspert Xulosasi va Dasturning Qimmati
Loyihaning asosiy kuchi — u "tayyor uchinchi tomon vositasi" hisobidan qochib, to'g'ridan-to'g'ri o'qituvchining amaliy tahlili uchun tuzilgan yopiq ekotizimida namoyon bo'ladi. Prompt Engineering O'zbek tili uchun ajoyib tarzda shaxsiylashtirilgan. Tizimdagi xatoliklarda darhol LocalStorage ga moslashuvchi 'Degraded Gracefully' metodologiyasidan ham loyiha yetuk ishlab chiqilganligini ko'rishimiz mumkin.
