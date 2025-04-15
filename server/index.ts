import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import { analyzeKeywords } from './analyze-keywords.js';
import { scoreResumeSections } from './key-metrics-api.js';
import { parseResume } from './resume-parser.js';
import { validateATS } from './ats-validator.js';
import { extractKeySkills } from './utils/skills.js';
import { generateSuggestionsForSection } from './utils/suggestions.js';
import { smartChunkHTML } from './utils/smartChunk.js';

const app = express();
const port = 3001;

const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.use(cors({ origin: '*', methods: ['GET', 'POST'], allowedHeaders: ['Content-Type'] }));
app.use(express.json());

// Analyze keywords
app.post('/api/analyze-keywords', async (req, res) => {
  const { jobDescription, resumeContent } = req.body;
  if (!jobDescription || !resumeContent) return res.status(400).json({ error: 'Missing required fields' });

  try {
    const analysis = await analyzeKeywords(jobDescription, resumeContent);
    res.json(analysis);
  } catch (error) {
    console.error('Keyword analysis failed:', error);
    res.status(500).json({ error: 'Keyword analysis failed' });
  }
});

// Score resume
app.post('/api/score-resume', async (req, res) => {
  const { jobDescription, resumeContent } = req.body;
  if (!jobDescription || !resumeContent) return res.status(400).json({ error: 'Missing required fields' });

  try {
    const customScore = await scoreResumeSections(jobDescription, resumeContent);
    const parsedResume = await parseResume(resumeContent);
    const atsResult = await validateATS(parsedResume);
    const atsScore = Math.max(0, 100 - (atsResult.issues?.length || 0) * 10);

    res.json({
      ...customScore,
      ats: { score: atsScore, issues: atsResult.issues || [] },
    });
  } catch (error) {
    console.error('Scoring failed:', error);
    res.status(500).json({ error: 'Resume scoring failed' });
  }
});

// Suggestions
app.post('/api/suggestions', async (req, res) => {
  const { resumeHtml, jobDescription } = req.body;
  if (!resumeHtml || !jobDescription) return res.status(400).json({ error: 'Missing data' });

  // Set a timeout for the entire request processing
  const requestTimeout = 35000; // 35 seconds max for total processing
  let timeoutTriggered = false; // Add flag to track if timeout was triggered
  const requestTimer = setTimeout(() => {
    console.error('⏱️ Total request processing timeout reached, sending partial results');
    timeoutTriggered = true; // Set the flag
    if (results && results.length > 0) {
      sendResponse();
    }
  }, requestTimeout);

  let results = [];
  const sendResponse = () => {
    clearTimeout(requestTimer);
    
    // Only send response if headers haven't been sent already
    if (!res.headersSent) {
      const items = results.flatMap((r, i) =>
        r.suggestions.map((s, j) => ({
          id: `sugg-${i}-${j}`,
          deleteText: s.deleteHtml,
          replacementOptions: [{
            id: `opt-${i}-${j}`,
            addText: s.insertHtml,
            reasoning: s.reasoning,
            category: s.ruleId
          }],
          type: s.type,
          category: s.ruleId,
        }))
      );

      console.log(`🎯 Total suggestions generated: ${items.length}`);
      
      res.json({
        format: 'replacements',
        content: {
          htmlChunks: results.map(({ id, html }) => ({ id, html, generateSuggestions: false })),
          items,
        },
      });
    }
  };

  try {
    const chunks = smartChunkHTML(resumeHtml);
    console.log(`📊 Processing ${chunks.length} chunks of resume content`);
    
    // Filter out chunks that should be ignored
    const processableChunks = chunks.map(chunk => {
      const sectionType = detectSectionType(chunk.html);
      console.log(`📋 Detected section type: ${sectionType} (${chunk.html.substring(0, 50)}...)`);
      return { chunk, sectionType };
    }).filter(({ sectionType }) => sectionType !== 'IGNORE');
    
    console.log(`📊 Found ${processableChunks.length} processable chunks after filtering`);
    
    // Create a placeholder for all chunks
    results = chunks.map(chunk => ({ ...chunk, suggestions: [] }));
    
    // Process chunks in batches of 3 to limit concurrent API calls
    const batchSize = 3;
    const batches = [];
    for (let i = 0; i < processableChunks.length; i += batchSize) {
      batches.push(processableChunks.slice(i, i + batchSize));
    }
    
    console.log(`📊 Processing in ${batches.length} batches of up to ${batchSize} chunks each`);
    
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`📊 Processing batch ${batchIndex + 1}/${batches.length}`);
      
      // Process each batch in parallel
      const batchResults = await Promise.all(
        batch.map(async ({ chunk, sectionType }) => {
          const originalIndex = chunks.findIndex(c => c.id === chunk.id);
          
          try {
            const suggestions = await generateSuggestionsForSection({
              sectionHtml: chunk.html,
              sectionType,
              jobDescription,
              openaiClient,
            });
            
            console.log(`✅ Generated ${suggestions.length} suggestions for section ${sectionType}`);
            return { index: originalIndex, chunk, suggestions };
          } catch (error) {
            console.error(`❌ Failed to process chunk:`, error);
            return { index: originalIndex, chunk, suggestions: [] };
          }
        })
      );
      
      // Update the results array with the new suggestions
      batchResults.forEach(({ index, chunk, suggestions }) => {
        if (index !== -1) {
          results[index] = { ...chunk, suggestions };
        }
      });
    }
    
    // When processing is complete, only send response if timeout hasn't triggered
    if (!timeoutTriggered) {
      sendResponse();
    }
  } catch (error) {
    console.error('Suggestion generation failed:', error);
    clearTimeout(requestTimer);
    // Only send error response if headers haven't been sent already
    if (!res.headersSent) {
      res.status(500).json({ error: 'Suggestion generation failed' });
    }
  }
});

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

app.listen(port, () => {
  console.log(`Resume optimizer API listening on port ${port}`);
});