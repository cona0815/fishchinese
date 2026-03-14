import React, { useState, useEffect } from 'react';
import { Save, Copy, Check } from 'lucide-react';

export const Settings: React.FC = () => {
  const [geminiKey, setGeminiKey] = useState('');
  const [gasUrl, setGasUrl] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setGeminiKey(localStorage.getItem('gemini_api_key') || '');
    setGasUrl(localStorage.getItem('gas_app_url') || '');
  }, []);

  const handleSave = () => {
    localStorage.setItem('gemini_api_key', geminiKey);
    localStorage.setItem('gas_app_url', gasUrl);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const gasCode = `
// ==========================================
// 國文錯題本 2025 - 後端程式碼 (完整版 v3)
// ==========================================
// 1. 請將此內容「完全覆蓋」原本的程式碼.gs
// 2. ⚠️ 關鍵：請將下方的 SPREADSHEET_ID 換成「您自己的」試算表 ID
//    (試算表網址 /d/ 之後的那串亂碼，例如 1abc...xyz)
// 3. ⚠️ 關鍵：每次修改後，必須執行「部署 > 管理部署 > 編輯 > 新增版本 > 部署」

const SPREADSHEET_ID = "10R7uQxi2mEvCQT9xRArKd-MVjs-4jsA-ksG67BG1Img"; // ★已自動填入您的 ID
const SHEET_NAME = "錯題庫"; 

// --- 1. API 核心 ---

// --- 1. API 核心 ---

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({ 
    status: "running", 
    message: "Backend is ready. Please use POST for data operations." 
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  let params;
  try {
    params = JSON.parse(e.postData.contents);
  } catch (error) {
    return createJSONOutput({ error: "Invalid JSON format" });
  }

  const action = params.action;
  let result = {};

  try {
    if (action === 'getWords') {
      result = getWrongWords();
    } else if (action === 'addWords') {
      const dataStr = typeof params.data === 'string' ? params.data : JSON.stringify(params.data);
      result = addNewWordFromJSON(dataStr);
    } else if (action === 'updateReview') {
      updateReviewStatus(params.id, params.correct);
      result = { success: true };
    } else if (action === 'batchUpdate') {
      result = batchUpdateSource(params.ids, params.newSource);
    } else if (action === 'updateWord') {
      const dataStr = typeof params.data === 'string' ? params.data : JSON.stringify(params.data);
      const data = JSON.parse(dataStr);
      result = updateWordById(data.ID, data);
    } else if (action === 'deleteWords') {
      result = deleteWordsByIds(params.ids);
    } else {
      result = { error: "Unknown action: " + action };
    }
  } catch (error) {
    result = { error: error.toString() };
  }

  return createJSONOutput(result);
}

function createJSONOutput(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// --- 2. 資料讀取邏輯 ---

function dateToString(date) {
  if (!date) return "";
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return year + "-" + month + "-" + day;
}

function getActualDataRange(sheet) {
  const maxRows = sheet.getMaxRows();
  const lastCol = sheet.getLastColumn();
  if (maxRows === 0 || lastCol === 0) return null;
  
  const idColumnValues = sheet.getRange(1, 1, maxRows, 1).getValues();
  let actualLastRow = 0;
  for (let i = maxRows - 1; i >= 0; i--) {
    if (idColumnValues[i][0] !== "") { actualLastRow = i + 1; break; }
  }
  if (actualLastRow === 0) return null;
  return sheet.getRange(1, 1, actualLastRow, lastCol);
}

function getSheetData(sheet) {
  const dataRange = getActualDataRange(sheet);
  if (!dataRange) return { headers: [], data: [] };
  const values = dataRange.getValues();
  const headers = values.shift() || [];
  return { headers: headers, data: values };
}

function getWrongWords() {
  try {
    let sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
    // 如果找不到工作表，嘗試自動建立 (但通常建議使用者自行建立以保留舊資料)
    if (!sheet) return [];
    
    const { headers, data } = getSheetData(sheet);
    if (data.length === 0) return [];
    
    return data.map(row => {
      let entry = {};
      headers.forEach((header, i) => {
        if (header === '上次複習' || header === '下次複習') {
           entry[header] = row[i] ? dateToString(new Date(row[i])) : "";
        } else {
           entry[header] = row[i];
        }
      });
      return entry;
    });
  } catch (error) { 
    return []; 
  }
}

// --- 3. 寫入資料邏輯 ---

function addNewWordFromJSON(jsonString) {
  let inputData;
  try { inputData = JSON.parse(jsonString); } catch (e) { throw new Error("JSON 格式錯誤"); }
  let dataArray = Array.isArray(inputData) ? inputData : [inputData];
  if (dataArray.length === 0) throw new Error("空資料");

  let sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
  if (!sheet) {
    // 自動建立工作表
    sheet = SpreadsheetApp.openById(SPREADSHEET_ID).insertSheet(SHEET_NAME);
  }

  if (sheet.getLastRow() === 0) {
     const defaultHeaders = ['ID', '字詞', '注音', '錯誤類型', '考點', '釋義', '例句', '詳情', '錯誤次數', '上次複習', '下次複習', '題庫來源'];
     sheet.getRange(1, 1, 1, defaultHeaders.length).setValues([defaultHeaders]);
  }

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const wordIndex = headers.indexOf('字詞');
  const errorCountIndex = headers.indexOf('錯誤次數');
  const nextReviewIndex = headers.indexOf('下次複習');
  const keyPointIndex = headers.indexOf('考點');
  
  if (wordIndex === -1) throw new Error("缺少必要欄位: 字詞");

  const wordColumnRange = (sheet.getLastRow() > 1) ? sheet.getRange(2, wordIndex + 1, sheet.getLastRow() - 1) : null;
  const todayString = dateToString(new Date());
  const startTime = new Date().getTime();
  
  let newRowsForSheet = [];
  let addedCount = 0;
  let updatedCount = 0;

  dataArray.forEach((newWordObject, index) => {
    const word = newWordObject['字詞'];
    if (!word) return;

    let keyPoint = newWordObject['考點'];
    if (!keyPoint) {
      const type = newWordObject['錯誤類型'];
      keyPoint = (type === '成語' || type === '字詞' || type === '字義' || type === '字詞義') ? word : word.charAt(0);
    }
    
    let foundCell = null;
    if (wordColumnRange) {
       foundCell = wordColumnRange.createTextFinder(word).matchEntireCell(true).findNext();
    }

    if (foundCell) {
      // 更新舊資料
      const sheetRowIndex = foundCell.getRow();
      if(errorCountIndex !== -1) {
         const cell = sheet.getRange(sheetRowIndex, errorCountIndex + 1);
         cell.setValue((parseInt(cell.getValue()) || 0) + 1);
      }
      if(nextReviewIndex !== -1) sheet.getRange(sheetRowIndex, nextReviewIndex + 1).setValue(todayString);
      if(keyPointIndex !== -1) sheet.getRange(sheetRowIndex, keyPointIndex + 1).setValue(keyPoint);
      
      headers.forEach((header, i) => {
         if (newWordObject[header] !== undefined && header !== 'ID' && header !== '錯誤次數' && header !== '上次複習' && header !== '下次複習') {
             sheet.getRange(sheetRowIndex, i + 1).setValue(newWordObject[header]);
         }
      });
      updatedCount++;
    } else {
      // 新增資料
      const uniqueId = "w" + (startTime + index);
      const newRow = headers.map(header => {
        if (header === 'ID') return uniqueId;
        if (header === '錯誤次數') return 0;
        if (header === '上次複習') return "";
        if (header === '下次複習') return todayString;
        if (header === '考點') return keyPoint;
        return newWordObject[header] || "";
      });
      newRowsForSheet.push(newRow);
      addedCount++;
    }
  });

  if (newRowsForSheet.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, newRowsForSheet.length, headers.length).setValues(newRowsForSheet);
  }
  SpreadsheetApp.flush();
  return { added: addedCount, updated: updatedCount };
}

// --- 4. 複習與更新邏輯 ---

function updateReviewStatus(id, correct) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
  if (!sheet) return;
  
  const { headers, data } = getSheetData(sheet);
  const idxID = headers.indexOf('ID');
  
  // 尋找對應的列 (注意 data 是從第2列開始的)
  const rowIdx = data.findIndex(r => r[idxID] == id);
  if(rowIdx === -1) return;
  
  const sRow = rowIdx + 2; // 轉換回 Sheet 的實際列號
  const idxErr = headers.indexOf('錯誤次數');
  const idxLast = headers.indexOf('上次複習');
  const idxNext = headers.indexOf('下次複習');
  
  let err = parseInt(data[rowIdx][idxErr])||0;
  if(!correct) err++;
  
  const today = new Date();
  // 如果答對，3天後再複習；答錯，明天再複習
  const next = new Date(); 
  next.setDate(today.getDate() + (correct ? 3 : 1));
  
  sheet.getRange(sRow, idxErr+1).setValue(err);
  sheet.getRange(sRow, idxLast+1).setValue(dateToString(today));
  sheet.getRange(sRow, idxNext+1).setValue(dateToString(next));
}

function batchUpdateSource(idList, newSource) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
  if (!sheet) return "找不到工作表";

  const { headers, data } = getSheetData(sheet);
  
  const idIdx = headers.indexOf('ID');
  const sourceIdx = headers.indexOf('題庫來源');
  
  if (idIdx === -1 || sourceIdx === -1) throw new Error("找不到 ID 或 題庫來源 欄位");

  let updates = [];
  data.forEach((row, i) => {
    if (idList.includes(row[idIdx])) {
      updates.push(i + 2);
    }
  });

  if (updates.length === 0) return "沒有找到對應的 ID";

  updates.forEach(rowIndex => {
    sheet.getRange(rowIndex, sourceIdx + 1).setValue(newSource);
  });

  return "成功更新 " + updates.length + " 筆資料";
}

function updateWordById(id, newData) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
  if (!sheet) return { error: "Sheet not found" };

  const { headers, data } = getSheetData(sheet);
  const idIdx = headers.indexOf('ID');
  if (idIdx === -1) return { error: "ID column not found" };

  const rowIdx = data.findIndex(r => r[idIdx] == id);
  if (rowIdx === -1) return { error: "Word not found" };

  const sheetRowIndex = rowIdx + 2;

  Object.keys(newData).forEach(key => {
    const colIdx = headers.indexOf(key);
    if (colIdx !== -1 && key !== 'ID') { 
      sheet.getRange(sheetRowIndex, colIdx + 1).setValue(newData[key]);
    }
  });

  return { success: true };
}

function deleteWordsByIds(ids) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
  if (!sheet) return { error: "Sheet not found" };

  const { headers, data } = getSheetData(sheet);
  const idIdx = headers.indexOf('ID');
  if (idIdx === -1) return { error: "ID column not found" };

  // Find rows to delete (1-based index)
  // data is 0-based, so row index in sheet is i + 2
  let rowsToDelete = [];
  data.forEach((row, i) => {
    if (ids.includes(row[idIdx])) {
      rowsToDelete.push(i + 2);
    }
  });

  if (rowsToDelete.length === 0) return { success: true, count: 0 };

  // Sort descending to delete from bottom up without affecting indices
  rowsToDelete.sort((a, b) => b - a);

  rowsToDelete.forEach(row => {
    sheet.deleteRow(row);
  });

  return { success: true, count: rowsToDelete.length };
}
`.trim();

  const [copied, setCopied] = useState(false);
  const copyCode = () => {
    navigator.clipboard.writeText(gasCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
        <span className="text-slate-400">⚙️</span> 設定 (Settings)
      </h2>

      <div className="space-y-6">
        {/* Gemini API Key Section */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <label className="block text-lg font-bold text-slate-700 mb-2 flex items-center gap-2">
            <span className="text-amber-500">🔑</span> Gemini API Key
          </label>
          <input
            type="password"
            value={geminiKey}
            onChange={(e) => setGeminiKey(e.target.value)}
            placeholder="在此貼上您的 Free Tier API Key"
            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono transition-all"
          />
          <p className="mt-2 text-sm text-slate-500">
            * 我們已將「發音功能」改為瀏覽器內建 (免費)，以節省您的 API 額度。
          </p>
        </div>

        {/* Google Apps Script URL Section */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <label className="block text-lg font-bold text-slate-700 mb-2 flex items-center gap-2">
            <span className="text-emerald-600">mw</span> Google Apps Script 網址
          </label>
          <input
            type="text"
            value={gasUrl}
            onChange={(e) => setGasUrl(e.target.value)}
            placeholder="https://script.google.com/macros/s/..."
            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm transition-all"
          />
          <div className="flex justify-between items-center mt-4">
            <p className="text-sm text-slate-500">
              用於雲端同步單字與進度。
            </p>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  if (!gasUrl) return alert('請先輸入網址');
                  try {
                    const res = await fetch(gasUrl);
                    const text = await res.text();
                    try {
                      const json = JSON.parse(text);
                      if (json.status === 'running') {
                        alert('✅ 連線成功！後端程式碼已更新。');
                      } else {
                        alert('⚠️ 連線成功，但回傳格式不符。請確認是否已更新 GAS 程式碼。');
                      }
                    } catch (e) {
                      alert('❌ 連線失敗：回傳的是 HTML 網頁而非 JSON 資料。\n\n請確認：\n1. 是否已將 GAS 程式碼更新為下方的新版本？\n2. 是否已建立「新版」部署？(Deploy > New deployment)');
                    }
                  } catch (e) {
                    alert('❌ 無法連線到此網址，請檢查網址是否正確。');
                  }
                }}
                className="text-sm px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 border border-slate-300 transition-colors"
              >
                測試連線
              </button>
              <button
                onClick={async () => {
                  if (!gasUrl) return alert('請先輸入網址');
                  try {
                    const testData = {
                      action: 'addWords',
                      data: [{
                        '字詞': '測試寫入',
                        '注音': 'ㄘㄜˋ ㄕˋ',
                        '錯誤類型': '測試',
                        '考點': '測試',
                        '題庫來源': '自建'
                      }]
                    };
                    
                    const res = await fetch(gasUrl, {
                      method: 'POST',
                      body: JSON.stringify(testData)
                    });
                    
                    if (!res.ok) throw new Error(res.statusText);
                    
                    const json = await res.json();
                    if (json.error) throw new Error(json.error);
                    
                    alert(`✅ 寫入成功！新增了 ${json.added} 筆資料。\n請檢查您的試算表是否有出現「測試寫入」。`);
                  } catch (e: any) {
                    alert(`❌ 寫入失敗：${e.message}\n\n可能原因：\n1. GAS 程式碼未更新\n2. 未部署新版本\n3. 權限不足 (請確認執行身分為 Me)`);
                  }
                }}
                className="text-sm px-4 py-2 bg-indigo-50 hover:bg-indigo-100 rounded-lg text-indigo-700 border border-indigo-200 transition-colors"
              >
                測試寫入
              </button>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            className={`flex items-center gap-2 px-8 py-3 rounded-xl text-white font-bold transition-all shadow-lg ${
              saved ? 'bg-emerald-500 shadow-emerald-500/30' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/30 hover:-translate-y-1'
            }`}
          >
            {saved ? <Check size={20} /> : <Save size={20} />}
            {saved ? '已儲存' : '儲存設定'}
          </button>
        </div>

        {/* GAS Code Helper */}
        <div className="mt-8 border-t border-slate-200 pt-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-slate-700">
              Backend 設定說明
            </h3>
            <button
              onClick={copyCode}
              className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? '已複製' : '複製 GAS 程式碼'}
            </button>
          </div>
          <div className="bg-slate-900 text-slate-100 p-6 rounded-xl overflow-x-auto text-sm font-mono shadow-inner border border-slate-800">
            <pre>{gasCode}</pre>
          </div>
        </div>
      </div>
    </div>
  );
};
