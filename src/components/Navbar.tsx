import React from 'react';
import { BookOpen, CheckCircle, List, FileText, PlusCircle, Settings as SettingsIcon, HelpCircle, Brain } from 'lucide-react';

interface NavbarProps {
  currentPage: string;
  setPage: (page: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentPage, setPage }) => {
  const navItems = [
    { id: 'today-review', label: '今日複習', icon: BookOpen },
    { id: 'wrong-review', label: '錯題複習', icon: CheckCircle },
    { id: 'dashboard', label: '瀏覽全覽', icon: List },
    { id: 'export', label: '匯出考卷', icon: FileText },
    { id: 'add', label: '新增題源', icon: PlusCircle },
    { id: 'notebook', label: 'AI 弱點分析', icon: Brain },
  ];

  return (
    <nav className="bg-slate-900 text-white p-4 flex flex-wrap items-center gap-4 shadow-md sticky top-0 z-50">
      <div className="text-xl font-bold mr-4 hidden md:block text-indigo-400">國文錯題本</div>
      
      {navItems.map((item) => (
        <button
          key={item.id}
          onClick={() => setPage(item.id)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm md:text-base ${
            currentPage === item.id ? 'bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-900/50' : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
          }`}
        >
          <item.icon size={18} />
          <span className="hidden sm:inline">{item.label}</span>
        </button>
      ))}

      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={() => setPage('guide')}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
            currentPage === 'guide' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
          title="功能說明"
        >
          <HelpCircle size={20} />
        </button>
        <button
          onClick={() => setPage('settings')}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
            currentPage === 'settings' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
          title="設定"
        >
          <SettingsIcon size={20} />
        </button>
      </div>
    </nav>
  );
};
