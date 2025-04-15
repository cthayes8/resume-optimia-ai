/**
 * Smart HTML chunking for resume sections
 * Inspired by Open-Resume's PDF parsing algorithm
 */
function smartChunkHTML(html: string, maxWordsPerChunk = 300): { id: string; html: string }[] {
  // Step 1: Extract potential section headers by looking for formatting patterns
  // This regex looks for common section header patterns in HTML
  const sectionHeaderPattern = /<(?:h[1-6]|strong|b|div\s+class="[^"]*heading[^"]*"|span\s+class="[^"]*heading[^"]*")(?:\s+[^>]*)?>\s*(.*?)\s*<\/(?:h[1-6]|strong|b|div|span)>/gi;
  
  // Common resume section titles to detect
  const sectionTitles = [
    "SUMMARY", "PROFILE", "OBJECTIVE", 
    "EXPERIENCE", "EMPLOYMENT", "WORK HISTORY", "PROFESSIONAL EXPERIENCE",
    "EDUCATION", "ACADEMIC BACKGROUND", "QUALIFICATIONS",
    "SKILLS", "TECHNICAL SKILLS", "COMPETENCIES", "EXPERTISE",
    "PROJECTS", "PORTFOLIO", "ACHIEVEMENTS",
    "CERTIFICATIONS", "LICENSES", "CREDENTIALS",
    "ADDITIONAL", "ACTIVITIES", "INTERESTS", "LANGUAGES", "VOLUNTEER",
    "AWARDS", "HONORS", "PUBLICATIONS", "REFERENCES"
  ];
  
  // Find potential section headers
  let match;
  
  // First pass - identify potential section headers based on HTML formatting
  const headerMatches: {index: number, title: string, match: string}[] = [];
  while ((match = sectionHeaderPattern.exec(html)) !== null) {
    const fullMatch = match[0];
    let title = match[1].replace(/<[^>]*>/g, '').trim();
    
    // Remove any HTML tags that might be inside the title
    title = title.replace(/<[^>]*>/g, '');
    
    // Ignore empty or very short titles
    if (title.length < 2) continue;
    
    // Convert to uppercase for comparison
    const uppercaseTitle = title.toUpperCase();
    
    // Score the potential header based on various factors
    let score = 0;
    
    // 1. Is it fully uppercase?
    if (title === uppercaseTitle) score += 5;
    
    // 2. Contains a known section title?
    if (sectionTitles.some(sectionTitle => 
      uppercaseTitle.includes(sectionTitle) || 
      sectionTitle.includes(uppercaseTitle))) {
      score += 10;
    }
    
    // 3. Is it bold or in a heading tag?
    if (fullMatch.match(/<(h[1-6]|strong|b)/i)) score += 3;
    
    // 4. Is it short (typical for section titles)?
    if (title.length < 15) score += 2;
    
    // Only consider as section header if score is high enough
    if (score >= 5) {
      headerMatches.push({
        index: match.index,
        title: title,
        match: fullMatch
      });
    }
  }
  
  // Sort by position in document
  headerMatches.sort((a, b) => a.index - b.index);
  
  // Extract the content between headers
  const sections: { title: string, content: string, originalIndex: number }[] = [];
  for (let i = 0; i < headerMatches.length; i++) {
    const currentHeader = headerMatches[i];
    const nextHeader = headerMatches[i + 1];
    
    let sectionContent;
    if (nextHeader) {
      sectionContent = html.substring(
        currentHeader.index, 
        nextHeader.index
      );
    } else {
      sectionContent = html.substring(currentHeader.index);
    }
    
    sections.push({
      title: currentHeader.title,
      content: sectionContent,
      originalIndex: currentHeader.index
    });
  }
  
  // Handle the case where there's content before the first section header
  if (headerMatches.length > 0 && headerMatches[0].index > 0) {
    const initialContent = html.substring(0, headerMatches[0].index);
    // Only add if it contains meaningful content
    if (initialContent.replace(/<[^>]*>/g, '').trim().length > 10) {
      sections.unshift({
        title: "PROFILE",
        content: initialContent,
        originalIndex: 0
      });
    }
  }
  
  // If no sections were detected, treat the entire document as one chunk
  if (sections.length === 0) {
    return [{ id: 'chunk-0', html }];
  }
  
  // Sort sections by their original position in the document
  sections.sort((a, b) => a.originalIndex - b.originalIndex);
  
  // Now create chunks, respecting section boundaries
  const chunks: { id: string; html: string }[] = [];
  let chunkIndex = 0;
  
  for (const section of sections) {
    // Skip empty sections
    if (!section.content.trim()) continue;
    
    // For smaller sections, keep them as a single chunk
    if (countWords(section.content) <= maxWordsPerChunk) {
      chunks.push({ id: `chunk-${chunkIndex++}`, html: section.content });
      continue;
    }
    
    // For larger sections, split intelligently
    const paragraphs = section.content.split(/<\/p>|<\/li>|<\/div>/).map(p => {
      // Re-add the closing tag if it was removed in the split
      if (!p.endsWith('</p>') && !p.endsWith('</li>') && !p.endsWith('</div>')) {
        if (p.includes('<p')) return p + '</p>';
        if (p.includes('<li')) return p + '</li>';
        if (p.includes('<div')) return p + '</div>';
      }
      return p;
    }).filter(p => p.trim().length > 0);
    
    let currentChunk = '';
    let wordCount = 0;
    
    for (const para of paragraphs) {
      const paraWords = countWords(para);
      
      if (wordCount + paraWords > maxWordsPerChunk && currentChunk.length > 0) {
        // Current paragraph would exceed the limit, finish current chunk
        chunks.push({ id: `chunk-${chunkIndex++}`, html: currentChunk });
        currentChunk = para;
        wordCount = paraWords;
      } else {
        // Add paragraph to current chunk
        currentChunk += para;
        wordCount += paraWords;
      }
    }
    
    // Add the last chunk if it has content
    if (currentChunk.length > 0) {
      chunks.push({ id: `chunk-${chunkIndex++}`, html: currentChunk });
    }
  }
  
  return chunks;
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
  
  // Track scores for each section type
  const sectionScores = {
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

  