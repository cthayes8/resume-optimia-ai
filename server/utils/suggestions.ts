// server/utils/suggestions.ts
import { OpenAI } from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources';

// Fixed map of category keys to display names
const RULE_CATEGORIES = {
  'action-verbs': 'Action Verbs',
  'quantify-achievements': 'Quantify Achievements',
  'technical-skills': 'Technical Skills', 
  'industry-keywords': 'Industry Keywords',
  'concise-language': 'Concise Language',
  'accomplishment-focus': 'Focus on Accomplishments'
};

interface GenerateSuggestionsParams {
  sectionHtml: string;
  sectionType: string;
  jobDescription: string;
  openaiClient: OpenAI;
}

interface Suggestion {
  id: string;
  ruleId: string;
  deleteHtml: string;
  insertHtml: string;
  reasoning: string;
  type: string;
  metadata: {
    category: string;
  };
  replacementOptions: {
    id: string;
    addText: string;
    reasoning: string;
    metadata: {
      category: string;
    };
  }[];
}

export async function generateSuggestionsForSection({
  sectionHtml,
  sectionType,
  jobDescription,
  openaiClient,
}: GenerateSuggestionsParams): Promise<Suggestion[]> {
  // Try with normal prompt first
  const result = await tryGenerateSuggestions({
    sectionHtml,
    sectionType, 
    jobDescription,
    openaiClient,
    isRetry: false
  });
  
  // If we get no suggestions and section isn't tiny, retry with simplified prompt
  if (result.length === 0 && sectionHtml.length > 200) {
    console.log(`⚠️ First attempt for ${sectionType} failed, retrying with simplified prompt`);
    return await tryGenerateSuggestions({
      sectionHtml,
      sectionType,
      jobDescription,
      openaiClient,
      isRetry: true
    });
  }
  
  return result;
}

