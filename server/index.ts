import express from 'express';
import cors from 'cors';
import { analyzeKeywords } from './analyze-keywords.js';
import { scoreResumeSections } from './key-metrics-api.js';
import OpenAI from 'openai';

const app = express();
const port = 3001; // Different from your frontend port
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Allow CORS from any origin during development
app.use(cors({
  origin: '*', // In production, you should restrict this to specific trusted domains
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

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

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
}); 