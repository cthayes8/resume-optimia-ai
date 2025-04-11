// backend/scoreResume.ts

import { analyzeKeywords } from './analyze-keywords.js';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface KeywordResult {
  found: boolean;
  keyword: string;
  matchType?: 'direct' | 'synonym' | 'semantic';
  confidence?: number;
}

interface CategoryScore {
  name: string;
  max: number;
  score: number;
}

interface KeywordAnalysisResult {
  keywords: KeywordResult[];
  score: number;
}

export async function scoreResumeSections(
  jobDescription: string, 
  resumeContent: string,
  keywordAnalysis?: KeywordAnalysisResult
) {
  try {
    // If keyword analysis is not provided, get it
    const keywordResults = keywordAnalysis || await analyzeKeywords(jobDescription, resumeContent);
    const { keywords } = keywordResults;

    const sections: CategoryScore[] = [
      {
        name: 'Keyword Match',
        max: 20,
        score: Math.round((keywords.filter((k: KeywordResult) => k.found).length / keywords.length) * 20),
      }
    ];

    try {
      // Try to get AI-based scoring for detailed metrics
      const aiSections = await getAIBasedScoring(jobDescription, resumeContent, keywords);
      sections.push(...aiSections);
    } catch (aiError) {
      console.error('Error getting AI-based scoring:', aiError);
      
      // Check if this is a rate limit error
      const isRateLimit = aiError instanceof Error && 
        (aiError.message.includes('429') || 
        aiError.message.includes('exceeded your current quota') ||
        aiError.message.includes('rate limit'));
        
      if (isRateLimit) {
        console.log('OpenAI rate limit exceeded, using fallback scoring method');
        // Add fallback rule-based scoring
        const fallbackSections = getFallbackScoring(jobDescription, resumeContent);
        sections.push(...fallbackSections);
      } else {
        // For other errors, add basic scoring
        sections.push(
          {
            name: 'Resume Structure',
            max: 10,
            score: scoreStructure(resumeContent),
          },
          {
            name: 'Format Compatibility',
            max: 5,
            score: scoreATSCompatibility(resumeContent),
          }
        );
      }
    }

    const total = sections.reduce((sum, s) => sum + s.score, 0);
    const totalMax = sections.reduce((sum, s) => sum + s.max, 0);

    return {
      totalScore: Math.round((total / totalMax) * 100),
      categoryScores: sections
    };
  } catch (mainError) {
    console.error('Error in scoreResumeSections:', mainError);
    // Return basic scoring if everything fails
    return getEmergencyFallbackScoring(jobDescription, resumeContent);
  }
}

// AI-based scoring function
async function getAIBasedScoring(jobDescription: string, resumeContent: string, keywords: KeywordResult[]): Promise<CategoryScore[]> {
  return [
    {
      name: 'Role Alignment',
      max: 15,
      score: await scoreRoleAlignment(jobDescription, resumeContent),
    },
    {
      name: 'Skills Match',
      max: 15,
      score: await scoreSkills(keywords),
    },
    {
      name: 'Achievements',
      max: 10,
      score: scoreAchievements(resumeContent),
    },
    {
      name: 'Experience Level',
      max: 10,
      score: scoreExperienceLevel(jobDescription, resumeContent),
    },
    {
      name: 'Resume Structure',
      max: 10,
      score: scoreStructure(resumeContent),
    },
    {
      name: 'Customization',
      max: 10,
      score: scoreCustomization(jobDescription, resumeContent),
    },
    {
      name: 'Format Compatibility',
      max: 5,
      score: scoreATSCompatibility(resumeContent),
    },
    {
      name: 'Grammar & Spelling',
      max: 3,
      score: scoreGrammar(resumeContent),
    },
    {
      name: 'Visual Appeal',
      max: 2,
      score: scoreVisuals(resumeContent),
    },
  ];
}

