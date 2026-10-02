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
import { db, auth, isFirebaseConfigured, getStorageLazy } from "./firebase";
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

/*
 * Bu yerda ilgari DEFAULT_SAMPLE_TASKS turardi — ikkita o'ylab topilgan
 * diktant ("Ona yurtim", "Bahor fasli"). Vazifalar ro'yxati bo'sh bo'lsa,
 * LocalDB ularni localStorage ga YOZIB QO'YAR va o'quvchiga HAQIQIY vazifa
 * sifatida ko'rsatardi.
 *
 * Buning oqibati shunchaki chalkashlik emas edi: ularning `id` si
 * ("sample-task-1") Firestore'da mavjud emas, `teacherId` esa
 * "teacher-default". O'quvchi "Boshlash" ni bosib ish yuborsa,
 * firestore.rules dagi `incoming().teacherId == taskTeacher(incoming().taskId)`
 * sharti o'tmas va topshiriq RAD ETILARDI — ya'ni bola diktantni yozib,
 * rasm yuklab, oxirida xato olardi.
 *
 * Endi vazifalar faqat o'qituvchi yaratgan joydan keladi. Vazifa bo'lmasa,
 * interfeys "Hozircha yangi vazifalar yo'q" deb halol aytadi.
 */

/**
 * Keshni foydalanuvchi bo'yicha ajratadigan kalit.
 *
 * Ilgari kalitlar oddiy "submissions", "tasks" edi — ya'ni BITTA brauzerda
 * hamma foydalanuvchi uchun UMUMIY. Maktab kompyuteri yoki uydagi umumiy
 * planshetda bu jiddiy muammo: bir o'quvchi chiqib, boshqasi kirsa,
 * oldingisining ishlari keshda qolar va tarmoq uzilganda ro'yxatda
 * ko'rinardi.
 *
 * Eski kalitlardagi ma'lumot shu o'zgarishdan keyin ishlatilmaydi. Bu
 * xavfsiz: kesh asl manba emas, haqiqiy ma'lumot Firestore'da.
 */
const scopedKey = (key: string): string => {
  let uid = 'anon';
  try {
    uid = auth?.currentUser?.uid || 'anon';
  } catch {
    // auth hali tayyor emas — umumiy bo'lmagan "anon" doirasiga tushamiz
  }
  return `tt:${uid}:${key}`;
};

