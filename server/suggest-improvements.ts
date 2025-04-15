import OpenAI from 'openai';
import { SectionType, ParsedResume, ResumeBullet, ResumeSection } from './resume-parser.js';
import { extractSimpleKeywords } from './analyze-keywords.js';
import { diff_match_patch } from 'diff-match-patch';

// Maximum number of retries for OpenAI calls
const MAX_RETRIES = 3;
// Default timeout for OpenAI API calls in milliseconds
const API_TIMEOUT = 10000;

interface SuggestionRequest {
  bulletId: string;
  originalText: string;
  section: SectionType;
  sectionTitle: string;
  jobDescription: string;
  openaiClient: OpenAI;
}

export interface SuggestionResult {
  bulletId: string;
  original: string;
  improved: string;
  section: SectionType;
  reasoning: string;
  category: string;
}

/**
 * Generate improvement suggestions for a resume based on job description
 * @param resume - The parsed resume structure
 * @param jobDescription - The job description to tailor resume for
 * @param openaiClient - OpenAI client instance
 */
export async function generateImprovements(
  resume: ParsedResume,
  jobDescription: string,
  openaiClient: OpenAI
): Promise<SuggestionResult[]> {
  try {
    // Extract keywords from job description for context
    const keywords = await extractSimpleKeywords(jobDescription);
    console.log(`📝 Extracted ${keywords.length} keywords from job description: ${keywords.slice(0, 5).join(', ')}${keywords.length > 5 ? '...' : ''}`);

    // Process sections in parallel but limit concurrency
    const allSuggestions: SuggestionResult[] = [];
    const maxConcurrent = 3; // Process 3 sections at a time
    const sections = resume.sections.filter(section => 
      // Skip contact & other sections that don't need improvements
      ![SectionType.CONTACT, SectionType.OTHER].includes(section.type)
    );

    console.log(`📋 Found ${sections.length} resume sections to process`);
    sections.forEach(section => {
      console.log(`  - ${section.type}: "${section.title}" (${section.bullets.length} bullets)`);
    });

    // Process sections in batches to limit concurrency
    for (let i = 0; i < sections.length; i += maxConcurrent) {
      const batch = sections.slice(i, i + maxConcurrent);
      console.log(`🔄 Processing batch ${Math.floor(i/maxConcurrent) + 1}/${Math.ceil(sections.length/maxConcurrent)}: ${batch.map(s => s.type).join(', ')}`);
      
      const batchResults = await Promise.allSettled(
        batch.map(section => 
          processSection(section, jobDescription, keywords, openaiClient)
        )
      );

      // Collect successful results
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          allSuggestions.push(...result.value);
          console.log(`✅ Generated ${result.value.length} suggestions for ${batch[index].type}`);
        } else {
          console.error(`❌ Failed to process section ${batch[index].type}:`, result.reason);
        }
      });
    }

    console.log(`🎯 Total suggestions generated: ${allSuggestions.length}`);
    return allSuggestions;
  } catch (error) {
    console.error("Failed to generate improvements:", error);
    throw error;
  }
}

/**
 * Process a single resume section to generate suggestions for its bullets
 */
