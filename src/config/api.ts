export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  ENDPOINTS: {
    ANALYZE_KEYWORDS: '/api/analyze-keywords',
    SCORE_RESUME: '/api/score-resume',
    SCRAPE_JOB: '/api/scrape-job',
    OPTIMIZE_RESUME: '/api/optimize-resume'
  },
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3
};

export const getApiUrl = (endpoint: keyof typeof API_CONFIG.ENDPOINTS): string => {
  return `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS[endpoint]}`;
};

export const handleApiError = (error: unknown): string => {
  if (error instanceof Error) {
    if (error.message.includes('402')) {
      return "API credits exhausted. Please try again later.";
    } else if (error.message.includes('403')) {
      return "Access denied. Please check your credentials.";
    } else if (error.message.includes('429')) {
      return "Too many requests. Please try again in a few minutes.";
    } else if (error.message.includes('timeout')) {
      return "The request timed out. Please try again.";
    }
    return error.message;
  }
  return "An unexpected error occurred. Please try again.";
}; 