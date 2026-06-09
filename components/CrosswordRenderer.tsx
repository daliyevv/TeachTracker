
import React from 'react';

interface Clue {
  number: number;
  clue: string;
  row: number;
  col: number;
}

interface CrosswordData {
  title: string;
  grid: string[][];
  clues: {
    across: Clue[];
    down: Clue[];
  };
}

interface Props {
  data: CrosswordData;
}

export const CrosswordRenderer: React.FC<Props> = ({ data }) => {
  const [showAnswers, setShowAnswers] = React.useState(false);

  if (!data || !data.grid || data.grid.length === 0) return null;

  // Find numbers for cells
  const getCellNumber = (r: number, c: number) => {
    const acrossClue = data.clues.across.find(clue => clue.row === r && clue.col === c);
    const downClue = data.clues.down.find(clue => clue.row === r && clue.col === c);
    return acrossClue?.number || downClue?.number || null;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-black text-slate-800">{data.title}</h3>
        <button 
          onClick={() => setShowAnswers(!showAnswers)}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all no-print ${
            showAnswers 
              ? 'bg-amber-100 text-amber-600 border border-amber-200' 
              : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
          }`}
        >
          {showAnswers ? "Javoblarni yashirish" : "Javoblarni ko'rsatish"}
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Grid */}
        <div className="bg-slate-900 p-4 rounded-2xl shadow-2xl overflow-auto max-w-full">
          <div 
            className="grid gap-px bg-slate-700 border border-slate-700"
            style={{ 
              gridTemplateColumns: `repeat(${data.grid[0].length}, minmax(35px, 1fr))`,
              width: 'fit-content'
            }}
          >
            {data.grid.map((row, r) => (
              row.map((cell, c) => {
                const isBlack = cell === "" || cell === null;
                const number = getCellNumber(r, c);
                
                return (
                  <div 
                    key={`${r}-${c}`}
                    className={`relative aspect-square flex items-center justify-center text-sm font-bold transition-all ${
                      isBlack ? 'bg-slate-900' : 'bg-white hover:bg-indigo-50'
                    }`}
                    style={{ width: '35px', height: '35px' }}
                  >
                    {number && (
                      <span className="absolute top-0.5 left-0.5 text-[8px] font-black text-slate-400 leading-none">
                        {number}
                      </span>
                    )}
                    {!isBlack && showAnswers && (
                      <span className="text-slate-800 uppercase animate-in zoom-in duration-300">{cell}</span>
                    )}
                  </div>
                );
              })
            ))}
          </div>
        </div>

        {/* Clues */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          <div className="space-y-4">
            <div className="flex items-center space-x-2 border-b-2 border-indigo-100 pb-2">
              <div className="w-2 h-6 bg-indigo-600 rounded-full"></div>
              <h4 className="font-black text-slate-800 uppercase tracking-wider">Yotiqchasiga</h4>
            </div>
            <ul className="space-y-3">
              {data.clues.across.map((clue) => (
                <li key={`across-${clue.number}`} className="flex space-x-3 group">
                  <span className="font-black text-indigo-600 shrink-0">{clue.number}.</span>
                  <span className="text-sm font-medium text-slate-600 group-hover:text-slate-900 transition-colors">{clue.clue}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-2 border-b-2 border-emerald-100 pb-2">
              <div className="w-2 h-6 bg-emerald-500 rounded-full"></div>
              <h4 className="font-black text-slate-800 uppercase tracking-wider">Tikiga</h4>
            </div>
            <ul className="space-y-3">
              {data.clues.down.map((clue) => (
                <li key={`down-${clue.number}`} className="flex space-x-3 group">
                  <span className="font-black text-emerald-500 shrink-0">{clue.number}.</span>
                  <span className="text-sm font-medium text-slate-600 group-hover:text-slate-900 transition-colors">{clue.clue}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      
      <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex items-start space-x-3">
        <div className="text-amber-500 mt-0.5">💡</div>
        <p className="text-xs text-amber-700 font-medium leading-relaxed">
          Krossvord avtomatik tarzda generatsiya qilindi. Ba'zi harflar yoki savollar noaniq bo'lishi mumkin. 
          O'quvchilar uchun chop etishdan oldin tekshirib ko'ring.
        </p>
      </div>
    </div>
  );
};
