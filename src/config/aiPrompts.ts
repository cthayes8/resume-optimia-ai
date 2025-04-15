import { AiSuggestionRule } from '@tiptap-pro/extension-ai-suggestion';

// Configuration for the AI suggestion system
export const aiConfig = {
  baseUrl: '/api',
  loadOnStart: true,
  reloadOnUpdate: false,
  debounceTimeout: 2000,
  minContentLength: 100,
  maxSuggestionsPerRule: 3,
  batchSize: 1000,
};

// Create rules that will be used by the TipTap Pro AI suggestion extension
export const createResumeAIRules = (jobDescription: string): AiSuggestionRule[] => {
  return [
    {
      id: 'resume-enhancement',
      title: 'Resume Enhancement',
      prompt: `Analyze this resume section and suggest improvements to better match this job description: ${jobDescription || 'Not provided'}. 
Focus on:
1. Adding specific metrics and quantifiable achievements
2. Using strong action verbs
3. Highlighting relevant skills and experience
4. Maintaining professional tone and clarity`,
      color: '#0284c7',
      backgroundColor: '#e0f2fe',
    },
    {
      id: 'job-match',
      title: 'Job Match',
      prompt: `Review this content and suggest edits to better align with these job requirements: ${jobDescription || 'Not provided'}.
For each suggestion:
1. Add relevant industry keywords and emphasize transferable skills
2. Ensure suggestions are complete sentences
3. Explain specifically HOW the change improves job fit (e.g. "This addresses the required cloud computing experience" or "This demonstrates project management skills listed in the job")
4. Reference specific requirements from the job description in the reasoning`,
      color: '#059669',
      backgroundColor: '#d1fae5',
    },
    {
      id: 'grammar-spelling',
      title: 'Grammar & Spelling',
      prompt: `Identify and correct any grammar or spelling mistakes. For each suggestion:
1. Make the language more professional and concise while maintaining meaning
2. Explain the specific grammar or clarity issue being fixed (e.g. "Fixes passive voice" or "Improves sentence structure by...")
3. Demonstrate how the change enhances readability or professionalism`,
      color: '#DC143C',
      backgroundColor: '#FFE6E6',
    },
  ];
};