import { Handler } from '@netlify/functions';
import OpenAI from 'openai';
import { KeywordMatch } from '../../src/types/keywords';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Common keyword synonyms map
const keywordSynonyms: Record<string, string[]> = {
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
  // Add more synonyms as needed
};

async function extractTopKeywords(jobDescription: string): Promise<string[]> {
  const prompt = `Extract exactly 15 of the most important skills, technologies, or qualifications from this job description. Return them as a JSON array of strings.

Job Description:
${jobDescription}

Format the response like:
["keyword1", "keyword2", "keyword3", ...]`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: [
      {
        role: "system",
        content: "You are a helpful assistant that extracts key requirements from job descriptions."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    response_format: { type: "json_object" }
  });

  const response = JSON.parse(completion.choices[0].message.content);
  return response.keywords;
}

async function checkSemanticMatch(keyword: string, resumeContent: string): Promise<{ matched: boolean; confidence: number; explanation: string }> {
  const prompt = `Compare this keyword requirement "${keyword}" with the following resume content. 
  Determine if the resume demonstrates this skill or requirement, even if not explicitly stated.
  Consider semantic matches and related experience.

  Resume Content:
  ${resumeContent}

  Return JSON in format:
  {
    "matched": boolean,
    "confidence": number (0-1),
    "explanation": "brief explanation of why this matches or doesn't match"
  }`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: [
      {
        role: "system",
        content: "You are a helpful assistant that analyzes resume content for skill matches."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    response_format: { type: "json_object" }
  });

  return JSON.parse(completion.choices[0].message.content);
}

function checkSynonymMatch(keyword: string, resumeContent: string): boolean {
  const normalizedKeyword = keyword.toLowerCase();
  const normalizedContent = resumeContent.toLowerCase();
  
  // Check direct match first
  if (normalizedContent.includes(normalizedKeyword)) {
    return true;
  }

  // Check synonyms
  const synonyms = keywordSynonyms[normalizedKeyword] || [];
  return synonyms.some(synonym => normalizedContent.includes(synonym.toLowerCase()));
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: 'Method Not Allowed'
    };
  }

  try {
    const { jobDescription, resumeContent } = JSON.parse(event.body || '{}');
    const keywords = await extractTopKeywords(jobDescription);
    const results: KeywordMatch[] = [];

    for (const keyword of keywords) {
      let matchType: KeywordMatch['matchType'] = 'none';
      let found = false;
      let confidence = 0;
      let explanation = '';

      // 1. Direct match
      if (resumeContent.toLowerCase().includes(keyword.toLowerCase())) {
        matchType = 'direct';
        found = true;
        confidence = 1.0;
        explanation = 'Direct keyword match found in resume.';
      }

      // 2. Synonym match
      if (!found && checkSynonymMatch(keyword, resumeContent)) {
        matchType = 'synonym';
        found = true;
        confidence = 0.9;
        explanation = 'Match found via synonym mapping.';
      }

      // 3. Semantic match
      if (!found) {
        const semantic = await checkSemanticMatch(keyword, resumeContent);
        if (semantic.matched) {
          matchType = 'semantic';
          found = true;
          confidence = semantic.confidence;
          explanation = semantic.explanation;
        } else {
          explanation = semantic.explanation;
        }
      }

      results.push({
        keyword,
        found,
        matchType,
        confidence,
        explanation
      });
    }

    // Calculate overall score
    const score = (results.filter(r => r.found).length / results.length) * 100;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        keywords: results,
        score
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: error.message })
    };
  }
}; 