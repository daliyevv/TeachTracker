
export type UserRole = 'teacher' | 'student';
export type ViewType = 'home' | 'tasks' | 'results';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

export interface DictationTask {
  id: string;
  teacherId: string;
  title: string;
  content: string; // Asl matn
  audioUrl?: string;
  status: 'published' | 'closed';
  createdAt: number;
}

export interface Mistake {
  word: string;
  correction: string;
  description: string;
  type: 'imlo' | 'tinish_belgisi' | 'uslub';
  lineNumber: number;
  boundingBox: [number, number, number, number];
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

export interface Submission {
  id: string;
  taskId: string;
  studentId: string;
  image: string; // Base64
  aiResult: AnalysisResult;
  teacherCorrection?: AnalysisResult;
  status: 'pending' | 'reviewing' | 'approved';
  submittedAt: number;
  approvedAt?: number;
}

export type AppState = 'idle' | 'loading' | 'success' | 'error';
