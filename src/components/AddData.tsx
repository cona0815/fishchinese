import React, { useState, useRef, useEffect } from 'react';
import { api } from '../services/api';
import { Word } from '../types';
import { Save, Trash2, Upload, Image as ImageIcon, Camera, Sparkles, X, FileText, Loader2, ChevronDown } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

interface AddDataProps {
  token: string;
  onSuccess: () => void;
  initialData?: Word;
  existingSources?: string[];
}

const SourceSelector: React.FC<{
  value: string;
  onChange: (value: string) => void;
  options: string[];
}> = ({ value, onChange, options }) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter options based on input value
  const filteredOptions = options.filter(opt => 
    opt.toLowerCase().includes(value.toLowerCase()) && opt !== value
  );

  return (
    <div className="relative" ref={wrapperRef}>
      <div className="relative">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsOpen(true)}
          className="w-full p-2 pr-8 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all text-slate-800 placeholder-slate-400"
          placeholder="輸入或選擇來源..."
        />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-teal-500 transition-colors"
        >
          <ChevronDown size={16} />
        </button>
      </div>
      
      {isOpen && filteredOptions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-auto animate-in fade-in slide-in-from-top-2 duration-200">
          {filteredOptions.map((option, index) => (
            <div
              key={index}
              className="px-4 py-2 hover:bg-teal-50 cursor-pointer text-slate-700 hover:text-teal-700 transition-colors"
              onClick={() => {
                onChange(option);
                setIsOpen(false);
              }}
            >
              {option}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};


export const AddData: React.FC<AddDataProps> = ({ token, onSuccess, initialData, existingSources = [] }) => {
  const [inputText, setInputText] = useState('');
  const [questionNumbers, setQuestionNumbers] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'review' | 'saving' | 'success' | 'error'>(initialData ? 'review' : 'idle');
  const [message, setMessage] = useState('');
  const [analyzedData, setAnalyzedData] = useState<any[]>(initialData ? [initialData] : []);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle paste event for images
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          handleFileSelect(file);
          e.preventDefault();
        }
      }
    }
  };

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
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

    if (!inputText && !selectedFile) {
      alert('請輸入文字或上傳圖片');
      return;
    }

    setStatus('analyzing');
    setMessage('AI 正在分析題目，請稍候...');

    try {
      const ai = new GoogleGenAI({ apiKey });
      
      const prompt = `
        你是一個國文題目分析助手。請分析使用者提供的文字或圖片內容，並將其轉換為結構化的 JSON 資料。

        **重要規則：**
        1. **提取範圍**：
           ${questionNumbers 
             ? `- 使用者指定了題號：**${questionNumbers}**。請只提取這些題號的題目。忽略其他題目。` 
             : '- 請仔細檢查圖片中的標記，只提取被打「x」、有紅筆訂正、或明顯標示為錯誤的題目。若題目未被標記為錯誤，請忽略。'}
        2. **分類**：請準確判斷錯誤類型（字音、字形、成語、字詞義、國學常識、閱讀理解、文言文）。

        請嚴格遵守以下欄位定義：

        1. **字詞** (Word)：必須是 **正確** 的詞語或成語。
           - **針對「字形」與「字音」題**：請將**測驗的目標字**用全形括號「」框起來。例如：臨「摹」、臉部輪「廓」、脫「穎」而出、「扳」機。
           - 其他類型：填寫完整詞語，不需括號。
           - 例如題目是「失誤招領處」，正確是「失物招領處」，這裡請填「失「物」招領處」。

        2. **考點** (Key Point)：必須是 **題目中出現的寫法**，並用全形括號「」標示出錯誤或測驗的地方。
           - 若為改錯字題，請將錯誤的字用「」框起來。例如：失「誤」招領處、不知所「衷」、「言」襲。
           - 若為注音題，請將注音部分用「」框起來。例如：肆「ㄋㄩㄝˋ」。
           - **若為「給注音寫國字」題，務必保留注音並用「」框起來，且歸類為「字形」**。例如：脫「ㄧㄥˇ」而出、「ㄓㄨㄢˋ」寫。
           - 若為正確的詞語解釋，則同「字詞」，或標示重點字。

        3. **錯誤類型**：
           - 字形：改錯字、或「給注音寫國字」 (如：失誤招領處、暴「ㄗㄠˋ」、脫「ㄧㄥˇ」而出、「ㄓㄨㄢˋ」寫)。
           - 字音：填注音、改錯音、或「給國字寫注音」 (如：肆虐、「扳」機)。
           - 成語：成語相關 (如：民康物阜)。
           - 字詞義：詞語解釋、字義比較 (如：燥熱)。
           - 國學常識、閱讀理解、文言文：針對長篇或知識型題目。

        **特別注意的分類範例：**
        - 「燥熱」 -> 字詞義
        - 「民康物阜」 -> 成語
        - 「扳」機 -> 字音
        - 暴「ㄗㄠˋ」 -> 字形
        - 「ㄓㄨㄢˋ」寫 -> 字形
        - 脫「ㄧㄥˇ」而出 -> 字形

        **重要：請務必使用 Google Search 工具查詢「教育部簡編本」字典 (https://dict.concised.moe.edu.tw/) 以確保字詞、注音與釋義的正確性。**

        請回傳一個 JSON Array，每個物件包含以下欄位。
        
        **針對「字音、字形、成語、字詞義」類型：**
        - 字詞: **正確**的詞語或成語。
        - 注音: **針對「字形」與「字音」題**，請**只填寫「字詞」中括號「」內該字的注音** (例如：脫「穎」而出 -> 填「ㄧㄥˇ」)。**針對「成語」題，請填寫該成語的完整注音** (例如：民康物阜 -> ㄇㄧㄣˊ ㄎㄤ ㄨˋ ㄈㄨˋ)。其他類型則填寫完整注音。**注意：一律使用注音符號 (如：ㄘˋ ㄍㄨˇ)，嚴禁使用漢語拼音 (如：ci gu)。**
        - 錯誤類型: 字音、字形、成語、字詞義。
        - 考點: **題目中的寫法**，錯誤處請用「」標示。
        - 釋義: 解釋。
        - 例句: 造句。
        - 詳情: 補充說明。

        **針對「國學常識、閱讀理解、文言文」類型：**
        - 字詞: **題目標題** (例如：貫雲石〈小梁州〉秋)。
        - 注音: (請留空)。
        - 錯誤類型: 國學常識、閱讀理解、文言文。
        - 考點: **題目問題** (例如：關於這首曲的分析，下列何者最恰當？)。
        - 釋義: **文章內容** (若是文言文，請務必 **保留原文**)。
        - 例句: **選項與正確答案** (務必完整列出 A、B、C、D **所有**選項內容，**絕對不可省略任何選項**。請在正確選項前加上「(正確答案)」)。
        - 詳情: **詳解** (請針對每個選項進行分析，並以**國中生能理解**的淺顯易懂方式說明。若其他選項內容正確但非本題答案，請解釋為何不選。**若是文言文，請務必將白話文翻譯放在詳解的最後面**)。
        - 題庫來源: "AI 辨識"。

        請直接回傳 JSON Array，不要包含 Markdown 格式 (如 \`\`\`json ... \`\`\`)。
      `;

      let parts = [];
      // Add text prompt
      const fullPrompt = prompt + (inputText ? `\n\n補充文字: ${inputText}` : '');
      parts.push({ text: fullPrompt });
      
      // Add image if exists
      if (selectedFile) {
        const imagePart = await fileToGenerativePart(selectedFile);
        parts.push(imagePart);
      }

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: { parts: parts },
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      const result = response.text;

      if (!result) {
        throw new Error("AI 回傳內容為空");
      }

      // Clean up the response if it contains markdown code blocks
      const cleanJson = result.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsedData = JSON.parse(cleanJson);
      
      setAnalyzedData(Array.isArray(parsedData) ? parsedData : [parsedData]);
      setStatus('review');
      setMessage(`分析完成！共找到 ${Array.isArray(parsedData) ? parsedData.length : 1} 筆資料，請確認後儲存。`);

    } catch (error: any) {
      console.error('Analysis error:', error);
      setStatus('error');
      
      let errorMessage = error.message || '請檢查 API Key 或網路連線';
      
      if (errorMessage.includes('429') || errorMessage.includes('Quota exceeded')) {
        errorMessage = '⚠️ API 使用量已達上限 (Quota exceeded)。\n\n即使是付費帳號，Google 也有每分鐘/每天的請求限制。\n請稍後再試，或檢查 Google Cloud Console 的配額設定。';
      }
      
      setMessage(`分析失敗: ${errorMessage}`);
    }
  };

  const handleSave = async () => {
    setStatus('saving');
    setMessage('正在儲存到資料庫...');
    try {
      if (initialData) {
        const item = analyzedData[0];
        await api.updateWord(item);
        
        setStatus('success');
        setMessage('更新成功！');
        setTimeout(() => {
          onSuccess();
        }, 1500);
      } else {
        // 確保資料格式正確，並填入預設值
        const dataToSave = analyzedData.map(item => ({
          '字詞': item['字詞'] || '',
          '注音': item['注音'] || '',
          '錯誤類型': item['錯誤類型'] || '',
          '考點': item['考點'] || '',
          '釋義': item['釋義'] || '',
          '例句': item['例句'] || '',
          '詳情': item['詳情'] || '',
          '題庫來源': item['題庫來源'] || '自建'
        }));

        const result = await api.addWords(dataToSave);
        
        setStatus('success');
        setMessage(`成功新增 ${result.added} 筆資料！`);
        setTimeout(() => {
          onSuccess();
          // Reset form
          setInputText('');
          clearFile();
          setAnalyzedData([]);
          setStatus('idle');
        }, 1500);
      }
    } catch (error: any) {
      setStatus('error');
      setMessage(`儲存失敗: ${error.message}`);
    }
  };

  const handleDataChange = (index: number, field: string, value: string) => {
    const newData = [...analyzedData];
    newData[index] = { ...newData[index], [field]: value };
    setAnalyzedData(newData);
  };

  const handleDeleteItem = (index: number) => {
    const newData = analyzedData.filter((_, i) => i !== index);
    setAnalyzedData(newData);
    if (newData.length === 0) {
      setStatus('idle');
      setMessage('');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 pb-20">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-black text-slate-800 flex items-center gap-3 tracking-tight">
          <div className="bg-teal-100 p-2 rounded-2xl">
            <Sparkles className="text-teal-600" size={28} />
          </div>
          {initialData ? '編輯題目' : '新增錯題題源'}
        </h2>
      </div>

      {/* Input Section */}
      {status === 'idle' || status === 'analyzing' || status === 'error' ? (
        <div className="space-y-6">
          {/* Text Input Area */}
          <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 italic transition-all">
            <label className="block text-slate-800 font-black mb-4 flex items-center gap-2">
              <FileText size={20} className="text-teal-500" />
              貼上題目或文章內容 (支援 Ctrl+V 圖片)
            </label>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onPaste={handlePaste}
              placeholder="請直接貼上國文考題文字... AI 將自動解析並歸位。"
              className="w-full h-48 p-6 border border-slate-100 rounded-3xl focus:outline-none focus:ring-4 focus:ring-teal-50 focus:border-teal-400 resize-none bg-slate-50/50 transition-all text-slate-700 leading-relaxed font-serif text-lg"
              disabled={status === 'analyzing'}
            />
          </div>

          {/* File Upload Area */}
          <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
            <label className="block text-slate-800 font-black mb-4 flex items-center gap-2">
              <ImageIcon size={20} className="text-emerald-500" />
              或者是拍攝考題照片
            </label>
            
            {!selectedFile ? (
              <div 
                className="grid grid-cols-1 md:grid-cols-2 gap-8"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
              >
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-4 border-dashed border-slate-100 rounded-[2rem] p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-teal-50/50 hover:border-teal-200 transition-all h-64 group bg-slate-50/20"
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])} 
                    className="hidden" 
                    accept="image/*,application/pdf"
                  />
                  <div className="bg-white p-5 rounded-3xl mb-4 group-hover:scale-110 transition-transform shadow-sm group-hover:shadow-teal-100">
                    <Upload className="text-teal-600 w-8 h-8" />
                  </div>
                  <span className="text-slate-800 font-black tracking-tight">匯入本機檔案</span>
                  <span className="text-slate-400 text-[10px] mt-2 font-black uppercase tracking-widest bg-white px-3 py-1 rounded-full shadow-sm">JPG / PNG / PDF</span>
                </div>

                <div 
                  className="border-4 border-dashed border-slate-100 rounded-[2rem] p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-emerald-50/50 hover:border-emerald-200 transition-all h-64 group bg-slate-50/20"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="bg-white p-5 rounded-3xl mb-4 group-hover:scale-110 transition-transform shadow-sm group-hover:shadow-emerald-100">
                    <Camera className="text-emerald-600 w-8 h-8" />
                  </div>
                  <span className="text-slate-800 font-black tracking-tight">啟動相機掃描</span>
                  <span className="text-slate-400 text-[10px] mt-2 font-black uppercase tracking-widest bg-white px-3 py-1 rounded-full shadow-sm">直接拍攝紙本錯題</span>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="relative border border-slate-100 rounded-[2rem] p-8 flex items-center gap-8 bg-slate-50/50 group overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-teal-500"></div>
                  {previewUrl ? (
                    <img src={previewUrl} alt="Preview" className="w-28 h-28 object-cover rounded-2xl shadow-xl border-4 border-white transform rotate-3" />
                  ) : (
                    <div className="w-28 h-28 bg-white rounded-2xl flex items-center justify-center shadow-lg transform -rotate-3">
                      <FileText className="text-slate-200" size={32} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-slate-800 truncate text-xl tracking-tight">{selectedFile.name}</p>
                    <p className="text-xs text-slate-400 font-black uppercase tracking-widest mt-1">{(selectedFile.size / 1024).toFixed(1)} KB READY</p>
                  </div>
                  <button 
                    onClick={clearFile}
                    className="p-4 bg-white hover:bg-rose-50 hover:text-rose-600 rounded-2xl transition-all text-slate-300 shadow-sm border border-slate-100"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="bg-slate-50 p-6 rounded-[1.5rem]">
                  <label className="block text-[10px] font-black text-slate-400 mb-3 uppercase tracking-[0.2em] ml-1">
                    指定特定題號 (可留空，AI 將自動辨認錯題)
                  </label>
                  <input
                    type="text"
                    value={questionNumbers}
                    onChange={(e) => setQuestionNumbers(e.target.value)}
                    placeholder="例如：3, 8, 12"
                    className="w-full p-5 bg-white border border-slate-100 rounded-2xl focus:ring-4 focus:ring-teal-50 outline-none transition-all placeholder-slate-300 font-black text-lg text-slate-700"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Action Button */}
          <div className="pt-4">
            <button
              onClick={handleAnalyze}
              disabled={status === 'analyzing' || (!inputText && !selectedFile)}
              className="w-full py-6 bg-teal-600 text-white rounded-[2rem] font-black text-xl hover:bg-teal-700 disabled:opacity-30 disabled:grayscale transition-all flex items-center justify-center gap-3 shadow-2xl shadow-teal-100 transform active:scale-95"
            >
              {status === 'analyzing' ? (
                <>
                  <Loader2 className="animate-spin" size={28} />
                  正在深度解析錯題脈絡...
                </>
              ) : (
                <>
                  <Sparkles size={24} />
                  啟動 AI 錯題分析
                </>
              )}
            </button>
            <p className="text-center text-slate-300 font-black text-[10px] mt-6 uppercase tracking-[0.2em]">
              Powered by Gemini Vision Intelligence
            </p>
          </div>
          
          {message && status === 'error' && (
            <div className="p-4 bg-red-50 text-red-600 rounded-xl text-center border border-red-100">
              {message}
            </div>
          )}
        </div>
      ) : (
        // Review Section
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h3 className="text-xl font-bold text-slate-800">{initialData ? '編輯內容' : '確認分析結果'}</h3>
            <div className="flex gap-2 w-full sm:w-auto">
              {!initialData && (
                <button
                  onClick={() => {
                    setStatus('idle');
                    setAnalyzedData([]);
                    setMessage('');
                  }}
                  className="flex-1 sm:flex-none px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
                >
                  重新分析
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={status === 'saving'}
                className="flex-1 sm:flex-none px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center justify-center gap-2 font-bold shadow-md transition-colors"
              >
                <Save size={18} />
                {status === 'saving' ? '儲存中...' : (initialData ? '確認修改' : '確認儲存')}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {analyzedData.map((item, index) => (
              <div key={index} className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
                {/* Card Header */}
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="bg-teal-100 text-teal-700 px-2 py-1 rounded text-xs font-bold">
                      #{index + 1}
                    </span>
                    <span className="font-bold text-slate-700">
                      {item['錯誤類型'] || '未分類'}
                    </span>
                  </div>
                  {!initialData && (
                    <button
                      onClick={() => handleDeleteItem(index)}
                      className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded hover:bg-red-50"
                      title="刪除此題"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>

                {/* Card Content */}
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">
                      {['國學常識', '閱讀理解', '文言文'].includes(item['錯誤類型'] || '') ? '標題' : '字詞'}
                    </label>
                    <input
                      value={item['字詞'] || ''}
                      onChange={(e) => handleDataChange(index, '字詞', e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">
                      {['國學常識', '閱讀理解', '文言文'].includes(item['錯誤類型'] || '') ? '注音 (可選)' : '注音'}
                    </label>
                    <input
                      value={item['注音'] || ''}
                      onChange={(e) => handleDataChange(index, '注音', e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">錯誤類型</label>
                    <input
                      value={item['錯誤類型'] || ''}
                      onChange={(e) => handleDataChange(index, '錯誤類型', e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">
                      {['國學常識', '閱讀理解', '文言文'].includes(item['錯誤類型'] || '') ? '題目問題' : '考點'}
                    </label>
                    <input
                      value={item['考點'] || ''}
                      onChange={(e) => handleDataChange(index, '考點', e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">
                      {['國學常識', '閱讀理解', '文言文'].includes(item['錯誤類型'] || '') ? '文章內容 (原文)' : '釋義'}
                    </label>
                    <textarea
                      value={item['釋義'] || ''}
                      onChange={(e) => handleDataChange(index, '釋義', e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
                      rows={['國學常識', '閱讀理解', '文言文'].includes(item['錯誤類型'] || '') ? 6 : 2}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">
                      {['國學常識', '閱讀理解', '文言文'].includes(item['錯誤類型'] || '') ? '選項 (完整列出 A, B, C, D)' : '例句'}
                    </label>
                    <textarea
                      value={item['例句'] || ''}
                      onChange={(e) => handleDataChange(index, '例句', e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
                      rows={['國學常識', '閱讀理解', '文言文'].includes(item['錯誤類型'] || '') ? 4 : 2}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">
                      {['國學常識', '閱讀理解', '文言文'].includes(item['錯誤類型'] || '') ? '詳解 (含翻譯)' : '詳情 (補充說明)'}
                    </label>
                    <textarea
                      value={item['詳情'] || ''}
                      onChange={(e) => handleDataChange(index, '詳情', e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
                      rows={['國學常識', '閱讀理解', '文言文'].includes(item['錯誤類型'] || '') ? 4 : 2}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">題庫來源</label>
                    <SourceSelector
                      value={item['題庫來源'] || '自建'}
                      onChange={(val) => handleDataChange(index, '題庫來源', val)}
                      options={Array.from(new Set([...existingSources, '自訂']))}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
