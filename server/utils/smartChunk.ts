import { ChatCompletionMessageParam } from 'openai/resources';

/**
 * Smart HTML chunking for resume sections
 * Inspired by Open-Resume's PDF parsing algorithm
 */
function smartChunkHTML(html: string, maxWordsPerChunk = 500): { id: string; html: string }[] {
  // Step 1: Extract potential bullets and paragraphs directly
  // Use a more aggressive approach to find content blocks

  // First, try to find unordered lists (<ul> with <li> elements)
  const listItemRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  let listItems: { id: string; html: string }[] = [];
  let listMatch;
  let id = 0;

  while ((listMatch = listItemRegex.exec(html)) !== null) {
    const content = listMatch[0];
    if (content && content.replace(/<[^>]*>/g, '').trim().length > 0) {
      listItems.push({
        id: `bullet-${id++}`,
        html: content
      });
    }
  }

  // If we found list items, return them directly
  if (listItems.length > 0) {
    console.log(`Found ${listItems.length} list items via <li> tags`);
    return listItems;
  }

  // Try to find paragraphs separated by line breaks or paragraph tags
  const paragraphSeparators = [
    /<p[^>]*>[\s\S]*?<\/p>/gi,              // <p> tags
    /<div[^>]*>[\s\S]*?<\/div>/gi,          // <div> tags
    /(?:<br\s*\/?>\s*){2,}|<\/p>\s*<p[^>]*>/gi,  // Multiple <br> tags or paragraph boundaries
    /\n\s*\n/g                              // Double line breaks
  ];

  // Extract paragraphs using separators
  let allParagraphs: { id: string; html: string }[] = [];
  
  for (const separator of paragraphSeparators) {
    // Get all content chunks based on this separator
    const parts = html.split(separator).filter(part => part.trim().length > 0);
    
    // If we found a reasonable number of chunks, process them
    if (parts.length >= 2) {
      allParagraphs = parts.map((part, index) => ({
        id: `para-${index}`,
        html: part.trim()
      }));
      
      console.log(`Found ${allParagraphs.length} paragraphs via separator`);
      
      // Exit early if we found enough chunks
      if (allParagraphs.length >= 3) {
        return allParagraphs;
      }
    }
  }

  // If we found at least some paragraphs, use them
  if (allParagraphs.length > 0) {
    return allParagraphs;
  }

  // Last resort: just split by newlines or sentences
  const lines = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .split(/\n|\.(?=\s|$)/)
    .filter(line => {
      const textOnly = line.replace(/<[^>]*>/g, '').trim();
      return textOnly.length > 0;
    });

  if (lines.length > 0) {
    console.log(`Last resort: Found ${lines.length} lines by splitting text`);
    return lines.map((line, index) => ({
      id: `line-${index}`,
      html: line.trim()
    }));
  }

  // If nothing else worked, treat the entire content as one chunk
  return [{ id: 'chunk-0', html }];
}

/**
 * Helper function to count words in HTML
 */
function countWords(html: string): number {
  // Remove HTML tags and count words
  const text = html.replace(/<[^>]*>/g, ' ');
  return text.split(/\s+/).filter(word => word.length > 0).length;
}

export { smartChunkHTML };

/**
 * Advanced Resume Section Detector
 * Inspired by Open-Resume's PDF parser algorithm
 */
