import { Handler } from '@netlify/functions';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Lightweight synonym map
const keywordSynonyms: Record<string, string[]> = {
  javascript: ['js', 'ecmascript', 'node.js', 'nodejs'],
  python: ['py', 'python3'],
  react: ['reactjs', 'react.js'],
  sql: ['mysql', 'postgres', 'oracle'],
  aws: ['amazon web services'],
  agile: ['scrum', 'kanban'],
};

function checkSynonymMatch(keyword: string, content: string): boolean {
  const norm = content.toLowerCase();
  if (norm.includes(keyword.toLowerCase())) return true;
  const synonyms = keywordSynonyms[keyword.toLowerCase()] || [];
  return synonyms.some(s => norm.includes(s));
}

async function checkSemanticMatch(keyword: string, resumeContent: string) {
  const prompt = `Does the resume below satisfy this requirement: "${keyword}"?
Return JSON: { matched: boolean, confidence: number, explanation: string }

Resume:
${resumeContent}`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: 'You analyze resumes for job relevance.' },
      { role: 'user', content: prompt }
    ],
    response_format: 'json'
  });

  return JSON.parse(completion.choices[0].message.content || '{}');
}

async function extractTopKeywords(jobDescription: string): Promise<string[]> {
  const prompt = `Extract the 10 most important skills, tools, or qualifications from the job description. Return JSON: ["keyword1", "keyword2", ...]

JD:
${jobDescription}`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: 'You extract key hiring criteria from job descriptions.' },
      { role: 'user', content: prompt }
    ],
    response_format: 'json'
  });

  return JSON.parse(completion.choices[0].message.content || '[]');
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const { jobDescription, resumeContent } = JSON.parse(event.body || '{}');
    if (!jobDescription || !resumeContent) return { statusCode: 400, body: 'Missing input' };

    const keywords = await extractTopKeywords(jobDescription);
    const results = await Promise.all(
      keywords.map(async keyword => {
        let matchType = 'none';
        let found = false;
        let confidence = 0;
        let explanation = '';

        if (resumeContent.toLowerCase().includes(keyword.toLowerCase())) {
          matchType = 'direct';
          found = true;
          confidence = 1;
          explanation = 'Direct keyword match found.';
        } else if (checkSynonymMatch(keyword, resumeContent)) {
          matchType = 'synonym';
          found = true;
          confidence = 0.9;
          explanation = 'Synonym match found.';
        } else {
          const semantic = await checkSemanticMatch(keyword, resumeContent);
          found = semantic.matched;
          confidence = semantic.confidence;
          explanation = semantic.explanation;
          if (found) matchType = 'semantic';
        }

        return { keyword, found, matchType, confidence, explanation };
      })
    );

    const score = Math.round((results.filter(r => r.found).length / results.length) * 100);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keywords: results, score })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: (err as Error).message })
    };
  }
}; 