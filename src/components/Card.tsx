import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Word } from '../types';
import { ChevronDown, ChevronUp, Edit2, Maximize2, X, Save, Loader2 } from 'lucide-react';
import { api } from '../services/api';

interface CardProps {
  word: Word;
  size: 's' | 'm' | 'l';
  onEdit: (word: Word) => void;
}

export const Card: React.FC<CardProps> = ({ word, size, onEdit }) => {
  const [showDetail, setShowDetail] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteText, setNoteText] = useState(word.筆記 || '');
  const [isSavingNote, setIsSavingNote] = useState(false);

  const handleSaveNote = async () => {
    setIsSavingNote(true);
    try {
      await api.updateWord({ ...word, 筆記: noteText });
      word.筆記 = noteText; // Optimistic update
      setIsEditingNote(false);
    } catch (error) {
      alert('儲存筆記失敗，請稍後再試');
    } finally {
      setIsSavingNote(false);
    }
  };

  const count = word.錯誤次數 || 0;
  const typeName = word.錯誤類型 || '其他';
  const isFocusMode = typeName.includes('成語') || typeName.includes('字詞') || typeName.includes('字義') || typeName.includes('字詞義');
  const isReadingMode = ['國學常識', '閱讀理解', '文言文'].includes(typeName);

  const getBadgeColor = (c: number) => {
    if (c === 0) return 'bg-transparent text-transparent';
    if (c === 1) return 'bg-slate-400 text-white';
    if (c === 2) return 'bg-emerald-500 text-white';
    if (c === 3) return 'bg-amber-400 text-slate-900';
    return 'bg-rose-500 text-white';
  };

  const getTypeColor = (t: string) => {
    if (t.includes('字音')) return 'bg-sky-500';
    if (t.includes('字形')) return 'bg-violet-500';
    if (t.includes('成語')) return 'bg-orange-500';
    if (t.includes('字詞') || t.includes('字義') || t.includes('字詞義')) return 'bg-emerald-500';
    if (t.includes('國學') || t.includes('閱讀') || t.includes('文言')) return 'bg-indigo-500';
    return 'bg-slate-400';
  };

  const cardWidth = size === 's' ? 'w-[200px]' : size === 'l' ? 'w-[380px]' : 'w-[280px]';
  const fontSize = size === 's' ? 'text-sm' : size === 'l' ? 'text-lg' : 'text-base';

  return (
    <div className={`relative bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all hover:-translate-y-1 flex flex-col overflow-hidden ${cardWidth} ${isFocusMode ? 'ring-2 ring-orange-100' : ''}`}>
      <div className={`absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold z-10 shadow-sm ${getBadgeColor(count)}`}>
        {count > 0 ? count : ''}
      </div>
      
      <div className="absolute top-2 right-2 flex gap-1.5 z-10">
        <button 
          onClick={() => setIsExpanded(true)}
          className="w-7 h-7 rounded-full bg-white/90 hover:bg-white hover:text-slate-700 flex items-center justify-center text-slate-400 transition-colors shadow-sm border border-slate-100"
          title="放大"
        >
          <Maximize2 size={14} />
        </button>
        <button 
          onClick={() => onEdit(word)}
          className="w-7 h-7 rounded-full bg-white/90 hover:bg-white hover:text-orange-500 flex items-center justify-center text-slate-400 transition-colors shadow-sm border border-slate-100"
          title="編輯"
        >
          <Edit2 size={14} />
        </button>
      </div>

      <div className={`p-4 pb-1 text-center px-8 ${size === 's' ? 'pt-8' : 'pt-6'}`}>
        <div className={`font-bold text-slate-800 mb-1 ${size === 'l' ? 'text-2xl' : 'text-xl'}`}>
          {word.字詞}
        </div>
        
        {!isFocusMode && !isReadingMode && (
          <div className={`inline-block bg-slate-50 px-2 py-1 rounded text-slate-600 font-zhuyin ${size === 'l' ? 'text-2xl' : 'text-xl'}`}>
            {word.注音}
          </div>
        )}
        
        <div className={`text-xs font-bold mt-2 inline-block px-2 py-0.5 rounded-full text-white shadow-sm ${getTypeColor(typeName)}`}>
          {typeName}
        </div>
      </div>

      <div className={`p-4 text-slate-600 flex-grow border-t border-dashed border-slate-100 ${fontSize}`}>
        {isReadingMode ? (
          <>
            <div className="mb-2 max-h-32 overflow-y-auto bg-slate-50 p-2 rounded text-sm border border-slate-100 scrollbar-thin">
              <span className="block font-bold text-slate-700 text-xs mb-1">文章/原文：</span>
              {word.釋義}
            </div>
            <div className="mb-2">
              <span className="font-bold text-slate-700 text-sm block mb-1">題目：</span>
              <span className="text-sm text-slate-600">{word.考點}</span>
            </div>
            {size !== 's' && (
              <div className="mb-2">
                <span className="font-bold text-slate-700 text-sm block mb-1">選項：</span>
                <pre className="text-sm whitespace-pre-wrap font-sans text-slate-600">{word.例句}</pre>
              </div>
            )}
          </>
        ) : isFocusMode ? (
          <>
            <div className="bg-orange-50 border-l-4 border-orange-400 p-2 mb-2 rounded-r text-slate-700 text-sm">
              <span className="block font-bold text-orange-700 text-xs mb-1">釋義：</span>
              {word.釋義 || '無釋義'}
            </div>
            {word.考點 && (
              <div className="mb-2 text-sm bg-slate-50 p-2 rounded border border-slate-100">
                <span className="font-bold text-slate-700 mr-1 block text-xs mb-1">考點：</span>
                <span className="text-slate-800 font-medium">{word.考點}</span>
              </div>
            )}
            {size !== 's' && (
              <div className="mb-2 text-sm">
                <span className="font-bold text-slate-700 mr-1">例句：</span>
                {word.例句}
              </div>
            )}
          </>
        ) : (
          <>
            {word.考點 && !typeName.includes('字音') && !typeName.includes('字形') && (
              <div className="mb-2 text-center">
                <span className="text-lg text-slate-800 font-medium bg-slate-100 px-3 py-1 rounded-full inline-block">
                  {word.考點}
                </span>
              </div>
            )}
            <div className="mb-2">
              <span className="font-bold text-slate-700 mr-1">釋義：</span>
              {word.釋義}
            </div>
            {size !== 's' && (
              <div className="mb-2">
                <span className="font-bold text-slate-700 mr-1">例句：</span>
                {word.例句}
              </div>
            )}
          </>
        )}

        {word.詳情 && size !== 's' && (
          <div className="mt-2">
            <button 
              onClick={() => setShowDetail(!showDetail)}
              className="flex items-center gap-1 text-xs px-2 py-1 bg-slate-100 text-slate-500 rounded hover:bg-slate-200 hover:text-slate-700 transition-colors w-full justify-center"
            >
              {showDetail ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {showDetail ? (isReadingMode ? '收起詳解' : '收起詳解') : (isReadingMode ? '查看答案與詳解' : '查看詳解')}
            </button>
            {showDetail && (
              <div className="mt-2 p-2 bg-slate-50 rounded border border-dashed border-slate-200 text-sm text-slate-600 animate-in fade-in slide-in-from-top-1 duration-200">
                {word.詳情}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 text-xs text-slate-400 flex justify-between items-center">
        <span>來源: {word.題庫來源 || '未標示'}</span>
        <span>{word.下次複習}</span>
      </div>

      {isExpanded && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setIsExpanded(false)}>
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col relative animate-in zoom-in-95 duration-200 border border-slate-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="sticky top-0 right-0 p-4 flex justify-end bg-white/90 backdrop-blur-md z-10 border-b border-slate-100">
              <button 
                onClick={() => setIsExpanded(false)}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 md:p-10">
              <div className="text-center mb-8 border-b border-slate-100 pb-6">
                <h2 className="text-3xl font-bold text-slate-900 mb-4">{word.字詞}</h2>
                
                {!isFocusMode && !isReadingMode && (
                  <div className="text-2xl text-slate-500 font-serif mb-4">{word.注音}</div>
                )}
                
                <span className={`px-4 py-1.5 rounded-full text-base font-bold text-white shadow-sm ${getTypeColor(typeName)}`}>
                  {typeName}
                </span>
              </div>

              <div className="space-y-8 text-lg text-slate-700">
                {isReadingMode ? (
                  <>
                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                      <h3 className="font-bold text-slate-900 mb-4 text-xl flex items-center gap-2">
                        <span className="w-1 h-6 bg-indigo-500 rounded-full"></span>
                        文章/原文
                      </h3>
                      <div className="whitespace-pre-wrap leading-relaxed text-slate-800 font-serif text-xl">
                        {word.釋義}
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="font-bold text-slate-900 mb-3 text-xl flex items-center gap-2">
                        <span className="w-1 h-6 bg-indigo-500 rounded-full"></span>
                        題目
                      </h3>
                      <div className="text-xl font-medium text-slate-800 pl-4 border-l-4 border-indigo-100 py-1">{word.考點}</div>
                    </div>

                    <div>
                      <h3 className="font-bold text-slate-900 mb-3 text-xl flex items-center gap-2">
                        <span className="w-1 h-6 bg-indigo-500 rounded-full"></span>
                        選項
                      </h3>
                      <div className="bg-white p-6 rounded-xl border border-slate-200 font-mono text-lg whitespace-pre-wrap shadow-sm text-slate-700">
                        {word.例句}
                      </div>
                    </div>

                    {word.詳情 && (
                      <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100">
                        <h3 className="font-bold text-indigo-900 mb-3 text-xl flex items-center gap-2">
                          <span className="w-1 h-6 bg-indigo-500 rounded-full"></span>
                          答案與詳解
                        </h3>
                        <div className="text-indigo-900 whitespace-pre-wrap leading-relaxed">
                          {word.詳情}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div>
                      <h3 className="font-bold text-slate-900 mb-3 text-xl flex items-center gap-2">
                        <span className="w-1 h-6 bg-orange-500 rounded-full"></span>
                        釋義
                      </h3>
                      <div className="bg-orange-50 p-6 rounded-xl border-l-4 border-orange-400 text-slate-800 text-xl leading-relaxed shadow-sm">
                        {word.釋義 || '無釋義'}
                      </div>
                    </div>

                    {word.例句 && (
                      <div>
                        <h3 className="font-bold text-slate-900 mb-3 text-xl flex items-center gap-2">
                          <span className="w-1 h-6 bg-emerald-500 rounded-full"></span>
                          例句
                        </h3>
                        <div className="text-slate-600 italic text-xl pl-4 border-l-4 border-emerald-100 py-1">
                          {word.例句}
                        </div>
                      </div>
                    )}

                    {word.詳情 && (
                      <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                        <h3 className="font-bold text-slate-700 mb-3 text-lg">詳情</h3>
                        <div className="text-slate-600 leading-relaxed">
                          {word.詳情}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Notes Section */}
                <div className="bg-yellow-50 p-6 rounded-xl border border-yellow-200 shadow-sm">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-bold text-yellow-800 text-xl flex items-center gap-2">
                      <span className="w-1 h-6 bg-yellow-500 rounded-full"></span>
                      我的筆記
                    </h3>
                    {!isEditingNote && (
                      <button 
                        onClick={() => setIsEditingNote(true)}
                        className="text-sm px-3 py-1 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 transition-colors"
                      >
                        編輯筆記
                      </button>
                    )}
                  </div>
                  
                  {isEditingNote ? (
                    <div className="space-y-3">
                      <textarea
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        placeholder="在這裡輸入你的筆記、口訣或相關連結..."
                        className="w-full p-3 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none transition-all bg-white min-h-[100px] text-base"
                      />
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => {
                            setIsEditingNote(false);
                            setNoteText(word.筆記 || '');
                          }}
                          className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors text-sm"
                          disabled={isSavingNote}
                        >
                          取消
                        </button>
                        <button 
                          onClick={handleSaveNote}
                          disabled={isSavingNote}
                          className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors text-sm flex items-center gap-2"
                        >
                          {isSavingNote ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                          儲存筆記
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-slate-700 whitespace-pre-wrap leading-relaxed min-h-[60px]">
                      {word.筆記 ? (
                        // Render URLs as clickable links
                        word.筆記.split(/(https?:\/\/[^\s]+)/g).map((part, i) => 
                          part.match(/^https?:\/\//) ? (
                            <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline break-all">
                              {part}
                            </a>
                          ) : (
                            <span key={i}>{part}</span>
                          )
                        )
                      ) : (
                        <span className="text-slate-400 italic">點擊右上角「編輯筆記」開始記錄...</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-slate-50 border-t border-slate-100 text-sm text-slate-500 flex justify-between items-center rounded-b-2xl">
               <span>來源: {word.題庫來源 || '未標示'}</span>
               <span>下次複習: {word.下次複習}</span>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
