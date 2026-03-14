import React, { useState } from 'react';
import { Word } from '../types';
import { Brain, Loader2, Sparkles, BookOpen, Copy, CheckCircle2, MessageSquareText } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import Markdown from 'react-markdown';

interface NotebookProps {
  words: Word[];
}

const NOTEBOOK_LM_PROMPTS = [
  {
    id: 'diagnosis',
    title: '📝 1. 綜合弱點診斷版（最推薦）',
    description: '讓 NotebookLM 幫你做一次全面的學習健檢，並給出具體的讀書建議。',
    prompt: `你現在是一位擁有多年教學經驗、專門輔導國中會考/高中學測的專業國文老師。我已經將我的「國文錯題紀錄」上傳到來源庫中（包含字音字形、成語、國學常識、文言文及閱讀理解等）。

請你仔細閱讀這些錯題資料，並幫我完成以下「專屬學習診斷報告」：
1. 核心弱點分析：統計並歸納我最常犯錯的題型與概念盲點（例如：是形近字容易混淆？還是文言文的字詞義判斷不佳？）。
2. 客製化複習策略：針對我的弱點，提供具體、可執行的讀書建議與改善方法。
3. 易混淆觀念釐清：挑出錯題中最具代表性、最容易搞混的 3~5 個觀念（如長得很像的字、意思相近的成語），用淺顯易懂的方式重新講解，並提供記憶口訣。

請用溫暖、鼓勵且專業的語氣回答，並使用清晰的排版（如列點、粗體）讓我方便閱讀。`
  },
  {
    id: 'table',
    title: '📊 2. 重點表格整理版',
    description: '適合考前衝刺、快速複習，將錯題整理成一目了然的表格。',
    prompt: `請根據我上傳的「國文錯題紀錄」，幫我整理出一份適合考前 10 分鐘快速複習的「精華秘笈」。

請依照錯誤類型，幫我製作以下表格：
1. 【字音字形與字義易錯表】：包含「易錯字詞」、「正確寫法/注音/解釋」、「常混淆的陷阱」。
2. 【成語急救包】：列出錯題中的成語，包含「成語」、「正確釋義」、「容易誤用的情境」。
3. 【文言文與國學常識重點】：將錯題中出現的文言文常考字義或國學常識，整理成條列式的必考重點。

請確保表格排版整齊，並在每個表格下方用一句話總結我該注意的重點。`
  },
  {
    id: 'quiz',
    title: '🎯 3. 考前猜題與延伸測驗版',
    description: '適合驗收學習成果，根據你的弱點「換句話說」再考你一次。',
    prompt: `你是我的專屬國文家教。請分析我上傳的「國文錯題紀錄」中我最常錯的觀念，並根據這些「易錯考點」，幫我重新出一份「延伸測驗卷」。

測驗卷要求：
1. 總共出 5 題單選題。
2. 題目必須是全新的（不要完全照抄原題），但要測驗完全相同的核心觀念或易混淆字詞。
3. 題目請包含字音字形、成語應用或文言文理解。
4. 請先只給我題目，不要附上答案。等我回答之後，你再幫我批改，並給予詳細的詳解。`
  }
];