async function processSection(
  section: ResumeSection,
  jobDescription: string,
  keywords: string[],
  openaiClient: OpenAI
): Promise<SuggestionResult[]> {
  // Skip sections with no bullets
  if (!section.bullets || section.bullets.length === 0) {
    console.log(`⚠️ Section ${section.type} (${section.title}) has no bullets to process`);
    return [];
  }

  console.log(`🔍 Processing ${section.bullets.length} bullets in section ${section.type} (${section.title})`);
  
  // Filter out bullets that are likely section headers or formatting elements
  const processableBullets = section.bullets.filter(bullet => {
    const text = bullet.text.trim();
    // Skip empty, very short, or all-caps bullets (likely headers)
    if (!text || text.length < 5 || (text === text.toUpperCase() && text.length < 30 && !text.includes('.'))) {
      console.log(`⏩ Skipping what appears to be a header or formatting element: "${text}"`);
      return false;
    }
    return true;
  });
  
  console.log(`🔍 Found ${processableBullets.length} processable bullets in section ${section.type}`);
  
  // Process bullets in parallel but limit concurrency
  const maxConcurrentBullets = 5;
  const sectionSuggestions: SuggestionResult[] = [];

  for (let i = 0; i < processableBullets.length; i += maxConcurrentBullets) {
    const bulletBatch = processableBullets.slice(i, i + maxConcurrentBullets);
    console.log(`📄 Processing batch of ${bulletBatch.length} bullets from section ${section.type}`);
    
    const bulletPromises = bulletBatch.map(bullet => 
      processBullet({
        bulletId: bullet.id,
        originalText: bullet.text,
        section: section.type,
        sectionTitle: section.title,
        jobDescription,
        openaiClient
      })
    );

    const batchResults = await Promise.allSettled(bulletPromises);
    
    // Count successful results
    let successCount = 0;
    
    batchResults.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        sectionSuggestions.push(result.value);
        successCount++;
      } else if (result.status === 'rejected') {
        console.error(`❌ Failed to process bullet ${bulletBatch[index].id}:`, result.reason);
      }
    });
    
    console.log(`✅ Generated ${successCount}/${bulletBatch.length} successful suggestions in this batch`);
  }

  console.log(`🏁 Completed section ${section.type} with ${sectionSuggestions.length} total suggestions`);
  return sectionSuggestions;
}

/**
 * Process a single bullet to generate an improvement suggestion
 */
