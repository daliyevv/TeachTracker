
export type UserRole = 'teacher' | 'student';
export type ViewType = 'home' | 'tasks' | 'results' | 'ai-assistant' | 'library' | 'games';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  badges?: string[]; // Masalan: ['imlo_ustasi', 'husnihat_qiroli', 'besh_yulduz']
  points?: number;
  isPro?: boolean;
  subscriptionStatus?: 'active' | 'canceled' | 'none';
  stripeCustomerId?: string;
}

export interface Resource {
  id: string;
  title: string;
  type: 'presentation' | 'document' | 'audio' | 'video';
  grade: number;
  subject: string;
  url: string;
  thumbnail?: string;
  description?: string;
}

export interface Game {
  id: string;
  title: string;
  type: 'wheel' | 'box' | 'anagram' | 'quiz';
  description: string;
  icon: string;
}

export type TaskType = 'dictation' | 'coding' | 'general';

export interface DictationTask {
  id: string;
  teacherId: string;
  title: string;
  content: string; // Asl matn yoki topshiriq tavsifi
  instructionFileUrl?: string;
  instructionText?: string;
  type?: TaskType;
  audioUrl?: string;
  minPlaybackSpeed?: number; // Masalan: 0.8, 1.0, 1.2
  status: 'published' | 'closed';
  createdAt: number;
}

export interface Mistake {
  word: string;
  correction: string;
  description: string;
  type: 'imlo' | 'tinish_belgisi' | 'uslub' | 'mantiq' | 'xavfsizlik' | 'sintaksis';
  lineNumber: number;
  boundingBox: [number, number, number, number];
  pageIndex: number;
}

export interface AnalysisResult {
  extractedText: string;
  correctedText: string;
  mistakes: Mistake[];
  grade: number;
  handwritingScore: number;
  feedback: string;
  improvementTips: string[];
}

export interface SubmissionFile {
  name: string;
  content?: string; // for text/code
  data?: string;    // base64 for binary
  mimeType?: string;
  language?: string;
}

export interface Submission {
  id: string;
  taskId: string;
  studentId: string;
  studentName?: string; // Ustoz qo'lda tekshirganda o'quvchi ismi
  images?: string[]; // Ko'p sahifali qo'llab-quvvatlash uchun array
  files?: SubmissionFile[];
  ttResult: AnalysisResult;
  teacherCorrection?: AnalysisResult;
  status: 'pending' | 'reviewing' | 'approved';
  submittedAt: number;
  approvedAt?: number;
}

export type AppState = 'idle' | 'loading' | 'success' | 'error';
