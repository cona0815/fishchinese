import React, { useState, useRef } from 'react';
import { Sparkles, Upload, FileText, Camera, X, Loader2, Printer, ChevronLeft } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

interface ExtractedQuestion {
  id: number;
  question: string;
  answer: string;
  hint?: string;
  type?: string;
}

export const CreateExam: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'preview' | 'printing'>('idle');
  const [message, setMessage] = useState('');
  const [questions, setQuestions] = useState<ExtractedQuestion[]>([]);
  const [quizMode, setQuizMode] = useState<'student' | 'teacher'>('student');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const clearFile = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const fileToGenerativePart = async (file: File) => {
    const base64EncodedDataPromise = new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.readAsDataURL(file);
    });
    return {
      inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
    };
  };

  const handleAnalyze = async () => {
    const apiKey = localStorage.getItem('gemini_api_key');
    if (!apiKey) {
      alert('請先在「設定」頁面輸入 Gemini API Key');
      return;
    }

    setStatus('analyzing');
    setMessage('AI 正在讀取並整理考卷內容...');

    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `
        你是一個專業的國文助教。請讀取使用者提供的人工考卷圖片或文字，並將其中的「所有題目」精確地整理出來。
        
        **任務目標：**
        1. 掃描並提取每一道題目，包括字音、字形、成語、詞意及選擇題。
        2. 不要跳過任何題目，無論題數多寡。
        3. 將內容格式化為 JSON Array。
        
        **JSON 欄位定義：**
        - id: 題號 (保持原考卷題號，如 1, 2, 3...)。
        - question: 題目本體。
          - 字音題例：「雛」鳥 -> 呈現為「雛」鳥。
          - 字形題例：「ㄎㄨㄟˋ」贈 -> 呈現為「ㄎㄨㄟˋ」贈。
        - answer: 解答。
          - 字音題：填寫該字的正確注音 (如：ㄔㄨˊ)。
          - 字形題：填寫該注音對應的國字 (如：饋)。
        - type: 題目類型（字音、字形、成語、選擇）。

        **特別規則：**
        - 請務必發揮你的國文專業，自動補齊題目對應的「正確答案」放在 answer 欄位中。
        - 如果是一張長卷，請確保從頭到尾完整提取。
        - 嚴禁回傳簡略版，必須包含所有題目。

        請直接回傳 JSON Array，不要包含 Markdown 格式 (如 \`\`\`json ... \`\`\`)。
      `;

      let parts = [{ text: prompt + (inputText ? `\n\n補充文字: ${inputText}` : '') }];
      if (selectedFile) {
        const imagePart = await fileToGenerativePart(selectedFile);
        parts.push(imagePart as any);
      }

      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: { parts: parts },
        config: { tools: [{ googleSearch: {} }] },
      });

      const result = response.text;
      const cleanJson = result.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsedData = JSON.parse(cleanJson);
      
      setQuestions(parsedData);
      setStatus('preview');
      setMessage(`整理完成！共整理出 ${parsedData.length} 題。`);
    } catch (error: any) {
      console.error(error);
      setStatus('idle');
      alert('分析失敗: ' + error.message);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (status === 'preview' || status === 'printing') {
    return (
      <div className="max-w-5xl mx-auto p-4 md:p-8">
        {/* Print Controls */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-8 print:hidden flex justify-between items-center">
          <button 
            onClick={() => setStatus('idle')}
            className="flex items-center gap-2 text-slate-600 hover:text-indigo-600 transition-colors"
          >
            <ChevronLeft size={20} />
            返回重新上傳
          </button>
          
          <div className="flex gap-4 items-center">
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setQuizMode('student')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                  quizMode === 'student' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'
                }`}
              >
                學生版
              </button>
              <button
                onClick={() => setQuizMode('teacher')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                  quizMode === 'teacher' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'
                }`}
              >
                教師版
              </button>
            </div>
            
            <button 
              onClick={handlePrint}
              className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all font-bold"
            >
              <Printer size={18} />
              列印 / 另存 PDF
            </button>
          </div>
        </div>

        {/* Paper Layout */}
        <div className="bg-white shadow-xl min-h-[297mm] w-full max-w-[210mm] mx-auto p-10 md:p-16 print:p-0 print:shadow-none print:w-full print:max-w-none">
          <div className="text-center border-b-2 border-black pb-6 mb-8 uppercase">
            <h1 className="text-3xl font-serif font-bold mb-4 tracking-widest">國文練習卷</h1>
            <div className="flex justify-between text-base font-serif text-slate-900 px-4">
              <div className="space-x-8">
                <span>班級：__________</span>
                <span>姓名：__________</span>
                <span>座號：__________</span>
              </div>
              <div className="text-slate-500 text-sm">
                {quizMode === 'teacher' ? '教師解答版' : '學生練習版'}
              </div>
            </div>
          </div>

          <table className="w-full border-collapse border border-slate-300 text-base">
            <thead>
              <tr className="bg-slate-100 print:bg-gray-100 border-b border-slate-300">
                <th className="p-3 border-r border-slate-300 w-12 text-center">題號</th>
                <th className="p-3 border-r border-slate-300 text-left">題目</th>
                <th className="p-3 border-r border-slate-300 w-1/4 text-left">作答 / 答案</th>
                <th className="p-3 w-1/4 text-left">訂正</th>
              </tr>
            </thead>
            <tbody>
              {questions.map((q, i) => (
                <tr key={i} className="border-b border-slate-300">
                  <td className="p-3 text-center border-r border-slate-300 align-top pt-4">{q.id || i + 1}.</td>
                  <td className="p-4 border-r border-slate-300 font-serif text-lg align-top leading-relaxed">
                    {q.question}
                    {q.hint && <span className="text-slate-400 text-sm ml-2">({q.hint})</span>}
                  </td>
                  <td className="p-4 border-r border-slate-300 align-top">
                    {quizMode === 'teacher' && (
                      <span className="text-red-600 font-bold text-xl font-serif">{q.answer}</span>
                    )}
                  </td>
                  <td className="p-3 align-top"></td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-12 text-center text-xs text-slate-400 print:text-gray-400 font-mono">
            Generated by 國文錯題本 練習卷生成器
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6 text-indigo-600">
            <Sparkles size={40} />
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-4">練習卷生成器</h1>
          <p className="text-slate-500 text-lg max-w-2xl mx-auto">
            上傳考卷 PDF 或圖片，AI 會自動偵測題目、整理成表格，<br />
            並為您生成一份乾淨的複習練習卷。
          </p>
        </div>

        <div className="space-y-8">
          {/* File Upload Area */}
          <div 
            className="border-3 border-dashed border-slate-200 rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 hover:border-indigo-300 transition-all group relative h-64"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files?.[0]) handleFileSelect(e.dataTransfer.files[0]);
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])} 
              className="hidden" 
              accept="image/*,application/pdf"
            />
            
            {previewUrl ? (
              <div className="absolute inset-0 p-4">
                <div className="relative h-full w-full bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center">
                  <img src={previewUrl} className="h-full object-contain" alt="Preview" />
                  <button 
                    onClick={(e) => { e.stopPropagation(); clearFile(); }}
                    className="absolute top-2 right-2 p-2 bg-white/80 hover:bg-white text-rose-500 rounded-full shadow-lg"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="bg-indigo-50 p-6 rounded-full group-hover:bg-indigo-100 transition-colors mb-6">
                  <Upload size={40} className="text-indigo-600" />
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-slate-700">點擊或拖曳檔案至此</p>
                  <p className="text-slate-400 mt-2">支援 JPG, PNG, PDF 格式</p>
                </div>
              </>
            )}
          </div>

          <div className="flex flex-col gap-4">
             <label className="text-slate-700 font-bold flex items-center gap-2">
              <FileText size={18} />
              或者直接貼上題目文字：
            </label>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="例如：1.「ㄎㄨㄟˋ」贈  2.「雛」鳥..."
              className="w-full h-32 p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 transition-all resize-none"
            />
          </div>

          <button
            onClick={handleAnalyze}
            disabled={status === 'analyzing' || (!selectedFile && !inputText)}
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3 shadow-lg shadow-indigo-200"
          >
            {status === 'analyzing' ? (
              <>
                <Loader2 className="animate-spin" />
                AI 分析整理中...
              </>
            ) : (
              <>
                <Sparkles size={24} />
                開始整理練習卷
              </>
            )}
          </button>
          
          {message && status === 'analyzing' && (
            <p className="text-center text-indigo-600 font-medium animate-pulse">
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
