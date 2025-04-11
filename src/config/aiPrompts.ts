import { AiSuggestionRule } from '@tiptap-pro/extension-ai-suggestion';

// Configuration for the AI suggestion system
export const aiConfig = {
  baseUrl: 'https://api.tiptap.dev/v1/ai',
  loadOnStart: true,
  reloadOnUpdate: true,
  debounceTimeout: 500,
  minContentLength: 15,
  maxSuggestionsPerRule: 5,
};

// Create rules that will be used by the TipTap Pro AI suggestion extension
export const createResumeAIRules = (jobDescription: string): AiSuggestionRule[] => {
  return [
    {
      id: 'resume-enhancement',
      title: 'Resume Enhancement',
      prompt: `Enhance this resume section to better match this job description: ${jobDescription || 'Not provided'}. Make it more impactful, professional, and relevant to the job. Focus on creating complete sentences and paragraphs.`,
      color: '#0284c7',
      backgroundColor: '#e0f2fe',
    },
    {
      id: 'job-match',
      title: 'Job Match',
      prompt: `Suggest edits that would better align this content with these job requirements: ${jobDescription || 'Not provided'}. Add relevant industry keywords and emphasize transferable skills. Ensure suggestions are complete sentences.`,
      color: '#059669',
      backgroundColor: '#d1fae5',
    },
    {
      id: 'grammar-spelling',
      title: 'Grammar & Spelling',
      prompt: 'Identify and correct any grammar or spelling mistakes. Make the language more professional and concise while maintaining meaning.',
      color: '#DC143C',
      backgroundColor: '#FFE6E6',
    },
  ];
};