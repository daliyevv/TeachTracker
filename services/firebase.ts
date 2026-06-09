
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { initializeFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyCSJhZaNha-3afKYtw7aN3KN9HMA79K1H8",
  authDomain: "teachtrackernew.firebaseapp.com",
  projectId: "teachtrackernew",
  storageBucket: "teachtrackernew.firebasestorage.app",
  messagingSenderId: "838419613050",
  appId: "1:838419613050:web:7914825b7a61b73d8a82c3",
  measurementId: "G-D4EDJ1L86C"
};

// Agar API kaliti o'zgargan bo'lsa, suspension-ni o'chirib tashlaymiz
if (typeof window !== 'undefined') {
  const lastKey = localStorage.getItem('firebase_last_key');
  if (lastKey && lastKey !== firebaseConfig.apiKey) {
    console.log("Firebase API key changed, clearing suspension state.");
    localStorage.removeItem('firebase_suspended');
    sessionStorage.removeItem('reloaded_after_suspension');
  }
  localStorage.setItem('firebase_last_key', firebaseConfig.apiKey);
}

// Agar API kaliti to'xtatilgan bo'lsa, Firebase-ni umuman ishlatmaymiz
const isSuspended = typeof window !== 'undefined' && localStorage.getItem('firebase_suspended') === 'true';

export const isFirebaseConfigured = !!(
  firebaseConfig.apiKey && 
  firebaseConfig.authDomain && 
  firebaseConfig.projectId &&
  !isSuspended
);

let app: any = null;
let auth: any = null;
let db: any = null;
let storage: any = null;

if (isFirebaseConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    
    // Firestore ulanish muammolarini bartaraf etish uchun long-polling yoqiladi
    db = initializeFirestore(app, {
      experimentalForceLongPolling: true,
    });
    
    // Offline rejimda ishlashni yaxshilash uchun persistence yoqiladi
    enableIndexedDbPersistence(db).catch((err) => {
      if (err.code === 'failed-precondition') {
        console.warn("Persistence failed: Multiple tabs open");
      } else if (err.code === 'unimplemented') {
        console.warn("Persistence failed: Browser doesn't support it");
      }
    });

    storage = getStorage(app);
    
    // Analytics faqat API kaliti ishlayotgan bo'lsa yoqiladi
    if (firebaseConfig.measurementId) {
      try {
        getAnalytics(app);
      } catch (e) {
        console.warn("Firebase Analytics initialization failed:", e);
      }
    }
  } catch (error: any) {
    console.error("Firebase initialization error:", error);
    const errorMsg = error.message || "";
    if (errorMsg.includes('suspended') || errorMsg.includes('permission-denied') || errorMsg.includes('403')) {
      console.warn("Firebase API key is suspended. Switching to local mode.");
      if (typeof window !== 'undefined') localStorage.setItem('firebase_suspended', 'true');
    }
  }
}

// Global error listener to catch Firebase async errors early
if (typeof window !== 'undefined') {
  const handleFirebaseError = (msg: string) => {
    if (
      msg.includes('suspended') || 
      msg.includes('permission-denied') || 
      msg.includes('installations/request-failed') ||
      msg.includes('403') ||
      msg.includes('PERMISSION_DENIED')
    ) {
      console.warn("Detected Firebase suspension, marking for local mode and reloading...");
      localStorage.setItem('firebase_suspended', 'true');
      // Faqat bir marta reload qilamiz
      if (!sessionStorage.getItem('reloaded_after_suspension')) {
        sessionStorage.setItem('reloaded_after_suspension', 'true');
        window.location.reload();
      }
    }
  };

  // Firebase SDK ichidagi console.error xabarlarini ham tutamiz
  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    const msg = args.join(' ');
    handleFirebaseError(msg);
    originalConsoleError.apply(console, args);
  };

  window.addEventListener('error', (event) => handleFirebaseError(event.message || ""));
  window.addEventListener('unhandledrejection', (event) => handleFirebaseError(event.reason?.message || ""));
}

export { app, auth, db, storage };
export const googleProvider = new GoogleAuthProvider();
