
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  addDoc,
  deleteDoc,
  onSnapshot
} from "firebase/firestore";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { db, storage, isFirebaseConfigured } from "./firebase";
import { User, DictationTask, Submission } from "../types";

let isServiceDegraded = false;

export const getServiceStatus = () => isServiceDegraded;

export const resetServiceStatus = () => {
  isServiceDegraded = false;
  localStorage.removeItem('firebase_suspended');
};

export const setServiceDegraded = (val: boolean) => {
  if (val && !isServiceDegraded) {
    console.warn("Firebase service is unavailable or suspended. Switching to Local Mode. Please check your VITE_FIREBASE_* environment variables if this is unexpected.");
    isServiceDegraded = true;
    if (typeof window !== 'undefined') localStorage.setItem('firebase_suspended', 'true');
  }
};

const COLLECTIONS = {
  USERS: "users",
  TASKS: "tasks",
  SUBMISSIONS: "submissions"
};

// Local storage fallback for demo mode
const LocalDB = {
  get: (key: string) => JSON.parse(localStorage.getItem(key) || "[]"),
  set: (key: string, data: any) => localStorage.setItem(key, JSON.stringify(data)),
  getItem: (key: string, id: string) => JSON.parse(localStorage.getItem(`${key}_${id}`) || "null"),
  setItem: (key: string, id: string, data: any) => localStorage.setItem(`${key}_${id}`, JSON.stringify(data))
};

// Firestore amallarini timeout bilan bajarish uchun yordamchi funksiya
const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number = 8000): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error("Firestore timeout")), timeoutMs)
    )
  ]);
};

