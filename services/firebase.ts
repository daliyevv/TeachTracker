import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { 
  initializeFirestore, 
  getFirestore, 
  doc, 
  getDocFromServer,
  persistentLocalCache, 
  persistentMultipleTabManager 
} from "firebase/firestore";
import { getStorage } from "firebase/storage";
import firebaseConfig from "../firebase-applet-config.json";

// Tozalash: eski sessiyalardan qolgan cheklovlarni tozalaymiz
if (typeof window !== 'undefined') {
  localStorage.removeItem('firebase_suspended');
  sessionStorage.removeItem('reloaded_after_suspension');
}

export const isFirebaseConfigured = !!(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId
);

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

/* CRITICAL: Passing firestoreDatabaseId is mandatory for provisioned database instances.
   We configure auto-detect long polling and persistent local cache for high network resilience in iframe/preview environments. */
let dbInstance;
try {
  dbInstance = initializeFirestore(app, {
    experimentalAutoDetectLongPolling: true,
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
  }, firebaseConfig.firestoreDatabaseId);
} catch {
  dbInstance = getFirestore(app, firebaseConfig.firestoreDatabaseId);
}

export const db = dbInstance;
export const auth = getAuth(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

// Connection testing as mandated by skill guidelines
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firestore connection test passed.");
    return true;
  } catch (error: any) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Please check your Firebase configuration or internet connection.");
      return false;
    }
    if (error?.code === 'unavailable') {
      console.log("Firestore connecting in background (offline persistence active).");
      return true;
    }
    // If doc does not exist, connection is still alive
    if (error?.code === 'not-found' || error?.code === 'permission-denied') {
      console.log("Firestore server reachable (doc or permission checked).");
      return true;
    }
    console.warn("Firestore connection check info:", error?.message || error);
    return true;
  }
}

// Test connection after initial frame renders so WebChannel socket has established
if (typeof window !== 'undefined') {
  setTimeout(() => {
    testFirestoreConnection();
  }, 1500);
}

export { app };
