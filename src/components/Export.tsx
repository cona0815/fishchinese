import React, { useState, useMemo } from 'react';
import { Word } from '../types';
import { Printer, FileText, Filter, Shuffle, ChevronLeft } from 'lucide-react';

interface ExportProps {
  words: Word[];
}

export const Export: React.FC<ExportProps> = ({ words }) => {
  const [quizCount, setQuizCount] = useState(20);
  const [quizOrder, setQuizOrder] = useState<'random' | 'sequential' | 'error_count' | 'date'>('random');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['全部']);
  const [quizMode, setQuizMode] = useState<'student' | 'teacher'>('student');
  const [quizData, setQuizData] = useState<Word[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  // Derived categories
  const availableCategories = useMemo(() => {
    const cats = new Set(words.map(w => {
      let t = w.錯誤類型 || '';
      if (t === '字詞' || t === '字義' || t === '語詞') return '字詞義';
      return t;
    }).filter(Boolean));
    return Array.from(cats);
  }, [words]);

  const toggleCategory = (cat: string) => {
    if (cat === '全部') {
      setSelectedCategories(['全部']);
      return;
    }

    setSelectedCategories(prev => {
      const filtered = prev.filter(c => c !== '全部');
      if (filtered.includes(cat)) {
        const next = filtered.filter(c => c !== cat);
        return next.length === 0 ? ['全部'] : next;
      } else {
        return [...filtered, cat];
      }
    });
  };

  const generateQuiz = () => {
    let candidates = [...words];

    // Filter by categories
    if (!selectedCategories.includes('全部')) {
      candidates = candidates.filter(w => {
        let t = w.錯誤類型 || '';
        if (t === '字詞' || t === '字義' || t === '語詞') t = '字詞義';
        return selectedCategories.includes(t);
      });
    }
    
    // Sort
    if (quizOrder === 'random') {
      candidates.sort(() => Math.random() - 0.5);
    } else if (quizOrder === 'sequential') {
      // Keep original order (usually by ID or added time)
    } else if (quizOrder === 'error_count') {
      candidates.sort((a, b) => (b.錯誤次數 || 0) - (a.錯誤次數 || 0));
    } else if (quizOrder === 'date') {
      // Sort by ID (newest first)
      candidates.sort((a, b) => (parseInt(b.ID.substring(1)) || 0) - (parseInt(a.ID.substring(1)) || 0));
    }
    
    setQuizData(candidates.slice(0, quizCount));
    setShowPreview(true);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8">
      {/* Controls - Hidden when printing */}
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 mb-8 print:hidden space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-50 pb-6">
          <h2 className="text-3xl font-black text-slate-800 flex items-center gap-3 tracking-tight">
            <div className="bg-teal-50 p-2 rounded-2xl">
              <FileText className="text-teal-600" size={28} />
            </div>
            匯出錯題練習考卷
          </h2>
          <div className="flex gap-3 w-full md:w-auto">
             <button 
              onClick={handlePrint}
              disabled={!showPreview}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-slate-800 text-white rounded-xl hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all font-bold shadow-lg"
            >
              <Printer size={18} />
              列印 / 儲存 PDF
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Category Selection */}
          <div className="space-y-4 col-span-1 md:col-span-2">
            <label className="text-sm font-black text-slate-700 flex items-center gap-2 ml-1">
              <Filter size={16} className="text-teal-500" />
              題目分類 (可複選)
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => toggleCategory('全部')}
                className={`px-5 py-2 rounded-xl text-sm font-bold transition-all shadow-sm ${
                  selectedCategories.includes('全部')
                    ? 'bg-teal-600 text-white shadow-xl shadow-teal-200 border-transparent'
                    : 'bg-slate-50 border border-slate-100 text-slate-500 hover:bg-slate-100'
                }`}
              >
                全部
              </button>
              {availableCategories.map(cat => (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className={`px-5 py-2 rounded-xl text-sm font-bold transition-all shadow-sm ${
                    selectedCategories.includes(cat) && !selectedCategories.includes('全部')
                      ? 'bg-teal-600 text-white shadow-xl shadow-teal-200 border-transparent'
                      : 'bg-slate-50 border border-slate-100 text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Sort Order */}
          <div className="space-y-2">
            <label className="text-sm font-black text-slate-700 flex items-center gap-2 ml-1">
              <Shuffle size={16} className="text-teal-500" />
              出題順序
            </label>
            <select 
              value={quizOrder}
              onChange={(e) => setQuizOrder(e.target.value as any)}
              className="w-full p-3 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 outline-none bg-slate-50/50 font-medium text-slate-700"
            >
              <option value="random">隨機亂數</option>
              <option value="error_count">錯誤次數 (多到少)</option>
              <option value="date">新增時間 (新到舊)</option>
              <option value="sequential">原始順序</option>
            </select>
          </div>

          {/* Count */}
          <div className="space-y-2">
            <label className="text-sm font-black text-slate-700 ml-1">
              考題數量
            </label>
            <input 
              type="number" 
              value={quizCount} 
              onChange={(e) => setQuizCount(parseInt(e.target.value))}
              min="1" max="100"
              className="w-full p-3 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 outline-none bg-slate-50/50 font-medium text-slate-700"
            />
          </div>

          {/* Mode */}
          <div className="space-y-2">
            <label className="text-sm font-black text-slate-700 ml-1">
              考卷模式
            </label>
            <div className="flex bg-slate-100/50 p-1 rounded-2xl border border-slate-100">
              <button
                onClick={() => setQuizMode('student')}
                className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all ${
                  quizMode === 'student' ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                學生版
              </button>
              <button
                onClick={() => setQuizMode('teacher')}
                className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all ${
                  quizMode === 'teacher' ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                教師版 (含解)
              </button>
            </div>
          </div>
        </div>

        <button 
          onClick={generateQuiz}
          className="w-full py-4 bg-teal-600 text-white rounded-2xl font-black text-lg hover:bg-teal-700 transition-all shadow-xl shadow-teal-200 transform hover:translate-y-[-2px] active:translate-y-[1px]"
        >
          產生專業考卷預覽
        </button>
      </div>

      {/* Preview Area */}
      {showPreview && (
        <div className="max-w-5xl mx-auto p-4 md:p-8 fixed inset-0 z-50 bg-slate-50/95 backdrop-blur-sm overflow-y-auto print:static print:bg-white print:p-0 print:m-0 scrollbar-none">
          {/* Controls - Hidden when printing */}
          <div className="max-w-4xl mx-auto mb-8 print:hidden flex flex-col sm:flex-row justify-between items-center gap-6 bg-white p-6 rounded-3xl shadow-xl mt-8">
            <button 
              onClick={() => setShowPreview(false)}
              className="flex items-center gap-2 text-slate-400 font-black hover:text-teal-600 transition-all group"
            >
              <div className="p-2 bg-slate-50 group-hover:bg-teal-50 rounded-xl transition-colors">
                <ChevronLeft size={20} />
              </div>
              返回設定
            </button>
            
            <div className="flex gap-4 items-center">
              <div className="flex bg-slate-100 p-1 rounded-2xl">
                <button
                  onClick={() => setQuizMode('student')}
                  className={`px-6 py-2 text-xs font-black rounded-xl transition-all ${
                    quizMode === 'student' ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-400'
                  }`}
                >
                  學生模式
                </button>
                <button
                  onClick={() => setQuizMode('teacher')}
                  className={`px-6 py-2 text-xs font-black rounded-xl transition-all ${
                    quizMode === 'teacher' ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-400'
                  }`}
                >
                  教師解答
                </button>
              </div>
              
              <button 
                onClick={handlePrint}
                className="flex items-center gap-2 px-8 py-2.5 bg-teal-600 text-white rounded-2xl hover:bg-teal-700 transition-all font-black shadow-lg shadow-teal-100"
              >
                <Printer size={18} />
                列印 / 儲存 PDF
              </button>
            </div>
          </div>

          {/* Paginated Paper Content */}
          <div className="space-y-8 print:space-y-0">
            {(() => {
              const QUESTIONS_PER_PAGE = 15;
              const totalPages = Math.ceil(quizData.length / QUESTIONS_PER_PAGE);
              
              return Array.from({ length: totalPages }).map((_, pageIndex) => (
                <div 
                  key={pageIndex}
                  className="bg-white shadow-2xl min-h-[297mm] w-full max-w-[210mm] mx-auto p-10 md:p-14 print:p-10 print:shadow-none print:w-[210mm] print:h-[297mm] print:min-h-[297mm] print:rounded-none overflow-hidden relative flex flex-col print:break-after-page mb-8 print:mb-0"
                >
                  {/* Header - Only on the FIRST page */}
                  {pageIndex === 0 ? (
                    <div className="text-center border-b-4 border-slate-800 pb-4 mb-6">
                      <h1 className="text-3xl font-serif font-black mb-3 tracking-[0.3em] text-slate-900 uppercase">國語文能力診斷練習卷</h1>
                      <div className="flex justify-between items-end text-lg font-serif text-slate-800 px-6">
                        <div className="space-x-8 flex items-center">
                          <span className="border-b-2 border-slate-300 pb-1 px-2 min-w-[80px]">班級：</span>
                          <span className="border-b-2 border-slate-300 pb-1 px-2 min-w-[100px]">姓名：</span>
                          <span className="border-b-2 border-slate-300 pb-1 px-2 min-w-[60px]">座號：</span>
                        </div>
                        <div className="px-3 py-1 bg-slate-100 rounded-lg text-[9px] font-black text-slate-500 tracking-widest uppercase">
                          {quizMode === 'teacher' ? 'AUTHORIZED TEACHER COPY' : 'STUDENT PRACTICE VERSION'}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-right mb-4 border-b border-slate-100 pb-2">
                       <span className="text-[10px] font-black text-slate-300 tracking-[0.2em]">國語文能力診斷練習卷 (續)</span>
                    </div>
                  )}

                  {/* Content Table */}
                  <div className="flex-grow">
                    <table className="w-full border-collapse text-base font-serif border border-slate-300">
                      <thead>
                        <tr className="bg-slate-50 print:bg-gray-100 border-b-2 border-slate-800">
                          <th className="p-2 w-12 text-center font-black text-slate-500 border-r border-slate-300">#</th>
                          <th className="p-2 text-left font-black border-r border-slate-300">測驗內容</th>
                          <th className="p-2 w-1/4 text-center font-black border-r border-slate-300">作答區</th>
                          <th className="p-2 w-1/4 text-center font-black">初評/訂正</th>
                        </tr>
                      </thead>
                      <tbody>
                        {quizData
                          .slice(pageIndex * QUESTIONS_PER_PAGE, (pageIndex + 1) * QUESTIONS_PER_PAGE)
                          .map((w, i) => {
                            let questionContent: React.ReactNode = w.字詞;
                            let answerContent = '';
                            let type = w.錯誤類型 || '';
                            
                            if (type.includes('字形')) {
                              const match = w.字詞.match(/「(.*?)」/);
                              const targetChar = match ? match[1] : '';
                              if (targetChar) {
                                const hint = w.注音 ? w.注音 : '　　';
                                questionContent = w.字詞.replace(/「.*?」/, ` 「 (${hint}) 」 `);
                                answerContent = targetChar;
                              }
                            } else if (type.includes('字音')) {
                              questionContent = w.字詞;
                              answerContent = w.注音 || '';
                            } else if (type.includes('成語') || type.includes('詞義') || type === '字詞' || type === '字義' || type === '語詞') {
                              questionContent = w.字詞;
                              answerContent = w.釋義 || '';
                            } else {
                              questionContent = (
                                <div className="space-y-1">
                                  <div className="font-bold text-lg">{w.字詞}</div>
                                  {w.考點 && <div className="text-xs underline underline-offset-4 decoration-slate-200">{w.考點}</div>}
                                </div>
                              );
                              answerContent = w.詳情 || '';
                            }

                            return (
                              <tr key={w.ID} className="border-b border-slate-300">
                                <td className="p-2 text-center text-slate-400 font-bold align-middle border-r border-slate-300">
                                  {pageIndex * QUESTIONS_PER_PAGE + i + 1}
                                </td>
                                <td className="py-2 px-3 font-serif text-lg align-middle leading-tight text-slate-800 border-r border-slate-300">
                                  {questionContent}
                                </td>
                                <td className="py-2 px-3 bg-slate-50/20 align-middle text-center min-h-[50px] border-r border-slate-300">
                                  {quizMode === 'teacher' && (
                                    <div className="text-rose-600 font-black text-xl animate-in zoom-in duration-300">
                                      {answerContent}
                                    </div>
                                  )}
                                </td>
                                <td className="p-2 align-middle"></td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>

                  {/* Footer */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-[9px] text-slate-300 font-black uppercase tracking-[0.2em]">
                    <div className="flex gap-4">
                      <span>AI LEARNING ENGINE</span>
                      <span>PAGE {pageIndex + 1} OF {totalPages}</span>
                    </div>
                    <div className="font-bold">{new Date().toLocaleDateString()}</div>
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
