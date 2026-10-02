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
import { db, storage, auth, isFirebaseConfigured } from "./firebase";
import { User, DictationTask, Submission } from "../types";

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo: auth?.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

let isServiceDegraded = false;

export const getServiceStatus = () => false;

export const resetServiceStatus = () => {
  isServiceDegraded = false;
  if (typeof window !== 'undefined') {
    localStorage.removeItem('firebase_suspended');
    localStorage.removeItem('firebase_last_key');
  }
};

export const setServiceDegraded = (_val: boolean) => {
  // Silent fallback without locking app into degraded UI
  isServiceDegraded = false;
};

const COLLECTIONS = {
  USERS: "users",
  TASKS: "tasks",
  SUBMISSIONS: "submissions"
};

const DEFAULT_SAMPLE_TASKS: DictationTask[] = [
  {
    id: "sample-task-1",
    teacherId: "teacher-default",
    title: "Ona yurtim — O'zbekiston",
    content: "O'zbekiston — go'zal va mehmondo'st o'lka. Uning keng dalalari, baland tog'lari va serquyosh bog'lari bor. Biz vatanimizni sevamiz va uning gullab-yashnashiga hissa qo'shamiz.",
    type: "dictation",
    status: "published",
    createdAt: Date.now() - 3600000
  },
  {
    id: "sample-task-2",
    teacherId: "teacher-default",
    title: "Bahor fasli va tabiat",
    content: "Bahorda tabiat uyg'onadi. Daraxtlar qiyg'os gullaydi, qushlar chug'urlaydi. Dalalarda dehqonlar bahorgi yumushlarni boshlaydilar.",
    type: "dictation",
    status: "published",
    createdAt: Date.now() - 7200000
  }
];

// Local storage fallback for offline / demo mode
const LocalDB = {
  get: (key: string) => {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || "null");
      if (parsed) return parsed;
      if (key === COLLECTIONS.TASKS) {
        localStorage.setItem(key, JSON.stringify(DEFAULT_SAMPLE_TASKS));
        return DEFAULT_SAMPLE_TASKS;
      }
      return [];
    } catch {
      return key === COLLECTIONS.TASKS ? DEFAULT_SAMPLE_TASKS : [];
    }
  },
  set: (key: string, data: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.warn("Local storage write failed, pruning older items to preserve image quality:", e);
      try {
        if (Array.isArray(data)) {
          // Eski topshiriqlarni qisqartirib, so'nggilarining rasmlarini to'liq saqlab qolamiz
          for (let count = Math.min(data.length - 1, 6); count >= 1; count--) {
            try {
              localStorage.setItem(key, JSON.stringify(data.slice(0, count)));
              break;
            } catch {}
          }
        }
      } catch (err2) {
        console.warn("Local storage fallback also failed:", err2);
      }
    }
  },
  getItem: (key: string, id: string) => {
    try {
      return JSON.parse(localStorage.getItem(`${key}_${id}`) || "null");
    } catch {
      return null;
    }
  },
  setItem: (key: string, id: string, data: any) => {
    try {
      localStorage.setItem(`${key}_${id}`, JSON.stringify(data));
    } catch (e) {
      console.warn("Local storage write failed:", e);
    }
  },
  removeItem: (key: string, id: string) => {
    try {
      localStorage.removeItem(`${key}_${id}`);
    } catch (e) {
      console.warn("Local storage remove failed:", e);
    }
  }
};

