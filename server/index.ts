import express from 'express';
import cors from 'cors';
import { analyzeKeywords } from './analyze-keywords.js';
import { scoreResumeSections } from './key-metrics-api.js';
import OpenAI from 'openai';

const app = express();
const port = 3001; // Different from your frontend port
const openai = new OpenAI({
  apiKey: process.env.VITE_OPENAI_API_KEY,
});

// Allow CORS from any origin during development
app.use(cors({
  origin: '*', // In production, you should restrict this to specific trusted domains
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Add these interfaces near the top of the file
interface HtmlChunk {
  id: string;
  html: string;
  generateSuggestions: boolean;
}

interface Rule {
  id: string;
  title: string;
  prompt: string;
}

interface Suggestion {
  ruleId: string;
  deleteHtml: string;
  insertHtml: string;
  reasoning: string;
  chunkId: string;
}

interface ProcessedChunk extends HtmlChunk {
  suggestions: Array<{
    ruleId: string;
    deleteHtml: string;
    insertHtml: string;
    chunkId: string;
  }>;
}

app.post('/api/analyze-keywords', async (req, res) => {
  try {
    const { jobDescription, resumeContent } = req.body;
    
    console.log('Received request for keyword analysis');
    console.log('Job Description length:', jobDescription?.length);
    console.log('Resume Content length:', resumeContent?.length);
    
    if (!jobDescription || !resumeContent) {
      console.log('Missing required fields');
      return res.status(400).json({ error: 'Missing required fields' });
    }

    console.log('Starting keyword analysis...');
    const result = await analyzeKeywords(jobDescription, resumeContent);
    console.log('Analysis complete:', result);
    res.json(result);
  } catch (error: unknown) {
    console.error('Error analyzing keywords:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to analyze keywords';
    res.status(500).json({ error: errorMessage });
  }
});

app.post('/api/score-resume', async (req, res) => {
  try {
    const { jobDescription, resumeContent } = req.body;

    if (!jobDescription || !resumeContent) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await scoreResumeSections(jobDescription, resumeContent);
    res.json(result);
  } catch (error) {
    console.error('Error scoring resume:', error);
    res.status(500).json({ error: 'Failed to score resume' });
  }
});

// Endpoint for Tiptap AI Suggestions
app.post('/api/tiptap-suggestions', async (req, res) => {
  try {
    const { content, jobDescription, rules } = req.body;
    
    console.log('---------------------------------------');
    console.log('Received request for AI suggestions:');
    console.log('Content empty?', !content);
    console.log('Content length:', content?.length ?? 0);
    console.log('Content sample:', content?.substring(0, 100));
    console.log('Job Description empty?', !jobDescription);
    console.log('Job Description length:', jobDescription?.length ?? 0);
    console.log('Job Description sample:', jobDescription?.substring(0, 100));
    console.log('Rules count:', rules?.length ?? 0);
    console.log('---------------------------------------');
    
    // Default suggestion rules if none provided
    const defaultRules = rules || [
      {
        id: "action-verbs",
        title: "Use action verbs for experience",
        color: "#4CAF50",
        backgroundColor: "#E8F5E9"
      },
      {
        id: "metrics",
        title: "Use metrics and achievements",
        color: "#2196F3",
        backgroundColor: "#E3F2FD"
      },
      {
        id: "strong-language",
        title: "Avoid weak/passive language",
        color: "#FF9800",
        backgroundColor: "#FFF3E0"
      }
    ];
    
    // Extract meaningful text from HTML if content is HTML
    let safeContent = content || '';
    if (safeContent.includes('<') && safeContent.includes('>')) {
      try {
        const { JSDOM } = require('jsdom');
        const dom = new JSDOM(safeContent);
        safeContent = dom.window.document.body.textContent || safeContent;
        console.log('Extracted text from HTML, new length:', safeContent.length);
      } catch (e) {
        console.error('Error extracting text from HTML:', e);
      }
    }
    
    // If no job description is provided, use a generic one
    const effectiveJobDescription = jobDescription || 
      "Looking for a professional with strong communication skills, attention to detail, and the ability to work in a team environment. The ideal candidate has experience with project management, problem-solving, and delivering results.";
    
    console.log('Using job description (truncated):', effectiveJobDescription.substring(0, 50) + '...');
    
    // If content is empty or too short, return fallback suggestions
    if (!safeContent || safeContent.trim().length < 10) {
      console.log('Content too short, returning fallback suggestions');
      return res.json({ 
        suggestions: [
          { 
            original: "Add your professional summary here", 
            improved: "Results-driven professional with expertise in [your field]. Proven track record of delivering high-quality results with a focus on [key skills].",
            rule: defaultRules[0].id
          },
          {
            original: "List your experience here",
            improved: "Led cross-functional team of 5 professionals to deliver project 15% under budget and ahead of schedule, resulting in $250K cost savings.",
            rule: defaultRules[1].id
          },
          {
            original: "Add your skills here",
            improved: "Proficient in [specific technologies/skills] with demonstrated ability to implement solutions that drive business growth and operational efficiency.",
            rule: defaultRules[2].id
          }
        ] 
      });
    }
    
    // Generate standard example suggestions when not using AI (for testing)
    const generateBasicSuggestions = (content: string, jobDesc: string) => {
      const paragraphs = content.split(/\n+/).filter((p: string) => p.trim().length > 0).slice(0, 5);
      const suggestions = [];
      
      // Look for common improvement opportunities
      paragraphs.forEach((paragraph: string, index: number) => {
        // Only process if paragraph has enough content
        if (paragraph.length < 10) return;
        
        if (index === 0 && (paragraph.includes('SUMMARY') || paragraph.includes('PROFILE'))) {
          // This is likely a summary section
          suggestions.push({
            original: paragraph,
            improved: `Results-driven professional with ${Math.floor(Math.random() * 10) + 3} years of experience in delivering high-impact solutions. Proven track record of exceeding targets by ${Math.floor(Math.random() * 20) + 10}% and optimizing team performance.`,
            rule: defaultRules[0].id
          });
        } 
        else if (paragraph.toLowerCase().includes('manage') && !paragraph.includes('%')) {
          // Experience with management but no metrics
          suggestions.push({
            original: paragraph,
            improved: paragraph.replace(
              /managed|led|directed/i, 
              `Led and delivered ${Math.floor(Math.random() * 30) + 10}% improvement in`
            ),
            rule: defaultRules[1].id
          });
        }
        else if (paragraph.toLowerCase().includes('responsible for') || paragraph.toLowerCase().includes('helped with')) {
          // Weak language
          suggestions.push({
            original: paragraph,
            improved: paragraph
              .replace(/responsible for/i, 'Spearheaded')
              .replace(/helped with/i, 'Collaborated on')
              .replace(/worked on/i, 'Executed'),
            rule: defaultRules[2].id
          });
        }
      });
      
      // If we couldn't find specific examples, add generic ones
      if (suggestions.length === 0) {
        suggestions.push({
          original: paragraphs[0] || "Your professional profile",
          improved: `Strategic professional with proven expertise in ${extractKeywords(jobDesc, 3).join(', ')}. Delivered measurable results including ${Math.floor(Math.random() * 30) + 10}% efficiency improvements.`,
          rule: defaultRules[Math.floor(Math.random() * defaultRules.length)].id
        });
      }
      
      return suggestions;
    };
    
    // Extract keywords from text
    function extractKeywords(text: string, count: number = 5) {
      if (!text) return ['team leadership', 'problem solving', 'communication'];
      
      // Remove common stop words
      const stopWords = ['and', 'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'with', 'by'];
      const words = text.toLowerCase().split(/\W+/).filter((word: string) => 
        word.length > 3 && !stopWords.includes(word)
      );
      
      // Count word frequencies
      const wordFreq: Record<string, number> = {};
      words.forEach((word: string) => {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      });
      
      // Sort by frequency and return top N
      return Object.entries(wordFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, count)
        .map(entry => entry[0]);
    }
    
    // Try to use AI, with multiple fallbacks if it fails
    try {
      // Choose model based on content length to optimize costs
      let useModel = safeContent.length > 1000 ? "gpt-3.5-turbo" : "gpt-4-turbo-preview";
      console.log(`Using ${useModel} for analysis`);
      
      // Try GPT model
      const completion = await openai.chat.completions.create({
        model: useModel,
        messages: [
          {
            role: "system",
            content: "You are a professional resume optimizer. Your task is to analyze resume content and identify 3-5 specific improvements that would make it more competitive for the job description provided."
          },
          {
            role: "user",
            content: `
Analyze this resume content and provide suggestions to improve it based on the job description.

Resume content: ${safeContent}

Job Description: ${effectiveJobDescription}

Focus on these areas:
1. Using strong action verbs for experience
2. Adding specific metrics and achievements 
3. Replacing weak or passive language with stronger alternatives

Return your response as a JSON array of objects with 'original' and 'improved' fields. Each object should contain the original text from the resume and your improved version.
`
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      });
      
      // Process result
      try {
        const suggestions = await processOpenAIResponse(completion, defaultRules);
        return res.json(suggestions);
      } catch (parseError) {
        console.error('Error parsing OpenAI response:', parseError);
        // Fall back to basic suggestions if parsing fails
        return res.json({ suggestions: generateBasicSuggestions(safeContent, effectiveJobDescription) });
      }
    } catch (aiError) {
      console.error('AI suggestion generation error:', aiError);
      // Return basic suggestions as fallback
      return res.json({ suggestions: generateBasicSuggestions(safeContent, effectiveJobDescription) });
    }
  } catch (error) {
    console.error('Error in tiptap-suggestions endpoint:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      suggestions: [
        { 
          original: "Error generating suggestions", 
          improved: "Please try again later or contact support if the problem persists.",
          rule: "error"
        }
      ] 
    });
  }
});

// Update the endpoint with proper types
app.post('/api/suggestions', async (req, res) => {
  const { html, htmlChunks, rules }: { 
    html: string; 
    htmlChunks: HtmlChunk[]; 
    rules: { id: string; title: string; prompt: string; }[];
  } = req.body;

  try {
    // Process only chunks that need suggestions
    const chunksToProcess = htmlChunks.filter(chunk => {
      const sectionType = getSectionType(chunk.html);
      // Only process chunks that are clearly identifiable sections or small content pieces
      return chunk.generateSuggestions && sectionType !== 'MULTIPLE';
    });
    
    if (chunksToProcess.length === 0) {
      return res.json({
        format: "replacements",
        content: {
          htmlChunks: htmlChunks.map(chunk => ({
            id: chunk.id,
            html: chunk.html,
            generateSuggestions: false
          })),
          items: []
        }
      });
    }

    // Group chunks by section type
    const sectionGroups: { [key: string]: HtmlChunk[] } = {};
    chunksToProcess.forEach(chunk => {
      const sectionType = getSectionType(chunk.html);
      if (!sectionGroups[sectionType]) {
        sectionGroups[sectionType] = [];
      }
      sectionGroups[sectionType].push(chunk);
    });

    // Process each section group
    const processedChunks: ProcessedChunk[] = [];
    
    for (const [sectionType, chunks] of Object.entries(sectionGroups)) {
      // Skip processing for unidentified or multiple sections
      if (sectionType === 'MULTIPLE' || sectionType === 'CONTACT') {
        chunks.forEach(chunk => {
          processedChunks.push({ ...chunk, suggestions: [] });
        });
        continue;
      }

      const sectionHtml = chunks.map(chunk => chunk.html).join('\n\n');
      
      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4-turbo-preview",
          messages: [
            {
              role: "system",
              content: `You are an expert resume optimizer focusing on ${sectionType} sections. Analyze the content and suggest specific improvements.

Guidelines for ${sectionType} sections:
${getSectionGuidelines(sectionType)}

Important:
- Only suggest changes for SPECIFIC phrases or sentences
- Do NOT suggest replacing entire paragraphs or sections
- Each suggestion should focus on a single improvement
- Ensure suggestions maintain the original context and structure

Provide exactly ${Math.min(chunks.length, 2)} suggestions that significantly improve different parts of this section.`
            },
            {
              role: "user",
              content: `Analyze this ${sectionType} section and provide specific improvements:

${sectionHtml}

Respond in JSON format:
{
  "suggestions": [
    {
      "originalText": "exact text to replace (must be a specific phrase, not an entire paragraph)",
      "improvedText": "improved version (maintaining similar length and structure)",
      "reasoning": "explanation of the improvement"
    }
  ]
}`
            }
          ],
          temperature: 0.3,
          max_tokens: 1000,
          response_format: { type: "json_object" }
        });

        if (completion.choices[0].message.content) {
          const aiResponse = JSON.parse(completion.choices[0].message.content);
          
          // Map suggestions back to chunks
          chunks.forEach(chunk => {
            const chunkSuggestions = aiResponse.suggestions
              ?.filter((s: any) => chunk.html.includes(s.originalText))
              ?.map((s: any) => ({
                ruleId: rules[0].id,
                deleteHtml: s.originalText,
                insertHtml: s.improvedText,
                chunkId: chunk.id
              }))
              ?.filter((s: any) => isValidSuggestion(s.insertHtml, sectionType)) || [];

            processedChunks.push({
              ...chunk,
              suggestions: chunkSuggestions
            });
          });
        }
      } catch (error) {
        console.error(`Error processing ${sectionType} section:`, error);
        chunks.forEach(chunk => {
          processedChunks.push({ ...chunk, suggestions: [] });
        });
      }
    }

    // Combine with unprocessed chunks
    const allChunks = htmlChunks.map(chunk => {
      const processed = processedChunks.find(p => p.id === chunk.id);
      return processed || { ...chunk, suggestions: [] } as ProcessedChunk;
    });

    const finalResponse = {
      format: "replacements",
      content: {
        htmlChunks: allChunks.map(({ suggestions, ...chunk }) => ({
          id: chunk.id,
          html: chunk.html,
          generateSuggestions: false
        })),
        items: allChunks.flatMap(chunk => chunk.suggestions || [])
      }
    };

    res.json(finalResponse);
  } catch (error) {
    console.error('Error in suggestions endpoint:', error);
    res.status(500).json({ 
      format: "replacements",
      content: {
        htmlChunks: htmlChunks.map(chunk => ({
          id: chunk.id,
          html: chunk.html,
          generateSuggestions: false
        })),
        items: []
      }
    });
  }
});

// Helper function to process OpenAI response
async function processOpenAIResponse(completion: any, defaultRules: any[]) {
  try {
    const parsed = JSON.parse(completion.choices[0].message.content || '[]');
    
    let suggestions: any;
    
    // If the API returns an array, wrap it
    if (Array.isArray(parsed)) {
      suggestions = { suggestions: parsed };
    } 
    // If it returns an object with a suggestions property, use that
    else if (parsed.suggestions && Array.isArray(parsed.suggestions)) {
      suggestions = parsed;
    }
    // If it returns any other object structure, create a proper format
    else if (typeof parsed === 'object') {
      suggestions = { suggestions: Object.values(parsed) };
    }
    // Fallback to empty array if none of the above
    else {
      suggestions = { suggestions: [] };
    }
    
    // Ensure each suggestion has a valid rule ID
    suggestions.suggestions = suggestions.suggestions.map((suggestion: any) => {
      // Find the rule by ID or assign the first rule as default
      const ruleId = suggestion.rule || defaultRules[0].id;
      const rule = defaultRules.find((r: { id: string }) => r.id === ruleId) || defaultRules[0];
      
      return {
        original: suggestion.original || "",
        improved: suggestion.improved || "",
        rule: rule.id
      };
    });
    
    return suggestions;
  } catch (e) {
    console.error("Error parsing OpenAI response:", e);
    return null;
  }
}

// Function to generate fallback suggestions based on common resume patterns
function generateFallbackSuggestions(content: string, jobDescription: string, defaultRules: any[]) {
  console.log('Generating rule-based fallback suggestions');
  
  const suggestions = [];
  const contentLower = content.toLowerCase();
  const jobDescLower = jobDescription.toLowerCase();

  // Detect common resume issues and provide suggestions
  
  // 1. Check for "Responsible for" phrases (passive language)
  const responsibleRegex = /responsible for ([\w\s]+)/gi;
  let match;
  while ((match = responsibleRegex.exec(content)) !== null) {
    if (match[1]) {
      const actionVerb = getRandomActionVerb();
      suggestions.push({
        original: match[0],
        improved: `${actionVerb} ${match[1]}`,
        rule: "strong-language"
      });
    }
  }
  
  // 2. Look for sentences without metrics
  const statements = content.split(/[.!?]/).filter(s => s.trim().length > 20);
  for (const statement of statements) {
    if (!statement.match(/\d+%|increased|improved|reduced|saved|\$\d+|\d+ years/i) && 
        suggestions.length < 5) {
      
      // Only add if it contains an achievement-like word
      if (statement.match(/completed|managed|led|developed|created|implemented/i)) {
        suggestions.push({
          original: statement.trim(),
          improved: `${statement.trim()} resulting in 20% improvement in efficiency`,
          rule: "metrics"
        });
        break;
      }
    }
  }
  
  // 3. Add job-specific suggestions based on keywords in job description
  const keySkills = extractKeySkills(jobDescription);
  for (const skill of keySkills) {
    if (!contentLower.includes(skill.toLowerCase()) && suggestions.length < 5) {
      // Find a sentence that could be enhanced with this skill
      for (const statement of statements) {
        if (statement.match(/experience|skills|knowledge|proficient/i)) {
          suggestions.push({
            original: statement.trim(),
            improved: `${statement.trim()} including ${skill}`,
            rule: "action-verbs"
          });
          break;
        }
      }
    }
  }
  
  // If we still don't have enough suggestions, add generic ones
  if (suggestions.length < 3) {
    suggestions.push({
      original: "Responsible for managing team.",
      improved: "Led and mentored team of 5 developers.",
      rule: "strong-language"
    });
    
    suggestions.push({
      original: "Helped with project.",
      improved: "Spearheaded project delivery, resulting in 15% efficiency increase.",
      rule: "metrics"
    });
    
    suggestions.push({
      original: "Duties included customer service.",
      improved: "Provided exceptional customer service, maintaining 98% satisfaction rating.",
      rule: "action-verbs"
    });
  }
  
  return { suggestions };
}

// Helper function to extract key skills from job description
function extractKeySkills(jobDescription: string) {
  const commonSkills = [
    'Python', 'JavaScript', 'React', 'Node.js', 'SQL', 'Data Analysis',
    'Project Management', 'Leadership', 'Communication', 'Problem Solving',
    'AWS', 'Cloud', 'Agile', 'DevOps', 'Marketing', 'Sales', 'Design',
    'Research', 'Customer Service', 'Strategic Planning'
  ];
  
  // Return skills that appear in the job description
  return commonSkills.filter(skill => 
    jobDescription.toLowerCase().includes(skill.toLowerCase())
  ).slice(0, 5); // Get up to 5 matching skills
}

// Helper function to get a random action verb
function getRandomActionVerb() {
  const actionVerbs = [
    'Led', 'Managed', 'Executed', 'Developed', 'Implemented', 'Coordinated',
    'Delivered', 'Achieved', 'Spearheaded', 'Orchestrated', 'Created',
    'Designed', 'Established', 'Generated', 'Launched', 'Pioneered'
  ];
  
  return actionVerbs[Math.floor(Math.random() * actionVerbs.length)];
}

// Helper function to determine section type from content
function getSectionType(html: string): string {
  // First try to find an explicit section header
  const headerMatch = html.match(/<h[1-6][^>]*>([^<]+)<\/h[1-6]>|^(SUMMARY|EXPERIENCE|EDUCATION|SKILLS|CERTIFICATIONS)[:\s]*$/mi);
  if (headerMatch) {
    const header = (headerMatch[1] || headerMatch[2]).toLowerCase();
    if (header.includes('summary') || header.includes('profile') || header.includes('objective')) {
      return 'SUMMARY';
    }
    if (header.includes('experience') || header.includes('employment') || header.includes('work')) {
      return 'EXPERIENCE';
    }
    if (header.includes('education') || header.includes('academic')) {
      return 'EDUCATION';
    }
    if (header.includes('skills') || header.includes('expertise') || header.includes('competencies')) {
      return 'SKILLS';
    }
    if (header.includes('certifications') || header.includes('licenses')) {
      return 'CERTIFICATIONS';
    }
  }

  // If no header found, analyze the content
  const lowerHtml = html.toLowerCase();
  const contentLength = html.length;

  // Don't process chunks that are too large (likely multiple sections)
  if (contentLength > 1000) {
    return 'MULTIPLE';
  }

  // Look for section-specific patterns
  if (lowerHtml.match(/^[A-Z][a-z]+ [A-Z][a-z]+\s*[\|\-•]\s*.+@.+\..+/)) {
    return 'CONTACT';
  }
  
  if (lowerHtml.includes('university') || lowerHtml.includes('college') || lowerHtml.includes('gpa')) {
    return 'EDUCATION';
  }

  if (lowerHtml.match(/\b(20\d{2}|19\d{2})\b/) && 
      (lowerHtml.includes('present') || 
       lowerHtml.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/))) {
    return 'EXPERIENCE';
  }

  if (lowerHtml.match(/proficient in|expertise in|skilled in|knowledge of|\b(advanced|intermediate|expert)\b/)) {
    return 'SKILLS';
  }

  // For small chunks that don't match any pattern, mark as CONTENT
  if (contentLength < 500) {
    return 'CONTENT';
  }

  return 'MULTIPLE';
}

// Helper function to validate suggestions based on section type
function isValidSuggestion(suggestion: string, sectionType: string): boolean {
  const lowerSuggestion = suggestion.toLowerCase();
  
  // Common validation for all sections
  if (suggestion.length < 10 || suggestion.length > 500) {
    return false;
  }

  switch (sectionType) {
    case 'SUMMARY':
      // Should include experience or expertise indicators
      return (
        lowerSuggestion.includes('experience') ||
        lowerSuggestion.includes('professional') ||
        lowerSuggestion.includes('expertise') ||
        lowerSuggestion.includes('background')
      );
    
    case 'EXPERIENCE':
      // Should include metrics or achievements
      return (
        lowerSuggestion.includes('%') ||
        lowerSuggestion.includes('$') ||
        /\d+/.test(lowerSuggestion) ||
        /\b(led|managed|developed|implemented|launched|created)\b/i.test(lowerSuggestion)
      );
    
    case 'EDUCATION':
      // Should include academic-related terms
      return (
        lowerSuggestion.includes('degree') ||
        lowerSuggestion.includes('university') ||
        lowerSuggestion.includes('college') ||
        lowerSuggestion.includes('gpa') ||
        lowerSuggestion.includes('honors')
      );
    
    case 'SKILLS':
      // Should include skill levels or technical terms
      return (
        lowerSuggestion.includes('proficient') ||
        lowerSuggestion.includes('expert') ||
        lowerSuggestion.includes('advanced') ||
        lowerSuggestion.includes('experience with') ||
        /\b(years|certification|qualified|trained)\b/i.test(lowerSuggestion)
      );
    
    default:
      // For general sections, require at least some measurable impact
      return (
        lowerSuggestion.includes('%') ||
        lowerSuggestion.includes('$') ||
        /\d+/.test(lowerSuggestion) ||
        /\b(achieved|improved|reduced|increased)\b/i.test(lowerSuggestion)
      );
  }
}

// Helper function to get section-specific guidelines
function getSectionGuidelines(sectionType: string): string {
  switch (sectionType) {
    case 'SUMMARY':
      return `- Start with a strong professional title
- Include years of experience and key specializations
- Highlight 2-3 most impressive metrics or achievements
- Focus on unique value proposition
- Keep length to 3-4 impactful sentences`;
    
    case 'EXPERIENCE':
      return `- Begin each bullet with a strong action verb
- Include specific metrics (%, $, team size, etc.)
- Highlight scope and impact of work
- Focus on achievements over responsibilities
- Quantify results where possible`;
    
    case 'EDUCATION':
      return `- List relevant coursework and projects
- Include GPA if above 3.5
- Highlight academic achievements and honors
- Mention relevant research or thesis work
- Include certifications and training`;
    
    case 'SKILLS':
      return `- Group related skills together
- Indicate proficiency levels
- Highlight most relevant skills first
- Include both technical and soft skills
- Add years of experience where relevant`;
    
    default:
      return `- Use strong action verbs
- Include specific metrics and achievements
- Focus on measurable impact
- Maintain professional tone
- Ensure clarity and conciseness`;
  }
}

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
}); 