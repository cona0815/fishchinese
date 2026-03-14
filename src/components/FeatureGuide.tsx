import React from 'react';
import { BookOpen, Camera, Brain, Search, Volume2, Edit3, LayoutGrid, Filter, CheckCircle2 } from 'lucide-react';

export const FeatureGuide: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-12">
      <div className="text-center space-y-4 mb-12">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-800">
          國文錯題本 - 功能使用說明
        </h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          結合 AI 智慧分析與教育部辭典，幫助學生快速整理錯題、精準複習，提升國語文能力。
        </p>
      </div>

      {/* 核心功能區塊 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* 1. AI 智慧分析 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
            <Brain size={24} />
          </div>
          <h3 className="text-xl font-bold text-slate-800">AI 智慧錯題分析</h3>
          <p className="text-slate-600 leading-relaxed">
            不用手動打字！直接上傳考卷或作業的照片，AI 會自動辨識題目、判斷錯誤類型（字音、字形、成語等），並整理成數位卡片。
          </p>
          <ul className="space-y-2 text-sm text-slate-500">
            <li className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-500" />
              支援圖片與 PDF 上傳
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-500" />
              自動分類錯誤類型
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-500" />
              可指定特定題號進行分析
            </li>
          </ul>
        </div>

        {/* 2. 教育部辭典驗證 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
            <Search size={24} />
          </div>
          <h3 className="text-xl font-bold text-slate-800">教育部辭典驗證</h3>
          <p className="text-slate-600 leading-relaxed">
            為確保內容正確性，系統會自動連線至「教育部重編國語辭典」或「簡編本」進行驗證，提供最權威的字詞解釋與注音。
          </p>
          <ul className="space-y-2 text-sm text-slate-500">
            <li className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-500" />
              自動校正字音字形
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-500" />
              提供標準釋義與例句
            </li>
          </ul>
        </div>

        {/* 3. 專注複習模式 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">
            <LayoutGrid size={24} />
          </div>
          <h3 className="text-xl font-bold text-slate-800">專注複習模式</h3>
          <p className="text-slate-600 leading-relaxed">
            針對不同題型提供最佳化的閱讀體驗。字音字形題強調重點標示，閱讀題則提供完整文章與解析版面。
          </p>
          <ul className="space-y-2 text-sm text-slate-500">
            <li className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-500" />
              字形題：自動標示括號重點 (如：脫「穎」而出)
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-500" />
              字音題：隱藏干擾資訊，專注記憶
            </li>
          </ul>
        </div>

        {/* 4. 語音朗讀與管理 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center text-rose-600">
            <Volume2 size={24} />
          </div>
          <h3 className="text-xl font-bold text-slate-800">語音朗讀與管理</h3>
          <p className="text-slate-600 leading-relaxed">
            支援整句或單詞朗讀，幫助記憶。並提供完整的題庫管理功能，可隨時編輯、刪除或標記已熟練的題目。
          </p>
          <ul className="space-y-2 text-sm text-slate-500">
            <li className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-500" />
              TTS 語音合成朗讀
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-500" />
              錯題次數統計與篩選
            </li>
          </ul>
        </div>

      </div>

      {/* 使用流程圖 */}
      <div className="bg-slate-50 p-8 rounded-3xl border border-slate-200">
        <h3 className="text-2xl font-bold text-slate-800 mb-8 text-center">使用流程</h3>
        <div className="flex flex-col md:flex-row justify-between items-center gap-8 relative">
          {/* Step 1 */}
          <div className="flex flex-col items-center text-center z-10">
            <div className="w-16 h-16 bg-white rounded-full shadow-md flex items-center justify-center text-indigo-600 mb-4 border-4 border-indigo-50">
              <Camera size={28} />
            </div>
            <h4 className="font-bold text-slate-800 mb-2">1. 拍照上傳</h4>
            <p className="text-sm text-slate-500 max-w-[150px]">
              拍攝考卷錯題部分，或直接上傳圖片檔案
            </p>
          </div>

          {/* Connector Line (Desktop) */}
          <div className="hidden md:block absolute top-8 left-0 w-full h-1 bg-slate-200 -z-0" style={{ transform: 'scaleX(0.8)' }}></div>

          {/* Step 2 */}
          <div className="flex flex-col items-center text-center z-10">
            <div className="w-16 h-16 bg-white rounded-full shadow-md flex items-center justify-center text-indigo-600 mb-4 border-4 border-indigo-50">
              <Brain size={28} />
            </div>
            <h4 className="font-bold text-slate-800 mb-2">2. AI 分析與驗證</h4>
            <p className="text-sm text-slate-500 max-w-[150px]">
              AI 自動辨識文字、分類題型，並查閱辭典確認正確性
            </p>
          </div>

          {/* Step 3 */}
          <div className="flex flex-col items-center text-center z-10">
            <div className="w-16 h-16 bg-white rounded-full shadow-md flex items-center justify-center text-indigo-600 mb-4 border-4 border-indigo-50">
              <Edit3 size={28} />
            </div>
            <h4 className="font-bold text-slate-800 mb-2">3. 確認與儲存</h4>
            <p className="text-sm text-slate-500 max-w-[150px]">
              檢查分析結果，確認無誤後儲存至個人題庫
            </p>
          </div>

          {/* Step 4 */}
          <div className="flex flex-col items-center text-center z-10">
            <div className="w-16 h-16 bg-white rounded-full shadow-md flex items-center justify-center text-indigo-600 mb-4 border-4 border-indigo-50">
              <BookOpen size={28} />
            </div>
            <h4 className="font-bold text-slate-800 mb-2">4. 複習與追蹤</h4>
            <p className="text-sm text-slate-500 max-w-[150px]">
              隨時翻閱錯題卡，追蹤複習進度，消滅知識盲點
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
