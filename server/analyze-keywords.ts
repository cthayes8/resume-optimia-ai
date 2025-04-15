import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Optional: enable GPT fallback to semantic matching
const ENABLE_SEMANTIC = false;

// Define MatchType type to include 'semantic'
type MatchType = 'direct' | 'synonym' | 'semantic' | 'none';

// Common keyword synonyms map
const keywordSynonyms: Record<string, string[]> = {
  // Technical
  "javascript": ["js", "ecmascript", "node.js", "nodejs"],
  "python": ["py", "python3"],
  "react": ["reactjs", "react.js"],
  "vue": ["vuejs", "vue.js"],
  "angular": ["angularjs", "angular.js"],
  "aws": ["amazon web services", "amazon aws"],
  "azure": ["microsoft azure", "ms azure"],
  "sql": ["mysql", "postgresql", "postgres", "oracle", "tsql", "plsql"],
  "nosql": ["mongodb", "dynamodb", "cassandra"],
  "ci/cd": ["continuous integration", "continuous deployment", "devops"],
  "agile": ["scrum", "kanban", "lean"],
  
  // Education
  "bachelor's degree": ["bachelors", "bachelor of", "b.a.", "b.s.", "ba", "bs", "bachelor", "undergraduate degree"],
  "master's degree": ["masters", "master of", "m.a.", "m.s.", "ma", "ms", "mba", "graduate degree"],
  "phd": ["doctorate", "ph.d.", "doctoral", "doctor of philosophy"],
  
  // Common business terms
  "sales": ["selling", "revenue generation", "business development"],
  "management": ["managing", "leadership", "directing"],
  "marketing": ["digital marketing", "market analysis", "brand management"],
};

