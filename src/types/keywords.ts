export interface KeywordMatch {
  keyword: string;
  found: boolean;
  matchType: 'direct' | 'synonym' | 'semantic' | 'none';
  confidence: number;
  explanation: string;
  importance?: 'required' | 'preferred';
  context?: string;
}

export interface ExtractedKeyword {
  keyword: string;
  importance: 'required' | 'preferred';
  context: string;
}

export interface KeywordAnalysisResponse {
  keywords: KeywordMatch[];
  score: number;
} 