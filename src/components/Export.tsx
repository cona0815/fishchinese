import React, { useState, useMemo } from 'react';
import { Word } from '../types';
import { Printer, FileText, Filter, SortDesc, Shuffle } from 'lucide-react';

interface ExportProps {
  words: Word[];
}

export const Export: React.FC<ExportProps> = ({ words }) => {
  const [quizCount, setQuizCount] = useState(20);
  const [quizOrder, setQuizOrder] = useState<'random' | 'sequential' | 'error_count' | 'date'>('random');
  const [selectedCategory, setSelectedCategory] = useState<string>('全部');
  const [quizMode, setQuizMode] = useState<'student' | 'teacher'>('student');
  const [quizData, setQuizData] = useState<Word[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  // Derived categories
  const availableCategories = useMemo(() => {
    const cats = new Set(words.map(w => w.錯誤類型).filter(Boolean));
    return ['全部', ...Array.from(cats)];
  }, [words]);

  const generateQuiz = () => {
    let candidates = [...words];

    // Filter by category
    if (selectedCategory !== '全部') {
      candidates = candidates.filter(w => w.錯誤類型 === selectedCategory);
    }
    
    // Sort
    if (quizOrder === 'random') {
      candidates.sort(() => Math.random() - 0.5);
    } else if (quizOrder === 'sequential') {
      // Keep original order (usually by ID or added time)
    } else if (quizOrder === 'error_count') {
      candidates.sort((a, b) => (b.錯誤次數 || 0) - (a.錯誤次數 || 0));
    } else if (quizOrder === 'date') {
      // Sort by updated time (newest first)
      candidates.sort((a, b) => new Date(b.更新時間 || '').getTime() - new Date(a.更新時間 || '').getTime());
    }
    
    setQuizData(candidates.slice(0, quizCount));
    setShowPreview(true);
  };

  const handlePrint = () => {
    window.print();
  };

  // Helper to render table rows
  const renderRows = (items: Word[], startIndex: number) => {
    return items.map((w, i) => {
      let questionContent = w.字詞;
      let answerContent = '';
      let type = w.錯誤類型 || '';
      
      // Determine Question and Answer based on type
      if (type.includes('字形')) {
        // For Character Shape:
        // Question: Show word with blank or Zhuyin hint
        // Answer: The correct character
        
        // Extract the target character from brackets if exists: e.g., 脫「穎」而出
        const match = w.字詞.match(/「(.*?)」/);
        const targetChar = match ? match[1] : '';
        
        if (targetChar) {
          // Replace target char with blank and show Zhuyin hint if available
          const hint = w.注音 ? `(${w.注音})` : '___';
          questionContent = w.字詞.replace(/「.*?」/, ` ${hint} `);
          answerContent = targetChar;
        } else {
          // Fallback if no brackets found
          questionContent = w.字詞;
          answerContent = w.考點 || '';
        }

      } else if (type.includes('字音')) {
        // For Pronunciation:
        // Question: Show word (target char might be bracketed)
        // Answer: The Zhuyin
        
        // Remove brackets for question display if preferred, or keep them to indicate target
        // Let's keep brackets to be precise
        questionContent = w.字詞;
        answerContent = w.注音 || '';

      } else if (type.includes('成語') || type.includes('字詞義')) {
        // For Idioms/Meanings:
        // Question: Show word
        // Answer: Meaning (Definition)
        
        // Teacher mode shows definition as answer? Or maybe fill in the blank?
        // Usually for these, we test definition matching or fill in blank.
        // Let's assume we test Definition -> Word? Or Word -> Definition?
        // Standard quiz: Word -> Write Definition/Meaning
        
        questionContent = w.字詞;
        answerContent = w.釋義 || '';
      } else {
        // Others (Reading, etc.)
        questionContent = w.字詞; // Title
        answerContent = w.詳情 || ''; // Answer key
      }

      return (
        <tr key={w.ID} className="h-14 border-b border-slate-300">
          <td className="p-2 text-center border-r border-slate-300 w-12">{startIndex + i}.</td>
          <td className="p-2 border-r border-slate-300 font-serif text-lg">
            {questionContent}
          </td>
          <td className="p-2 border-r border-slate-300 w-1/4">
            {/* Student writes answer here */}
            {quizMode === 'teacher' && (
              <span className="text-red-600 font-medium">{answerContent}</span>
            )}
          </td>
          <td className="p-2 w-1/3">
            {/* Correction column */}
          </td>
        </tr>
      );
    });
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8">
      {/* Controls - Hidden when printing */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-8 print:hidden space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-4">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="text-indigo-600" />
            匯出考卷
          </h2>
          <div className="flex gap-2">
             <button 
              onClick={handlePrint}
              disabled={!showPreview}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Printer size={18} />
              列印 / 儲存 PDF
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Category Selection */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <Filter size={16} />
              題目分類
            </label>
            <select 
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50"
            >
              {availableCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Sort Order */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <SortDesc size={16} />
              出題順序
            </label>
            <select 
              value={quizOrder}
              onChange={(e) => setQuizOrder(e.target.value as any)}
              className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50"
            >
              <option value="random">隨機亂數</option>
              <option value="error_count">錯誤次數 (多到少)</option>
              <option value="date">新增時間 (新到舊)</option>
              <option value="sequential">原始順序</option>
            </select>
          </div>

          {/* Count */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">
              考題數量
            </label>
            <input 
              type="number" 
              value={quizCount} 
              onChange={(e) => setQuizCount(parseInt(e.target.value))}
              min="1" max="100"
              className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50"
            />
          </div>

          {/* Mode */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">
              考卷模式
            </label>
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setQuizMode('student')}
                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${
                  quizMode === 'student' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                學生版
              </button>
              <button
                onClick={() => setQuizMode('teacher')}
                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${
                  quizMode === 'teacher' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                教師版 (含解)
              </button>
            </div>
          </div>
        </div>

        <button 
          onClick={generateQuiz}
          className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
        >
          產生考卷預覽
        </button>
      </div>

      {/* Preview Area */}
      {showPreview && (
        <div className="bg-white shadow-xl min-h-[297mm] w-full max-w-[210mm] mx-auto p-10 md:p-16 print:p-0 print:shadow-none print:w-full print:max-w-none">
          {/* Header */}
          <div className="text-center border-b-2 border-black pb-6 mb-8">
            <h1 className="text-3xl font-serif font-bold mb-4 tracking-widest">國文錯題複習卷</h1>
            <div className="flex justify-between text-base font-serif text-slate-900 px-4">
              <div className="space-x-8">
                <span>班級：__________</span>
                <span>姓名：__________</span>
                <span>座號：__________</span>
              </div>
              <div className="text-slate-500 text-sm">
                {quizMode === 'teacher' ? '教師版 (含解答)' : '學生版'}
              </div>
            </div>
          </div>

          {/* Content Table */}
          <div className="w-full">
            <table className="w-full border-collapse border border-slate-300 text-base">
              <thead>
                <tr className="bg-slate-100 print:bg-gray-100 border-b border-slate-300">
                  <th className="p-2 border-r border-slate-300 w-12">題號</th>
                  <th className="p-2 border-r border-slate-300 text-left">題目</th>
                  <th className="p-2 border-r border-slate-300 w-1/4 text-left">作答區 / 答案</th>
                  <th className="p-2 w-1/3">訂正</th>
                </tr>
              </thead>
              <tbody>
                {renderRows(quizData, 1)}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="mt-12 text-center text-xs text-slate-400 print:text-gray-400 font-mono">
            Generated by 錯題本 2025
          </div>
        </div>
      )}
    </div>
  );
};
