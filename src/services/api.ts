import { Word } from '../types';

const getGasUrl = () => {
  const url = localStorage.getItem('gas_app_url');
  if (!url) throw new Error('請先在設定頁面輸入 Google Apps Script 網址');
  return url;
};

const callGasApi = async (action: string, data: any = {}) => {
  const url = getGasUrl();
  
  // GAS requires POST for complex data, and we use text/plain to avoid CORS preflight issues sometimes,
  // but standard fetch with CORS mode usually works if the GAS script handles OPTIONS or simple POST.
  // We'll use no-cors? No, we need response.
  // We'll use standard POST. The GAS script must return JSON and handle CORS.
  
  const response = await fetch(url, {
    method: 'POST',
    body: JSON.stringify({ action, ...data }),
    // Do not set Content-Type to application/json to avoid preflight if possible, 
    // but we are sending JSON. 
    // Actually, sending as text/plain (default if not set) is often the hack for GAS.
    // Let's try sending as text/plain but stringified JSON.
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }

  const result = await response.json();
  if (result.error) {
    throw new Error(result.error);
  }
  return result;
};

export const api = {
  async getWords(): Promise<Word[]> {
    return callGasApi('getWords');
  },

  async addWords(words: Partial<Word>[]) {
    // GAS script expects 'data' property for addWords
    return callGasApi('addWords', { data: words });
  },

  async updateReview(id: string, correct: boolean) {
    return callGasApi('updateReview', { id, correct });
  },

  async batchUpdate(ids: string[], newSource: string) {
    return callGasApi('batchUpdate', { ids, newSource });
  },

  async updateWord(word: Partial<Word>) {
    return callGasApi('updateWord', { data: word });
  },

  async deleteWords(ids: string[]) {
    return callGasApi('deleteWords', { ids });
  },
};
