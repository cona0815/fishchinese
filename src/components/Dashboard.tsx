import React, { useState, useMemo } from 'react';
import { Word, ViewMode, CardSize } from '../types';
import { Card } from './Card';
import { LayoutGrid, List, Filter, ArrowUp, ArrowDown, Search, Trash2 } from 'lucide-react';
import { api } from '../services/api';

interface DashboardProps {
  words: Word[];
  onEdit: (word: Word) => void;
  token: string;
  refreshData: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ words, onEdit, token, refreshData }) => {
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
      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-wrap w-full lg:w-auto">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-700 flex items-center gap-1">
              <Filter size={16} className="text-indigo-500" />
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
                  className="accent-indigo-600"
                />
                <span className={filterType === type ? 'text-indigo-700 font-bold' : 'text-slate-600'}>
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
                  className="accent-indigo-600"
                />
                <span className={filterSources.includes(source) ? 'text-indigo-700 font-bold' : 'text-slate-600'}>
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
                className="border border-slate-300 rounded-lg pl-8 pr-2 py-1 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-auto w-full lg:w-auto justify-end">
          <select 
            value={sortKey} 
            onChange={(e) => setSortKey(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-700"
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
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${cardSize === 's' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
            >S</button>
            <button 
              onClick={() => setCardSize('m')} 
              className={`px-3 py-1.5 text-xs font-medium border-l border-r border-slate-300 transition-colors ${cardSize === 'm' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
            >M</button>
            <button 
              onClick={() => setCardSize('l')} 
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${cardSize === 'l' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
            >L</button>
          </div>

          <div className="h-6 w-px bg-slate-200 mx-2"></div>

          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
            <button 
              onClick={() => setViewMode('card')} 
              className={`p-1.5 rounded-md transition-all ${viewMode === 'card' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <LayoutGrid size={18} />
            </button>
            <button 
              onClick={() => setViewMode('table')} 
              className={`p-1.5 rounded-md transition-all ${viewMode === 'table' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
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
                      className="accent-indigo-600 w-4 h-4"
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
                        className="accent-indigo-600 w-4 h-4"
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
      <div className={`fixed bottom-0 left-0 w-full bg-slate-900 text-white p-4 flex flex-col sm:flex-row justify-between items-center shadow-lg transition-transform transform duration-300 z-50 ${selectedIds.size > 0 ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="font-bold text-lg flex items-center gap-2 mb-2 sm:mb-0">
          <span className="bg-indigo-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">
            {selectedIds.size}
          </span>
          筆資料已選取
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-slate-300 text-sm">修改來源：</span>
            <select 
              value={bulkSource} 
              onChange={(e) => setBulkSource(e.target.value)}
              className="bg-slate-800 text-white border border-slate-700 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            >
              <option value="" disabled>請選擇...</option>
              <option value="自建">自建</option>
              <option value="會考">會考</option>
              <option value="學校">學校</option>
            </select>
          </div>
          <button 
            onClick={handleBulkUpdate} 
            disabled={isUpdating}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-1.5 rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-indigo-900/50"
          >
            {isUpdating ? '更新中...' : '更新'}
          </button>
          <button 
            onClick={handleBulkDelete} 
            disabled={isUpdating}
            className="bg-rose-600 hover:bg-rose-500 text-white px-4 py-1.5 rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-rose-900/50 flex items-center gap-2"
          >
            <Trash2 size={16} />
            刪除
          </button>
          <button 
            onClick={() => setSelectedIds(new Set())} 
            className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-1.5 rounded-lg transition-colors"
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