export const Notebook: React.FC<NotebookProps> = ({ words }) => {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleAnalyze = async () => {
    const apiKey = localStorage.getItem('gemini_api_key');
    if (!apiKey) {
      setError('請先在「設定」頁面輸入 Gemini API Key');
      return;
    }

    const wrongWords = words.filter(w => (w.錯誤次數 || 0) > 0);
    if (wrongWords.length === 0) {
      setError('目前沒有錯題可以分析！');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const ai = new GoogleGenAI({ apiKey });
      
      // Prepare data for AI
      const dataToAnalyze = wrongWords.map(w => ({
        字詞: w.字詞,
        錯誤類型: w.錯誤類型,
        考點: w.考點,
        錯誤次數: w.錯誤次數
      }));

      const prompt = `
        你是一位專業的國文老師。請分析學生提供的「國文錯題紀錄」，並給出具體的「學習重點與弱點分析」。
        
        學生的錯題紀錄 (JSON格式)：
        ${JSON.stringify(dataToAnalyze, null, 2)}

        請提供以下內容：
        1. **整體弱點分析**：根據錯誤類型（如字音、字形、成語、閱讀理解等）和錯誤次數，總結學生最常犯錯的地方。
        2. **重點複習建議**：針對常錯的字詞或題型，給予具體的學習建議或記憶口訣。
        3. **鼓勵的話**：給學生一些正向的鼓勵。

        請用繁體中文回答，並使用 Markdown 格式排版，讓內容易於閱讀。語氣請保持專業且鼓勵人心的老師口吻。
      `;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      if (response.text) {
        setAnalysis(response.text);
      } else {
        throw new Error("AI 回傳內容為空");
      }
    } catch (err: any) {
      console.error('Analysis error:', err);
      let errorMessage = err.message || '分析過程中發生錯誤';
      if (errorMessage.includes('429') || errorMessage.includes('Quota exceeded')) {
        errorMessage = '⚠️ API 使用量已達上限。請稍後再試。';
      }
      setError(errorMessage);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8 md:p-12">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6 text-indigo-600">
            <Brain size={40} />
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-4">AI 弱點分析 Notebook</h1>
          <p className="text-slate-500 text-lg max-w-2xl mx-auto">
            讓 AI 老師分析你的所有錯題，找出你的學習盲點，並提供專屬的複習建議。
          </p>
        </div>

        {!analysis && !isAnalyzing && (
          <div className="flex justify-center">
            <button
              onClick={handleAnalyze}
              className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg hover:bg-indigo-700 transition-all flex items-center gap-3 shadow-lg shadow-indigo-200 hover:scale-105"
            >
              <Sparkles size={24} />
              開始分析我的錯題
            </button>
          </div>
        )}

        {isAnalyzing && (
          <div className="flex flex-col items-center justify-center py-12 space-y-6">
            <Loader2 size={48} className="text-indigo-600 animate-spin" />
            <div className="text-xl font-bold text-slate-700 animate-pulse">
              AI 老師正在仔細研究你的錯題...
            </div>
            <p className="text-slate-500">這可能需要幾秒鐘的時間</p>
          </div>
        )}

        {error && (
          <div className="mt-8 p-6 bg-red-50 text-red-600 rounded-2xl border border-red-100 text-center font-medium">
            {error}
          </div>
        )}

        {analysis && !isAnalyzing && (
          <div className="mt-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="bg-slate-50 rounded-2xl p-8 md:p-10 border border-slate-200">
              <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-200">
                <BookOpen className="text-indigo-600" size={28} />
                <h2 className="text-2xl font-bold text-slate-800">專屬學習診斷報告</h2>
              </div>
              <div className="prose prose-slate prose-indigo max-w-none prose-headings:font-bold prose-h1:text-2xl prose-h2:text-xl prose-p:text-slate-700 prose-li:text-slate-700">
                <Markdown>{analysis}</Markdown>
              </div>
            </div>
            
            <div className="mt-8 flex justify-center">
              <button
                onClick={handleAnalyze}
                className="px-6 py-3 bg-white text-indigo-600 border-2 border-indigo-100 rounded-xl font-bold hover:bg-indigo-50 transition-all flex items-center gap-2"
              >
                <Sparkles size={18} />
                重新分析
              </button>
            </div>
          </div>
        )}

        {/* NotebookLM Prompts Section */}
        <div className="mt-16 pt-12 border-t border-slate-200">
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600">
              <MessageSquareText size={32} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-3">進階應用：NotebookLM 專屬家教</h2>
            <p className="text-slate-500 max-w-2xl mx-auto">
              將錯題匯出成 PDF 後，上傳到 Google NotebookLM 作為來源，<br className="hidden sm:block" />
              再複製以下提示詞（Prompt）貼給 AI，讓它成為你的專屬國文家教！
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {NOTEBOOK_LM_PROMPTS.map((item) => (
              <div key={item.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">{item.title}</h3>
                    <p className="text-sm text-slate-500 mt-1">{item.description}</p>
                  </div>
                  <button
                    onClick={() => handleCopy(item.id, item.prompt)}
                    className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors sm:w-auto w-full ${
                      copiedId === item.id 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {copiedId === item.id ? (
                      <>
                        <CheckCircle2 size={18} />
                        <span>已複製</span>
                      </>
                    ) : (
                      <>
                        <Copy size={18} />
                        <span>複製提示詞</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">
                    {item.prompt}
                  </pre>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
