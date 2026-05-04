import React, { useState, useEffect, useMemo } from 'react';
import { Word } from '../types';
import { api } from '../services/api';
import { CheckCircle, XCircle, RotateCcw, Settings, Play, Filter, Shuffle, SortDesc } from 'lucide-react';

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
            className="px-8 py-3 bg-indigo-600 text-white rounded-full font-bold hover:bg-indigo-700 transition-all shadow-lg hover:shadow-indigo-500/30"
          >
            返回首頁
          </button>
        </div>
      );
    }

    return (
      <div className="max-w-md mx-auto p-6 bg-white rounded-3xl shadow-xl border border-slate-100 mt-10">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-600">
            <Settings size={32} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">
            {mode === 'today' ? '今日複習設定' : '錯題複習設定'}
          </h2>
          <p className="text-slate-500 mt-2">
            共 {eligibleWords.length} 題可複習
          </p>
        </div>

        <div className="space-y-6">
          {/* Count Slider */}
          <div>
            <label className="flex justify-between text-slate-700 font-bold mb-2">
              <span>複習題數</span>
              <span className="text-indigo-600">{config.count} 題</span>
            </label>
            <input
              type="range"
              min="1"
              max={eligibleWords.length}
              value={config.count}
              onChange={(e) => setConfig({ ...config, count: parseInt(e.target.value) })}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>1</span>
              <span>{eligibleWords.length}</span>
            </div>
          </div>

          {/* Category Filter (For Wrong Review, or Today if desired) */}
          <div>
            <label className="block text-slate-700 font-bold mb-2 flex items-center gap-2">
              <Filter size={18} />
              題目分類 (可複選)
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => toggleCategory('全部')}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  config.categories.includes('全部')
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                全部
              </button>
              {availableCategories.map(cat => (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    config.categories.includes(cat) && !config.categories.includes('全部')
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Random Toggle (Mainly for Today) */}
          {mode === 'today' && (
            <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl">
              <div className="flex items-center gap-3">
                {config.isRandom ? <Shuffle className="text-indigo-600" /> : <SortDesc className="text-slate-400" />}
                <span className="font-bold text-slate-700">隨機排序</span>
              </div>
              <button
                onClick={() => setConfig({ ...config, isRandom: !config.isRandom })}
                className={`w-12 h-6 rounded-full transition-colors relative ${
                  config.isRandom ? 'bg-indigo-600' : 'bg-slate-300'
                }`}
              >
                <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${
                  config.isRandom ? 'left-7' : 'left-1'
                }`} />
              </button>
            </div>
          )}

          <button
            onClick={startReview}
            className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 mt-4"
          >
            <Play fill="currentColor" />
            開始複習
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
            className="px-6 py-3 bg-white text-indigo-600 border-2 border-indigo-100 rounded-full font-bold hover:bg-indigo-50 transition-all"
          >
            <span className="flex items-center gap-2">
              <RotateCcw size={20} />
              再練一次
            </span>
          </button>
          <button 
            onClick={onFinish}
            className="px-8 py-3 bg-indigo-600 text-white rounded-full font-bold hover:bg-indigo-700 transition-all shadow-lg hover:shadow-indigo-500/30"
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
        <div className="text-slate-500 font-mono font-medium bg-slate-100 px-3 py-1 rounded-full text-sm">
          {currentIndex + 1} / {queue.length}
        </div>
        <div className="text-slate-400 text-sm">
          點擊卡片翻面
        </div>
      </div>

      <div 
        onClick={() => setIsFlipped(!isFlipped)}
        className={`w-full min-h-[400px] bg-white rounded-3xl shadow-xl cursor-pointer transition-all duration-500 relative flex flex-col items-center justify-center p-8 md:p-12 border-2 ${isFlipped ? 'border-orange-400 bg-orange-50/50' : 'border-slate-100 hover:border-indigo-200 hover:shadow-2xl'}`}
      >
        <div className="text-center w-full">
          <div className={`font-bold text-slate-800 mb-6 transition-all duration-300 ${isFlipped ? 'text-2xl' : 'text-4xl md:text-5xl'}`}>
            {currentWord.字詞}
          </div>
          
          {isFlipped ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6">
              {currentWord.注音 && (
                <div className="text-3xl font-serif text-orange-600 font-medium">
                  {currentWord.注音}
                </div>
              )}
              
              <div className="bg-white/60 p-6 rounded-xl border border-orange-100 text-slate-700 text-lg leading-relaxed text-left">
                <span className="block font-bold text-orange-800 text-sm mb-2 uppercase tracking-wider">釋義</span>
                {currentWord.釋義}
              </div>

              {currentWord.例句 && (
                <div className="text-slate-600 text-left pl-4 border-l-4 border-emerald-400 italic">
                  {currentWord.例句}
                </div>
              )}
            </div>
          ) : (
            <div className="text-slate-400 text-sm mt-12 animate-pulse flex flex-col items-center gap-2">
              <span className="w-12 h-1 bg-slate-200 rounded-full"></span>
              <span>思考一下...</span>
            </div>
          )}
        </div>
      </div>

      <div className={`flex gap-4 md:gap-8 mt-8 w-full justify-center transition-all duration-300 ${isFlipped ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
        <button 
          onClick={(e) => { e.stopPropagation(); handleAnswer(false); }}
          className="flex-1 max-w-[160px] py-4 rounded-2xl bg-white border-2 border-rose-100 text-rose-500 font-bold hover:bg-rose-50 hover:border-rose-200 hover:scale-105 transition-all flex items-center justify-center gap-2 shadow-sm"
        >
          <XCircle size={24} />
          <span>忘了 😣</span>
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); handleAnswer(true); }}
          className="flex-1 max-w-[160px] py-4 rounded-2xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 hover:scale-105 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30"
        >
          <CheckCircle size={24} />
          <span>記得 😎</span>
        </button>
      </div>
    </div>
  );
};
