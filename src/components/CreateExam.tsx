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
        model: "gemini-3-flash-preview",
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
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 mb-8 print:hidden flex flex-col sm:flex-row justify-between items-center gap-6">
          <button 
            onClick={() => setStatus('idle')}
            className="flex items-center gap-2 text-slate-400 font-bold hover:text-teal-600 transition-all group"
          >
            <div className="p-2 bg-slate-50 group-hover:bg-teal-50 rounded-xl transition-colors">
              <ChevronLeft size={20} />
            </div>
            返回重新上傳
          </button>
          
          <div className="flex flex-wrap gap-4 items-center justify-center">
            <div className="flex bg-slate-100 p-1 rounded-2xl">
              <button
                onClick={() => setQuizMode('student')}
                className={`px-6 py-2 text-sm font-black rounded-xl transition-all ${
                  quizMode === 'student' ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-400'
                }`}
              >
                學生模式
              </button>
              <button
                onClick={() => setQuizMode('teacher')}
                className={`px-6 py-2 text-sm font-black rounded-xl transition-all ${
                  quizMode === 'teacher' ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-400'
                }`}
              >
                教師解答
              </button>
            </div>
            
            <button 
              onClick={handlePrint}
              className="flex items-center gap-2 px-8 py-2.5 bg-teal-600 text-white rounded-2xl hover:bg-teal-700 transition-all font-black shadow-lg shadow-teal-100"
            >
              <Printer size={18} />
              列印考卷
            </button>
          </div>
        </div>

        {/* Paper Layout */}
        <div className="bg-white shadow-2xl min-h-[297mm] w-full max-w-[210mm] mx-auto p-12 md:p-20 print:p-0 print:shadow-none print:w-full print:max-w-none rounded-[2.5rem] print:rounded-none overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-teal-600/10 print:hidden"></div>
          
          <div className="text-center border-b-4 border-slate-800 pb-10 mb-12">
            <h1 className="text-4xl font-serif font-black mb-6 tracking-[0.3em] text-slate-900">國語文能力診斷練習卷</h1>
            <div className="flex justify-between items-end text-lg font-serif text-slate-800 px-6">
              <div className="space-x-12 flex items-center">
                <span className="border-b-2 border-slate-300 pb-1 px-4 min-w-[120px]">班級：</span>
                <span className="border-b-2 border-slate-300 pb-1 px-4 min-w-[150px]">姓名：</span>
                <span className="border-b-2 border-slate-300 pb-1 px-4 min-w-[100px]">座號：</span>
              </div>
              <div className="px-4 py-1.5 bg-slate-100 rounded-lg text-xs font-bold text-slate-500 tracking-widest uppercase">
                {quizMode === 'teacher' ? 'AUTHORIZED TEACHER COPY' : 'STUDENT PRACTICE VERSION'}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-lg font-serif">
              <thead>
                <tr className="bg-slate-50 print:bg-gray-50 border-y-2 border-slate-800">
                  <th className="p-4 w-16 text-center font-black text-slate-500">#</th>
                  <th className="p-4 text-left font-black">測驗內容</th>
                  <th className="p-4 w-1/4 text-left font-black">作答區</th>
                  <th className="p-4 w-1/4 text-left font-black">初評/訂正</th>
                </tr>
              </thead>
              <tbody>
                {questions.map((q, i) => (
                  <tr key={i} className="border-b border-slate-100 hover:bg-slate-50/30 transition-colors">
                    <td className="p-4 text-center text-slate-400 font-bold align-top pt-6">{q.id || i + 1}</td>
                    <td className="p-6 font-serif text-xl align-top leading-relaxed text-slate-800">
                      {q.question}
                      {q.hint && <span className="text-slate-400 text-sm italic ml-3">※{q.hint}</span>}
                    </td>
                    <td className="p-6 bg-slate-50/20 border-x border-slate-100 align-top min-h-[60px]">
                      {quizMode === 'teacher' && (
                        <div className="text-rose-600 font-black text-2xl animate-in zoom-in duration-300 shadow-sm inline-block px-2">
                          {q.answer}
                        </div>
                      )}
                    </td>
                    <td className="p-4 align-top"></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-20 pt-8 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-300 font-black uppercase tracking-[0.2em] italic">
            <span>Powered by AI Learning Engine</span>
            <span>Generated At {new Date().toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      <div className="bg-white p-8 md:p-12 rounded-[2.5rem] shadow-sm border border-slate-100">
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-teal-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-teal-600 shadow-inner">
            <Sparkles size={40} />
          </div>
          <h1 className="text-3xl font-black text-slate-800 mb-4 tracking-tight">練習卷生成器</h1>
          <p className="text-slate-500 text-lg max-w-2xl mx-auto font-medium">
            上傳考卷 PDF 或圖片，AI 會自動偵測題目、整理成表格，<br className="hidden sm:block" />
            並為您生成一份乾淨、精緻的複習練習卷。
          </p>
        </div>

        <div className="space-y-10">
          {/* File Upload Area */}
          <div 
            className="border-4 border-dashed border-slate-100 rounded-[2rem] p-10 flex flex-col items-center justify-center cursor-pointer hover:bg-teal-50/30 hover:border-teal-200 transition-all group relative h-72 shadow-sm"
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
              <div className="absolute inset-0 p-6">
                <div className="relative h-full w-full bg-slate-50 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center border border-slate-100">
                  <img src={previewUrl} className="h-full object-contain" alt="Preview" />
                  <button 
                    onClick={(e) => { e.stopPropagation(); clearFile(); }}
                    className="absolute top-4 right-4 p-3 bg-white text-rose-500 rounded-2xl shadow-xl hover:scale-110 active:scale-95 transition-all"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="bg-teal-50 p-8 rounded-[1.5rem] group-hover:bg-teal-100 transition-all mb-6 transform group-hover:rotate-6 shadow-sm">
                  <Upload size={40} className="text-teal-600" />
                </div>
                <div className="text-center">
                  <p className="text-xl font-black text-slate-700 tracking-tight">點擊或拖曳檔案至此</p>
                  <p className="text-slate-400 mt-2 font-bold uppercase tracking-widest text-[10px]">支援 JPG, PNG, PDF 格式</p>
                </div>
              </>
            )}
          </div>

          <div className="flex flex-col gap-4">
             <label className="text-slate-500 font-black text-xs uppercase tracking-widest flex items-center gap-2 pl-2">
              <FileText size={14} className="text-teal-500" />
              或貼上題目文字：
            </label>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="例如：1.「ㄎㄨㄟˋ」贈  2.「雛」鳥..."
              className="w-full h-32 p-6 border border-slate-100 rounded-3xl focus:ring-4 focus:ring-teal-50 outline-none bg-slate-50/50 transition-all resize-none text-slate-700 font-medium font-serif"
            />
          </div>

          <div className="pt-4">
            <button
              onClick={handleAnalyze}
              disabled={status === 'analyzing' || (!selectedFile && !inputText)}
              className="w-full py-5 bg-teal-600 text-white rounded-3xl font-black text-xl hover:bg-teal-700 disabled:opacity-30 disabled:grayscale transition-all flex items-center justify-center gap-3 shadow-xl shadow-teal-100 transform active:scale-95"
            >
              {status === 'analyzing' ? (
                <>
                  <Loader2 className="animate-spin" size={24} />
                  AI 正在精準整理中...
                </>
              ) : (
                <>
                  <Sparkles size={24} />
                  生成專屬練習卷
                </>
              )}
            </button>
            
            {message && status === 'analyzing' && (
              <p className="text-center text-teal-600 font-black mt-6 animate-bounce text-sm uppercase tracking-widest">
                {message}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
