import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Word } from '../types';
import { ChevronDown, ChevronUp, Edit2, Maximize2, X, Save, Loader2, Sparkles, HelpCircle, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { GoogleGenAI } from "@google/genai";

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

  // AI Challenge State
  const [isChallenging, setIsChallenging] = useState(false);
  const [challenges, setChallenges] = useState<{ question: string; options: string; answer: string; explanation: string }[]>([]);
  const [currentChallengeIdx, setCurrentChallengeIdx] = useState(0);
  const [isGeneratingChallenge, setIsGeneratingChallenge] = useState(false);
  const [showChallengeAnswer, setShowChallengeAnswer] = useState(false);

  const startAiChallenge = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const apiKey = localStorage.getItem('gemini_api_key');
    if (!apiKey) return alert('請先在設定中輸入 Gemini API Key');

    setIsGeneratingChallenge(true);
    setIsChallenging(true);
    setShowChallengeAnswer(false);
    setChallenges([]);
    setCurrentChallengeIdx(0);

    try {
      const ai = new GoogleGenAI({ apiKey });
      
      const prompt = `你現在是一位精通「台灣國中會考（近十年）」命題規律的國文名師。
      請針對以下考點或題目，提供 3 題「相似題」供學生複習練習。

      優先原則：
      1. 優先檢索或模擬「近十年國中會考」中出現過的相似考點真題。
      2. 若真題不足 3 題，請根據會考的命題風格（情境化、重理解、跨領域）自行設計高品質的仿真題。

      題目要求：
      - 考點必須與原始資料完全一致（例如：同一個字、同一個成語、同一個文法觀念）。
      - 必須是選擇題（A, B, C, D）。
      - 必須包含「解析」，解釋為何選該項以及其它選項的錯誤原因。

      原始資料：
      類型：${word.錯誤類型}
      內容：${word.字詞}
      釋義：${word.釋義}
      考點：${word.考點}
      
      請回傳 JSON 格式的數組（Array），包含 3 個物件。每個物件包含：
      1. question: 題目內容。
      2. options: 四個選項（如 "A.xxx B.xxx C.xxx D.xxx"）。
      3. answer: 正確答案（例如 "C"）。
      4. explanation: 詳盡的解析。
      
      請直接回傳純 JSON 代碼，切勿包含 Markdown 標記（如 \`\`\`json）。`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      const text = response.text || "";
      // More robust JSON extraction
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      const jsonStr = jsonMatch ? jsonMatch[0] : text.replace(/```json/g, '').replace(/```/g, '').trim();
      
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed)) {
        setChallenges(parsed);
      } else {
        setChallenges([parsed]);
      }
    } catch (error) {
      console.error(error);
      alert('生成相似題失敗，請稍後再試');
      setIsChallenging(false);
    } finally {
      setIsGeneratingChallenge(false);
    }
  };

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
    if (c === 1) return 'bg-slate-300 text-white';
    if (c === 2) return 'bg-teal-400 text-white shadow-sm shadow-teal-100';
    if (c === 3) return 'bg-emerald-500 text-white shadow-md shadow-emerald-200';
    return 'bg-rose-500 text-white shadow-lg shadow-rose-200 animate-pulse';
  };

  const getTypeColor = (t: string) => {
    if (t.includes('字音')) return 'bg-sky-400';
    if (t.includes('字形')) return 'bg-violet-400';
    if (t.includes('成語')) return 'bg-orange-400';
    if (t.includes('字詞') || t.includes('字義') || t.includes('字詞義')) return 'bg-teal-500';
    if (t.includes('國學') || t.includes('閱讀') || t.includes('文言')) return 'bg-emerald-600';
    return 'bg-slate-300';
  };

  const cardWidth = size === 's' ? 'w-[200px]' : size === 'l' ? 'w-[380px]' : 'w-[280px]';
  const fontSize = size === 's' ? 'text-sm' : size === 'l' ? 'text-lg' : 'text-base';

  return (
    <div className={`relative bg-white rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl hover:shadow-teal-100/50 transition-all hover:-translate-y-1.5 flex flex-col overflow-hidden ${cardWidth} ${isFocusMode ? 'ring-2 ring-teal-50 shadow-teal-50' : ''}`}>
      <div className={`absolute top-3 left-3 w-7 h-7 rounded-2xl flex items-center justify-center text-xs font-black z-10 shadow-sm ${getBadgeColor(count)} transition-all transform hover:scale-110`}>
        {count > 0 ? count : ''}
      </div>
      
      <div className="absolute top-3 right-3 flex gap-2 z-10">
        <button 
          onClick={startAiChallenge}
          className="w-8 h-8 rounded-2xl bg-white/80 backdrop-blur-sm hover:bg-teal-50 hover:text-teal-600 flex items-center justify-center text-teal-400 transition-all shadow-sm border border-teal-50 group"
          title="考考相似題 (AI)"
        >
          <Sparkles size={16} className="group-hover:rotate-12 transition-transform" />
        </button>
        <button 
          onClick={() => setIsExpanded(true)}
          className="w-8 h-8 rounded-2xl bg-white/80 backdrop-blur-sm hover:bg-slate-50 hover:text-slate-800 flex items-center justify-center text-slate-400 transition-all shadow-sm border border-slate-100"
          title="放大"
        >
          <Maximize2 size={16} />
        </button>
        <button 
          onClick={() => onEdit(word)}
          className="w-8 h-8 rounded-2xl bg-white/80 backdrop-blur-sm hover:bg-orange-50 hover:text-orange-500 flex items-center justify-center text-slate-400 transition-all shadow-sm border border-slate-100"
          title="編輯"
        >
          <Edit2 size={16} />
        </button>
      </div>

      {/* AI Challenge Modal */}
      {isChallenging && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setIsChallenging(false)}>
          <div 
            className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg p-8 flex flex-col relative animate-in zoom-in-95 duration-300 border border-teal-100"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-3">
                <div className="bg-teal-100 p-2 rounded-2xl">
                  <Sparkles size={24} className="text-teal-600" />
                </div>
                <span className="text-slate-800 font-black text-xl tracking-tight">AI 相似題挑戰</span>
              </div>
              <button 
                onClick={() => setIsChallenging(false)}
                className="p-2 rounded-full hover:bg-slate-50 text-slate-300 hover:text-slate-500 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {isGeneratingChallenge ? (
              <div className="py-16 flex flex-col items-center justify-center gap-6">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-teal-100 rounded-full animate-pulse"></div>
                  <Loader2 size={32} className="animate-spin text-teal-600 absolute inset-0 m-auto" />
                </div>
                <p className="text-slate-500 font-bold text-lg">AI 老師正在調研會考題庫中...</p>
              </div>
            ) : challenges.length > 0 ? (
              <div className="space-y-8">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-black text-teal-600 bg-teal-50 px-3 py-1 rounded-full uppercase tracking-widest">
                    第 {currentChallengeIdx + 1} 題 / 共 {challenges.length} 題
                  </span>
                </div>
                
                <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
                  <p className="text-xl font-bold text-slate-800 leading-relaxed font-serif">
                    {challenges[currentChallengeIdx].question}
                  </p>
                  {challenges[currentChallengeIdx].options && (
                    <div className="mt-6 grid grid-cols-1 gap-3">
                       {challenges[currentChallengeIdx].options.split(/\s+([ABCD]\.)/g).filter((s, i) => i % 2 !== 0 || s.trim()).reduce((acc, curr, i, arr) => {
                         // This is tricky because options format can vary.
                         // Let's assume most AI output A. B. C. D.
                         return acc; 
                       }, [] as string[])}
                       
                       {/* Better display: just split by common separators if needed, 
                           but actually the AI prompt is now specific about the format.
                           Let's simplify for now. */}
                       <div className="text-slate-600 font-bold space-y-3">
                          {challenges[currentChallengeIdx].options.split('\n').filter(Boolean).map((opt, i) => (
                            <div key={i} className="bg-white p-4 rounded-2xl border border-slate-100 hover:border-teal-300 transition-all cursor-pointer shadow-sm">
                              {opt}
                            </div>
                          ))}
                       </div>
                    </div>
                  )}
                </div>

                {!showChallengeAnswer ? (
                  <button 
                    onClick={() => setShowChallengeAnswer(true)}
                    className="w-full py-4 bg-teal-600 text-white rounded-2xl font-black text-lg hover:bg-teal-700 transition-all shadow-xl shadow-teal-200 transform hover:scale-[1.02] active:scale-[0.98]"
                  >
                    揭曉答案與解析
                  </button>
                ) : (
                  <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-emerald-50/50 p-6 rounded-3xl border border-emerald-100 shadow-sm shadow-emerald-50">
                      <div className="text-emerald-600 font-black text-[10px] mb-2 flex items-center gap-2 uppercase tracking-widest">
                        <CheckCircle2 size={14} /> 正確答案
                      </div>
                      <p className="text-2xl font-black text-emerald-800">{challenges[currentChallengeIdx].answer}</p>
                    </div>
                    <div className="bg-teal-50/50 p-6 rounded-3xl border border-teal-100 max-h-[200px] overflow-y-auto scrollbar-none">
                       <div className="text-teal-600 font-black text-[10px] mb-2 uppercase tracking-widest">名師深度解析</div>
                       <p className="text-slate-700 leading-relaxed text-base font-medium">{challenges[currentChallengeIdx].explanation}</p>
                    </div>
                    
                    <div className="flex gap-4">
                      {currentChallengeIdx < challenges.length - 1 ? (
                        <button 
                          onClick={() => {
                            setCurrentChallengeIdx(prev => prev + 1);
                            setShowChallengeAnswer(false);
                          }}
                          className="flex-grow py-4 bg-teal-600 text-white rounded-2xl font-black text-lg hover:bg-teal-700 transition-all shadow-xl shadow-teal-100"
                        >
                          下一題驗收
                        </button>
                      ) : (
                        <button 
                          onClick={() => setIsChallenging(false)}
                          className="flex-grow py-4 bg-emerald-600 text-white rounded-2xl font-black text-lg hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100"
                        >
                          挑戰成功！回主頁
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>,
        document.body
      )}

      <div className={`p-6 pb-2 text-center px-10 ${size === 's' ? 'pt-16' : 'pt-14'}`}>
        <div className={`font-black text-slate-800 tracking-tight leading-tight ${size === 'l' ? 'text-3xl' : 'text-2xl'}`}>
          {word.字詞}
        </div>
        
        {!isFocusMode && !isReadingMode && (
          <div className={`mt-2 inline-block text-teal-600 font-serif font-bold ${size === 'l' ? 'text-3xl' : 'text-2xl'}`}>
            {word.注音}
          </div>
        )}
        
        <div className={`text-[10px] font-black mt-3 inline-block px-3 py-1 rounded-2xl text-white shadow-sm uppercase tracking-wider ${getTypeColor(typeName)}`}>
          {typeName}
        </div>
      </div>

      <div className={`p-6 text-slate-600 flex-grow border-t border-dashed border-slate-100/50 ${fontSize} leading-relaxed`}>
        {isReadingMode ? (
          <div className="space-y-4">
            <div className="max-h-32 overflow-y-auto bg-slate-50/50 p-4 rounded-2xl text-sm border border-slate-50 scrollbar-none italic text-slate-500 font-serif">
              {word.釋義}
            </div>
            <div className="pl-3 border-l-4 border-teal-400 py-1">
              <span className="text-sm text-slate-700 font-bold">{word.考點}</span>
            </div>
            {size !== 's' && (
              <div className="bg-white p-4 rounded-2xl border border-slate-100 font-mono text-sm shadow-sm">
                {word.例句}
              </div>
            )}
          </div>
        ) : isFocusMode ? (
          <div className="space-y-4">
            <div className="bg-teal-50/50 p-4 rounded-2xl border border-teal-50 text-slate-700 text-sm font-medium">
              <span className="block font-black text-teal-600 text-[10px] mb-2 uppercase tracking-widest">釋義精華</span>
              {word.釋義 || '暫無解釋'}
            </div>
            {word.考點 && (
              <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-50 text-sm">
                <span className="block font-black text-slate-400 text-[10px] mb-2 uppercase tracking-widest">關鍵考點</span>
                <span className="text-slate-800 font-bold">{word.考點}</span>
              </div>
            )}
            {size !== 's' && (
              <div className="text-sm italic text-slate-500 pl-3 border-l-2 border-slate-200 py-1">
                {word.例句}
              </div>
            )}
          </div>
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
          <div className="mt-4">
            <button 
              onClick={() => setShowDetail(!showDetail)}
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-3 py-2 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-100 hover:text-slate-600 transition-all w-full justify-center"
            >
              {showDetail ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {showDetail ? '收起完整解析' : '查看完整解析'}
            </button>
            {showDetail && (
              <div className="mt-3 p-4 bg-teal-50/30 rounded-2xl border border-teal-50 text-sm text-slate-600 animate-in fade-in slide-in-from-top-1 duration-300 font-medium italic">
                {word.詳情}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="px-6 py-4 bg-slate-50/30 border-t border-slate-100/50 text-[10px] text-slate-300 flex justify-between items-center font-bold uppercase tracking-widest">
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
