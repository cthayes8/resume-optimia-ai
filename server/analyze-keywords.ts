import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Common keyword synonyms map
const keywordSynonyms: Record<string, string[]> = {
  // Technical
  "javascript": ["js", "ecmascript", "node.js", "nodejs"],
  "python": ["py", "python3"],
  "react": ["reactjs", "react.js"],
  "vue": ["vuejs", "vue.js"],
  "angular": ["angularjs", "angular.js"],
  "aws": ["amazon web services", "amazon aws"],
  "azure": ["microsoft azure", "ms azure"],
  "sql": ["mysql", "postgresql", "postgres", "oracle", "tsql", "plsql"],
  "nosql": ["mongodb", "dynamodb", "cassandra"],
  "ci/cd": ["continuous integration", "continuous deployment", "devops"],
  "agile": ["scrum", "kanban", "lean"],
  
  // Education
  "bachelor's degree": ["bachelors", "bachelor of", "b.a.", "b.s.", "ba", "bs", "bachelor", "undergraduate degree"],
  "master's degree": ["masters", "master of", "m.a.", "m.s.", "ma", "ms", "mba", "graduate degree"],
  "phd": ["doctorate", "ph.d.", "doctoral", "doctor of philosophy"],
  
  // Common business terms
  "sales": ["selling", "revenue generation", "business development"],
  "management": ["managing", "leadership", "directing"],
  "marketing": ["digital marketing", "market analysis", "brand management"],
};

async function extractTopKeywords(jobDescription: string): Promise<string[]> {
  const prompt = `Extract the most important technical skills, tools, technologies, certifications, and specific qualifications from this job description. Focus on single words or short technical terms that a candidate could add to their resume (like "Python", "AWS", "MBA", "Agile", etc.).

Do NOT include general phrases or soft skills. For example:
- Instead of "strong oral and written communication", just use "communication"
- Instead of "experience developing business relationships", use specific relevant skills like "sales", "negotiation", "account management"
- Instead of "proven track record of exceeding goals", extract the specific domain like "sales", "revenue", "business development"

Return exactly 15 of the most important keywords as a JSON array.

Job Description:
${jobDescription}

Format the response like:
{
  "keywords": ["keyword1", "keyword2", "keyword3", ...]
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that extracts specific, actionable keywords from job descriptions to help candidates optimize their resumes. Focus on concrete skills and qualifications, not general phrases."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" }
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    const response = JSON.parse(content);
    if (!response.keywords || !Array.isArray(response.keywords)) {
      throw new Error('Invalid response format from OpenAI');
    }

    // Clean up keywords to ensure they're concise
    const cleanedKeywords = response.keywords.map((keyword: string) => 
      keyword.toLowerCase()
        .trim()
        .replace(/^(experience in|experience with|proficiency in|knowledge of) /, '')
        .replace(/(experience|proficiency|knowledge)$/, '')
        .trim()
    );

    return cleanedKeywords;
  } catch (error) {
    console.error('Error in extractTopKeywords:', error);
    throw error;
  }
}

function checkKeywordPresence(keyword: string, resumeContent: string): boolean {
  const normalizedKeyword = keyword.toLowerCase();
  const normalizedContent = resumeContent.toLowerCase();
  
  // Check direct match
  if (normalizedContent.includes(normalizedKeyword)) {
    return true;
  }

  // Check synonyms
  const synonyms = keywordSynonyms[normalizedKeyword] || [];
  if (synonyms.some(synonym => normalizedContent.includes(synonym.toLowerCase()))) {
    return true;
  }

  // Special case for degrees - check for partial matches
  if (normalizedKeyword.includes('degree') || normalizedKeyword.includes('bachelor') || 
      normalizedKeyword.includes('master') || normalizedKeyword.includes('phd')) {
    // Check each word in the content against degree-related keywords
    const words = normalizedContent.split(/\s+/);
    for (const word of words) {
      if (word.includes('b.a.') || word.includes('b.s.') || 
          word.includes('m.a.') || word.includes('m.s.') ||
          word.includes('ph.d') || word.includes('phd') ||
          word.includes('bachelor') || word.includes('master') ||
          word.includes('degree')) {
        return true;
      }
    }
  }

  return false;
}

export async function analyzeKeywords(jobDescription: string, resumeContent: string) {
  try {
    const keywords = await extractTopKeywords(jobDescription);
    const results = keywords.map(keyword => ({
      keyword,
      found: checkKeywordPresence(keyword, resumeContent)
    }));

    // Calculate simple percentage score
    const score = (results.filter(r => r.found).length / results.length) * 100;

    return {
      keywords: results,
      score
    };
  } catch (err) {
    console.error('Error in analyzeKeywords:', err);
    
    // Check if this is a rate limit error
    const isRateLimit = err instanceof Error && 
      (err.message.includes('429') || 
       err.message.includes('exceeded your current quota') ||
       err.message.includes('rate limit'));
    
    if (isRateLimit) {
      console.log('OpenAI rate limit exceeded, using fallback keyword extraction');
      
      // Create fallback keywords based on common resume terms and the job description
      return createFallbackKeywordAnalysis(jobDescription, resumeContent);
    }
    
    throw new Error(`Failed to analyze keywords: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
}

// Function to create fallback keywords when API fails
function createFallbackKeywordAnalysis(jobDescription: string, resumeContent: string) {
  console.log('Using fallback keyword analysis');
  
  // Extract simple keywords from job description
  const commonJobKeywords = [
    "experience", "skills", "leadership", "management", "team", "communication",
    "problem-solving", "project", "development", "analysis", "data", "research",
    "customer", "client", "sales", "marketing", "technical", "software", "design", 
    "engineering", "operations", "strategic", "planning", "budget", "results",
    "professional", "degree", "certification"
  ];
  
  // Get words from job description
  const jobWords = jobDescription.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3)
    .filter(word => !commonJobKeywords.includes(word));
  
  // Create unique set of potential keywords by combining common keywords and job-specific terms
  const allPotentialKeywords = [...commonJobKeywords, ...jobWords];
  const uniqueKeywords = Array.from(new Set(allPotentialKeywords));
  
  // Select the top 15 keywords (or fewer if not enough are available)
  const topKeywords = uniqueKeywords.slice(0, 15);
  
  // Check if each keyword is in the resume
  const results = topKeywords.map(keyword => ({
    keyword,
    found: checkKeywordPresence(keyword, resumeContent)
  }));
  
  // Calculate simple percentage score
  const score = (results.filter(r => r.found).length / results.length) * 100;
  
  return {
    keywords: results,
    score
  };
} 