// analyzeKeywords.ts — backend API logic

import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Optional: enable GPT fallback to semantic matching
const ENABLE_SEMANTIC = false;

const keywordSynonyms: Record<string, string[]> = {
  javascript: ['js', 'ecmascript', 'node.js', 'nodejs'],
  python: ['py', 'python3'],
  react: ['reactjs', 'react.js'],
  vue: ['vuejs', 'vue.js'],
  angular: ['angularjs', 'angular.js'],
  aws: ['amazon web services'],
  azure: ['microsoft azure'],
  sql: ['mysql', 'postgres', 'oracle'],
  nosql: ['mongodb', 'dynamodb'],
  ci: ['continuous integration'],
  cd: ['continuous deployment'],
  agile: ['scrum', 'kanban'],
  "bachelor's degree": ['bachelor', 'b.a.', 'b.s.', 'undergrad'],
  "master's degree": ['m.a.', 'm.s.', 'mba'],
  phd: ['ph.d.', 'doctorate']
};

async function extractTopKeywords(jobDescription: string): Promise<{ keyword: string, importance: 'required' | 'preferred', context: string }[]> {
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
    response_format: 'json_object'
  });

  const response = JSON.parse(completion.choices[0].message.content);
  return response.keywords || [];
}

function checkKeywordMatch(keyword: string, content: string): { found: boolean; matchType: 'direct' | 'synonym' | 'none'; confidence: number; explanation: string } {
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
    response_format: 'json_object'
  });

  return JSON.parse(completion.choices[0].message.content);
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
    return { keywords: [], score: 0 };
  }
}
