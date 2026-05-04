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
        model: "gemini-3-flash-preview",
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
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-8 md:p-12">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-teal-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-teal-600">
            <Brain size={40} />
          </div>
          <h1 className="text-3xl font-black text-slate-800 mb-4 tracking-tight">AI 弱點分析精靈</h1>
          <p className="text-slate-500 text-lg max-w-2xl mx-auto font-medium">
            讓 AI 深度分析你的錯題分佈，精準找出學習死角，並產出專屬複習指引。
          </p>
        </div>

        {!analysis && !isAnalyzing && (
          <div className="flex justify-center">
            <button
              onClick={handleAnalyze}
              className="px-10 py-4 bg-teal-600 text-white rounded-2xl font-black text-lg hover:bg-teal-700 transition-all flex items-center gap-3 shadow-xl shadow-teal-100 transform hover:scale-105 active:scale-95"
            >
              <Sparkles size={24} />
              產出我的專屬弱點分析
            </button>
          </div>
        )}

        {isAnalyzing && (
          <div className="flex flex-col items-center justify-center py-16 space-y-8">
            <div className="relative">
              <div className="w-20 h-20 border-4 border-teal-100 rounded-full animate-pulse"></div>
              <Loader2 size={40} className="text-teal-600 animate-spin absolute inset-0 m-auto" />
            </div>
            <div className="text-2xl font-black text-slate-800 tracking-tight">
              AI 老師正在調閱檔案中...
            </div>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">分析中，請稍候片刻</p>
          </div>
        )}

        {error && (
          <div className="mt-8 p-6 bg-rose-50 text-rose-600 rounded-3xl border border-rose-100 text-center font-bold shadow-sm shadow-rose-50">
            {error}
          </div>
        )}

        {analysis && !isAnalyzing && (
          <div className="mt-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="bg-slate-50/50 rounded-3xl p-8 md:p-12 border border-slate-100 shadow-inner">
              <div className="flex items-center gap-3 mb-8 pb-6 border-b border-slate-200/50">
                <BookOpen className="text-teal-600" size={32} />
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">專屬學習診斷報告</h2>
              </div>
              <div className="prose prose-slate prose-teal max-w-none prose-headings:font-black prose-p:text-slate-600 prose-p:font-medium prose-p:leading-relaxed prose-strong:text-teal-700 prose-strong:font-black">
                <Markdown>{analysis}</Markdown>
              </div>
            </div>
            
            <div className="mt-10 flex justify-center">
              <button
                onClick={handleAnalyze}
                className="px-8 py-3 bg-white text-teal-600 border-2 border-teal-100 rounded-2xl font-black hover:bg-teal-50 transition-all flex items-center gap-2 shadow-sm"
              >
                <Sparkles size={20} />
                重新分析弱點
              </button>
            </div>
          </div>
        )}

        {/* NotebookLM Prompts Section */}
        <div className="mt-20 pt-16 border-t border-slate-100">
          <div className="text-center mb-12">
            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-emerald-600">
              <MessageSquareText size={32} />
            </div>
            <h2 className="text-2xl font-black text-slate-800 mb-4 tracking-tight">進化應用：NotebookLM 數位家教</h2>
            <p className="text-slate-500 max-w-2xl mx-auto font-medium">
              將匯出的 PDF 錯題本上傳至 <span className="text-teal-600 font-bold underline underline-offset-4 decoration-teal-200">NotebookLM</span>，<br className="hidden sm:block" />
              搭配以下 AI 提示詞，瞬間獲得一位對你瞭若指掌的專屬老師。
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8">
            {NOTEBOOK_LM_PROMPTS.map((item) => (
              <div key={item.id} className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm hover:shadow-xl hover:shadow-teal-100/30 transition-all transform hover:-translate-y-1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-6">
                  <div>
                    <h3 className="text-xl font-black text-slate-800 leading-tight">{item.title}</h3>
                    <p className="text-slate-500 mt-2 font-medium">{item.description}</p>
                  </div>
                  <button
                    onClick={() => handleCopy(item.id, item.prompt)}
                    className={`flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-black transition-all sm:w-auto w-full shadow-sm ${
                      copiedId === item.id 
                        ? 'bg-emerald-600 text-white shadow-emerald-200 shadow-xl' 
                        : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                    }`}
                  >
                    {copiedId === item.id ? (
                      <>
                        <CheckCircle2 size={18} />
                        <span>複製成功</span>
                      </>
                    ) : (
                      <>
                        <Copy size={18} />
                        <span>複製提示詞</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                  <pre className="text-sm text-slate-600 whitespace-pre-wrap font-sans leading-relaxed font-medium italic">
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
