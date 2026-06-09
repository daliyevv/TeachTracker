
import React, { useState } from 'react';
import { Search, Filter, BookOpen, Video, FileText, Music, Download, ExternalLink } from 'lucide-react';
import { Resource } from '../types';

const MOCK_RESOURCES: Resource[] = [
  { id: '1', title: '4-sinf Ona tili darsligi', type: 'document', grade: 4, subject: 'Ona tili', url: '#', thumbnail: 'https://picsum.photos/seed/book1/400/300' },
  { id: '2', title: 'Sifat so\'z turkumi (Prezentatsiya)', type: 'presentation', grade: 3, subject: 'Ona tili', url: '#', thumbnail: 'https://picsum.photos/seed/pres1/400/300' },
  { id: '3', title: 'Alisher Navoiy hayoti (Video)', type: 'video', grade: 5, subject: 'Adabiyot', url: '#', thumbnail: 'https://picsum.photos/seed/video1/400/300' },
  { id: '4', title: 'Imlo qoidalari to\'plami', type: 'document', grade: 2, subject: 'Ona tili', url: '#', thumbnail: 'https://picsum.photos/seed/doc1/400/300' },
  { id: '5', title: 'Audio diktantlar to\'plami', type: 'audio', grade: 4, subject: 'Ona tili', url: '#', thumbnail: 'https://picsum.photos/seed/audio1/400/300' },
  { id: '6', title: 'Matematika 1-qism', type: 'document', grade: 1, subject: 'Matematika', url: '#', thumbnail: 'https://picsum.photos/seed/math1/400/300' },
];

export const ResourceLibrary: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<number | 'all'>('all');

  const filteredResources = MOCK_RESOURCES.filter(res => {
    const matchesSearch = res.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGrade = selectedGrade === 'all' || res.grade === selectedGrade;
    return matchesSearch && matchesGrade;
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-slate-900">Kutubxona</h1>
          <p className="text-slate-500 font-medium">Barcha darsliklar va metodik materiallar bir joyda</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text"
              placeholder="Qidirish..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 pr-4 py-3 bg-white border-2 border-slate-100 rounded-2xl focus:border-indigo-600 transition-all w-64 font-medium"
            />
          </div>
          <select 
            value={selectedGrade}
            onChange={(e) => setSelectedGrade(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="px-4 py-3 bg-white border-2 border-slate-100 rounded-2xl focus:border-indigo-600 transition-all font-bold text-slate-700"
          >
            <option value="all">Barcha sinflar</option>
            {[1,2,3,4,5,6,7,8,9,10,11].map(g => (
              <option key={g} value={g}>{g}-sinf</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredResources.map((res) => (
          <div key={res.id} className="group bg-white rounded-[2rem] border border-slate-100 overflow-hidden hover:shadow-2xl hover:shadow-slate-200 transition-all">
            <div className="aspect-video relative overflow-hidden">
              <img 
                src={res.thumbnail} 
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                alt={res.title}
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-4 left-4">
                <span className="px-3 py-1 bg-white/90 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-wider text-slate-900 shadow-sm">
                  {res.grade}-sinf
                </span>
              </div>
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-xl">
                  <ExternalLink className="w-5 h-5 text-indigo-600" />
                </div>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{res.subject}</span>
                  <h3 className="font-black text-slate-900 line-clamp-1">{res.title}</h3>
                </div>
                <div className="p-2 bg-slate-50 rounded-xl">
                  {res.type === 'presentation' && <BookOpen className="w-4 h-4 text-amber-500" />}
                  {res.type === 'video' && <Video className="w-4 h-4 text-rose-500" />}
                  {res.type === 'document' && <FileText className="w-4 h-4 text-indigo-500" />}
                  {res.type === 'audio' && <Music className="w-4 h-4 text-emerald-500" />}
                </div>
              </div>
              <div className="flex items-center justify-between pt-2">
                <button className="text-xs font-black text-slate-400 hover:text-indigo-600 transition-colors uppercase tracking-widest">Ko'rish</button>
                <button className="flex items-center space-x-2 text-xs font-black text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl hover:bg-indigo-100 transition-colors">
                  <Download className="w-3 h-3" />
                  <span>Yuklash</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
