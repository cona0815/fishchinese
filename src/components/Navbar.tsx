import React from 'react';
import { BookOpen, CheckCircle, List, FileText, PlusCircle, Settings as SettingsIcon, HelpCircle, Brain, Sparkles } from 'lucide-react';

interface NavbarProps {
  currentPage: string;
  setPage: (page: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentPage, setPage }) => {
  const navItems = [
    { id: 'today-review', label: '今日複習', icon: BookOpen },
    { id: 'wrong-review', label: '錯題複習', icon: CheckCircle },
    { id: 'dashboard', label: '瀏覽全覽', icon: List },
    { id: 'export', label: '匯出錯題練習考卷', icon: FileText },
    { id: 'create-exam', label: '練習卷生成', icon: Sparkles },
    { id: 'add', label: '新增錯題題源', icon: PlusCircle },
    { id: 'notebook', label: 'AI 弱點分析', icon: Brain },
  ];

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-slate-100 text-slate-800 p-4 flex flex-wrap items-center gap-4 shadow-sm sticky top-0 z-50">
      <div className="text-xl font-black mr-4 hidden md:block bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent tracking-tight">國文錯題本</div>
      
      {navItems.map((item) => (
        <button
          key={item.id}
          onClick={() => setPage(item.id)}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all text-sm md:text-base font-medium ${
            currentPage === item.id 
              ? 'bg-teal-50 text-teal-600 shadow-sm border border-teal-100' 
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
          }`}
        >
          <item.icon size={18} />
          <span className="hidden sm:inline">{item.label}</span>
        </button>
      ))}

      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={() => setPage('guide')}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all ${
            currentPage === 'guide' ? 'bg-slate-100 text-slate-800' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
          }`}
          title="功能說明"
        >
          <HelpCircle size={20} />
        </button>
        <button
          onClick={() => setPage('settings')}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all ${
            currentPage === 'settings' ? 'bg-slate-100 text-slate-800' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
          }`}
          title="設定"
        >
          <SettingsIcon size={20} />
        </button>
      </div>
    </nav>
  );
};
