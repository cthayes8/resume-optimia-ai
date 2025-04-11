// KeywordAnalysis.ts

import { keywordSynonyms } from '@/config/keywords';

interface KeywordMatch {
  keyword: string;
  found: boolean;
  importance: 'required' | 'preferred';
  context?: string;
}

const COMMON_WORDS = new Set([
  'and', 'or', 'the', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'a', 'an',
  'this', 'that', 'these', 'those', 'we', 'you', 'they', 'it', 'is', 'are', 'was',
  'will', 'would', 'could', 'should', 'have', 'has', 'had', 'be', 'been', 'being',
  'do', 'does', 'did', 'can', 'may', 'might', 'must', 'shall'
]);

function cleanText(text: string): string {
  return text.toLowerCase()
    .replace(/[^\w\s-/.+#]/g, ' ')  // Keep common chars in tech terms
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(text: string): string[] {
  const cleaned = cleanText(text);
  return cleaned.split(' ').filter(word => {
    // Keep technical terms even if they're short
    if (/[.+#/-]/.test(word)) return true;
    return word.length > 2 && !COMMON_WORDS.has(word);
  });
}

function extractPhrases(text: string, maxLength = 4): string[] {
  const words = tokenize(text);
  const phrases: string[] = [];
  
  // First look for exact matches in keyword synonyms
  for (let len = maxLength; len >= 1; len--) {
    for (let i = 0; i <= words.length - len; i++) {
      const phrase = words.slice(i, i + len).join(' ');
      if (keywordSynonyms[phrase] || 
          Object.entries(keywordSynonyms).some(([key, syns]) => 
            key === phrase || syns.includes(phrase))) {
        phrases.push(phrase);
        i += len - 1;
      }
    }
  }

  // Then look for technical patterns
  const techPatterns = words.filter(word => 
    /[.+#/-]/.test(word) || // Has special chars common in tech
    /^[vV]\d/.test(word) || // Version numbers
    /^[a-z]+\d/.test(word) || // Letters followed by numbers
    /^\d+[a-z]+/.test(word)   // Numbers followed by letters
  );

  return [...new Set([...phrases, ...techPatterns])];
}

export function extractKeywords(text: string): string[] {
  const phrases = extractPhrases(text);
  const tokens = tokenize(text);

  const validTokens = tokens.filter(token => keywordSynonyms[token] ||
    Object.values(keywordSynonyms).some(syns => syns.includes(token)));

  return [...new Set([...phrases, ...validTokens])];
}

export function findKeywordContext(text: string, keyword: string): string | undefined {
  const sentences = text.split(/[.!?]+/);
  const keywordLower = keyword.toLowerCase();
  const synonyms = keywordSynonyms[keywordLower] || [];

  for (const sentence of sentences) {
    const sentenceLower = sentence.toLowerCase();
    if (sentenceLower.includes(keywordLower) || synonyms.some(syn => sentenceLower.includes(syn))) {
      const trimmed = sentence.trim().replace(/\s+/g, ' ');
      if (trimmed.length > 100) {
        const index = sentenceLower.indexOf(keywordLower);
        return trimmed.slice(Math.max(0, index - 50), index + 50) + '...';
      }
      return trimmed;
    }
  }
  return undefined;
}

export function isKeywordPresent(text: string, keyword: string, synonyms: string[] = []): boolean {
  const lowerText = cleanText(text);
  if (lowerText.includes(keyword.toLowerCase())) return true;
  return synonyms.some(syn => lowerText.includes(syn.toLowerCase()));
}

export function analyzeKeywords(jobDescription: string, resumeContent: string): KeywordMatch[] {
  console.log('Starting keyword analysis with:', {
    jobDescriptionLength: jobDescription?.length || 0,
    resumeContentLength: resumeContent?.length || 0
  });

  // Skip analysis if we have the default job description
  if (!jobDescription || jobDescription === 'Default job description') {
    console.log('Skipping keyword analysis - default or empty job description');
    return [];
  }

  const headers = {
    required: [
      'requirements', 'required', 'must have', 'qualifications', 'key qualifications',
      'essential', 'what you need', 'what we need', 'what we require', 'responsibilities',
      'job requirements', 'basic qualifications', 'minimum qualifications', 'required skills',
      'job duties', 'core responsibilities', 'key responsibilities'
    ],
    preferred: [
      'nice to have', 'preferred', 'plus', 'desired', 'bonus', 'additionally', 'ideally',
      'preferred qualifications', 'additional qualifications', 'preferred skills',
      'desirable', 'optional', 'beneficial'
    ]
  };

  // First try to extract keywords from the entire text
  const allKeywords = extractKeywords(jobDescription);
  console.log('Extracted keywords:', allKeywords);

  if (allKeywords.length === 0) {
    console.log('No keywords found in job description');
    return [];
  }
  
  const frequencyMap = new Map<string, number>();
  
  // Count keyword frequency
  allKeywords.forEach(k => {
    const count = (jobDescription.toLowerCase().match(new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    frequencyMap.set(k, count);
  });
  console.log('Keyword frequencies:', Object.fromEntries(frequencyMap));

  // Split into sections
  const sections = { required: [] as string[], preferred: [] as string[] };
  const blocks = jobDescription.split(/[.!?]\s+|\n\s*\n|\n(?=[-•*])/);

  blocks.forEach(block => {
    const lower = block.toLowerCase();
    if (headers.required.some(header => lower.includes(header))) {
      sections.required.push(block);
    } else if (headers.preferred.some(header => lower.includes(header))) {
      sections.preferred.push(block);
    } else if (/[-•*]\s/.test(block)) {
      // Bullet points usually indicate requirements
      sections.required.push(block);
    }
  });

  console.log('Found sections:', {
    required: sections.required.length,
    preferred: sections.preferred.length
  });

  const requiredKeywords = new Set<string>();
  const preferredKeywords = new Set<string>();

  // Classify keywords based on frequency and position
  allKeywords.forEach(k => {
    const count = frequencyMap.get(k) || 0;
    const inRequiredSection = sections.required.some(s => s.toLowerCase().includes(k.toLowerCase()));
    const inPreferredSection = sections.preferred.some(s => s.toLowerCase().includes(k.toLowerCase()));

    if (inRequiredSection || count > 1) {
      requiredKeywords.add(k);
    } else if (inPreferredSection || count === 1) {
      preferredKeywords.add(k);
    }
  });

  // If no sections were found, use frequency-based classification
  if (sections.required.length === 0 && sections.preferred.length === 0) {
    allKeywords.forEach(k => {
      const count = frequencyMap.get(k) || 0;
      if (count > 1) {
        requiredKeywords.add(k);
      } else {
        preferredKeywords.add(k);
      }
    });
  }

  console.log('Classified keywords:', {
    required: Array.from(requiredKeywords),
    preferred: Array.from(preferredKeywords)
  });

  // Remove duplicates
  requiredKeywords.forEach(k => preferredKeywords.delete(k));

  const results: KeywordMatch[] = [];

  // Check required keywords
  for (const keyword of requiredKeywords) {
    const synonyms = keywordSynonyms[keyword] || [];
    const found = isKeywordPresent(resumeContent, keyword, synonyms);
    results.push({
      keyword,
      found,
      importance: 'required',
      context: found ? undefined : findKeywordContext(jobDescription, keyword)
    });
  }

  // Check preferred keywords
  for (const keyword of preferredKeywords) {
    const synonyms = keywordSynonyms[keyword] || [];
    const found = isKeywordPresent(resumeContent, keyword, synonyms);
    results.push({
      keyword,
      found,
      importance: 'preferred',
      context: found ? undefined : findKeywordContext(jobDescription, keyword)
    });
  }

  console.log('Analysis results:', results);
  return results;
}

export function getMissingKeywords(jobDescription: string, resumeContent: string): string[] {
  const analysis = analyzeKeywords(jobDescription, resumeContent);
  const required = analysis.filter(a => !a.found && a.importance === 'required');
  const preferred = analysis.filter(a => !a.found && a.importance === 'preferred');

  const prioritize = (list: KeywordMatch[]) => [
    ...list.filter(k => keywordSynonyms[k.keyword]),
    ...list.filter(k => !keywordSynonyms[k.keyword])
  ].map(k => k.keyword);

  return [
    ...prioritize(required).slice(0, 6),
    ...prioritize(preferred).slice(0, Math.max(0, 8 - required.length))
  ];
}