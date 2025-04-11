import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Note: In production, API calls should be made from the backend
});

export interface ResumeSuggestion {
  id: string;
  originalText: string;
  suggestedText: string;
  position: {
    from: number;
    to: number;
  };
  applied?: boolean;
}

export async function generateResumeSuggestions(resumeText: string): Promise<ResumeSuggestion[]> {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: "You are a professional resume editor. Analyze the resume text and provide specific suggestions to improve clarity, impact, and professionalism. Focus on enhancing action verbs, quantifying achievements, and maintaining consistent formatting."
        },
        {
          role: "user",
          content: `Please analyze this resume section and provide suggestions for improvement: ${resumeText}`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const response = JSON.parse(completion.choices[0].message.content || "{}");
    
    return response.suggestions.map((suggestion: any, index: number) => ({
      id: `suggestion-${index}`,
      originalText: suggestion.original,
      suggestedText: suggestion.improved,
      position: suggestion.position,
      applied: false
    }));
  } catch (error) {
    console.error('Error generating resume suggestions:', error);
    throw error;
  }
} 