// Local storage fallback for offline / demo mode
const LocalDB = {
  get: (key: string) => {
    try {
      const parsed = JSON.parse(localStorage.getItem(scopedKey(key)) || "null");
      if (parsed) return parsed;
      return [];
    } catch {
      return [];
    }
  },
  set: (key: string, data: any) => {
    try {
      localStorage.setItem(scopedKey(key), JSON.stringify(data));
    } catch (e) {
      console.warn("Local storage write failed, pruning older items to preserve image quality:", e);
      try {
        if (Array.isArray(data)) {
          // Eski topshiriqlarni qisqartirib, so'nggilarining rasmlarini to'liq saqlab qolamiz
          for (let count = Math.min(data.length - 1, 6); count >= 1; count--) {
            try {
              localStorage.setItem(scopedKey(key), JSON.stringify(data.slice(0, count)));
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
      return JSON.parse(localStorage.getItem(scopedKey(`${key}_${id}`)) || "null");
    } catch {
      return null;
    }
  },
  setItem: (key: string, id: string, data: any) => {
    try {
      localStorage.setItem(scopedKey(`${key}_${id}`), JSON.stringify(data));
    } catch (e) {
      console.warn("Local storage write failed:", e);
    }
  },
  removeItem: (key: string, id: string) => {
    try {
      localStorage.removeItem(scopedKey(`${key}_${id}`));
    } catch (e) {
      console.warn("Local storage remove failed:", e);
    }
  }
};

/**
 * Topshiriqlarni kim so'rayotganini bildiradi.
 *
 * O'qituvchi endi BARCHA topshiriqlarni emas, faqat o'z vazifalariga
 * tegishlilarini ko'radi. firestore.rules shu filtr qo'yilganini talab
 * qiladi, shuning uchun filtrsiz so'rov rad etiladi.
 */
/**
 * Firestore hujjati uchun xavfsiz chegara. Haqiqiy chegara 1MiB (1048576),
 * lekin maydon nomlari va ichki yuk uchun zahira qoldiramiz.
 */
const MAX_SUBMISSION_BYTES = 900 * 1024;

export type SubmissionFilter = { studentId?: string; teacherId?: string };

const buildSubmissionQuery = (filter?: SubmissionFilter) => {
  const col = collection(db, COLLECTIONS.SUBMISSIONS);
  if (filter?.studentId) return query(col, where("studentId", "==", filter.studentId));
  if (filter?.teacherId) return query(col, where("teacherId", "==", filter.teacherId));
  return col;
};

const filterLocalSubmissions = (filter?: SubmissionFilter): Submission[] => {
  const subs = LocalDB.get(COLLECTIONS.SUBMISSIONS) as Submission[];
  if (filter?.studentId) return subs.filter(s => s.studentId === filter.studentId);
  if (filter?.teacherId) return subs.filter(s => s.teacherId === filter.teacherId);
  return subs;
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
      // setUser to'liq setDoc qilgani uchun kodni har safar uzatmasak,
      // birinchi oddiy profil saqlashdayoq audit izi yo'qolardi.
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
    // Vazifalar endi autentifikatsiya talab qiladi (firestore.rules), shuning
    // uchun kirmagan holda so'rov yubormaymiz — submission funksiyalaridagi
    // kabi. Aks holda bu jimgina permission-denied bo'lib, namuna
    // vazifalarga tushib ketardi.
    if (!isFirebaseConfigured || isServiceDegraded || !auth?.currentUser) return LocalDB.get(COLLECTIONS.TASKS);
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
  getSubmissions: async (filter?: SubmissionFilter): Promise<Submission[]> => {
    if (!isFirebaseConfigured || isServiceDegraded || !auth?.currentUser) {
      return filterLocalSubmissions(filter);
    }
    const path = COLLECTIONS.SUBMISSIONS;
    try {
      const q = buildSubmissionQuery(filter);

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
      return filterLocalSubmissions(filter);
    }
  },

  addSubmission: async (sub: Omit<Submission, "id">): Promise<string> => {
    // Firestore hujjati 1MiB bilan cheklangan. Storage yoqilmagan bo'lsa
    // rasmlar hujjat ichida base64 holida keladi, shuning uchun hajmni
    // OLDINDAN tekshiramiz. Ilgari bu tekshirilmas, Firestore yozuvni rad
    // etar va xato yutilib ketardi — o'quvchi esa "Qabul qilindi!" ni ko'rardi.
    const approxBytes = JSON.stringify(sub).length;
    if (approxBytes > MAX_SUBMISSION_BYTES) {
      const mb = (approxBytes / (1024 * 1024)).toFixed(1);
      throw new Error(
        `Topshiriq juda katta (${mb}MB). Kamroq sahifa yuboring yoki rasmlarni ` +
        `alohida-alohida topshiring.`
      );
    }

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
      // Mahalliy nusxani olib tashlaymiz: aks holda saqlanmagan ish
      // saqlangandek ko'rinib qolardi.
      const rollback = (LocalDB.get(COLLECTIONS.SUBMISSIONS) as Submission[])
        .filter(s => s.id !== localId);
      LocalDB.set(COLLECTIONS.SUBMISSIONS, rollback);
      // Xato yuqoriga chiqadi. Ilgari u yutilar va o'quvchiga "Qabul qilindi!"
      // ko'rsatilardi, ish esa hech qayerga bormasdi.
      throw error;
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
    if (!isFirebaseConfigured || isServiceDegraded || !auth?.currentUser) {
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

  subscribeToSubmissions: (callback: (subs: Submission[]) => void, filter?: SubmissionFilter) => {
    if (!isFirebaseConfigured || isServiceDegraded || !auth?.currentUser) {
      const interval = setInterval(() => {
        callback(filterLocalSubmissions(filter));
      }, 2500);
      return () => clearInterval(interval);
    }
    const path = COLLECTIONS.SUBMISSIONS;
    const q = buildSubmissionQuery(filter);

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
  /**
   * Rasmni Storage'ga yuklab, yuklab olish manzilini qaytaradi.
   *
   * Ilgari bu funksiya 2,5 soniyadan keyin base64 ni qaytarardi. Mobil
   * internetda 2,5 soniya ko'pincha yetmaydi, shuning uchun bu istisno emas,
   * ODATIY yo'l edi: base64 Firestore hujjatiga tushar, ikki sahifada 1MiB
   * chegarasi oshar va topshiriq jimgina yo'qolardi.
   *
   * Endi timeout 60 soniya va muvaffaqiyatsizlik haqiqiy xato — chaqiruvchi
   * uni foydalanuvchiga ko'rsatadi.
   */
  uploadImage: async (base64: string, path: string): Promise<string> => {
    // Demo yoki avtorizatsiyasiz rejim: Storage yo'q, base64 bilan ishlaymiz
    if (!isFirebaseConfigured || isServiceDegraded || !auth?.currentUser) {
      return base64;
    }

    // Storage moduli va SDK funksiyalari shu yerda — birinchi yuklashda emas.
    const [storage, { ref, uploadString, getDownloadURL }] = await Promise.all([
      getStorageLazy(),
      import("firebase/storage"),
    ]);
    if (!storage) return base64;

    const storageRef = ref(storage, path);
    const uploadPromise = uploadString(storageRef, base64, "data_url");
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(
        () => reject(new Error("Rasmni yuklash juda uzoq davom etdi")),
        60000
      );
    });

    try {
      await Promise.race([uploadPromise, timeoutPromise]);
      return await getDownloadURL(storageRef);
    } catch (error: any) {
      // Loyihada Firebase Storage yoqilmagan bo'lishi mumkin (Spark tarifida
      // bucket umuman yaratilmaydi). Bunday holda rasmni base64 ko'rinishida
      // hujjat ichida saqlaymiz — bu yagona ishlaydigan yo'l.
      //
      // Bu xavfsiz, chunki rasm yuborishdan oldin siqilgan va addSubmission
      // hujjat hajmini tekshiradi: Firestore chegarasidan oshsa, aniq xato
      // beradi. Ilgari hajm tekshirilmasdi va topshiriq jimgina yo'qolardi.
      console.warn(
        "Storage'ga yuklab bo'lmadi, rasm hujjat ichida saqlanadi:",
        error?.message || error
      );
      return base64;
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }
};