// Helper function to try generating suggestions with error handling
async function tryGenerateSuggestions({
  sectionHtml,
  sectionType,
  jobDescription,
  openaiClient,
  isRetry = false
}: GenerateSuggestionsParams & { isRetry?: boolean }): Promise<Suggestion[]> {
  const prompt = isRetry 
    ? buildSimplifiedPrompt(sectionHtml, sectionType, jobDescription)
    : buildPrompt(sectionHtml, sectionType, jobDescription);
  
  // Calculate appropriate max_tokens based on section length
  // Longer sections need fewer tokens for response to avoid enormous responses
  const sectionLength = sectionHtml.length;
  let maxTokens = isRetry ? 1000 : 1500; // Lower for retry
  
  if (sectionLength > 2000) {
    // For very long sections, restrict token output to prevent huge responses
    maxTokens = isRetry ? 800 : 1000;
  } else if (sectionLength > 1000) {
    // For moderately long sections
    maxTokens = isRetry ? 900 : 1200;
  }
  
  console.log(`📏 Section ${sectionType} length: ${sectionLength} chars, using ${maxTokens} max tokens${isRetry ? ' (retry)' : ''}`);

  try {
    const completion = await openaiClient.chat.completions.create({
      model: 'gpt-4o',
      messages: prompt,
      temperature: isRetry ? 0.2 : 0.3, // Lower temperature for retry
      response_format: { type: 'json_object' },
      max_tokens: maxTokens,
    }, {
      timeout: 30000, // 30 seconds timeout
    });

    const raw = completion.choices[0].message.content || '{}';

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      console.error(`❌ Failed to parse JSON from OpenAI response${isRetry ? ' (retry)' : ''}:`, { error: err });

      // Enhanced recovery from malformed JSON
      try {
        // Try find valid JSON object by matching outermost braces
        const jsonObjectMatch = raw.match(/\{[\s\S]*\}/);
        if (jsonObjectMatch) {
          try {
            parsed = JSON.parse(jsonObjectMatch[0]);
            console.log('✅ Successfully recovered JSON with outer braces match');
          } catch (e) {
            // If still failing, try to manually reconstruct the JSON
            if (raw.includes('"content"') && raw.includes('"items"')) {
              // Create a minimalist valid JSON with just the items array
              const reconstructedJson = `{"content":{"items":[]}}`;
              parsed = JSON.parse(reconstructedJson);
              console.log('✅ Created minimal valid JSON structure');
            }
          }
        }
      } catch (recoveryErr) {
        console.error('❌ Advanced recovery parse failed:', recoveryErr);
        return [];
      }
      
      // If all recovery attempts failed
      if (!parsed) {
        console.error('❌ All JSON recovery attempts failed');
        return [];
      }
    }

    const items = parsed?.content?.items || parsed?.suggestions || [];

    if (!Array.isArray(items)) {
      console.log('⚠️ No items array found in parsed response, returning empty array');
      return [];
    }
    
    console.log(`✅ Successfully parsed ${items.length} suggestion items`);
    
    // Map the suggestions to our expected format
    return items.map((s: any, index: number): Suggestion => {
      // Extract the category from the suggestion data
      // First check if the category is already one of our valid categories
      let categoryKey = '';
      
      if (s.category && typeof s.category === 'string') {
        // If it's already a valid category, use it
        if (Object.keys(RULE_CATEGORIES).includes(s.category)) {
          categoryKey = s.category;
        } else {
          // Try to map from the string
          categoryKey = determineCategory(s.category, s.reasoning || '');
        }
      } else {
        // No category specified, try to determine from context
        categoryKey = determineCategory(s.improvementType || '', s.reasoning || '');
      }
      
      const category = RULE_CATEGORIES[categoryKey as keyof typeof RULE_CATEGORIES] || 'General Improvements';
      
      // Handle the case of multiple categories in format "cat1 | cat2"
      if (s.category && typeof s.category === 'string' && s.category.includes('|')) {
        // Use the first category as primary
        categoryKey = s.category.split('|')[0].trim();
      }
      
      return {
        id: s.id || `sugg-${index}`,
        ruleId: categoryKey || 'general',
        deleteHtml: s.deleteText || s.originalText || '',
        insertHtml: s.replacementOptions?.[0]?.addText || s.improvedText || '',
        reasoning: s.replacementOptions?.[0]?.reasoning || s.reasoning || '',
        type: s.type || sectionType,
        metadata: {
          category: categoryKey || 'general',
        },
        replacementOptions: (s.replacementOptions || []).map((opt: any, i: number) => ({
          id: opt.id || `opt-${index}-${i}`,
          addText: opt.addText,
          reasoning: opt.reasoning,
          metadata: {
            category: categoryKey || 'general',
          },
        })),
      };
    });
  } catch (error: unknown) {
    console.error(`❌ Failed to generate suggestions for ${sectionType}${isRetry ? ' (retry)' : ''}`, error);
    
    // More specific error logging for different error types
    if (error instanceof Error) {
      if (error.name === 'AbortError' || error.message?.includes('timeout')) {
        console.error(`🕒 Request timed out for section ${sectionType}. Consider increasing timeout.`);
      } 
    }
    
    // Check for OpenAI API errors with status codes
    const apiError = error as { status?: number };
    if (apiError.status === 429) {
      console.error(`🛑 Rate limit exceeded for section ${sectionType}. Backing off.`);
    }
    
    return [];
  }
}

// Add a simplified prompt builder for retries
function buildSimplifiedPrompt(sectionHtml: string, sectionType: string, jobDescription: string): ChatCompletionMessageParam[] {
  // Tailor instructions based on section type
  let sectionSpecificInstructions = '';
  
  switch(sectionType) {
    case 'SUMMARY':
      sectionSpecificInstructions = 'Make the summary more concise and impactful.';
      break;
    case 'EXPERIENCE':
      sectionSpecificInstructions = 'Add metrics and use stronger action verbs.';
      break;
    case 'EDUCATION':
      sectionSpecificInstructions = 'Improve formatting consistency and highlight achievements.';
      break;
    case 'SKILLS':
      sectionSpecificInstructions = 'Align skills with job requirements.';
      break;
    case 'ADDITIONAL':
      sectionSpecificInstructions = 'Highlight relevant certifications or qualifications.';
      break;
    case 'PROJECTS':
      sectionSpecificInstructions = 'Emphasize skills and outcomes.';
      break;
    default:
      sectionSpecificInstructions = 'Improve clarity and relevance.';
  }

  return [
    {
      role: 'system',
      content: `
Generate 3-5 resume improvement suggestions for ${sectionType} section.
${sectionSpecificInstructions}
Each suggestion must include: original text, improved text, reason for change, and category.
Use JSON format with basic structure: {"content":{"items":[{"id":"sugg-0","deleteText":"...","replacementOptions":[{"id":"opt-0-0","addText":"...","reasoning":"...","category":"..."}],"type":"${sectionType}"}]}}
Categories: "action-verbs", "quantify-achievements", "technical-skills", "industry-keywords", "concise-language", "accomplishment-focus"
Keep it simple and don't exceed 3-5 high-quality suggestions.
`.trim(),
    },
    {
      role: 'user',
      content: `
SECTION (${sectionType}):
${sectionHtml.substring(0, 1500)}${sectionHtml.length > 1500 ? '...' : ''}

JOB:
${jobDescription.substring(0, 300)}...
`.trim(),
    },
  ];
}