// Fallback rule-based scoring when OpenAI is rate limited
function getFallbackScoring(jobDescription: string, resumeContent: string): CategoryScore[] {
  console.log('Using fallback scoring methods');
  
  // This function applies straightforward rule-based scoring without AI
  return [
    {
      name: 'Role Alignment',
      max: 15,
      score: scoreFallbackRoleAlignment(jobDescription, resumeContent),
    },
    {
      name: 'Skills Match',
      max: 15,
      score: scoreFallbackSkillsMatch(jobDescription, resumeContent),
    },
    {
      name: 'Achievements',
      max: 10,
      score: scoreAchievements(resumeContent),
    },
    {
      name: 'Experience Level',
      max: 10,
      score: scoreExperienceLevel(jobDescription, resumeContent),
    },
    {
      name: 'Resume Structure',
      max: 10,
      score: scoreStructure(resumeContent),
    },
    {
      name: 'Customization',
      max: 10,
      score: scoreCustomization(jobDescription, resumeContent),
    },
    {
      name: 'Format Compatibility',
      max: 5,
      score: scoreATSCompatibility(resumeContent),
    },
    {
      name: 'Grammar & Spelling',
      max: 3,
      score: scoreGrammar(resumeContent),
    },
    {
      name: 'Visual Appeal',
      max: 2,
      score: scoreVisuals(resumeContent),
    },
  ];
}

// Complete fallback scoring when everything else fails
function getEmergencyFallbackScoring(jobDescription: string, resumeContent: string) {
  console.log('Using emergency fallback scoring');
  
  // Extract basic sections from resume
  const sections = [
    {
      name: 'Keyword Match',
      max: 20,
      score: 10, // Middle score
    },
    {
      name: 'Role Alignment',
      max: 15,
      score: 8,
    },
    {
      name: 'Skills Match',
      max: 15,
      score: 8,
    },
    {
      name: 'Achievements',
      max: 10,
      score: 5,
    },
    {
      name: 'Experience Level',
      max: 10,
      score: 5, 
    },
    {
      name: 'Resume Structure',
      max: 10,
      score: scoreStructure(resumeContent),
    },
    {
      name: 'Customization',
      max: 10,
      score: 5,
    },
    {
      name: 'Format Compatibility',
      max: 5,
      score: scoreATSCompatibility(resumeContent),
    },
    {
      name: 'Grammar & Spelling',
      max: 3,
      score: 2,
    },
    {
      name: 'Visual Appeal',
      max: 2,
      score: 1,
    },
  ];

  const total = sections.reduce((sum, s) => sum + s.score, 0);
  const totalMax = sections.reduce((sum, s) => sum + s.max, 0);

  return {
    totalScore: Math.round((total / totalMax) * 100),
    categoryScores: sections
  };
}

// Fallback functions that don't use OpenAI
function scoreFallbackRoleAlignment(jd: string, resume: string): number {
  const jdLower = jd.toLowerCase();
  const resumeLower = resume.toLowerCase();
  
  // Extract common job roles/titles
  const commonTitles = [
    'manager', 'director', 'developer', 'engineer', 'analyst', 'coordinator',
    'specialist', 'assistant', 'associate', 'administrator', 'lead', 'senior',
    'junior', 'consultant', 'executive', 'supervisor', 'head', 'chief'
  ];
  
  // Check how many titles are present in both documents
  let matchCount = 0;
  for (const title of commonTitles) {
    if (jdLower.includes(title) && resumeLower.includes(title)) {
      matchCount++;
    }
  }
  
  // Convert to a score out of 15
  const maxMatches = Math.min(5, commonTitles.length);
  return Math.min(15, Math.round((matchCount / maxMatches) * 15));
}