// Common technical skills and qualifications for regex fallback
const commonSkillsPatterns = [
  // Programming languages
  /\b(javascript|python|java|c\+\+|c#|ruby|go|rust|swift|kotlin|php|typescript|scala|perl|r|matlab)\b/gi,
  // Frameworks & libraries
  /\b(react|angular|vue|svelte|django|flask|express|spring|rails|laravel|nextjs|flutter|tensorflow|pytorch)\b/gi,
  // Databases
  /\b(sql|mysql|postgresql|mongodb|dynamodb|cassandra|redis|sqlite|firestore|oracle|mariadb)\b/gi,
  // Cloud platforms
  /\b(aws|amazon web services|azure|google cloud|gcp|cloud computing|serverless)\b/gi,
  // Tools & methodologies
  /\b(git|docker|kubernetes|ci\/cd|jenkins|github actions|agile|scrum|kanban|devops|mlops)\b/gi,
  // Soft skills
  /\b(teamwork|leadership|communication|problem.?solving|analytical|critical thinking|project management)\b/gi,
  // Degrees & certifications 
  /\b(bachelor'?s|master'?s|phd|mba|certification|certified|aws certified|pmp|scrum master)\b/gi,
  // Experience levels
  /\b(\d+\+?\s*(?:years|yrs).*?experience)\b/gi,
  // Domain knowledge
  /\b(machine learning|artificial intelligence|data science|web development|mobile development|cloud architecture)\b/gi
];

// Extract keywords using regex patterns (fallback method)
function extractKeywordsWithRegex(jobDescription: string): string[] {
  const text = jobDescription.toLowerCase();
  const allMatches: string[] = [];
  
  // Extract using predefined patterns
  commonSkillsPatterns.forEach(pattern => {
    const matches = text.match(pattern) || [];
    matches.forEach(match => {
      if (match) allMatches.push(match.toLowerCase());
    });
  });
  
  // Look for capitalized words that might be technologies or tools
  const techTerms = jobDescription.match(/\b[A-Z][a-z]*(?:\.[A-Z][a-z]*)*\b/g) || [];
  techTerms.forEach(term => {
    if (term && term.length > 1 && !['I', 'A'].includes(term)) {
      allMatches.push(term.toLowerCase());
    }
  });
  
  // Count occurrences and get top keywords
  const counts: Record<string, number> = {};
  allMatches.forEach(match => {
    counts[match] = (counts[match] || 0) + 1;
  });
  
  // Sort by frequency and get unique values
  const uniqueKeywords = [...new Set(allMatches)]
    .sort((a, b) => (counts[b] || 0) - (counts[a] || 0))
    .slice(0, 15);
  
  return uniqueKeywords;
}

async function extractTopKeywords(jobDescription: string): Promise<{ keyword: string, importance: 'required' | 'preferred', context: string }[]> {
  try {
    const prompt = `Extract 15 key skills, technologies, or qualifications from the job description. 

For each, return:
- keyword
- importance: "required" or "preferred"
- context: short snippet from JD

Return in this JSON format:
{
  "keywords": [
    { "keyword": "salesforce", "importance": "required", "context": "Experience with Salesforce is required" },
    ...
  ]
}

Job Description:
${jobDescription}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are a resume keyword extraction assistant.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' }
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error('OpenAI returned empty content');
    }

    const response = JSON.parse(content);
    return response.keywords || [];
  } catch (error) {
    console.error('OpenAI keyword extraction failed:', error);
    
    // Fallback to regex-based extraction
    const fallbackKeywords = extractKeywordsWithRegex(jobDescription);
    
    // Convert to the expected format
    return fallbackKeywords.map(keyword => ({
      keyword,
      importance: 'required' as const,
      context: `Extracted via fallback method`
    }));
  }
}

// Extract just the keywords without additional metadata
export async function extractSimpleKeywords(jobDescription: string): Promise<string[]> {
  try {
    const prompt = `Extract the top 15 most important skills, technologies, or qualifications from the job description.
Return ONLY a JSON array of strings with the extracted keywords. No other text or explanation.

Job Description:
${jobDescription}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo', // Using a faster, cheaper model
      messages: [
        { role: 'system', content: 'You are a resume keyword extraction assistant.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' }
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error('OpenAI returned empty content');
    }

    const response = JSON.parse(content);
    return response.keywords || extractKeywordsWithRegex(jobDescription);
  } catch (error) {
    console.error('Simple keyword extraction failed:', error);
    return extractKeywordsWithRegex(jobDescription);
  }
}

function checkKeywordMatch(keyword: string, content: string): { found: boolean; matchType: MatchType; confidence: number; explanation: string } {
  const normContent = content.toLowerCase();
  const normKeyword = keyword.toLowerCase();

  if (normContent.includes(normKeyword)) {
    return { found: true, matchType: 'direct', confidence: 1.0, explanation: 'Direct match found in resume.' };
  }

  const synonyms = keywordSynonyms[normKeyword] || [];
  if (synonyms.some(s => normContent.includes(s.toLowerCase()))) {
    return { found: true, matchType: 'synonym', confidence: 0.9, explanation: 'Matched via synonym.' };
  }

  return { found: false, matchType: 'none', confidence: 0.0, explanation: 'No match found.' };
}

async function checkSemanticMatch(keyword: string, resumeContent: string) {
  try {
    const prompt = `Does the resume below satisfy this keyword requirement: "${keyword}"?

Return:
{
  "matched": boolean,
  "confidence": number,
  "explanation": string
}

Resume:
${resumeContent}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are a resume matching engine.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' }
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error('OpenAI returned empty content');
    }

    return JSON.parse(content);
  } catch (error) {
    console.error('Semantic match check failed:', error);
    return { matched: false, confidence: 0.0, explanation: 'Error in semantic matching.' };
  }
}

export async function analyzeKeywords(jobDescription: string, resumeContent: string) {
  try {
    const extracted = await extractTopKeywords(jobDescription);

    const keywordMatches = await Promise.all(
      extracted.map(async ({ keyword, importance, context }) => {
        let match = checkKeywordMatch(keyword, resumeContent);

        if (!match.found && ENABLE_SEMANTIC) {
          const semantic = await checkSemanticMatch(keyword, resumeContent);
          match = {
            found: semantic.matched,
            matchType: semantic.matched ? 'semantic' : 'none',
            confidence: semantic.confidence,
            explanation: semantic.explanation
          };
        }

        return {
          keyword,
          importance,
          context,
          ...match
        };
      })
    );

    const score = Math.round((keywordMatches.filter(k => k.found).length / keywordMatches.length) * 100);

    return {
      keywords: keywordMatches,
      score
    };
  } catch (err) {
    console.error('analyzeKeywords error:', err);
    
    // Check if this is a rate limit error and use fallback if needed
    const isRateLimit = err instanceof Error && 
      (err.message.includes('429') || 
       err.message.includes('exceeded your current quota') ||
       err.message.includes('rate limit'));
    
    if (isRateLimit) {
      console.log('OpenAI rate limit exceeded, using fallback keyword extraction');
      // Reuse fallback method from extractKeywordsWithRegex
      const fallbackKeywords = extractKeywordsWithRegex(jobDescription);
      
      // Check if each keyword is in the resume
      const results = fallbackKeywords.map(keyword => ({
        keyword,
        importance: 'required' as const,
        context: 'Extracted via fallback method',
        found: resumeContent.toLowerCase().includes(keyword.toLowerCase()),
        matchType: 'direct' as MatchType,
        confidence: 1.0,
        explanation: 'Simple text match.'
      }));
      
      // Calculate score
      const score = Math.round((results.filter(k => k.found).length / results.length) * 100);
      
      return {
        keywords: results,
        score
      };
    }
    
    return { keywords: [], score: 0 };
  }
} 