// Helper to determine the appropriate category based on the suggestion content
function determineCategory(improvementType: string, reasoning: string): string {
  const text = (improvementType + ' ' + reasoning).toLowerCase();
  
  if (text.includes('action verb') || text.includes('strong verb') || text.includes('stronger verb')) {
    return 'action-verbs';
  }
  if (text.includes('quant') || text.includes('metric') || text.includes('number') || text.includes('percentage')) {
    return 'quantify-achievements';
  }
  if (text.includes('technical skill') || text.includes('technology') || text.includes('tool')) {
    return 'technical-skills';
  }
  if (text.includes('keyword') || text.includes('industry') || text.includes('terminology')) {
    return 'industry-keywords';
  }
  if (text.includes('concise') || text.includes('clear') || text.includes('brevity')) {
    return 'concise-language';
  }
  if (text.includes('accomplish') || text.includes('achievement') || text.includes('result')) {
    return 'accomplishment-focus';
  }
  
  return 'general';
}

function buildPrompt(sectionHtml: string, sectionType: string, jobDescription: string): ChatCompletionMessageParam[] {
  // Tailor instructions based on section type
  let sectionSpecificInstructions = '';
  
  switch(sectionType) {
    case 'SUMMARY':
      sectionSpecificInstructions = 'Focus on making the summary more concise, impactful, and aligned with the job description.';
      break;
    case 'EXPERIENCE':
      sectionSpecificInstructions = 'Focus on quantifying achievements, using stronger action verbs, and highlighting relevant accomplishments.';
      break;
    case 'EDUCATION':
      sectionSpecificInstructions = 'Focus on formatting consistency, relevant coursework, and academic achievements.';
      break;
    case 'SKILLS':
      sectionSpecificInstructions = 'Focus on relevant technical skills and industry keywords from the job description.';
      break;
    case 'ADDITIONAL':
      sectionSpecificInstructions = 'Focus on certifications, languages, volunteer work, or other relevant qualifications that strengthen the resume.';
      break;
    case 'PROJECTS':
      sectionSpecificInstructions = 'Focus on technical skills demonstrated, project outcomes, and relevant technologies used.';
      break;
    default:
      sectionSpecificInstructions = 'Focus on improving clarity and relevance to the job description.';
  }

  return [
    {
      role: 'system',
      content: `
Resume optimization assistant. Suggest improvements for ${sectionType} section.
${sectionSpecificInstructions}
Do not modify dates, company names, job titles, or personal identifiers.
Categorize each suggestion as one of: "action-verbs", "quantify-achievements", "technical-skills", "industry-keywords", "concise-language", or "accomplishment-focus".
Include specific reasoning for each suggestion.
Respond in JSON:
{
  "content": {
    "items": [
      {
        "id": "sugg-0",
        "deleteText": "original phrase",
        "replacementOptions": [
          {
            "id": "opt-0-0",
            "addText": "improved phrase",
            "reasoning": "explanation why better",
            "category": "one-of-the-categories"
          }
        ],
        "type": "${sectionType}",
        "category": "one-of-the-categories"
      }
    ]
  }
}
`.trim(),
    },
    {
      role: 'user',
      content: `
Job Description: ${jobDescription.substring(0, 500)}...

Resume Section (${sectionType}):
${sectionHtml}
`.trim(),
    },
  ];
}