export const DB = {
  // User
  getUser: async (uid: string): Promise<User | null> => {
    if (!isFirebaseConfigured || isServiceDegraded) return LocalDB.getItem(COLLECTIONS.USERS, uid);
    try {
      const docRef = doc(db, COLLECTIONS.USERS, uid);
      const docSnap = await withTimeout(getDoc(docRef));
      return docSnap.exists() ? (docSnap.data() as User) : null;
    } catch (error: any) {
      console.warn("Firestore getUser error (offline?):", error);
      const errorMsg = error.message || "";
      if (errorMsg.includes('suspended') || error.code === 'permission-denied' || errorMsg.includes('installations/request-failed') || errorMsg.includes('403') || errorMsg === "Firestore timeout") {
        setServiceDegraded(true);
      }
      // Offline bo'lsa local storage-dan qidirib ko'ramiz
      return LocalDB.getItem(COLLECTIONS.USERS, uid);
    }
  },
  setUser: async (user: User) => {
    if (!isFirebaseConfigured || isServiceDegraded) {
      LocalDB.setItem(COLLECTIONS.USERS, user.id, user);
      return;
    }
    try {
      await withTimeout(setDoc(doc(db, COLLECTIONS.USERS, user.id), user));
      // Local storage-ga ham saqlab qo'yamiz (offline fallback uchun)
      LocalDB.setItem(COLLECTIONS.USERS, user.id, user);
    } catch (error: any) {
      console.warn("Firestore setUser error (offline?):", error);
      const errorMsg = error.message || "";
      if (errorMsg.includes('suspended') || error.code === 'permission-denied' || errorMsg.includes('installations/request-failed') || errorMsg.includes('403') || errorMsg === "Firestore timeout") {
        setServiceDegraded(true);
      }
      LocalDB.setItem(COLLECTIONS.USERS, user.id, user);
    }
  },
  updateUser: async (uid: string, data: Partial<User>) => {
    if (!isFirebaseConfigured) {
      const user = LocalDB.getItem(COLLECTIONS.USERS, uid);
      if (user) LocalDB.setItem(COLLECTIONS.USERS, uid, { ...user, ...data });
      return;
    }
    try {
      await updateDoc(doc(db, COLLECTIONS.USERS, uid), data);
      const user = LocalDB.getItem(COLLECTIONS.USERS, uid);
      if (user) LocalDB.setItem(COLLECTIONS.USERS, uid, { ...user, ...data });
    } catch (error) {
      console.warn("Firestore updateUser error (offline?):", error);
      const user = LocalDB.getItem(COLLECTIONS.USERS, uid);
      if (user) LocalDB.setItem(COLLECTIONS.USERS, uid, { ...user, ...data });
    }
  },

  // Tasks
  getTasks: async (): Promise<DictationTask[]> => {
    if (!isFirebaseConfigured || isServiceDegraded) return LocalDB.get(COLLECTIONS.TASKS);
    try {
      const q = query(collection(db, COLLECTIONS.TASKS), orderBy("createdAt", "desc"));
      const querySnapshot = await withTimeout(getDocs(q));
      const tasks = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DictationTask));
      LocalDB.set(COLLECTIONS.TASKS, tasks);
      return tasks;
    } catch (error: any) {
      console.warn("Firestore getTasks error (offline?):", error);
      const errorMsg = error.message || "";
      if (errorMsg.includes('suspended') || error.code === 'permission-denied' || errorMsg.includes('installations/request-failed') || errorMsg.includes('403') || errorMsg === "Firestore timeout") {
        console.error("Firestore access failed. Please ensure Firestore Database is created and rules allow access.", errorMsg);
        setServiceDegraded(true);
      }
      return LocalDB.get(COLLECTIONS.TASKS);
    }
  },
  addTask: async (task: Omit<DictationTask, "id">) => {
    if (!isFirebaseConfigured || isServiceDegraded) {
      const tasks = LocalDB.get(COLLECTIONS.TASKS);
      const id = Math.random().toString(36).substr(2, 9);
      const newTask = { ...task, id };
      tasks.unshift(newTask);
      LocalDB.set(COLLECTIONS.TASKS, tasks);
      return id;
    }
    try {
      const docRef = await withTimeout(addDoc(collection(db, COLLECTIONS.TASKS), task));
      return docRef.id;
    } catch (error: any) {
      console.warn("Firestore addTask error (offline?):", error);
      const errorMsg = error.message || "";
      if (errorMsg.includes('suspended') || error.code === 'permission-denied' || errorMsg.includes('installations/request-failed') || errorMsg.includes('403') || errorMsg === "Firestore timeout") {
        setServiceDegraded(true);
      }
      const tasks = LocalDB.get(COLLECTIONS.TASKS);
      const id = "offline_" + Math.random().toString(36).substr(2, 9);
      const newTask = { ...task, id };
      tasks.unshift(newTask);
      LocalDB.set(COLLECTIONS.TASKS, tasks);
      return id;
    }
  },
  updateTask: async (id: string, data: Partial<DictationTask>) => {
    if (!isFirebaseConfigured || isServiceDegraded) {
      const tasks = LocalDB.get(COLLECTIONS.TASKS);
      const index = tasks.findIndex((t: any) => t.id === id);
      if (index !== -1) {
        tasks[index] = { ...tasks[index], ...data };
        LocalDB.set(COLLECTIONS.TASKS, tasks);
      }
      return;
    }
    try {
      await withTimeout(updateDoc(doc(db, COLLECTIONS.TASKS, id), data));
      const tasks = LocalDB.get(COLLECTIONS.TASKS);
      const index = tasks.findIndex((t: any) => t.id === id);
      if (index !== -1) {
        tasks[index] = { ...tasks[index], ...data };
        LocalDB.set(COLLECTIONS.TASKS, tasks);
      }
    } catch (error: any) {
      console.warn("Firestore updateTask error (offline?):", error);
      const errorMsg = error.message || "";
      if (errorMsg.includes('suspended') || error.code === 'permission-denied' || errorMsg.includes('installations/request-failed') || errorMsg.includes('403') || errorMsg === "Firestore timeout") {
        setServiceDegraded(true);
      }
      const tasks = LocalDB.get(COLLECTIONS.TASKS);
      const index = tasks.findIndex((t: any) => t.id === id);
      if (index !== -1) {
        tasks[index] = { ...tasks[index], ...data };
        LocalDB.set(COLLECTIONS.TASKS, tasks);
      }
    }
  },
  deleteTask: async (id: string) => {
    if (!isFirebaseConfigured || isServiceDegraded) {
      const tasks = LocalDB.get(COLLECTIONS.TASKS);
      const filtered = tasks.filter((t: any) => t.id !== id);
      LocalDB.set(COLLECTIONS.TASKS, filtered);
      return;
    }
    try {
      await withTimeout(deleteDoc(doc(db, COLLECTIONS.TASKS, id)));
      const tasks = LocalDB.get(COLLECTIONS.TASKS);
      const filtered = tasks.filter((t: any) => t.id !== id);
      LocalDB.set(COLLECTIONS.TASKS, filtered);
    } catch (error: any) {
      console.warn("Firestore deleteTask error (offline?):", error);
      const errorMsg = error.message || "";
      if (errorMsg.includes('suspended') || error.code === 'permission-denied' || errorMsg.includes('installations/request-failed') || errorMsg.includes('403') || errorMsg === "Firestore timeout") {
        setServiceDegraded(true);
      }
      const tasks = LocalDB.get(COLLECTIONS.TASKS);
      const filtered = tasks.filter((t: any) => t.id !== id);
      LocalDB.set(COLLECTIONS.TASKS, filtered);
    }
  },

  // Submissions
  getSubmissions: async (studentId?: string): Promise<Submission[]> => {
    if (!isFirebaseConfigured || isServiceDegraded) {
      const subs = LocalDB.get(COLLECTIONS.SUBMISSIONS);
      if (studentId) return subs.filter((s: any) => s.studentId === studentId);
      return subs;
    }
    try {
      let q = query(collection(db, COLLECTIONS.SUBMISSIONS), orderBy("submittedAt", "desc"));
      if (studentId) {
        q = query(collection(db, COLLECTIONS.SUBMISSIONS), where("studentId", "==", studentId), orderBy("submittedAt", "desc"));
      }
      const querySnapshot = await withTimeout(getDocs(q));
      const subs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Submission));
      LocalDB.set(COLLECTIONS.SUBMISSIONS, subs);
      return subs;
    } catch (error: any) {
      console.warn("Firestore getSubmissions error (offline?):", error);
      const errorMsg = error.message || "";
      if (errorMsg.includes('suspended') || error.code === 'permission-denied' || errorMsg.includes('installations/request-failed') || errorMsg.includes('403') || errorMsg === "Firestore timeout") {
        setServiceDegraded(true);
      }
      const subs = LocalDB.get(COLLECTIONS.SUBMISSIONS);
      if (studentId) return subs.filter((s: any) => s.studentId === studentId);
      return subs;
    }
  },
  addSubmission: async (sub: Omit<Submission, "id">) => {
    if (!isFirebaseConfigured || isServiceDegraded) {
      const subs = LocalDB.get(COLLECTIONS.SUBMISSIONS);
      const id = Math.random().toString(36).substr(2, 9);
      const newSub = { ...sub, id };
      subs.unshift(newSub);
      LocalDB.set(COLLECTIONS.SUBMISSIONS, subs);
      return id;
    }
    try {
      const docRef = await withTimeout(addDoc(collection(db, COLLECTIONS.SUBMISSIONS), sub));
      return docRef.id;
    } catch (error: any) {
      console.warn("Firestore addSubmission error (offline?):", error);
      const errorMsg = error.message || "";
      if (errorMsg.includes('suspended') || error.code === 'permission-denied' || errorMsg.includes('installations/request-failed') || errorMsg.includes('403') || errorMsg === "Firestore timeout") {
        setServiceDegraded(true);
      }
      // Offline bo'lsa local storage-ga saqlaymiz
      const subs = LocalDB.get(COLLECTIONS.SUBMISSIONS);
      const id = "offline_" + Math.random().toString(36).substr(2, 9);
      subs.unshift({ ...sub, id });
      LocalDB.set(COLLECTIONS.SUBMISSIONS, subs);
      return id;
    }
  },
  updateSubmission: async (id: string, data: Partial<Submission>) => {
    if (!isFirebaseConfigured || isServiceDegraded) {
      const subs = LocalDB.get(COLLECTIONS.SUBMISSIONS);
      const index = subs.findIndex((s: any) => s.id === id);
      if (index !== -1) {
        subs[index] = { ...subs[index], ...data };
        LocalDB.set(COLLECTIONS.SUBMISSIONS, subs);
      }
      return;
    }
    try {
      await withTimeout(updateDoc(doc(db, COLLECTIONS.SUBMISSIONS, id), data));
    } catch (error: any) {
      console.warn("Firestore updateSubmission error (offline?):", error);
      const errorMsg = error.message || "";
      if (errorMsg.includes('suspended') || error.code === 'permission-denied' || errorMsg.includes('installations/request-failed') || errorMsg.includes('403') || errorMsg === "Firestore timeout") {
        setServiceDegraded(true);
      }
      const subs = LocalDB.get(COLLECTIONS.SUBMISSIONS);
      const index = subs.findIndex((s: any) => s.id === id);
      if (index !== -1) {
        subs[index] = { ...subs[index], ...data };
        LocalDB.set(COLLECTIONS.SUBMISSIONS, subs);
      }
    }
  },

  // Real-time listeners
  subscribeToTasks: (callback: (tasks: DictationTask[]) => void) => {
    if (!isFirebaseConfigured || isServiceDegraded) {
      const interval = setInterval(() => {
        callback(LocalDB.get(COLLECTIONS.TASKS));
      }, 2000);
      return () => clearInterval(interval);
    }
    const q = query(collection(db, COLLECTIONS.TASKS), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snapshot) => {
      const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DictationTask));
      callback(tasks);
    }, (error) => {
      console.warn("Firestore subscribeToTasks error:", error);
      if (error.message?.includes('suspended') || error.code === 'permission-denied' || error.message?.includes('installations/request-failed')) {
        setServiceDegraded(true);
      }
    });
  },
  subscribeToSubmissions: (callback: (subs: Submission[]) => void, studentId?: string) => {
    if (!isFirebaseConfigured || isServiceDegraded) {
      const interval = setInterval(() => {
        const subs = LocalDB.get(COLLECTIONS.SUBMISSIONS);
        if (studentId) callback(subs.filter((s: any) => s.studentId === studentId));
        else callback(subs);
      }, 2000);
      return () => clearInterval(interval);
    }
    let q = query(collection(db, COLLECTIONS.SUBMISSIONS), orderBy("submittedAt", "desc"));
    if (studentId) {
      q = query(collection(db, COLLECTIONS.SUBMISSIONS), where("studentId", "==", studentId), orderBy("submittedAt", "desc"));
    }
    return onSnapshot(q, (snapshot) => {
      const subs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Submission));
      callback(subs);
    }, (error) => {
      console.warn("Firestore subscribeToSubmissions error:", error);
      if (error.message?.includes('suspended') || error.code === 'permission-denied' || error.message?.includes('installations/request-failed')) {
        setServiceDegraded(true);
      }
    });
  },

  // Storage
  uploadImage: async (base64: string, path: string): Promise<string> => {
    if (!isFirebaseConfigured || isServiceDegraded || !storage) {
      // Demo rejimida yoki xizmat to'xtatilganda rasmni shunchaki base64 sifatida qaytaramiz
      return base64;
    }
    try {
      const storageRef = ref(storage, path);
      
      // Yuklash uchun timeout (15 soniya)
      const uploadPromise = uploadString(storageRef, base64, "data_url");
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Storage timeout")), 15000)
      );

      await Promise.race([uploadPromise, timeoutPromise]);
      return await getDownloadURL(storageRef);
    } catch (error: any) {
      console.warn("Firebase Storage upload error:", error);
      // Agar storage xatosi bo'lsa (masalan, retry limit exceeded yoki permission denied)
      // xizmatni degraded deb belgilaymiz va base64 qaytaramiz
      if (
        error.code === 'storage/retry-limit-exceeded' || 
        error.code === 'storage/unauthorized' ||
        error.message?.includes('suspended') ||
        error.message === "Storage timeout"
      ) {
        setServiceDegraded(true);
      }
      return base64;
    }
  }
};
