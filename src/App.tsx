import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { Review } from './components/Review';
import { AddData } from './components/AddData';
import { Export } from './components/Export';
import { Settings } from './components/Settings';
import { FeatureGuide } from './components/FeatureGuide';
import { Notebook } from './components/Notebook';
import { CreateExam } from './components/CreateExam';
import { Word } from './types';
import { api } from './services/api';

import { CheckCircle, XCircle } from 'lucide-react';

export default function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingWord, setEditingWord] = useState<Word | undefined>(undefined);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getWords();
      // Ensure data is an array
      if (Array.isArray(data)) {
        setWords(data);
      } else {
        // GAS might return an object wrapper
        setWords([]);
        console.warn('Received non-array data:', data);
      }
    } catch (error: any) {
      console.error('Failed to fetch data', error);
      setError(error.message);
      // If error is about missing URL, redirect to settings
      if (error.message.includes('請先在設定頁面')) {
        setCurrentPage('settings');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch if URL exists
    if (localStorage.getItem('gas_app_url')) {
      fetchData();
    } else {
      setCurrentPage('settings');
    }
  }, []);

  useEffect(() => {
    if (currentPage !== 'add') {
      setEditingWord(undefined);
    }
  }, [currentPage]);

  const handleEdit = (word: Word) => {
    setEditingWord(word);
    setCurrentPage('add');
  };

  const renderContent = () => {
    if (currentPage === 'settings') {
      return <Settings />;
    }

    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-teal-600 border-t-transparent mb-6 shadow-xl shadow-teal-100"></div>
          <p className="text-slate-400 font-black tracking-widest text-sm uppercase">正在同步雲端資料...</p>
        </div>
      );
    }

    if (error && currentPage === 'dashboard') {
      return (
        <div className="text-center p-12 bg-white rounded-[2.5rem] shadow-xl border border-slate-100 max-w-lg mx-auto mt-10">
          <div className="w-20 h-20 bg-rose-100 rounded-3xl flex items-center justify-center mx-auto mb-6 text-rose-500">
            <XCircle size={40} />
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-4 tracking-tight">連線發生錯誤</h2>
          <p className="text-slate-500 mb-8 font-medium leading-relaxed">{error}</p>
          <button 
            onClick={() => fetchData()}
            className="px-8 py-3 bg-teal-600 text-white rounded-2xl font-black hover:bg-teal-700 transition-all shadow-xl shadow-teal-200 transform hover:scale-105 active:scale-95"
          >
            重試連線
          </button>
        </div>
      );
    }

    switch (currentPage) {
      case 'dashboard':
        return (
          <Dashboard 
            words={words} 
            onEdit={handleEdit} 
            token="" 
            refreshData={fetchData} 
            setPage={setCurrentPage}
          />
        );
      case 'today-review':
        return (
          <Review 
            mode="today" 
            words={words} 
            token="" 
            onFinish={() => setCurrentPage('dashboard')} 
          />
        );
      case 'wrong-review':
        return (
          <Review 
            mode="wrong" 
            words={words} 
            token="" 
            onFinish={() => setCurrentPage('dashboard')} 
          />
        );
      case 'add':
        // Extract unique sources from existing words
        const uniqueSources = Array.from(new Set(words.map(w => w.題庫來源).filter(Boolean)));
        return (
          <AddData 
            token="" 
            onSuccess={() => {
              fetchData();
              if (editingWord) {
                setCurrentPage('dashboard');
              }
            }}
            initialData={editingWord}
            existingSources={uniqueSources}
          />
        );
      case 'export':
        return <Export words={words} />;
      case 'guide':
        return <FeatureGuide />;
      case 'notebook':
        return <Notebook words={words} />;
      case 'create-exam':
        return <CreateExam />;
      default:
        return <div>Page not found</div>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-teal-100 selection:text-teal-900">
      <Navbar 
        currentPage={currentPage} 
        setPage={setCurrentPage} 
      />
      <main className="container mx-auto pb-20 pt-6 px-4 md:px-6">
        {renderContent()}
      </main>
    </div>
  );
}