export const DB = {
  // User
  getUser: async (uid: string): Promise<User | null> => {
    if (!isFirebaseConfigured || isServiceDegraded || !auth?.currentUser || uid.startsWith('local-demo-')) {
      return LocalDB.getItem(COLLECTIONS.USERS, uid);
    }
    const path = `${COLLECTIONS.USERS}/${uid}`;
    try {
      const docRef = doc(db, COLLECTIONS.USERS, uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const u = docSnap.data() as User;
        LocalDB.setItem(COLLECTIONS.USERS, uid, u);
        return u;
      }
      return null;
    } catch (error: any) {
      console.warn("getUser error:", error);
      if (error?.code === 'permission-denied') {
        try {
          handleFirestoreError(error, OperationType.GET, path);
        } catch {
          // Fall back gracefully
        }
      }
      return LocalDB.getItem(COLLECTIONS.USERS, uid);
    }
  },

  setUser: async (user: User) => {
    // Oldingi mahalliy nusxani eslab qolamiz: agar masofaviy yozuv rad etilsa
    // (masalan taklif kodi noto'g'ri bo'lsa), mahalliy keshda "o'qituvchi"
    // bo'lib qolib ketmasin.
    const previousLocal = LocalDB.getItem(COLLECTIONS.USERS, user.id);
    LocalDB.setItem(COLLECTIONS.USERS, user.id, user);
    // Demo yoki avtorizatsiyasiz foydalanuvchilar faqat LocalDB da saqlanadi
    if (!isFirebaseConfigured || isServiceDegraded || !auth?.currentUser || user.id.startsWith('local-demo-')) {
      return;
    }
    const path = `${COLLECTIONS.USERS}/${user.id}`;
    try {
      // Ensure clean payload matching rules
      const sanitizedUser: User = {
        id: user.id,
        name: user.name || "Foydalanuvchi",
        email: user.email || "",
        role: user.role,
        avatar: user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`,
        badges: user.badges || [],
        points: typeof user.points === 'number' ? user.points : 0,
        isPro: !!user.isPro,
        subscriptionStatus: user.subscriptionStatus || 'none'
      };
      // O'qituvchi roli taklif kodi bilan beriladi va uni firestore.rules
      // tekshiradi — shuning uchun kod yozuvga albatta kirishi kerak.
      if (user.teacherCode) {
        (sanitizedUser as any).teacherCode = user.teacherCode;
      }

      await setDoc(doc(db, COLLECTIONS.USERS, user.id), sanitizedUser);
    } catch (error: any) {
      console.warn("setUser error:", error);
      // Mahalliy keshni oldingi holatiga qaytaramiz
      if (previousLocal) {
        LocalDB.setItem(COLLECTIONS.USERS, user.id, previousLocal);
      } else {
        LocalDB.removeItem(COLLECTIONS.USERS, user.id);
      }
      // Xato yuqoriga chiqariladi. Aks holda noto'g'ri taklif kodi yoki
      // ruxsat xatosi foydalanuvchiga ko'rinmay qoladi va u o'zini
      // ro'yxatdan o'tgan deb o'ylaydi.
      throw error;
    }
  },

  updateUser: async (uid: string, data: Partial<User>) => {
    const cached = LocalDB.getItem(COLLECTIONS.USERS, uid);
    if (cached) LocalDB.setItem(COLLECTIONS.USERS, uid, { ...cached, ...data });

    if (!isFirebaseConfigured || isServiceDegraded || !auth?.currentUser || uid.startsWith('local-demo-')) return;
    const path = `${COLLECTIONS.USERS}/${uid}`;
    try {
      await updateDoc(doc(db, COLLECTIONS.USERS, uid), data);
    } catch (error: any) {
      console.warn("updateUser error:", error);
      if (error?.code === 'permission-denied') {
        try {
          handleFirestoreError(error, OperationType.UPDATE, path);
        } catch {}
      }
    }
  },

  // Tasks
  getTasks: async (): Promise<DictationTask[]> => {
    if (!isFirebaseConfigured || isServiceDegraded) return LocalDB.get(COLLECTIONS.TASKS);
    const path = COLLECTIONS.TASKS;
    try {
      const q = query(collection(db, COLLECTIONS.TASKS), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const tasks = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DictationTask));
      LocalDB.set(COLLECTIONS.TASKS, tasks);
      return tasks;
    } catch (error: any) {
      console.warn("getTasks error:", error);
      if (error?.code === 'permission-denied') {
        try {
          handleFirestoreError(error, OperationType.LIST, path);
        } catch {}
      }
      return LocalDB.get(COLLECTIONS.TASKS);
    }
  },

  addTask: async (task: Omit<DictationTask, "id">): Promise<string> => {
    const localId = Math.random().toString(36).substring(2, 11);
    const localTasks = LocalDB.get(COLLECTIONS.TASKS);
    localTasks.unshift({ ...task, id: localId });
    LocalDB.set(COLLECTIONS.TASKS, localTasks);

    if (!isFirebaseConfigured || isServiceDegraded || !auth?.currentUser) {
      return localId;
    }
    const path = COLLECTIONS.TASKS;
    try {
      const docRef = await addDoc(collection(db, COLLECTIONS.TASKS), task);
      return docRef.id;
    } catch (error: any) {
      console.warn("addTask error:", error);
      if (error?.code === 'permission-denied') {
        try {
          handleFirestoreError(error, OperationType.CREATE, path);
        } catch {}
      }
      return localId;
    }
  },

  updateTask: async (id: string, data: Partial<DictationTask>) => {
    const tasks = LocalDB.get(COLLECTIONS.TASKS);
    const index = tasks.findIndex((t: any) => t.id === id);
    if (index !== -1) {
      tasks[index] = { ...tasks[index], ...data };
      LocalDB.set(COLLECTIONS.TASKS, tasks);
    }

    if (!isFirebaseConfigured || isServiceDegraded || !auth?.currentUser) return;
    const path = `${COLLECTIONS.TASKS}/${id}`;
    try {
      await updateDoc(doc(db, COLLECTIONS.TASKS, id), data);
    } catch (error: any) {
      console.warn("updateTask error:", error);
      if (error?.code === 'permission-denied') {
        try {
          handleFirestoreError(error, OperationType.UPDATE, path);
        } catch {}
      }
    }
  },

  deleteTask: async (id: string) => {
    const tasks = LocalDB.get(COLLECTIONS.TASKS);
    const filtered = tasks.filter((t: any) => t.id !== id);
    LocalDB.set(COLLECTIONS.TASKS, filtered);

    if (!isFirebaseConfigured || isServiceDegraded || !auth?.currentUser) return;
    const path = `${COLLECTIONS.TASKS}/${id}`;
    try {
      await deleteDoc(doc(db, COLLECTIONS.TASKS, id));
    } catch (error: any) {
      console.warn("deleteTask error:", error);
      if (error?.code === 'permission-denied') {
        try {
          handleFirestoreError(error, OperationType.DELETE, path);
        } catch {}
      }
    }
  },

  // Submissions
  getSubmissions: async (studentId?: string): Promise<Submission[]> => {
    if (!isFirebaseConfigured || isServiceDegraded || !auth?.currentUser) {
      const subs = LocalDB.get(COLLECTIONS.SUBMISSIONS);
      return studentId ? subs.filter((s: any) => s.studentId === studentId) : subs;
    }
    const path = COLLECTIONS.SUBMISSIONS;
    try {
      const q = studentId
        ? query(collection(db, COLLECTIONS.SUBMISSIONS), where("studentId", "==", studentId))
        : collection(db, COLLECTIONS.SUBMISSIONS);

      const querySnapshot = await getDocs(q);
      const subs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Submission));
      // Sort in-memory to prevent requiring composite index in Firestore
      subs.sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0));
      LocalDB.set(COLLECTIONS.SUBMISSIONS, subs);
      return subs;
    } catch (error: any) {
      console.warn("getSubmissions error:", error);
      if (error?.code === 'permission-denied') {
        try {
          handleFirestoreError(error, OperationType.LIST, path);
        } catch {}
      }
      const subs = LocalDB.get(COLLECTIONS.SUBMISSIONS);
      return studentId ? subs.filter((s: any) => s.studentId === studentId) : subs;
    }
  },

  addSubmission: async (sub: Omit<Submission, "id">): Promise<string> => {
    const localId = Math.random().toString(36).substring(2, 11);
    const subs = LocalDB.get(COLLECTIONS.SUBMISSIONS);
    subs.unshift({ ...sub, id: localId });
    LocalDB.set(COLLECTIONS.SUBMISSIONS, subs);

    if (!isFirebaseConfigured || isServiceDegraded || !auth?.currentUser) {
      return localId;
    }
    const path = COLLECTIONS.SUBMISSIONS;
    try {
      const docRef = await addDoc(collection(db, COLLECTIONS.SUBMISSIONS), sub);
      return docRef.id;
    } catch (error: any) {
      console.warn("addSubmission error:", error);
      if (error?.code === 'permission-denied') {
        try {
          handleFirestoreError(error, OperationType.CREATE, path);
        } catch {}
      }
      return localId;
    }
  },

  updateSubmission: async (id: string, data: Partial<Submission>) => {
    const subs = LocalDB.get(COLLECTIONS.SUBMISSIONS);
    const index = subs.findIndex((s: any) => s.id === id);
    if (index !== -1) {
      subs[index] = { ...subs[index], ...data };
      LocalDB.set(COLLECTIONS.SUBMISSIONS, subs);
    }

    if (!isFirebaseConfigured || isServiceDegraded || !auth?.currentUser) return;
    const path = `${COLLECTIONS.SUBMISSIONS}/${id}`;
    try {
      await updateDoc(doc(db, COLLECTIONS.SUBMISSIONS, id), data);
    } catch (error: any) {
      console.warn("updateSubmission error:", error);
      if (error?.code === 'permission-denied') {
        try {
          handleFirestoreError(error, OperationType.UPDATE, path);
        } catch {}
      }
    }
  },

  // Real-time listeners
  subscribeToTasks: (callback: (tasks: DictationTask[]) => void) => {
    if (!isFirebaseConfigured || isServiceDegraded) {
      const interval = setInterval(() => {
        callback(LocalDB.get(COLLECTIONS.TASKS));
      }, 2500);
      return () => clearInterval(interval);
    }
    const path = COLLECTIONS.TASKS;
    const q = collection(db, COLLECTIONS.TASKS);
    return onSnapshot(q, (snapshot) => {
      const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DictationTask));
      tasks.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      callback(tasks);
    }, (error) => {
      console.warn("subscribeToTasks error:", error);
      if (error?.code === 'permission-denied') {
        try {
          handleFirestoreError(error, OperationType.LIST, path);
        } catch {}
      }
    });
  },

  subscribeToSubmissions: (callback: (subs: Submission[]) => void, studentId?: string) => {
    if (!isFirebaseConfigured || isServiceDegraded || !auth?.currentUser) {
      const interval = setInterval(() => {
        const subs = LocalDB.get(COLLECTIONS.SUBMISSIONS);
        if (studentId) callback(subs.filter((s: any) => s.studentId === studentId));
        else callback(subs);
      }, 2500);
      return () => clearInterval(interval);
    }
    const path = COLLECTIONS.SUBMISSIONS;
    const q = studentId
      ? query(collection(db, COLLECTIONS.SUBMISSIONS), where("studentId", "==", studentId))
      : collection(db, COLLECTIONS.SUBMISSIONS);

    return onSnapshot(q, (snapshot) => {
      const subs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Submission));
      subs.sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0));
      callback(subs);
    }, (error) => {
      console.warn("subscribeToSubmissions error:", error);
      if (error?.code === 'permission-denied') {
        try {
          handleFirestoreError(error, OperationType.LIST, path);
        } catch {}
      }
    });
  },

  // Storage
  uploadImage: async (base64: string, path: string): Promise<string> => {
    if (!isFirebaseConfigured || isServiceDegraded || !storage || !auth?.currentUser) {
      return base64;
    }
    try {
      const storageRef = ref(storage, path);
      const uploadPromise = uploadString(storageRef, base64, "data_url");
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error("Storage timeout")), 2500)
      );

      await Promise.race([uploadPromise, timeoutPromise]);
      return await getDownloadURL(storageRef);
    } catch (error: any) {
      console.warn("Firebase Storage upload fallback to base64:", error?.message || error);
      return base64;
    }
  }
};