async function processBullet(params: SuggestionRequest): Promise<SuggestionResult | null> {
  const { bulletId, originalText, section, sectionTitle, jobDescription, openaiClient } = params;
  
  // Skip empty or very short bullets (likely formatting elements)
  if (!originalText || originalText.trim().length < 5) {
    return null;
  }

  try {
    // Try to get suggestions with retries
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        return await getSuggestionForBullet(params, attempt > 0);
      } catch (error) {
        console.warn(`⚠️ Attempt ${attempt + 1} failed for bullet ${bulletId}:`, error);
        
        // On last attempt, throw to be caught by outer handler
        if (attempt === MAX_RETRIES - 1) {
          throw error;
        }
        
        // Exponential backoff before retry (300ms, 900ms, 2700ms)
        const delay = 300 * Math.pow(3, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // Safety return in case all retries failed but didn't throw
    return null;
  } catch (error) {
    console.error(`❌ All attempts failed for bullet ${bulletId}:`, error);
    return null;
  }
}

/**
 * Get an improvement suggestion for a single bullet
 */
async function getSuggestionForBullet(
  params: SuggestionRequest, 
  isRetry: boolean = false
): Promise<SuggestionResult | null> {
  const { bulletId, originalText, section, sectionTitle, jobDescription, openaiClient } = params;
  
  // Truncate the text for logging
  const truncatedText = originalText.length > 50 
    ? originalText.substring(0, 47) + '...' 
    : originalText;
  
  console.log(`🔍 Processing bullet in ${section}: "${truncatedText}"`);
  
  // Build a prompt specific to the bullet and section type
  const messages = buildBulletPrompt(originalText, section, sectionTitle, jobDescription, isRetry);
  
  try {
    const completion = await openaiClient.chat.completions.create({
      model: isRetry ? 'gpt-3.5-turbo' : 'gpt-4o', // Fall back to 3.5 on retries for speed
      messages: messages,
      temperature: 0.2, // Low temperature for consistent outputs
      response_format: { type: 'json_object' },
      max_tokens: 800,
    }, {
      timeout: API_TIMEOUT
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error('OpenAI returned empty content');
    }

    let response;
    try {
      response = JSON.parse(content);
    } catch (jsonError: unknown) {
      // Try to recover from malformed JSON
      const recovered = attemptJsonRecovery(content);
      if (!recovered) {
        const errorMessage = jsonError instanceof Error 
          ? jsonError.message 
          : 'Unknown JSON parsing error';
        throw new Error(`Malformed JSON response: ${errorMessage}`);
      }
      response = recovered;
    }

    // Validate the response has the required fields
    if (!response.improved || typeof response.improved !== 'string') {
      console.log(`⚠️ No valid improvement suggested for: "${truncatedText}"`);
      return null; // No valid improvement suggested
    }
    
    // Log the successful suggestion
    console.log(`✅ Generated suggestion for bullet: "${truncatedText}"`);
    console.log(`   Improved to: "${response.improved.substring(0, 50)}${response.improved.length > 50 ? '...' : ''}"`);

    return {
      bulletId,
      original: originalText,
      improved: response.improved,
      section,
      reasoning: response.reasoning || "Improved for better clarity and impact.",
      category: response.category || determineCategory(response.reasoning || "", section)
    };
  } catch (error) {
    console.error(`❌ OpenAI API error for bullet ${bulletId}:`, error);
    throw error;
  }
}

/**
 * Build a prompt specific to the bullet and section type
 */
function buildBulletPrompt(
  bulletText: string,
  sectionType: SectionType,
  sectionTitle: string,
  jobDescription: string,
  isRetry: boolean = false
): Array<OpenAI.Chat.ChatCompletionMessageParam> {
  // Base system message
  const systemMessage = {
    role: "system" as const,
    content: `You are an expert resume writing assistant. Your task is to improve ONLY the single bullet point provided, making it more impactful and tailored to a specific job description.

Focus on:
1. Using strong action verbs
2. Quantifying achievements where possible
3. Incorporating relevant skills and keywords from the job description
4. Making the language more concise and impactful
5. Highlighting accomplishments rather than just responsibilities

IMPORTANT: Only improve the specific bullet point provided, not the entire section or resume. The bullet point may be a single sentence, phrase, or line from the resume.

Return a JSON response with these fields:
- improved: the rewritten bullet text (just the single improved bullet)
- reasoning: brief explanation of the improvements made
- category: one of ["action-verbs", "quantify-achievements", "technical-skills", "industry-keywords", "concise-language", "accomplishment-focus"]`
  };

  // Select few-shot examples based on section type
  let examples: Array<OpenAI.Chat.ChatCompletionMessageParam> = [];
  
  switch (sectionType) {
    case SectionType.EXPERIENCE:
      examples = [
        {
          role: "user" as const,
          content: `Improve this bullet from my Work Experience section for a Product Manager role that requires "agile methodologies, data analysis, and cross-functional collaboration": 
          
"Managed the development of a mobile app"`
        },
        {
          role: "assistant" as const,
          content: `{
  "improved": "Led cross-functional team using agile methodologies to deliver a mobile app, resulting in 35% user growth and improving key metrics based on data analysis",
  "reasoning": "Added quantifiable results (35% growth), incorporated key job requirements (agile, data analysis, cross-functional collaboration), and used a stronger action verb (led vs managed)",
  "category": "quantify-achievements"
}`
        }
      ];
      break;
      
    case SectionType.SKILLS:
      examples = [
        {
          role: "user" as const,
          content: `Improve this bullet from my Skills section for a Software Developer role that requires "proficiency in React, Node.js, and cloud platforms": 
          
"Web development skills"`
        },
        {
          role: "assistant" as const,
          content: `{
  "improved": "Full-stack web development with React, Redux, Node.js, and AWS cloud services (EC2, S3, Lambda)",
  "reasoning": "Specified technical skills that match the job requirements rather than using a generic phrase",
  "category": "technical-skills"
}`
        }
      ];
      break;
      
    case SectionType.SUMMARY:
      examples = [
        {
          role: "user" as const,
          content: `Improve this bullet from my Summary section for a Marketing Manager role that requires "SEO expertise, content strategy, and campaign management": 
          
"Marketing professional with experience in digital advertising"`
        },
        {
          role: "assistant" as const,
          content: `{
  "improved": "Results-driven marketing professional with 5+ years leading SEO strategy and content campaigns that increased organic traffic by 120% and conversion rates by 15%",
  "reasoning": "Added specific expertise that matches job requirements (SEO, content strategy, campaign management) and quantifiable achievements",
  "category": "industry-keywords"
}`
        }
      ];
      break;
  
    // Add other section types as needed
    default:
      // Generic examples for other section types
      examples = [
        {
          role: "user" as const,
          content: `Improve this bullet point for a job that requires "attention to detail and project management": 
          
"Responsible for various projects and tasks"`
        },
        {
          role: "assistant" as const,
          content: `{
  "improved": "Successfully managed 5+ concurrent projects with meticulous attention to detail, consistently delivering under budget and ahead of deadlines",
  "reasoning": "Added quantification (5+ projects), incorporated job requirements (attention to detail, project management), and included specific achievements (under budget, ahead of deadlines)",
  "category": "accomplishment-focus"
}`
        }
      ];
      break;
  }

  // Final user message with the actual bullet to improve
  const userMessage = {
    role: "user" as const,
    content: `Improve this SINGLE bullet from my ${sectionTitle} section based on this job description:

Job Description:
${jobDescription.substring(0, 500)}${jobDescription.length > 500 ? '...' : ''}

Bullet point to improve (ONLY THIS SINGLE BULLET):
"${bulletText.trim()}"`
  };

  // Combine all messages
  return [systemMessage, ...examples, userMessage];
}

/**
 * Attempt to recover from malformed JSON
 */
function attemptJsonRecovery(content: string): any | null {
  try {
    // Try to extract JSON object using regex
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    // If that fails, try to build a minimal valid response
    if (content.includes('improved') && content.includes(':')) {
      // Extract the improved part after "improved":
      const improvedMatch = content.match(/improved['"]?\s*:\s*['"]([^'"]+)['"]/i);
      if (improvedMatch && improvedMatch[1]) {
        return {
          improved: improvedMatch[1],
          reasoning: "Extracted from malformed response",
          category: "general"
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error("JSON recovery attempt failed:", error);
    return null;
  }
}

/**
 * Determine the category of the suggestion based on the reasoning text
 */
function determineCategory(reasoning: string, sectionType: SectionType): string {
  reasoning = reasoning.toLowerCase();
  
  if (reasoning.includes('action verb') || reasoning.includes('stronger verb')) {
    return 'action-verbs';
  } else if (reasoning.includes('quantif') || reasoning.includes('measur') || reasoning.includes('metric') || reasoning.includes('%')) {
    return 'quantify-achievements';
  } else if (reasoning.includes('technical') || reasoning.includes('technolog') || reasoning.includes('skill')) {
    return 'technical-skills';
  } else if (reasoning.includes('industry') || reasoning.includes('keyword') || reasoning.includes('terminolog')) {
    return 'industry-keywords';
  } else if (reasoning.includes('concise') || reasoning.includes('brief') || reasoning.includes('shorter')) {
    return 'concise-language';
  } else if (reasoning.includes('accomplish') || reasoning.includes('achiev') || reasoning.includes('result') || reasoning.includes('impact')) {
    return 'accomplishment-focus';
  }
  
  // Default categories based on section type
  switch (sectionType) {
    case SectionType.EXPERIENCE:
      return 'accomplishment-focus';
    case SectionType.SKILLS:
      return 'technical-skills';
    case SectionType.SUMMARY:
      return 'concise-language';
    case SectionType.EDUCATION:
      return 'accomplishment-focus';
    default:
      return 'general';
  }
}

/**
 * Apply a suggested improvement to a resume bullet using diff-match-patch
 */
export function applySuggestionToBullet(
  resumeText: string, 
  bulletId: string, 
  improvedText: string
): string {
  // This is a stub for future implementation of applying suggestions directly
  // Would use diff-match-patch to avoid the issues with direct text replacement
  // This would likely be implemented in the frontend
  return resumeText;
}