function scoreFallbackSkillsMatch(jd: string, resume: string): number {
  const jdLower = jd.toLowerCase();
  const resumeLower = resume.toLowerCase();
  
  // Common technical skills
  const technicalSkills = [
    'python', 'javascript', 'java', 'c++', 'sql', 'html', 'css', 'react',
    'node', 'angular', 'vue', 'aws', 'azure', 'gcp', 'cloud', 'database',
    'api', 'agile', 'scrum', 'devops', 'ci/cd', 'git', 'automation'
  ];
  
  // Common soft skills
  const softSkills = [
    'communication', 'leadership', 'teamwork', 'problem-solving', 'analytical',
    'detail-oriented', 'organized', 'time management', 'interpersonal', 'collaboration',
    'adaptability', 'creativity', 'critical thinking', 'decision-making'
  ];
  
  // Check matches
  let technicalMatchCount = 0;
  let softMatchCount = 0;
  
  for (const skill of technicalSkills) {
    if (jdLower.includes(skill) && resumeLower.includes(skill)) {
      technicalMatchCount++;
    }
  }
  
  for (const skill of softSkills) {
    if (jdLower.includes(skill) && resumeLower.includes(skill)) {
      softMatchCount++;
    }
  }
  
  // Weight technical skills more heavily
  const weightedScore = (technicalMatchCount * 0.7) + (softMatchCount * 0.3);
  const maxScore = Math.min(8, technicalSkills.length * 0.7 + softSkills.length * 0.3);
  
  return Math.min(15, Math.round((weightedScore / maxScore) * 15));
}

async function scoreRoleAlignment(jd: string, resume: string): Promise<number> {
  const prompt = `Given the following job description and resume, score how well the role titles and career progression align on a scale of 0 to 15.

Return just the score.

Job Description:
${jd}

Resume:
${resume}`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      { role: 'system', content: 'You are an ATS evaluation engine.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0
  });

  const content = completion.choices[0]?.message?.content;
  return content ? Number(content.trim()) : 0;
}

async function scoreSkills(keywords: KeywordResult[]): Promise<number> {
  let score = 0;
  for (const k of keywords) {
    if (!k.found) continue;
    switch (k.matchType) {
      case 'direct': score += 1; break;
      case 'synonym': score += 0.8; break;
      case 'semantic': score += k.confidence || 0.6; break;
      default: score += 0.5; // default score if no match type
    }
  }
  return Math.min(15, Math.round((score / keywords.length) * 15));
}

function scoreAchievements(resume: string): number {
  const indicators = ['%', 'revenue', 'growth', 'increase', 'saved', 'launched', 'reduced', 'results'];
  const matches = indicators.filter(i => resume.toLowerCase().includes(i)).length;
  return Math.min(10, Math.round((matches / indicators.length) * 10));
}

function scoreExperienceLevel(jd: string, resume: string): number {
  const regex = /(\d+)\+?\s+(?:years|yrs)/i;
  const resumeExp = resume.match(regex);
  const jobExp = jd.match(regex);
  const r = resumeExp ? parseInt(resumeExp[1]) : 0;
  const j = jobExp ? parseInt(jobExp[1]) : 0;
  if (!r || !j) return 5;
  if (r >= j) return 10;
  if (r >= j * 0.8) return 8;
  if (r >= j * 0.6) return 6;
  return 4;
}

function scoreStructure(resume: string): number {
  const headers = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications'];
  const r = resume.toLowerCase();
  const matches = headers.filter(h => r.includes(h)).length;
  return Math.min(10, Math.round((matches / headers.length) * 10));
}

function scoreCustomization(jd: string, resume: string): number {
  const jWords: string[] = jd.toLowerCase().match(/\w+/g) || [];
  const rWords: string[] = resume.toLowerCase().match(/\w+/g) || [];
  const common = jWords.filter(w => rWords.includes(w.toLowerCase()));
  return Math.min(10, Math.round((common.length / jWords.length) * 10));
}

function scoreATSCompatibility(resume: string): number {
  const issues = [
    resume.includes('|'),
    resume.includes('•'),
    /\[.*?\]/.test(resume),
    /<.*?>/.test(resume),
    /\t/.test(resume),
    /[^\x00-\x7F]/g.test(resume)
  ];
  const issueCount = issues.filter(Boolean).length;
  return Math.max(0, 5 - issueCount);
}

function scoreGrammar(resume: string): number {
  const patterns = [/\s\s+/, /[^.!?]\s+[A-Z]/, /\s+[,.!?]/, /\bi\b/];
  const issues = patterns.filter(p => p.test(resume)).length;
  return Math.max(0, 3 - issues);
}

function scoreVisuals(resume: string): number {
  return resume.includes('\n\n') ? 2 : 1;
}