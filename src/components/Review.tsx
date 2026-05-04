import React, { useState, useEffect, useMemo } from 'react';
import { Word } from '../types';
import { api } from '../services/api';
import { CheckCircle, XCircle, RotateCcw, Settings, Play, Filter, Shuffle, SortDesc, Sparkles, X, Loader2, CheckCircle2 } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { createPortal } from 'react-dom';

interface ReviewProps {
  mode: 'today' | 'wrong';
  words: Word[];
  token: string;
  onFinish: () => void;
}

export const Review: React.FC<ReviewProps> = ({ mode, words, token, onFinish }) => {
  const [step, setStep] = useState<'setup' | 'review' | 'finished'>('setup');
  const [queue, setQueue] = useState<Word[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  
  // AI Challenge State
  const [isChallenging, setIsChallenging] = useState(false);
  const [challenges, setChallenges] = useState<{ question: string; options: string; answer: string; explanation: string }[]>([]);
  const [currentChallengeIdx, setCurrentChallengeIdx] = useState(0);
  const [isGeneratingChallenge, setIsGeneratingChallenge] = useState(false);
  const [showChallengeAnswer, setShowChallengeAnswer] = useState(false);

  const startAiChallenge = async (word: Word) => {
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

  // Config state
  const [config, setConfig] = useState({
    count: mode === 'today' ? 15 : 20,
    categories: ['全部'] as string[],
    isRandom: true
  });

  // Derived data
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
      setConfig(prev => ({ ...prev, categories: ['全部'] }));
      return;
    }

    setConfig(prev => {
      const filtered = prev.categories.filter(c => c !== '全部');
      let next: string[];
      if (filtered.includes(cat)) {
        next = filtered.filter(c => c !== cat);
        if (next.length === 0) next = ['全部'];
      } else {
        next = [...filtered, cat];
      }
      return { ...prev, categories: next };
    });
  };

  const eligibleWords = useMemo(() => {
    if (mode === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return words.filter(w => {
        if (!w.下次複習) return false;
        const nextReview = new Date(w.下次複習);
        return nextReview <= today;
      });
    } else {
      return words.filter(w => (w.錯誤次數 || 0) > 0);
    }
  }, [mode, words]);

  const maxCount = eligibleWords.length;

  // Update config count if maxCount changes and is smaller than current count
  useEffect(() => {
    if (maxCount > 0 && config.count > maxCount) {
      setConfig(prev => ({ ...prev, count: maxCount }));
    }
    // If maxCount is 0, we handle it in the render
  }, [maxCount]);

  const startReview = () => {
    let q = [...eligibleWords];

    // Filter by category (mainly for wrong review, but applicable to today too if desired)
    if (!config.categories.includes('全部')) {
      q = q.filter(w => {
        let t = w.錯誤類型 || '';
        if (t === '字詞' || t === '字義' || t === '語詞') t = '字詞義';
        return config.categories.includes(t);
      });
    }

    // Sort/Shuffle
    if (mode === 'today') {
      if (config.isRandom) {
        q = q.sort(() => Math.random() - 0.5);
      } else {
        // Sort by due date ascending (oldest first)
        q = q.sort((a, b) => new Date(a.下次複習!).getTime() - new Date(b.下次複習!).getTime());
      }
    } else {
      // Wrong review: default sort by error count desc
      q = q.sort((a, b) => (b.錯誤次數 || 0) - (a.錯誤次數 || 0));
    }

    // Slice
    q = q.slice(0, config.count);

    setQueue(q);
    setStep('review');
  };

  const handleAnswer = async (correct: boolean) => {
    const currentWord = queue[currentIndex];
    // Optimistic update
    if (currentIndex < queue.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setIsFlipped(false);
    } else {
      setStep('finished');
    }

    try {
      await api.updateReview(currentWord.ID, correct);
    } catch (error) {
      console.error('Failed to update review status', error);
      // Ideally show a toast, but for now we just log
    }
  };

  // Render Setup Screen
  if (step === 'setup') {
    if (eligibleWords.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
          <div className="text-8xl mb-6 animate-bounce">🎉</div>
          <h2 className="text-3xl font-bold text-slate-800 mb-3">
            {mode === 'today' ? '今日沒有需要複習的題目！' : '太棒了，沒有錯題！'}
          </h2>
          <p className="text-slate-500 text-lg mb-8">休息一下吧～</p>
          <button 
            onClick={onFinish}
            className="px-8 py-3 bg-teal-600 text-white rounded-full font-bold hover:bg-teal-700 transition-all shadow-lg shadow-teal-500/30"
          >
            返回首頁
          </button>
        </div>
      );
    }

    return (
      <div className="max-w-md mx-auto p-6 bg-white rounded-3xl shadow-xl border border-slate-100 mt-10">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-4 text-teal-600">
            <Settings size={32} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
            {mode === 'today' ? '今日複習設定' : '錯題複習設定'}
          </h2>
          <p className="text-slate-400 mt-2 font-medium">
            共 {eligibleWords.length} 題可複習
          </p>
        </div>

        <div className="space-y-6">
          {/* Count Slider */}
          <div>
            <label className="flex justify-between text-slate-700 font-bold mb-3">
              <span>複習題數</span>
              <span className="text-teal-600 font-black">{config.count} 題</span>
            </label>
            <input
              type="range"
              min="1"
              max={eligibleWords.length}
              value={config.count}
              onChange={(e) => setConfig({ ...config, count: parseInt(e.target.value) })}
              className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-teal-600"
            />
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-slate-700 font-bold mb-3 flex items-center gap-2">
              <Filter size={18} className="text-teal-500" />
              題目分類 (可複選)
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => toggleCategory('全部')}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                  config.categories.includes('全部')
                    ? 'bg-teal-600 text-white shadow-lg shadow-teal-200'
                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                }`}
              >
                全部
              </button>
              {availableCategories.map(cat => (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                    config.categories.includes(cat) && !config.categories.includes('全部')
                      ? 'bg-teal-600 text-white shadow-lg shadow-teal-200'
                      : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Random Toggle */}
          {mode === 'today' && (
            <div className="flex items-center justify-between bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${config.isRandom ? 'bg-teal-100 text-teal-600' : 'bg-slate-100 text-slate-400'}`}>
                  {config.isRandom ? <Shuffle size={18} /> : <SortDesc size={18} />}
                </div>
                <span className="font-bold text-slate-700">隨記排序</span>
              </div>
              <button
                onClick={() => setConfig({ ...config, isRandom: !config.isRandom })}
                className={`w-12 h-6 rounded-full transition-colors relative ${
                  config.isRandom ? 'bg-teal-500' : 'bg-slate-200'
                }`}
              >
                <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform shadow-sm ${
                  config.isRandom ? 'left-7' : 'left-1'
                }`} />
              </button>
            </div>
          )}

          <button
            onClick={startReview}
            className="w-full py-4 bg-teal-600 text-white rounded-2xl font-black text-lg hover:bg-teal-700 transition-all flex items-center justify-center gap-2 shadow-xl shadow-teal-200 mt-4 transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <Play fill="currentColor" size={20} />
            開始深度複習
          </button>
        </div>
      </div>
    );
  }

  if (step === 'finished') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <div className="text-8xl mb-6 animate-pulse">🌟</div>
        <h2 className="text-3xl font-bold text-emerald-600 mb-3">複習完成！</h2>
        <p className="text-slate-500 text-lg mb-8">你完成了 {queue.length} 個單字的複習。</p>
        <div className="flex gap-4">
          <button 
            onClick={() => {
              setStep('setup');
              setCurrentIndex(0);
              setIsFlipped(false);
            }}
            className="px-6 py-3 bg-white text-teal-600 border-2 border-teal-100 rounded-full font-bold hover:bg-teal-50 transition-all"
          >
            <span className="flex items-center gap-2">
              <RotateCcw size={20} />
              再練一次
            </span>
          </button>
          <button 
            onClick={onFinish}
            className="px-8 py-3 bg-teal-600 text-white rounded-full font-bold hover:bg-teal-700 transition-all shadow-lg shadow-teal-500/30"
          >
            返回首頁
          </button>
        </div>
      </div>
    );
  }

  const currentWord = queue[currentIndex];

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8 flex flex-col items-center">
      <div className="w-full flex justify-between items-center mb-6 px-2">
        <div className="flex items-center gap-3">
          <div className="text-slate-500 font-mono font-medium bg-slate-100 px-3 py-1 rounded-full text-sm">
            {currentIndex + 1} / {queue.length}
          </div>
          {isFlipped && (
            <button 
              onClick={(e) => { e.stopPropagation(); startAiChallenge(currentWord); }}
              className="flex items-center gap-2 px-3 py-1 bg-white border border-teal-100 text-teal-600 rounded-full text-xs font-black shadow-sm hover:bg-teal-50 transition-all group"
            >
              <Sparkles size={14} className="group-hover:rotate-12 transition-transform" />
              AI 仿真題
            </button>
          )}
        </div>
        <div className="text-slate-400 text-sm">
          點擊卡片翻面
        </div>
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
                <span className="text-slate-800 font-black text-xl tracking-tight">AI 仿真題挑戰</span>
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
                <p className="text-slate-500 font-bold text-lg text-center">AI 老師正在調研會考題庫中...</p>
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
                       <div className="text-slate-600 font-bold space-y-3">
                          {(() => {
                            const rawOptions = challenges[currentChallengeIdx].options;
                            let opts = rawOptions.split(/\n+/).filter(o => o.trim());
                            if (opts.length <= 1) {
                              const matches = rawOptions.match(/[ABCD]\.[^ABCD]+/g);
                              if (matches) opts = matches;
                            }
                            return opts.map((opt, i) => (
                              <div key={i} className="bg-white p-4 rounded-2xl border border-slate-100 hover:border-teal-300 transition-all cursor-pointer shadow-sm">
                                {opt.trim()}
                              </div>
                            ));
                          })()}
                       </div>
                    </div>
                  )}
                </div>

                {!showChallengeAnswer ? (
                  <button 
                    onClick={() => setShowChallengeAnswer(true)}
                    className="w-full py-4 bg-teal-600 text-white rounded-2xl font-black text-lg hover:bg-teal-700 transition-all shadow-xl shadow-teal-200"
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
                          挑戰成功！
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

      <div 
        onClick={() => setIsFlipped(!isFlipped)}
        className={`w-full min-h-[400px] bg-white rounded-[2rem] shadow-xl cursor-pointer transition-all duration-500 relative flex flex-col items-center justify-center p-8 md:p-12 border-2 ${isFlipped ? 'border-teal-200 bg-teal-50/30 shadow-teal-100' : 'border-white hover:border-teal-100 hover:shadow-2xl hover:shadow-teal-100/50'}`}
      >
        <div className="text-center w-full">
          <div className={`font-black text-slate-800 mb-6 transition-all duration-300 tracking-tight ${isFlipped ? 'text-2xl' : 'text-5xl md:text-6xl'}`}>
            {currentWord.字詞}
          </div>
          
          {isFlipped ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6">
              {currentWord.注音 && (
                <div className="text-4xl font-serif text-teal-600 font-bold">
                  {currentWord.注音}
                </div>
              )}
              
              <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-teal-100 text-slate-700 text-xl leading-relaxed text-left shadow-sm">
                <span className="block font-black text-teal-700 text-xs mb-2 uppercase tracking-widest bg-teal-50 w-fit px-2 py-0.5 rounded">釋義</span>
                {currentWord.釋義}
              </div>

              {currentWord.例句 && (
                <div className="text-slate-500 text-left pl-4 border-l-4 border-emerald-400 font-medium text-lg leading-relaxed">
                  {currentWord.例句}
                </div>
              )}
            </div>
          ) : (
            <div className="text-slate-300 text-sm mt-12 animate-pulse flex flex-col items-center gap-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-teal-200 rounded-full"></div>
                <div className="w-2 h-2 bg-teal-300 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-teal-200 rounded-full"></div>
              </div>
              <span className="font-bold tracking-widest text-teal-400/50">想一下正確解答...</span>
            </div>
          )}
        </div>
      </div>

      <div className={`flex gap-4 md:gap-8 mt-12 w-full justify-center transition-all duration-300 ${isFlipped ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
        <button 
          onClick={(e) => { e.stopPropagation(); handleAnswer(false); }}
          className="flex-1 max-w-[200px] py-5 rounded-2xl bg-white border border-slate-200 text-slate-400 font-bold hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 transition-all flex items-center justify-center gap-3 shadow-sm group"
        >
          <XCircle size={28} className="group-hover:animate-shake" />
          <span className="text-lg">忘了</span>
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); handleAnswer(true); }}
          className="flex-1 max-w-[200px] py-5 rounded-2xl bg-teal-600 text-white font-black text-lg hover:bg-teal-700 hover:scale-105 transition-all flex items-center justify-center gap-3 shadow-xl shadow-teal-200"
        >
          <CheckCircle size={28} />
          <span>記得</span>
        </button>
      </div>
    </div>
  );
};
