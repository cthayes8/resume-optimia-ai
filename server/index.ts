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

  // Set a timeout for the entire request processing - increase for large PDFs
  const requestTimeout = 45000; // 45 seconds max for total processing
  let timeoutTriggered = false;
  const requestTimer = setTimeout(() => {
    console.error('⏱️ Total request processing timeout reached, sending partial results');
    timeoutTriggered = true;
    if (results && results.length > 0) {
      sendResponse();
    }
  }, requestTimeout);

  let results: any[] = [];
  const sendResponse = () => {
    clearTimeout(requestTimer);
    
    // Only send response if headers haven't been sent already
    if (!res.headersSent) {
      // Create HTML chunks for each section with suggestions
      const htmlChunks = results.map(({ id, html }) => ({ 
        id, 
        html, 
        generateSuggestions: false 
      }));
      
      // Transform suggestion format for frontend
      const items = [];
      
      // Iterate through each section and its suggestions
      for (const section of results) {
        for (const suggestion of section.suggestions) {
          // Ensure we're only using individual bullet suggestions
          if (suggestion.deleteHtml && suggestion.deleteHtml.length > 500) {
            console.warn(`Skipping oversized suggestion with ${suggestion.deleteHtml.length} characters`);
            continue;
          }
          
          items.push({
            id: suggestion.id,
            deleteText: suggestion.deleteHtml, // This contains just the bullet text
            replacementOptions: [{
              id: `opt-${suggestion.id}`,
              addText: suggestion.insertHtml,
              reasoning: suggestion.reasoning,
              category: suggestion.ruleId
            }],
            type: suggestion.type,
            category: suggestion.ruleId,
            bulletId: suggestion.bulletId // Pass bulletId to frontend for exact matching
          });
        }
      }

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
    // Parse the resume to get structured sections and bullets
    const parsedResume = await parseResume(resumeHtml, 'html');
    console.log(`📊 Parsed resume into ${parsedResume.sections.length} sections`);
    
    // Debug: Show what sections were detected
    console.log('Detected sections:');
    parsedResume.sections.forEach(section => {
      console.log(`- ${section.type} (${section.title}): ${section.bullets.length} bullets | Content length: ${section.content?.length || 0}`);
    });

    // SPECIAL DIRECT HTML PARSING FOR BULLETS
    // This bypasses issues with the resume parser by directly extracting list items
    console.log('🔍 Attempting direct bullet extraction from HTML...');
    
    // Extract resume sections based on known headers
    const domParser = new JSDOM(resumeHtml);
    const document = domParser.window.document;
    
    // First identify section headers (typically bold or heading elements)
    const potentialHeaders = Array.from(document.querySelectorAll('b, strong, h1, h2, h3, h4, h5, h6')) as Element[];
    const sectionHeaders = potentialHeaders.filter((el: Element) => {
      const text = el.textContent?.trim() || '';
      return (
        text === text.toUpperCase() && text.length > 3 && text.length < 30
      ) || /^(SUMMARY|EXPERIENCE|EDUCATION|SKILLS|AWARDS|CERTIFICATIONS)/i.test(text);
    });
    
    console.log(`Found ${sectionHeaders.length} potential section headers in HTML`);
    
    // Create a mapping of section headers to their sections and extract bullets from those sections
    const extractedSections: ResumeSection[] = [];
    
    for (let i = 0; i < sectionHeaders.length; i++) {
      const header = sectionHeaders[i] as Element;
      const headerText = header.textContent?.trim() || '';
      
      // Determine section type
      let sectionType: SectionType;
      if (/SUMMARY|PROFILE|OBJECTIVE/i.test(headerText)) sectionType = SectionType.SUMMARY;
      else if (/EXPERIENCE|EMPLOYMENT|WORK/i.test(headerText)) sectionType = SectionType.EXPERIENCE;
      else if (/EDUCATION|ACADEMIC/i.test(headerText)) sectionType = SectionType.EDUCATION;
      else if (/SKILLS|CERTIFICATIONS/i.test(headerText)) sectionType = SectionType.SKILLS;
      else if (/AWARDS|HONORS/i.test(headerText)) sectionType = SectionType.AWARDS;
      else if (/PROJECTS|PORTFOLIO/i.test(headerText)) sectionType = SectionType.PROJECTS;
      else sectionType = SectionType.OTHER;
      
      console.log(`Processing section header: "${headerText}" (${sectionType})`);
      
      // Extract content until the next header or end of document
      let nextElement = header.nextElementSibling as Element | null;
      const contentElements: Element[] = [];
      
      // Keep going until we hit another header or run out of elements
      while (
        nextElement && 
        !sectionHeaders.includes(nextElement) &&
        !Array.from(nextElement.querySelectorAll('b, strong, h1, h2, h3, h4, h5, h6')).some(
          (el: Element) => sectionHeaders.includes(el)
        )
      ) {
        contentElements.push(nextElement);
        nextElement = nextElement.nextElementSibling as Element | null;
      }
      
      // Extract bullets from this section (list items or paragraphs that start with bullets)
      const bullets: ResumeBullet[] = [];
      
      // Look for list items in this section's content
      contentElements.forEach((el: Element) => {
        // Extract all list items
        const listItems = Array.from(el.querySelectorAll('li')) as Element[];
        
        listItems.forEach((li: Element) => {
          const text = li.textContent?.trim() || '';
          if (text && text.length > 3) {
            bullets.push({
              id: `bullet-${Math.random().toString(36).substring(2, 10)}`,
              text: text,
              level: 0
            });
          }
        });
        
        // Also look for paragraphs that start with bullet characters
        const paragraphs = Array.from(el.querySelectorAll('p, div')) as Element[];
        
        paragraphs.forEach((p: Element) => {
          const text = p.textContent?.trim() || '';
          
          // Check if this contains multiple newline-separated items
          if (text && text.includes('\n')) {
            // Split by newlines and create a bullet for each non-empty line
            const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
            
            console.log(`Found ${lines.length} newline-separated items in section ${headerText}`);
            
            lines.forEach(line => {
              // Clean up the line - remove bullet characters if present
              let cleanLine = line.trim();
              if (cleanLine.startsWith('•') || cleanLine.startsWith('-') || cleanLine.startsWith('*')) {
                cleanLine = cleanLine.substring(1).trim();
              }
              
              // Skip very short lines and obvious headers
              if (cleanLine.length < 3 || cleanLine === cleanLine.toUpperCase()) {
                return;
              }
              
              bullets.push({
                id: `line-bullet-${Math.random().toString(36).substring(2, 10)}`,
                text: cleanLine,
                level: 0
              });
            });
          }
          // Check for individual bullet points
          else if (text && (text.startsWith('•') || text.startsWith('-') || text.startsWith('*')) && text.length > 5) {
            bullets.push({
              id: `bullet-${Math.random().toString(36).substring(2, 10)}`,
              text: text.substring(1).trim(), // Remove the bullet character
              level: 0
            });
          }
        });
        
        // Special case: also check the raw text content for newlines in case they're not wrapped in paragraphs
        const rawText = el.textContent?.trim() || '';
        if (rawText && rawText.includes('\n') && !bullets.some(b => b.text === rawText)) {
          // Split by newlines and create a bullet for each non-empty line
          const lines = rawText.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
          
          console.log(`Found ${lines.length} raw newline-separated items in section ${headerText}`);
          
          lines.forEach(line => {
            // Clean up the line - remove bullet characters if present
            let cleanLine = line.trim();
            if (cleanLine.startsWith('•') || cleanLine.startsWith('-') || cleanLine.startsWith('*')) {
              cleanLine = cleanLine.substring(1).trim();
            }
            
            // Skip lines that are too short or are already included
            if (cleanLine.length < 5 || bullets.some(b => b.text === cleanLine)) {
              return;
            }
            
            // Skip lines that look like headers or section titles
            if (cleanLine === cleanLine.toUpperCase() && cleanLine.length < 20) {
              return;
            }
            
            // For EXPERIENCE section, skip lines that look like job titles/company names
            if (sectionType === SectionType.EXPERIENCE) {
              if (/\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec|20\d{2}|present)\b/i.test(cleanLine)) {
                if (cleanLine.length < 50) {
                  return; // Skip date ranges and job header lines
                }
              }
            }
            
            bullets.push({
              id: `line-${Math.random().toString(36).substring(2, 10)}`,
              text: cleanLine,
              level: 0
            });
          });
        }
      });
      
      // For experience sections, look for company sections and extract bullets
      if (sectionType === SectionType.EXPERIENCE) {
        // Find potential company/role headers within this section
        const potentialCompanyHeaders: Element[] = [];
        
        contentElements.forEach((el: Element) => {
          const boldElements = Array.from(el.querySelectorAll('b, strong, i, em')) as Element[];
          
          boldElements.forEach((boldEl: Element) => {
            const text = boldEl.textContent?.trim() || '';
            if (text && text.length < 50) {
              potentialCompanyHeaders.push(boldEl);
            }
          });
        });
        
        console.log(`Found ${potentialCompanyHeaders.length} potential company headers in EXPERIENCE section`);
        
        // For each company, extract bullets that follow it
        for (let j = 0; j < potentialCompanyHeaders.length; j++) {
          const companyHeader = potentialCompanyHeaders[j];
          const companyName = companyHeader.textContent?.trim() || '';
          
          // Find the closest parent that might contain bullets
          let parentContainer = companyHeader.parentElement;
          while (parentContainer && !parentContainer.querySelector('li, ul, ol')) {
            parentContainer = parentContainer.parentElement;
          }
          
          if (parentContainer) {
            // Extract bullet points for this company
            const companyBullets = Array.from(parentContainer.querySelectorAll('li')) as Element[];
            
            companyBullets.forEach((bullet: Element) => {
              const text = bullet.textContent?.trim() || '';
              if (text && text.length > 10) {
                bullets.push({
                  id: `company-bullet-${Math.random().toString(36).substring(2, 10)}`,
                  text: text,
                  level: 0
                });
              }
            });
          }
        }
      }
      
      console.log(`Extracted ${bullets.length} bullets from section "${headerText}"`);
      
      // For EXPERIENCE sections, add special handling for bulleted lists 
      if (sectionType === SectionType.EXPERIENCE) {
        console.log('🔍 Applying special handling for EXPERIENCE section bullets');
        
        // SPECIAL CASE FOR THIS RESUME FORMAT:
        // Look specifically for list items with '•' symbols
        const experienceContent = contentElements.map(el => el.outerHTML || '').join('\n');
        
        // This resume format has "• Text" at the start of achievement bullets
        // Using more specific regexes to detect this format
        const specificBulletRegex = /•\s+([^•\n<]+)/g;
        const altBulletRegex = /[●■-]\s+([^\n<●■-]+)/g;
        let match;
        const foundBullets = [];
        
        // Try primary bullet pattern (•)
        while ((match = specificBulletRegex.exec(experienceContent)) !== null) {
          const bulletText = match[1].trim();
          if (bulletText && bulletText.length > 10) {
            console.log(`Found bullet: "${bulletText.substring(0, 50)}${bulletText.length > 50 ? '...' : ''}"`);
            
            foundBullets.push({
              id: `exp-bullet-${Math.random().toString(36).substring(2, 10)}`,
              text: bulletText,
              level: 0
            });
          }
        }
        
        // Try alternate bullet patterns (●, ■, -)
        while ((match = altBulletRegex.exec(experienceContent)) !== null) {
          const bulletText = match[1].trim();
          // Skip if we already have this text
          if (bulletText && bulletText.length > 10 && !foundBullets.some(b => b.text === bulletText)) {
            console.log(`Found alternate bullet: "${bulletText.substring(0, 50)}${bulletText.length > 50 ? '...' : ''}"`);
            
            foundBullets.push({
              id: `exp-bullet-alt-${Math.random().toString(36).substring(2, 10)}`,
              text: bulletText,
              level: 0
            });
          }
        }
        
        if (foundBullets.length > 0) {
          console.log(`🎯 Found ${foundBullets.length} formatted bullets in EXPERIENCE section`);
          // If we found bullets with this more specific method, use only these
          bullets.length = 0; // Clear existing bullets
          bullets.push(...foundBullets);
        } else {
          console.log('⚠️ No formatted bullets found, falling back to other methods');
        }
      }
      
      // SPECIAL HANDLING FOR SUMMARY SECTION
      if (sectionType === SectionType.SUMMARY && bullets.length === 0) {
        const summaryText = contentElements.map(el => el.textContent?.trim() || '').join('\n').trim();
        
        if (summaryText && summaryText.length > 20) {
          console.log(`🔍 Adding SUMMARY section text as a single bullet: "${summaryText.substring(0, 50)}${summaryText.length > 50 ? '...' : ''}"`);
          
          bullets.push({
            id: `summary-${Math.random().toString(36).substring(2, 10)}`,
            text: summaryText,
            level: 0
          });
        }
      }
      
      // Create a section object
      extractedSections.push({
        id: `section-${Math.random().toString(36).substring(2, 10)}`,
        type: sectionType,
        title: headerText,
        content: contentElements.map(el => el.outerHTML).join(''),
        bullets: bullets
      });
    }
    
    console.log(`🔍 Direct extraction found ${extractedSections.length} sections with ${extractedSections.reduce((sum, s) => sum + s.bullets.length, 0)} total bullets`);
    
    // Use the extracted sections if they have more bullets than the parsed resume
    const extractedBulletCount = extractedSections.reduce((sum, s) => sum + s.bullets.length, 0);
    const parsedBulletCount = parsedResume.sections.reduce((sum, s) => sum + s.bullets.length, 0);
    
    if (extractedBulletCount > parsedBulletCount) {
      console.log(`Using directly extracted sections (${extractedBulletCount} bullets) instead of parsed resume (${parsedBulletCount} bullets)`);
      parsedResume.sections = extractedSections;
    }

    // Remove duplicate section types that might be causing issues
    // Keep only the most complete section of each type
    const uniqueSections = new Map<string, ResumeSection>();
    
    parsedResume.sections.forEach(section => {
      const sectionKey = section.type.toString();
      
      // If we haven't seen this section type before, or this one has more bullets than the existing one
      if (!uniqueSections.has(sectionKey) || 
          section.bullets.length > uniqueSections.get(sectionKey)!.bullets.length) {
        uniqueSections.set(sectionKey, section);
      }
    });
    
    // Replace the sections array with our deduplicated list
    parsedResume.sections = Array.from(uniqueSections.values());
    
    console.log(`📊 Deduplicated to ${parsedResume.sections.length} unique sections`);
    
    // Process each section
    await Promise.all(parsedResume.sections.map(async (section) => {
      console.log(`\n📋 Processing section: ${section.type} (${section.title})`);
      
      // For EXPERIENCE sections, analyze each bullet to detect company headers vs accomplishment statements
      if (section.type === SectionType.EXPERIENCE && section.bullets.length > 0) {
        console.log(`Analyzing ${section.bullets.length} bullets in EXPERIENCE section to identify companies vs achievements`);
        
        // Group bullets by company (detect company headers vs actual bullets)
        const companies: {[key: string]: ResumeBullet[]} = {};
        let currentCompany = "Unknown";
        
        for (const bullet of section.bullets) {
          const text = bullet.text.trim();
          
          // Skip empty bullets
          if (!text) continue;
          
          // MUCH more aggressive company header detection:
          // 1. Company names are typically short
          // 2. Often contain business entities like LLC, Inc, Corp
          // 3. Often standalone without verbs or achievements
          // 4. May include dates, titles, or be in all caps
          const isCompanyHeader = 
            // Short text is likely a header
            (text.length < 80) && (
              // Contains dates
              /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|20\d{2}|19\d{2})\b/i.test(text) ||
              // All caps or title case
              (text === text.toUpperCase() && text.length < 40) ||
              // Contains job titles
              /\b(manager|director|executive|president|vp|vice president|analyst|specialist|consultant)\b/i.test(text) ||
              // Contains typical company format (word followed by dash or hyphen)
              /^[A-Za-z0-9\s]+([-–—]|$)/.test(text) ||
              // Doesn't contain achievement verbs (typically found in bullets)
              !/\b(achieved|improved|increased|decreased|developed|implemented|managed|created|led|generated|reduced|delivered|designed)\b/i.test(text)
            );
          
          if (isCompanyHeader) {
            // This is probably a company/role header
            currentCompany = text;
            companies[currentCompany] = companies[currentCompany] || [];
            console.log(`  Identified company/role header: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
          } else {
            // This is probably an achievement bullet
            companies[currentCompany] = companies[currentCompany] || [];
            companies[currentCompany].push(bullet);
          }
        }
        
        // Log company breakdown
        console.log(`Found ${Object.keys(companies).length} companies/roles in EXPERIENCE section`);
        for (const company in companies) {
          console.log(`  - "${company.substring(0, 30)}${company.length > 30 ? '...' : ''}": ${companies[company].length} achievement bullets`);
        }
        
        // Filter to keep only accomplishment bullets for each company
        const achievementBullets = Object.values(companies).flat();
        console.log(`After filtering, keeping ${achievementBullets.length} achievement bullets in EXPERIENCE section`);
        
        section.bullets = achievementBullets;
      }
      
      // Apply much more aggressive filtering for bullets
      const originalBulletCount = section.bullets.length;
      
      // Track which filters are removing bullets
      const filterCounts = {
        tooShort: 0,
        tooLong: 0,
        allCaps: 0,
        dateRange: 0,
        jobTitle: 0,
        education: 0,
        skills: 0,
        awards: 0
      };
      
      // MUCH MORE LENIENT filtering to remove non-bullet content
      section.bullets = section.bullets.filter(bullet => {
        const text = bullet.text.trim();
        
        // Skip empty bullets only
        if (!text) {
          return false;
        }
        
        // Skip extremely short content (just single characters)
        if (text.length < 5) {
          filterCounts.tooShort++;
          return false;
        }
        
        // Skip extremely long content (paragraphs)
        if (text.length > 800) {
          filterCounts.tooLong++;
          return false;
        }
        
        // Skip text that's ALL CAPS and very short (likely headers)
        if (text === text.toUpperCase() && text.length < 20) {
          filterCounts.allCaps++;
          return false;
        }
        
        // Skip obvious date ranges when alone
        if (/^\s*\d{4}\s*[-–]\s*\d{4}\s*$/.test(text)) {
          filterCounts.dateRange++;
          return false;
        }
        
        // Only filter EXPERIENCE bullets if they're very obvious headers
        if (section.type === SectionType.EXPERIENCE) {
          if (text.length < 30 && /^[A-Z][a-z]+ [A-Z][a-z]+$/.test(text)) {
            // Simple proper noun pattern like "Company Name"
            filterCounts.jobTitle++;
            return false;
          }
        }
        
        // Accept all other content as valid bullets - VERY LENIENT!
        return true;
      });
      
      // Log which filters removed bullets
      console.log(`Filtering details for section ${section.type}:`);
      Object.entries(filterCounts).forEach(([filter, count]) => {
        if (count > 0) {
          console.log(`  - ${filter}: removed ${count} bullets`);
        }
      });
      
      console.log(`Filtered from ${originalBulletCount} to ${section.bullets.length} valid bullets`);
      
      // Don't limit bullets for now - process all valid ones
      // const MAX_BULLETS_PER_SECTION = 5; // Limit to 5 bullets per section max
      // if (section.bullets.length > MAX_BULLETS_PER_SECTION) {
      //   console.log(`Limiting section ${section.type} from ${section.bullets.length} to ${MAX_BULLETS_PER_SECTION} bullets`);
      //   section.bullets = section.bullets.slice(0, MAX_BULLETS_PER_SECTION);
      // }
      
      // Fix type comparison issues for section types
      if (typeof section.type === 'string') {
        // Handle section type mapping to avoid indexing errors
        let sectionTypeValue: SectionType;
        switch (section.type) {
          case 'SUMMARY': sectionTypeValue = SectionType.SUMMARY; break;
          case 'EXPERIENCE': sectionTypeValue = SectionType.EXPERIENCE; break;
          case 'EDUCATION': sectionTypeValue = SectionType.EDUCATION; break;
          case 'SKILLS': sectionTypeValue = SectionType.SKILLS; break;
          case 'PROJECTS': sectionTypeValue = SectionType.PROJECTS; break;
          case 'AWARDS': sectionTypeValue = SectionType.AWARDS; break;
          case 'OTHER': sectionTypeValue = SectionType.OTHER; break;
          default: sectionTypeValue = SectionType.OTHER;
        }
        section.type = sectionTypeValue;
      }
      
      console.log(`Section ${section.type} has ${section.bullets.length} valid bullets after processing`);
      
      // Debug: Show the first few bullets for each section
      if (section.bullets.length > 0) {
        console.log('Sample bullets:');
        section.bullets.slice(0, Math.min(3, section.bullets.length)).forEach((bullet, index) => {
          console.log(`  ${index+1}. "${bullet.text.substring(0, 50)}${bullet.text.length > 50 ? '...' : ''}" (ID: ${bullet.id})`);
        });
      }
    }));

    // Generate improvements in parallel with limited concurrency (3 at a time)
    const processChunksWithConcurrency = async (sections: ResumeSection[], concurrencyLimit = 3) => {
      // Create a function to process each section
      const processSingleSection = async (section: ResumeSection) => {
        // Skip sections with very few bullets
        if (!section.bullets || section.bullets.length === 0) {
          console.log(`Skipping section ${section.type} - no bullets`);
          return [];
        }
        
        console.log(`Generating improvements for section ${section.type} with ${section.bullets.length} bullets`);
        try {
          // Generate improvements for just this section
          const sectionCopy = { ...parsedResume, sections: [section] };
          const sectionImprovements = await generateImprovements(sectionCopy, jobDescription, openaiClient);
          console.log(`Generated ${sectionImprovements.length} improvements for section ${section.type}`);
          return sectionImprovements;
        } catch (error) {
          console.error(`Error generating improvements for section ${section.type}:`, error);
          return [];
        }
      };
      
      // Process in batches to limit concurrency
      const allImprovements: Array<{
        bulletId: string;
        original: string;
        improved: string;
        reasoning: string;
        category: string;
      }> = [];
      
      // Prioritize sections that have the most impact (EXPERIENCE and SUMMARY)
      const prioritizedSections = [...sections].sort((a, b) => {
        // Give EXPERIENCE highest priority, followed by SUMMARY
        if (a.type === SectionType.EXPERIENCE) return -1;
        if (b.type === SectionType.EXPERIENCE) return 1;
        if (a.type === SectionType.SUMMARY) return -1;
        if (b.type === SectionType.SUMMARY) return 1;
        return 0;
      });
      
      const sectionQueue = prioritizedSections;
      
      while (sectionQueue.length > 0) {
        const batch = sectionQueue.splice(0, concurrencyLimit);
        const batchResults = await Promise.allSettled(
          batch.map(section => processSingleSection(section))
        );
        
        // Collect results from successful promises
        batchResults.forEach((result) => {
          if (result.status === 'fulfilled') {
            allImprovements.push(...result.value);
          }
        });
        
        // Check if we need to send partial results due to timeout
        if (timeoutTriggered && allImprovements.length > 0) {
          console.log(`Timeout triggered, sending partial results from ${allImprovements.length} improvements`);
          break;
        }
      }
      
      return allImprovements;
    };
    
    // Process sections in parallel with lower concurrency (2 at a time instead of 3)
    const improvementResults = await processChunksWithConcurrency(parsedResume.sections, 2);
    console.log(`✅ Generated ${improvementResults.length} improvement suggestions total`);
    
    // Transform the results to match expected frontend format
    // Group suggestions by section
    const sectionMap = new Map<string, any>();
    
    // First create a section container for each section in the resume
    parsedResume.sections.forEach(section => {
      // Ensure we have HTML content for the section
      let sectionHtml = section.content;
      
      // If content is empty but we have the section title, create minimal HTML
      if ((!sectionHtml || sectionHtml.trim() === '') && section.title) {
        sectionHtml = `<div class="resume-section"><h2>${section.title}</h2><div class="section-content"></div></div>`;
      }
      
      sectionMap.set(section.id, {
        id: section.id,
        html: sectionHtml,
        suggestions: []
      });
    });
    
    // Add suggestions to their corresponding sections
    improvementResults.forEach(sugg => {
      // Skip suggestions with overly large content
      if (sugg.original && sugg.original.length > 300) {
        console.warn(`Skipping large suggestion with ${sugg.original.length} characters`);
        return;
      }
      
      // Find which section contains this bullet
      const section = parsedResume.sections.find(sec => 
        sec.bullets.some(bullet => bullet.id === sugg.bulletId)
      );
      
      if (section && sectionMap.has(section.id)) {
        const sectionContainer = sectionMap.get(section.id);
        
        // Find the exact bullet in the section
        const bullet = section.bullets.find(b => b.id === sugg.bulletId);
        
        if (bullet) {
          sectionContainer.suggestions.push({
            id: `sugg-${sugg.bulletId}`,
            deleteHtml: sugg.original, // This is the text of the individual bullet
            insertHtml: sugg.improved,
            reasoning: sugg.reasoning,
            ruleId: sugg.category,
            type: section.type,
            bulletId: sugg.bulletId // Keep track of the bulletId
          });
        }
      }
    });
    
    // Convert map to array of sections with suggestions
    results = Array.from(sectionMap.values())
      .filter(section => section.suggestions.length > 0);
    
    // Log the sections with suggestions
    console.log(`\n📊 Sections with suggestions:`);
    results.forEach(section => {
      console.log(`- Section ${section.id}: ${section.suggestions.length} suggestions`);
    });
    
    // If we have results, send them
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