
import React, { useState } from 'react';

interface Props { onCancel: () => void; onCreate: (d: any) => void; }

export const TaskCreator: React.FC<Props> = ({ onCancel, onCreate }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-[3rem] p-10 shadow-2xl space-y-8">
        <div>
          <h3 className="text-2xl font-black text-slate-900">Yangi diktant taski</h3>
          <p className="text-slate-500">Talabalar uchun matn va shartlarni belgilang.</p>
        </div>
        
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-600 uppercase tracking-widest ml-1">Mavzu nomi</label>
            <input 
              value={title} onChange={e => setTitle(e.target.value)}
              className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-600 focus:bg-white transition-all outline-none font-medium"
              placeholder="Masalan: Oltin kuz"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-600 uppercase tracking-widest ml-1">Diktant matni</label>
            <textarea 
              rows={6} value={content} onChange={e => setContent(e.target.value)}
              className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-600 focus:bg-white transition-all outline-none font-medium resize-none"
              placeholder="Diktant matnini shu yerga kiriting..."
            />
          </div>
        </div>

        <div className="flex space-x-4 pt-4">
          <button onClick={onCancel} className="flex-1 py-4 font-bold text-slate-500 hover:bg-slate-50 rounded-2xl transition-all">Bekor qilish</button>
          <button 
            onClick={() => onCreate({ title, content })}
            disabled={!title || !content}
            className="flex-grow py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50"
          >
            E'lon qilish
          </button>
        </div>
      </div>
    </div>
  );
};
