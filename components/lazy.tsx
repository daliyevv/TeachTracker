/**
 * Og'ir komponentlar — alohida bo'laklarda (chunk).
 *
 * Nega kerak: butun ilova bitta 2,37MB faylga yig'ilardi. Telefonda,
 * sekin internetda bu ochilish vaqtining asosiy qismi. Holbuki birinchi
 * ekranda bu komponentlarning HECH BIRI kerak emas:
 *
 *   - `ResultView`  -> kod ranglagichni (`react-syntax-highlighter`) tortadi
 *   - `TaskCreator` -> `.docx` o'qish uchun `mammoth` ni tortadi
 *   - `AIAssistant`, `GamesHub`, `Pricing` -> `framer-motion` ni tortadi
 *   - `AIAssistant`  -> ustoz uchun, o'quvchi uni umuman ko'rmaydi
 *
 * Har biri `Suspense` bilan shu yerda o'raladi, shuning uchun chaqiruvchi
 * joylarda hech narsa o'zgarmaydi — oddiy komponent kabi ishlatiladi.
 */
import React, { lazy, Suspense } from 'react';

/** Bo'lak yuklanayotgan paytdagi ko'rinish. */
export const LoadingPanel: React.FC<{ label?: string }> = ({ label }) => (
  <div className="flex flex-col items-center justify-center py-20 space-y-4">
    <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    {label && <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{label}</p>}
  </div>
);

/** To'liq ekranli oynalar uchun — fon ortida yuklanadi. */
const LoadingOverlay: React.FC = () => (
  <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-[200] flex items-center justify-center">
    <div className="w-14 h-14 border-4 border-white border-t-transparent rounded-full animate-spin" />
  </div>
);

/**
 * Nomlangan eksportni `Suspense` bilan o'ralgan "dangasa" komponentga
 * aylantiradi.
 */
function lazyNamed<P extends object>(
  loader: () => Promise<Record<string, any>>,
  exportName: string,
  fallback: React.ReactNode
): React.FC<P> {
  const Loaded = lazy(async () => {
    const mod = await loader();
    return { default: mod[exportName] as React.ComponentType<P> };
  });
  const Wrapped: React.FC<P> = (props) => (
    <Suspense fallback={fallback}>
      <Loaded {...(props as any)} />
    </Suspense>
  );
  Wrapped.displayName = `Lazy(${exportName})`;
  return Wrapped;
}

// --- Panellar ---

export const TeacherDashboard = lazyNamed<any>(
  () => import('./TeacherDashboard'), 'TeacherDashboard', <LoadingPanel />
);
export const StudentDashboard = lazyNamed<any>(
  () => import('./StudentDashboard'), 'StudentDashboard', <LoadingPanel />
);

// --- To'liq ekranli oynalar ---

export const DictationWorker = lazyNamed<any>(
  () => import('./DictationWorker'), 'DictationWorker', <LoadingOverlay />
);
export const SubmissionReviewer = lazyNamed<any>(
  () => import('./SubmissionReviewer'), 'SubmissionReviewer', <LoadingOverlay />
);
export const ManualChecker = lazyNamed<any>(
  () => import('./ManualChecker'), 'ManualChecker', <LoadingOverlay />
);
export const TaskCreator = lazyNamed<any>(
  () => import('./TaskCreator'), 'TaskCreator', <LoadingOverlay />
);
export const BadgesModal = lazyNamed<any>(
  () => import('./BadgesModal'), 'BadgesModal', null
);

// --- Bo'limlar ---

export const ResultView = lazyNamed<any>(
  () => import('./ResultView'), 'ResultView', <LoadingPanel label="Natija yuklanmoqda" />
);
export const AIAssistant = lazyNamed<any>(
  () => import('./AIAssistant'), 'AIAssistant', <LoadingPanel />
);
export const GamesHub = lazyNamed<any>(
  () => import('./GamesHub'), 'GamesHub', <LoadingPanel />
);
export const ResourceLibrary = lazyNamed<any>(
  () => import('./ResourceLibrary'), 'ResourceLibrary', <LoadingPanel />
);

/** `Pricing` default eksport qiladi. */
export const Pricing = lazyNamed<any>(
  () => import('./Pricing'), 'default', <LoadingPanel />
);
