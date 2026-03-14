export interface Word {
  ID: string;
  字詞: string;
  注音: string;
  錯誤類型: string;
  考點: string;
  釋義: string;
  例句: string;
  詳情: string;
  錯誤次數: number;
  上次複習: string;
  下次複習: string;
  題庫來源: string;
}

export type ViewMode = 'card' | 'table';
export type CardSize = 's' | 'm' | 'l';
