import React, { useState, useMemo } from 'react';
import { Word, ViewMode, CardSize } from '../types';
import { Card } from './Card';
import { LayoutGrid, List, Filter, ArrowUp, ArrowDown, Search, Trash2, BookCheck, AlertCircle, TrendingUp, Brain } from 'lucide-react';
import { api } from '../services/api';

interface DashboardProps {
  words: Word[];
  onEdit: (word: Word) => void;
  token: string;
  refreshData: () => void;
  setPage: (page: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ words, onEdit, token, refreshData, setPage }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [cardSize, setCardSize] = useState<CardSize>('m');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterSources, setFilterSources] = useState<string[]>([]);
  const [customSourceFilter, setCustomSourceFilter] = useState<string>('');
  const [sortKey, setSortKey] = useState<string>('default');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkSource, setBulkSource] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const stats = useMemo(() => {
    const total = words.length;
    const needReview = words.filter(w => {
      if (!w.下次複習) return false;
      const next = new Date(w.下次複習);
      return next <= new Date();
    }).length;
    const highError = words.filter(w => (w.錯誤次數 || 0) >= 3).length;
    
    // Calculate category distribution
    const categories: Record<string, number> = {};
    words.forEach(w => {
      let t = w.錯誤類型 || '未分類';
      if (t === '字詞' || t === '字義' || t === '語詞') t = '字詞義';
      categories[t] = (categories[t] || 0) + 1;
    });
    
    const topWeakness = Object.entries(categories)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 1)[0]?.[0] || '無';

    return { total, needReview, highError, topWeakness };
  }, [words]);

  const filteredWords = useMemo(() => {
    let result = [...words];

    if (filterType !== 'all') {
      if (filterType === '字詞義') {
        result = result.filter(w => {
          const t = w.錯誤類型 || '';
          return t.includes('字詞') || t.includes('字義') || t.includes('字詞義');
        });
      } else {
        result = result.filter(w => (w.錯誤類型 || '').includes(filterType));
      }
    }

    if (filterSources.length > 0 || customSourceFilter.trim()) {
      result = result.filter(w => {
        const source = (w.題庫來源 || '').toString();
        const matchesCheckbox = filterSources.some(s => source.includes(s));
        const matchesCustom = customSourceFilter.trim() ? source.includes(customSourceFilter.trim()) : false;
        
        if (filterSources.length > 0 && customSourceFilter.trim()) {
          return matchesCheckbox || matchesCustom;
        }
        if (filterSources.length > 0) return matchesCheckbox;
        if (customSourceFilter.trim()) return matchesCustom;
        return true;
      });
    }

    switch (sortKey) {
      case 'error-desc':
        result.sort((a, b) => (b.錯誤次數 || 0) - (a.錯誤次數 || 0));
        break;
      case 'error-asc':
        result.sort((a, b) => (a.錯誤次數 || 0) - (b.錯誤次數 || 0));
        break;
      case 'date-desc':
        result.sort((a, b) => new Date(b.下次複習 || 0).getTime() - new Date(a.下次複習 || 0).getTime());
        break;
      case 'date-asc':
        result.sort((a, b) => new Date(a.下次複習 || 0).getTime() - new Date(b.下次複習 || 0).getTime());
        break;
      case 'id-desc':
        result.sort((a, b) => (parseInt(b.ID.substring(1)) || 0) - (parseInt(a.ID.substring(1)) || 0));
        break;
      case 'id-asc':
        result.sort((a, b) => (parseInt(a.ID.substring(1)) || 0) - (parseInt(b.ID.substring(1)) || 0));
        break;
      default:
        break;
    }

    return result;
  }, [words, filterType, filterSources, sortKey]);

  const handleSourceChange = (source: string) => {
    setFilterSources(prev => 
      prev.includes(source) ? prev.filter(s => s !== source) : [...prev, source]
    );
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(filteredWords.map(w => w.ID)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkUpdate = async () => {
    if (!bulkSource) return alert('請選擇來源');
    if (selectedIds.size === 0) return alert('請選擇項目');
    
    setIsUpdating(true);
    try {
      await api.batchUpdate(Array.from(selectedIds), bulkSource);
      alert('更新成功');
      setSelectedIds(new Set());
      setBulkSource('');
      refreshData();
    } catch (error) {
      console.error(error);
      alert('更新失敗');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    setShowDeleteConfirm(false);
    setIsUpdating(true);
    try {
      await api.deleteWords(Array.from(selectedIds));
      alert('刪除成功');
      setSelectedIds(new Set());
      refreshData();
    } catch (error: any) {
      console.error(error);
      alert('刪除失敗: ' + error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* AI Recommendation Message */}
      <div className="mb-8 bg-teal-50/50 border border-teal-100 rounded-3xl p-6 flex flex-col md:flex-row items-center gap-6 shadow-sm overflow-hidden relative">
        <div className="absolute -right-8 -top-8 w-32 h-32 bg-emerald-200/20 rounded-full blur-2xl"></div>
        <div className="bg-white p-4 rounded-full shadow-sm text-teal-600 animate-bounce">
          <Brain size={32} />
        </div>
        <div className="flex-grow text-center md:text-left relative z-10">
          <h2 className="text-xl font-bold text-slate-800 mb-1">
            {stats.needReview > 0 
              ? `今天還有 ${stats.needReview} 題待複習，準備好挑戰了嗎？` 
              : "今天的複習任務已全部達成！休息一下或是練習新題目吧。"}
          </h2>
          <p className="text-teal-600 font-medium italic opacity-80">
            {stats.topWeakness !== '無' 
              ? `AI 偵測到你在「${stats.topWeakness}」類型出錯較多，建議優先加強。` 
              : "太棒了！目前你的學習狀況非常穩定。"}
          </p>
        </div>
        <div className="flex gap-4 relative z-10">
          <button 
            onClick={() => setPage('wrong-review')} 
            className="px-6 py-3 bg-teal-600 text-white rounded-2xl font-bold hover:bg-teal-700 transition-all shadow-lg shadow-teal-200 whitespace-nowrap"
          >
            立即開始複習
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="bg-sky-50 p-3 rounded-xl text-sky-600">
            <BookCheck size={24} />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold mb-0.5">總題數</p>
            <p className="text-2xl font-black text-slate-800 tracking-tight">{stats.total}</p>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="bg-amber-50 p-3 rounded-xl text-amber-600">
            <AlertCircle size={24} />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold mb-0.5">今日待複習</p>
            <p className="text-2xl font-black text-slate-800 tracking-tight">{stats.needReview}</p>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="bg-rose-50 p-3 rounded-xl text-rose-600">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold mb-0.5">高頻錯題</p>
            <p className="text-2xl font-black text-slate-800 tracking-tight">{stats.highError}</p>
          </div>
        </div>
        
        <div className="bg-emerald-600 p-4 rounded-2xl shadow-lg border border-emerald-500 flex items-center gap-4 transform hover:scale-[1.02] transition-all">
          <div className="bg-white/20 p-3 rounded-xl text-white">
            <Brain size={24} />
          </div>
          <div className="overflow-hidden">
            <p className="text-xs text-emerald-100 font-bold mb-0.5 tracking-wider">核心弱點</p>
            <p className="text-lg font-bold text-white truncate">{stats.topWeakness}</p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-wrap w-full lg:w-auto">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-700 flex items-center gap-1">
              <Filter size={16} className="text-teal-500" />
              類型：
            </span>
            {['all', '字音', '字形', '成語', '字詞義', '國學常識', '閱讀理解', '文言文'].map(type => (
              <label key={type} className="flex items-center gap-1 cursor-pointer text-sm hover:bg-slate-50 px-2 py-1 rounded transition-colors">
                <input 
                  type="radio" 
                  name="typeFilter" 
                  value={type} 
                  checked={filterType === type} 
                  onChange={(e) => setFilterType(e.target.value)}
                  className="accent-teal-600"
                />
                <span className={filterType === type ? 'text-teal-700 font-bold' : 'text-slate-600'}>
                  {type === 'all' ? '全部' : type}
                </span>
              </label>
            ))}
          </div>
          
          <div className="h-6 w-px bg-slate-200 mx-2 hidden md:block"></div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-700">來源：</span>
            {['自建', '會考', '學校', 'AI 辨識'].map(source => (
              <label key={source} className="flex items-center gap-1 cursor-pointer text-sm hover:bg-slate-50 px-2 py-1 rounded transition-colors">
                <input 
                  type="checkbox" 
                  value={source} 
                  checked={filterSources.includes(source)} 
                  onChange={() => handleSourceChange(source)}
                  className="accent-teal-600"
                />
                <span className={filterSources.includes(source) ? 'text-teal-700 font-bold' : 'text-slate-600'}>
                  {source}
                </span>
              </label>
            ))}
            <div className="relative">
              <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="自訂來源..."
                value={customSourceFilter}
                onChange={(e) => setCustomSourceFilter(e.target.value)}
                className="border border-slate-300 rounded-lg pl-8 pr-2 py-1 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-auto w-full lg:w-auto justify-end">
          <select 
            value={sortKey} 
            onChange={(e) => setSortKey(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white text-slate-700"
          >
            <option value="default">預設排序</option>
            <option value="id-desc">建立日期 (新→舊)</option>
            <option value="id-asc">建立日期 (舊→新)</option>
            <option value="error-desc">錯誤次數 (高→低)</option>
            <option value="error-asc">錯誤次數 (低→高)</option>
            <option value="date-desc">下次複習 (遠→近)</option>
            <option value="date-asc">下次複習 (近→遠)</option>
          </select>

          <div className="flex border border-slate-300 rounded-lg overflow-hidden shadow-sm">
            <button 
              onClick={() => setCardSize('s')} 
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${cardSize === 's' ? 'bg-teal-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
            >S</button>
            <button 
              onClick={() => setCardSize('m')} 
              className={`px-3 py-1.5 text-xs font-medium border-l border-r border-slate-300 transition-colors ${cardSize === 'm' ? 'bg-teal-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
            >M</button>
            <button 
              onClick={() => setCardSize('l')} 
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${cardSize === 'l' ? 'bg-teal-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
            >L</button>
          </div>

          <div className="h-6 w-px bg-slate-200 mx-2"></div>

          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
            <button 
              onClick={() => setViewMode('card')} 
              className={`p-1.5 rounded-md transition-all ${viewMode === 'card' ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <LayoutGrid size={18} />
            </button>
            <button 
              onClick={() => setViewMode('table')} 
              className={`p-1.5 rounded-md transition-all ${viewMode === 'table' ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <List size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'card' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredWords.map(word => (
            <Card key={word.ID} word={word} size={cardSize} onEdit={onEdit} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="p-4 w-12 text-center">
                    <input 
                      type="checkbox" 
                      onChange={handleSelectAll} 
                      checked={filteredWords.length > 0 && selectedIds.size === filteredWords.length}
                      className="accent-teal-600 w-4 h-4"
                    />
                  </th>
                  <th className="p-4 text-left text-sm font-bold text-slate-600 uppercase tracking-wider">字詞</th>
                  <th className="p-4 text-left text-sm font-bold text-slate-600 uppercase tracking-wider">注音</th>
                  <th className="p-4 text-left text-sm font-bold text-slate-600 uppercase tracking-wider">類型</th>
                  <th className="p-4 text-left text-sm font-bold text-slate-600 uppercase tracking-wider">來源</th>
                  <th className="p-4 text-left text-sm font-bold text-slate-600 uppercase tracking-wider">錯誤次數</th>
                  <th className="p-4 text-left text-sm font-bold text-slate-600 uppercase tracking-wider">下次複習</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredWords.map(word => (
                  <tr key={word.ID} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 text-center">
                      <input 
                        type="checkbox" 
                        checked={selectedIds.has(word.ID)} 
                        onChange={() => handleSelect(word.ID)}
                        className="accent-teal-600 w-4 h-4"
                      />
                    </td>
                    <td className="p-4 text-sm text-slate-900 font-medium">{word.字詞}</td>
                    <td className="p-4 text-sm text-slate-600 font-serif">{word.注音}</td>
                    <td className="p-4 text-sm">
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                        {word.錯誤類型}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-slate-500">{word.題庫來源}</td>
                    <td className="p-4 text-sm">
                      <span className={`font-bold ${word.錯誤次數 > 0 ? 'text-orange-600' : 'text-slate-400'}`}>
                        {word.錯誤次數}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-slate-500">{word.下次複習}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bulk Edit Bar */}
      <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-4xl bg-white/80 backdrop-blur-xl border border-slate-200 text-slate-800 p-4 rounded-3xl flex flex-col sm:flex-row justify-between items-center shadow-2xl transition-all transform duration-500 z-50 ${selectedIds.size > 0 ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'}`}>
        <div className="font-bold text-lg flex items-center gap-3 mb-2 sm:mb-0">
          <span className="bg-teal-600 text-white px-3 py-1 rounded-full flex items-center justify-center text-sm shadow-lg shadow-teal-200">
            {selectedIds.size}
          </span>
          <span className="text-slate-600">筆資料已選取</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-sm font-medium">修改來源：</span>
            <select 
              value={bulkSource} 
              onChange={(e) => setBulkSource(e.target.value)}
              className="bg-slate-50 text-slate-800 border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium"
            >
              <option value="" disabled>請選擇...</option>
              <option value="自建">自建</option>
              <option value="會考">會考</option>
              <option value="學校">學校</option>
              <option value="AI 辨識">AI 辨識</option>
            </select>
          </div>
          <button 
            onClick={handleBulkUpdate} 
            disabled={isUpdating}
            className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-1.5 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-teal-200"
          >
            {isUpdating ? '更新中...' : '批次更新'}
          </button>
          <button 
            onClick={handleBulkDelete} 
            disabled={isUpdating}
            className="bg-rose-50 hover:bg-rose-100 text-rose-600 px-4 py-1.5 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
          >
            <Trash2 size={16} />
            刪除
          </button>
          <button 
            onClick={() => setSelectedIds(new Set())} 
            className="text-slate-400 hover:text-slate-600 px-4 py-1.5 font-bold transition-colors"
          >
            取消
          </button>
        </div>
      </div>
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Trash2 className="text-rose-500" />
              確認刪除
            </h3>
            <p className="text-slate-600 mb-6">
              您確定要刪除選取的 <span className="font-bold text-rose-600">{selectedIds.size}</span> 筆資料嗎？
              <br />
              <span className="text-sm text-slate-500 mt-2 block">此動作無法復原。</span>
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                disabled={isUpdating}
              >
                取消
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors font-bold shadow-lg shadow-rose-500/30"
                disabled={isUpdating}
              >
                {isUpdating ? '刪除中...' : '確認刪除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
