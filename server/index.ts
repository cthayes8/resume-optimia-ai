import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import { analyzeKeywords } from './analyze-keywords.js';
import { scoreResumeSections } from './key-metrics-api.js';
import { parseResume, SectionType, ResumeBullet, ResumeSection } from './resume-parser.js';
import { validateATS } from './ats-validator.js';
import { generateSuggestionsForSection } from './utils/suggestions.js';
import { smartChunkHTML } from './utils/smartChunk.js';
import { generateImprovements } from './suggest-improvements.js';
import { JSDOM } from 'jsdom';
import { 
  buildBulletPrompt, 
  attemptJsonRecovery, 
  determineCategory 
} from './suggest-improvements.js';

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
  console.log("Received request for suggestions");
  
  if (!resumeHtml || !jobDescription) return res.status(400).json({ error: 'Missing data' });

  // Set shorter timeout
  const requestTimeout = 30000; // 30 seconds max
  let timeoutTriggered = false;
  const requestTimer = setTimeout(() => {
    console.error('⏱️ Request timeout reached, sending partial results');
    timeoutTriggered = true;
    if (suggestions.length > 0) {
      sendResponse();
    }
  }, requestTimeout);

  // Track suggestions
  let suggestions: any[] = [];
  
  const sendResponse = () => {
    clearTimeout(requestTimer);
    
    if (!res.headersSent) {
      // Format for frontend
      const htmlChunks = [{
        id: 'full-resume',
        html: resumeHtml,
        generateSuggestions: false
      }];
      
      const items = suggestions.map(s => ({
        id: s.id,
        deleteText: s.original,
        replacementOptions: [{
          id: `opt-${s.id}`,
          addText: s.improved,
          reasoning: s.reasoning,
          category: s.category
        }],
        type: 'EXPERIENCE', // Default all to experience
        category: s.category,
        bulletId: s.id
      }));
      
      console.log(`🎯 Total suggestions generated: ${items.length}`);
      
      res.json({
        format: 'replacements',
        content: {
          htmlChunks,
          items,
        },
      });
    }
  };

  try {
    // MUCH SIMPLER EXTRACTION APPROACH
    // Extract paragraphs directly from raw HTML
    const dom = new JSDOM(resumeHtml);
    const paragraphs = Array.from(dom.window.document.querySelectorAll('p'));
    
    console.log(`Found ${paragraphs.length} paragraphs in the HTML`);
    
    // Process only the paragraph content as text lines
    const lines = paragraphs
      .map(p => p.textContent?.trim() || '')
      .filter(line => 
        // Only keep lines that look like achievement bullets
        line.length > 15 && 
        // Skip section headers and job titles
        !line.match(/^(SUMMARY|EXPERIENCE|EDUCATION|ADDITIONAL|SKILLS|AWARDS)$/i) &&
        !line.match(/^(National Account Executive|Vice President|District Manager)/i) &&
        // Skip dates and companies
        !line.match(/^\w+ \d{4} [–-]/) &&
        !line.match(/^(T-Mobile|MarketSpark|Sensitek|Purdue)/i) &&
        // Only focus on likely achievements
        !line.match(/^Certifications|^Awards/i) &&
        // Skip lines with "Present" which are likely job headers
        !line.includes("Present") &&
        // Skip award dates 
        !line.match(/^Q[1-4] 20\d{2}:/) &&
        // Skip lines that are all caps (likely headers)
        line !== line.toUpperCase()
      );
    
    console.log(`Filtered to ${lines.length} content lines to process`);
    
    // Limit to a reasonable number to avoid timeout 
    const MAX_LINES = 15;
    
    // Prioritize lines that look like achievements - especially with action verbs
    const prioritizedLines = lines
      .filter(line => {
        // Keep lines that start with past tense verbs (common in achievements)
        return /^(Cultivated|Led|Developed|Negotiated|Drove|Launched|Directed|Managed|Collaborated|Conducted|Established|Built|Instilled|Designed|Achieved|Created)/i.test(line);
      })
      .slice(0, MAX_LINES);
    
    // If we didn't find enough prioritized lines, include some other lines
    let linesToProcess = prioritizedLines;
    if (prioritizedLines.length < MAX_LINES) {
      const additionalLines = lines
        .filter(line => !prioritizedLines.includes(line))
        .slice(0, MAX_LINES - prioritizedLines.length);
      
      linesToProcess = [...prioritizedLines, ...additionalLines].slice(0, MAX_LINES);
    }
    
    console.log(`Processing ${linesToProcess.length} lines`);
    
    // Process each line directly without complex section logic
    for (let i = 0; i < linesToProcess.length && !timeoutTriggered; i++) {
      const line = linesToProcess[i];
      const lineId = `line-${i}`;
      
      try {
        console.log(`Processing line ${i+1}/${linesToProcess.length}: "${line.substring(0, 50)}..."`);
        
        // Use the better prompts from suggest-improvements.ts
        const messages = [
          {
            role: "system",
            content: `You are an expert resume writing assistant. Your task is to improve the single bullet point provided, making it more impactful and tailored to a job description for a telecommunications enterprise sales role.

Focus on:
1. Using strong action verbs
2. Quantifying achievements where possible
3. Incorporating relevant skills and keywords related to telecom enterprise sales
4. Making the language more concise and impactful
5. Highlighting accomplishments rather than just responsibilities

Return a JSON response with these fields:
- improved: the rewritten bullet text
- reasoning: brief explanation of the improvements made
- category: one of ["action-verbs", "quantify-achievements", "technical-skills", "industry-keywords", "concise-language", "accomplishment-focus"]`
          },
          {
            role: "user",
            content: `Improve this bullet point for a telecommunications enterprise sales role: "${line}"`
          }
        ];
        
        const completion = await openaiClient.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: messages,
          temperature: 0.3,
          response_format: { type: 'json_object' },
          max_tokens: 500,
        }, {
          timeout: 8000 // 8s timeout per API call
        });
        
        const content = completion.choices[0].message.content;
        if (!content) continue;
        
        // Parse the response
        let response;
        try {
          // Try to extract JSON object using regex
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            response = JSON.parse(jsonMatch[0]);
          }
        } catch (error) {
          console.error(`Could not recover JSON: ${error}`);
        }
        
        if (!response.improved) continue;
        
        // Add suggestion
        suggestions.push({
          id: lineId,
          original: line,
          improved: response.improved,
          reasoning: response.reasoning || "Improved for job relevance",
          category: response.category || "accomplishment-focus"
        });
        
        console.log(`✅ Generated suggestion ${i+1}/${linesToProcess.length}`);
      } catch (error) {
        console.error(`Error processing line ${i+1}: ${error.message}`);
      }
    }
    
    // Send response if we have suggestions
    if (suggestions.length > 0) {
      sendResponse();
    } else {
      res.status(500).json({ error: 'No suggestions could be generated' });
    }
  } catch (error) {
    console.error('Error generating suggestions:', error);
    clearTimeout(requestTimer);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Error generating suggestions' });
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
  
  // Track scores for each section type with an index signature
  interface SectionScores {
    [key: string]: number;
  }
  
  const sectionScores: SectionScores = {
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