function detectSectionType(html: string): string {
  // Strip HTML tags to get plain text for analysis
  const plainText = html.replace(/<[^>]*>/g, ' ').toLowerCase().trim();
  
  // Skip very short or empty content
  if (!plainText || plainText.length < 3) return 'IGNORE';
  
  // Only ignore basic separators or single bullets
  if (plainText.match(/^\d{4}$/) || plainText === '–' || plainText === '•' || plainText === '-') return 'IGNORE';
  
  // Define section patterns with scoring system
  const sectionPatterns = [
    // Format: [regex pattern, section type, score]
    { pattern: /\b(summary|profile|objective|about me)\b/i, type: 'SUMMARY', score: 10 },
    { pattern: /\b(experience|employment|work history|professional|career)\b/i, type: 'EXPERIENCE', score: 10 },
    { pattern: /\b(education|degree|academic|university|college|school)\b/i, type: 'EDUCATION', score: 10 },
    { pattern: /\b(skills|expertise|technologies|competencies|proficiencies)\b/i, type: 'SKILLS', score: 10 },
    { pattern: /\b(additional|certifications|certificates|credentials|languages|interests|activities|volunteer)\b/i, type: 'ADDITIONAL', score: 10 },
    { pattern: /\b(projects|portfolio|achievements)\b/i, type: 'PROJECTS', score: 10 },
    { pattern: /\b(awards|honors|recognitions)\b/i, type: 'AWARDS', score: 10 },
    
    // Content-based patterns for section body content (lower scores)
    { pattern: /responsible for|managed|led|developed|created|implemented|designed/i, type: 'EXPERIENCE', score: 5 },
    { pattern: /\b(gpa|graduated|bachelor|master|phd|mba|bs|ba|ms)\b/i, type: 'EDUCATION', score: 5 },
    { pattern: /\bproficient\s+in\b|\bfamiliar\s+with\b|\bknowledge\s+of\b|\bexpertise\s+in\b/i, type: 'SKILLS', score: 5 },
    { pattern: /\b(certified|certificate|certification|completed course)\b/i, type: 'ADDITIONAL', score: 5 },
    { pattern: /\b(developed|built|created|designed|implemented)\s+a\b/i, type: 'PROJECTS', score: 5 },
    { pattern: /\b(award|recipient|recognized|honor|achievement)\b/i, type: 'AWARDS', score: 5 },
    
    // Date patterns strongly suggest experience sections
    { pattern: /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b.+\b(20\d{2}|19\d{2})\b/i, type: 'EXPERIENCE', score: 7 },
    { pattern: /\b(20\d{2}|19\d{2})\b.+\b(present|current|now)\b/i, type: 'EXPERIENCE', score: 7 },
    { pattern: /\b(20\d{2}|19\d{2})\b.+\b(to|–|-)\b.+\b(20\d{2}|19\d{2}|present)\b/i, type: 'EXPERIENCE', score: 7 },
  ];
  
  // Check for formatting clues in the original HTML (higher scores for formatted section headers)
  const isBold = html.includes('<b>') || html.includes('<strong>') || html.includes('font-weight: bold') || html.includes('font-weight:bold');
  const isHeading = html.includes('<h1') || html.includes('<h2') || html.includes('<h3') || html.includes('<h4') || html.includes('<h5') || html.includes('<h6');
  const isAllCaps = plainText === plainText.toUpperCase() && plainText.length > 3;
  
  // Track scores for each section type with proper index signature
  const sectionScores: { [key: string]: number } = {
    'SUMMARY': 0,
    'EXPERIENCE': 0,
    'EDUCATION': 0,
    'SKILLS': 0,
    'ADDITIONAL': 0,
    'PROJECTS': 0,
    'AWARDS': 0,
    'CONTENT': 0,
    'IGNORE': 0
  };
  
  // Header format bonus (more likely to be a section header than content)
  if (plainText.length < 30 && (isBold || isHeading)) {
    if (isAllCaps) {
      // Very likely a section header
      for (const sectionType in sectionScores) {
        if (sectionType !== 'CONTENT' && sectionType !== 'IGNORE') {
          sectionScores[sectionType] += 3;
        }
      }
    }
  }
  
  // Apply pattern matching
  for (const { pattern, type, score } of sectionPatterns) {
    if (pattern.test(plainText)) {
      sectionScores[type] += score;
      
      // Additional bonus for formatted section headers
      if (plainText.length < 30 && (isBold || isHeading || isAllCaps)) {
        sectionScores[type] += 3;
      }
    }
  }
  
  // Special case: Job title/company/date patterns are very strong indicators of experience
  if (/\b(manager|director|engineer|specialist|analyst|coordinator|supervisor|lead|executive|officer|president|vp|vice president)\b/i.test(plainText) &&
      /\b(20\d{2}|19\d{2})\b/i.test(plainText)) {
    sectionScores['EXPERIENCE'] += 8;
  }
  
  // Special case: Degree, university pattern strongly indicates education
  if (/\b(bachelor|master|phd|mba|bs|ba|ms)\b.+\b(university|college|institute|school)\b/i.test(plainText)) {
    sectionScores['EDUCATION'] += 8;
  }

  // List of skills is a strong indicator
  if ((plainText.match(/,/g) || []).length >= 3 && plainText.length < 200) {
    sectionScores['SKILLS'] += 5;
  }
  
  // Default to CONTENT if no strong pattern matches
  sectionScores['CONTENT'] = 2;
  
  // Find the section type with the highest score
  let detectedType = 'CONTENT';
  let highestScore = 0;
  
  for (const [type, score] of Object.entries(sectionScores)) {
    if (score > highestScore) {
      highestScore = score;
      detectedType = type;
    }
  }
  
  return detectedType;
}

function buildSimplifiedPrompt(sectionHtml: string, sectionType: string, jobDescription: string): ChatCompletionMessageParam[] {
  return [
    {
      role: 'system',
      content: `
You are an expert resume optimizer. Create 3-5 high-quality suggestions to improve this ${sectionType} section to better match the job description.
Focus on adding metrics, using stronger action verbs, and including industry keywords from the job description.
Use the following format (JSON):
{"content":{"items":[{"id":"sugg-0","deleteText":"original text","replacementOptions":[{"id":"opt-0-0","addText":"improved text","reasoning":"explanation","category":"category-name"}],"type":"${sectionType}","category":"category-name"}]}}
Keep it simple - 3-5 clear, impactful suggestions. Categories: "action-verbs", "quantify-achievements", "technical-skills", "industry-keywords", "concise-language", "accomplishment-focus"
`.trim(),
    },
    {
      role: 'user',
      content: `
SECTION (${sectionType}):
${sectionHtml.substring(0, 1500)}${sectionHtml.length > 1500 ? '...' : ''}

JOB DESCRIPTION (KEY POINTS):
${jobDescription.substring(0, 300)}...
`.trim(),
    },
  ];
}

  