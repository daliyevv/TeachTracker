
import { User, DictationTask, Submission } from '../types';

const STORAGE_KEYS = {
  USER: 'teachtracker_user',
  TASKS: 'teachtracker_tasks',
  SUBMISSIONS: 'teachtracker_submissions'
};

export const DB = {
  getUser: (): User | null => JSON.parse(localStorage.getItem(STORAGE_KEYS.USER) || 'null'),
  setUser: (user: User | null) => localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user)),
  
  getTasks: (): DictationTask[] => JSON.parse(localStorage.getItem(STORAGE_KEYS.TASKS) || '[]'),
  addTask: (task: DictationTask) => {
    const tasks = DB.getTasks();
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify([task, ...tasks]));
  },

  getSubmissions: (): Submission[] => JSON.parse(localStorage.getItem(STORAGE_KEYS.SUBMISSIONS) || '[]'),
  addSubmission: (sub: Submission) => {
    const subs = DB.getSubmissions();
    localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify([sub, ...subs]));
  },
  updateSubmission: (updatedSub: Submission) => {
    const subs = DB.getSubmissions().map(s => s.id === updatedSub.id ? updatedSub : s);
    localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(subs));
  }
};
