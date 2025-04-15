import mammoth from 'mammoth';
import { JSDOM } from 'jsdom';
import { diff_match_patch } from 'diff-match-patch';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Define section types as enum for consistency
export enum SectionType {
  CONTACT = 'CONTACT',
  SUMMARY = 'SUMMARY',
  EXPERIENCE = 'EXPERIENCE',
  EDUCATION = 'EDUCATION',
  SKILLS = 'SKILLS',
  PROJECTS = 'PROJECTS',
  CERTIFICATIONS = 'CERTIFICATIONS',
  AWARDS = 'AWARDS',
  PUBLICATIONS = 'PUBLICATIONS',
  LANGUAGES = 'LANGUAGES',
  INTERESTS = 'INTERESTS',
  REFERENCES = 'REFERENCES',
  OTHER = 'OTHER'
}

// Improved interfaces for better type safety and structure
export interface ResumeBullet {
  id: string;       // Unique ID for bullet (for applying suggestions)
  text: string;     // Bullet text content
  level: number;    // Nesting level (0 for top-level bullets)
}

export interface ResumeSection {
  id: string;             // Unique ID for section
  type: SectionType;      // Section type from enum
  title: string;          // Original section title as it appears
  bullets: ResumeBullet[]; // Bullets in this section
  content: string;        // Full section content (for backward compatibility)
}

export interface ParsedResume {
  sections: ResumeSection[];
  metadata: {
    hasContactInfo: boolean;
    hasSummary: boolean;
    hasExperience: boolean;
    hasEducation: boolean;
    hasSkills: boolean;
    isAtsCompatible: boolean;   // New field to track ATS compatibility
    originalFormat: string;     // 'pdf', 'docx', 'html', etc.
  };
}

// Map common section titles to standard section types
const SECTION_TITLE_MAP: Record<string, SectionType> = {
  // Contact/Personal info section titles
  'contact': SectionType.CONTACT,
  'contact information': SectionType.CONTACT,
  'personal information': SectionType.CONTACT,
  'personal details': SectionType.CONTACT,
  
  // Summary section titles
  'summary': SectionType.SUMMARY,
  'professional summary': SectionType.SUMMARY,
  'career summary': SectionType.SUMMARY,
  'profile': SectionType.SUMMARY,
  'professional profile': SectionType.SUMMARY,
  'objective': SectionType.SUMMARY,
  'career objective': SectionType.SUMMARY,
  'about me': SectionType.SUMMARY,
  
  // Experience section titles
  'experience': SectionType.EXPERIENCE,
  'work experience': SectionType.EXPERIENCE,
  'employment history': SectionType.EXPERIENCE,
  'work history': SectionType.EXPERIENCE,
  'professional experience': SectionType.EXPERIENCE,
  'career experience': SectionType.EXPERIENCE,
  
  // Education section titles
  'education': SectionType.EDUCATION,
  'academic background': SectionType.EDUCATION,
  'educational background': SectionType.EDUCATION,
  'academic history': SectionType.EDUCATION,
  'qualifications': SectionType.EDUCATION,
  
  // Skills section titles
  'skills': SectionType.SKILLS,
  'technical skills': SectionType.SKILLS,
  'core skills': SectionType.SKILLS,
  'key skills': SectionType.SKILLS,
  'competencies': SectionType.SKILLS,
  'abilities': SectionType.SKILLS,
  'technologies': SectionType.SKILLS,
  'expertise': SectionType.SKILLS,
  
  // Projects section titles
  'projects': SectionType.PROJECTS,
  'personal projects': SectionType.PROJECTS,
  'project experience': SectionType.PROJECTS,
  
  // Certifications section titles
  'certifications': SectionType.CERTIFICATIONS,
  'certificates': SectionType.CERTIFICATIONS,
  'professional certifications': SectionType.CERTIFICATIONS,
  'credentials': SectionType.CERTIFICATIONS,
  
  // Awards section titles
  'awards': SectionType.AWARDS,
  'honors': SectionType.AWARDS,
  'achievements': SectionType.AWARDS,
  'recognition': SectionType.AWARDS,
  
  // Publications section titles
  'publications': SectionType.PUBLICATIONS,
  'published works': SectionType.PUBLICATIONS,
  'research': SectionType.PUBLICATIONS,
  
  // Languages section titles
  'languages': SectionType.LANGUAGES,
  'language proficiency': SectionType.LANGUAGES,
  
  // Interests section titles
  'interests': SectionType.INTERESTS,
  'hobbies': SectionType.INTERESTS,
  'activities': SectionType.INTERESTS,
  
  // References section titles
  'references': SectionType.REFERENCES,
  'professional references': SectionType.REFERENCES
};

/**
 * Main entry point for resume parsing
 * Determines the input type and routes to appropriate parser
 */
export async function parseResume(
  input: string | Buffer,
  fileType: 'pdf' | 'docx' | 'html' = 'html'
): Promise<ParsedResume> {
  let html = '';
  
  // Handle different input formats
  switch (fileType) {
    case 'pdf':
      try {
        // For PDF content, we'll use a simplified text-based approach for now
        // PDF parsing in Node.js requires special setup
        const textContent = input.toString('utf-8');
        html = convertPlainTextToHtml(textContent);
        console.log("PDF parsing using basic text conversion. Use HTML for most accurate results.");
      } catch (error) {
        console.error('Error parsing PDF:', error);
        // Fall back to a basic conversion as placeholder
        html = `<div class="pdf-fallback">Could not parse PDF properly. Please upload HTML or DOCX format.</div>`;
      }
      break;
    case 'docx':
      html = await parseDocxToHtml(input as Buffer);
      break;
    case 'html':
      html = input as string;
      break;
    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
  
  // Continue with parsing HTML
  return parseHtmlResume(html, fileType);
}

/**
 * Parse DOCX file to HTML using Mammoth
 */
async function parseDocxToHtml(docxBuffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.convertToHtml({ buffer: docxBuffer });
    return result.value;
  } catch (error) {
    console.error('Error parsing DOCX:', error);
    throw new Error('Failed to parse DOCX file');
  }
}

/**
 * Parse HTML resume into structured sections
 */
function parseHtmlResume(html: string, originalFormat: string): ParsedResume {
  const dom = new JSDOM(html);
  const document = dom.window.document;
  
  // Initialize result structure
  const sections: ResumeSection[] = [];
  const metadata = {
    hasContactInfo: false,
    hasSummary: false,
    hasExperience: false,
    hasEducation: false,
    hasSkills: false,
    isAtsCompatible: true,  // Assume compatible by default
    originalFormat
  };
  
  // Step 1: Identify potential section headers using OpenResume approach
  const possibleHeaders = identifySectionHeaders(document);
  
  // Step 2: Extract sections based on identified headers
  if (possibleHeaders.length > 0) {
    // We found headers, extract sections based on them
    extractSectionsFromHeaders(document, possibleHeaders, sections);
    
    // Post-processing: Check if we can identify contact section
    if (!sections.some(s => s.type === SectionType.CONTACT)) {
      // If the first section has a name pattern and contact info, mark it as CONTACT
      const firstSection = sections[0];
      if (firstSection && 
          firstSection.type === SectionType.OTHER &&
          /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.test(firstSection.content)) {
        firstSection.type = SectionType.CONTACT;
      }
    }
  } else {
    // Fallback: No clear headers found, try to infer sections from content
    inferSectionsFromContent(document, sections);
  }
  
  // Step 3: Process each section to update metadata
  for (const section of sections) {
    // Update metadata based on section type
    switch (section.type) {
      case SectionType.CONTACT:
        metadata.hasContactInfo = true;
        break;
      case SectionType.SUMMARY:
        metadata.hasSummary = true;
        break;
      case SectionType.EXPERIENCE:
        metadata.hasExperience = true;
        break;
      case SectionType.EDUCATION:
        metadata.hasEducation = true;
        break;
      case SectionType.SKILLS:
        metadata.hasSkills = true;
        break;
    }
    
    // If no bullets were detected but there's content, create a generic bullet
    if (section.bullets.length === 0 && section.content) {
      section.bullets = [{
        id: uuidv4(),
        text: section.content,
        level: 0
      }];
    }
  }
  
  // Check ATS compatibility
  checkAtsCompatibility(sections, metadata);
  
  return { sections, metadata };
}

/**
 * Identify potential section headers in the document
 * Uses multiple heuristics to find section titles:
 * 1. Heading elements (h1-h6)
 * 2. Bold or all caps elements that are standalone (likely section titles)
 * 3. Text containing keywords from known section titles
 */
function identifySectionHeaders(document: Document): Element[] {
  const headers: Element[] = [];
  
  // 1. Find all heading elements
  const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
  headers.push(...Array.from(headings));
  
  // 2. Find elements that are likely headers based on styling and positioning
  const allElements = document.querySelectorAll('p, div, span, strong, b');
  
  for (const element of Array.from(allElements)) {
    const text = element.textContent?.trim() || '';
    
    // Skip empty or very long elements (unlikely to be headers)
    if (!text || text.length > 50 || text.length < 2) continue;
    
    // Check if element contains a known section title
    const normalizedText = text.toLowerCase();
    if (Object.keys(SECTION_TITLE_MAP).some(key => normalizedText.includes(key))) {
      headers.push(element);
      continue;
    }
    
    // Check if element is styled like a header (bold, all caps, etc.)
    const isAllCaps = text === text.toUpperCase() && text.length > 2;
    const isBold = element.tagName === 'STRONG' || 
                  element.tagName === 'B' || 
                  element.innerHTML.includes('<strong>') ||
                  element.innerHTML.includes('<b>');
    
    const isStandalone = !element.nextElementSibling?.textContent?.trim() ||
                         element.parentElement?.children.length === 1;
    
    if ((isAllCaps || isBold) && isStandalone) {
      headers.push(element);
    }
  }
  
  // Sort headers by their position in the document
  // Can't use getBoundingClientRect in Node.js, so use DOM order instead
  return headers.sort((a, b) => {
    // Get the position in the document by walking the DOM tree
    const posA = getElementPosition(a);
    const posB = getElementPosition(b);
    return posA - posB;
  });
}

/**
 * Get the position of an element in the document by counting
 * preceding elements
 */
function getElementPosition(element: Element): number {
  let position = 0;
  let current = element;
  
  // Walk up to the root
  while (current.parentElement) {
    // Count preceding siblings
    let sibling = current.previousElementSibling;
    while (sibling) {
      position++;
      sibling = sibling.previousElementSibling;
    }
    
    current = current.parentElement;
    position++; // Count the parent too
  }
  
  return position;
}

/**
 * Extract sections based on identified headers
 */
function extractSectionsFromHeaders(
  document: Document, 
  headers: Element[], 
  sections: ResumeSection[]
) {
  // Create a map to track section types by position
  const mainSections: {element: Element, type: SectionType, index: number}[] = [];
  
  // First pass: identify main sections only
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i];
    const title = header.textContent?.trim() || '';
    const type = getSectionTypeFromTitle(title);
    
    // Only consider major section headers (h1, h2) or explicit section keywords
    if (type !== SectionType.OTHER || header.tagName === 'H1' || header.tagName === 'H2') {
      mainSections.push({ element: header, type, index: i });
    }
  }
  
  // Second pass: extract content for each main section
  for (let i = 0; i < mainSections.length; i++) {
    const { element, type, index } = mainSections[i];
    const title = element.textContent?.trim() || '';
    
    // Find next main section to determine boundaries
    const nextIndex = i < mainSections.length - 1 ? mainSections[i+1].index : headers.length;
    
    // Get all headers between current and next main section
    const subheaders = headers.slice(index + 1, nextIndex);
    
    // Extract all content until the next main section
    let content = '';
    let currentElement: Element | null = element.nextElementSibling;
    const stopElement = nextIndex < headers.length ? headers[nextIndex] : null;
    
    // Collect basic content (excluding sub-sections that will be processed separately)
    while (currentElement && currentElement !== stopElement && !subheaders.includes(currentElement)) {
      content += currentElement.textContent?.trim() + '\n';
      currentElement = currentElement.nextElementSibling;
    }
    
    // Create the main section
    const section: ResumeSection = {
      id: uuidv4(),
      type,
      title,
      content: content.trim(),
      bullets: extractBullets(element, subheaders[0] || stopElement)
    };
    
    // Special handling for EXPERIENCE section - process job subsections
    if (type === SectionType.EXPERIENCE && subheaders.length > 0) {
      // Process job entries (subsections of experience)
      for (let j = 0; j < subheaders.length; j++) {
        const jobHeader = subheaders[j];
        const jobTitle = jobHeader.textContent?.trim() || '';
        const nextJobHeader = j < subheaders.length - 1 ? subheaders[j+1] : stopElement;
        
        // Extract job details
        let jobContent = '';
        let jobElement: Element | null = jobHeader.nextElementSibling;
        
        while (jobElement && jobElement !== nextJobHeader && jobElement !== stopElement) {
          jobContent += jobElement.textContent?.trim() + '\n';
          jobElement = jobElement.nextElementSibling;
        }
        
        // Extract bullets for this job
        const jobBullets = extractBullets(jobHeader, nextJobHeader as Element | undefined);
        
        // Add a job entry bullet to the main experience section
        section.bullets.push({
          id: uuidv4(),
          text: jobTitle,
          level: 0
        });
        
        // Add company/date info if available (usually the first paragraph after job title)
        if (jobContent.trim()) {
          section.bullets.push({
            id: uuidv4(),
            text: jobContent.trim().split('\n')[0],
            level: 1
          });
        }
        
        // Add all job bullets as sub-bullets of the experience section
        section.bullets.push(
          ...jobBullets.map(bullet => ({
            ...bullet,
            level: 1  // Make these sub-bullets
          }))
        );
      }
    }
    
    sections.push(section);
  }
}

/**
 * Extract bullet points from a section
 */
function extractBullets(
  sectionHeader: Element, 
  nextSectionHeader: Element | undefined
): ResumeBullet[] {
  const bullets: ResumeBullet[] = [];
  let currentElement: Element | null = sectionHeader.nextElementSibling;
  
  // Process elements until we reach the next section header
  while (currentElement && currentElement !== nextSectionHeader) {
    // Check for list items
    if (currentElement.tagName === 'UL' || currentElement.tagName === 'OL') {
      const listItems = currentElement.querySelectorAll('li');
      listItems.forEach(li => {
        bullets.push({
          id: uuidv4(),
          text: li.textContent?.trim() || '',
          level: 0  // Top level
        });
      });
    }
    // Check for paragraphs that look like bullets
    else if (currentElement.tagName === 'P' || currentElement.tagName === 'DIV') {
      const text = currentElement.textContent?.trim() || '';
      
      // Skip empty paragraphs or likely sub-headers
      if (text && text.length > 2 && !isLikelySubheader(currentElement)) {
        // Check if paragraph starts with a bullet character or number
        if (/^[•\-–—*⁃◦⦿⁌⁍➤➢➣➔➙➛➜➝➞➟➠➧➨➩➪➫➬➭➮➯➱➲➳➵➶➷➸➹➺]|\d+[.)]/.test(text)) {
          bullets.push({
            id: uuidv4(),
            text,
            level: 0
          });
        }
        // Or if it's not a likely header and follows a pattern of bullet-like paragraphs
        else if (bullets.length > 0 && text.length < 200) {
          bullets.push({
            id: uuidv4(),
            text,
            level: 0
          });
        }
      }
    }
    
    currentElement = currentElement.nextElementSibling;
  }
  
  return bullets;
}

/**
 * Check if an element is likely a sub-header rather than content
 */
function isLikelySubheader(element: Element): boolean {
  const text = element.textContent?.trim() || '';
  
  // Check for common patterns in sub-headers (dates, job titles, etc.)
  const isDateRange = /\d{4}\s*(-|–|—)\s*(\d{4}|present|current)/i.test(text);
  const isAllCaps = text === text.toUpperCase() && text.length > 2;
  const isBold = element.tagName === 'STRONG' || 
                element.tagName === 'B' || 
                element.innerHTML.includes('<strong>') ||
                element.innerHTML.includes('<b>');
  
  return (isDateRange || isAllCaps || isBold) && text.length < 60;
}

/**
 * Fallback method to infer sections when no clear headers are found
 */
function inferSectionsFromContent(document: Document, sections: ResumeSection[]) {
  // Try to identify content blocks that might be sections
  const contentBlocks = document.querySelectorAll('div, section, article');
  
  for (const block of Array.from(contentBlocks)) {
    // Skip very small blocks
    if (block.textContent?.length || 0 < 50) continue;
    
    // Check if this block has any identifiable content
    const content = block.textContent?.trim() || '';
    
    // Look for keywords that might indicate a section type
    let sectionType = SectionType.OTHER;
    let sectionTitle = '';
    
    // Check for contact info patterns
    if (/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.test(content)) {
      sectionType = SectionType.CONTACT;
      sectionTitle = 'Contact Information';
    }
    // Check for education patterns
    else if (/degree|university|college|school|gpa|graduated/i.test(content)) {
      sectionType = SectionType.EDUCATION;
      sectionTitle = 'Education';
    }
    // Check for experience patterns
    else if (/experience|job|position|work|employment|career/i.test(content)) {
      sectionType = SectionType.EXPERIENCE;
      sectionTitle = 'Experience';
    }
    // Check for skills patterns
    else if (/skills|proficient|knowledge|familiar|expertise/i.test(content)) {
      sectionType = SectionType.SKILLS;
      sectionTitle = 'Skills';
    }
    
    // If we identified a section, add it
    if (sectionType !== SectionType.OTHER || sections.length === 0) {
      sections.push({
        id: uuidv4(),
        type: sectionType,
        title: sectionTitle,
        content,
        bullets: extractBullets(block, null as any)
      });
    }
  }
}

/**
 * Check if the resume is ATS compatible based on various factors
 */
function checkAtsCompatibility(sections: ResumeSection[], metadata: any) {
  // A simple check - more sophisticated checks can be added
  metadata.isAtsCompatible = (
    metadata.hasContactInfo &&
    metadata.hasExperience &&
    sections.length >= 3 // At least a few sections
  );
}

/**
 * Check if text is likely a job title
 */
function isLikelyJobTitle(text: string): boolean {
  const jobTitleKeywords = [
    'engineer', 'developer', 'manager', 'director', 'analyst', 
    'specialist', 'coordinator', 'associate', 'lead', 'consultant',
    'designer', 'architect'
  ];
  
  const normalizedText = text.toLowerCase();
  
  // Common job title patterns
  const hasJobTitleKeyword = jobTitleKeywords.some(keyword => 
    normalizedText.includes(keyword)
  );
  
  return hasJobTitleKeyword && text.length < 50 && !normalizedText.includes('experience');
}

/**
 * Check if text contains a date range
 */
function isDateRange(text: string): boolean {
  return /\d{4}\s*(-|–|—)\s*(\d{4}|present|current)/i.test(text);
}

/**
 * Get section type just from the title (without content context)
 */
function getSectionTypeFromTitle(title: string): SectionType {
  const normalizedTitle = title.toLowerCase();
  
  // Check if the title matches any known section title
  for (const [key, value] of Object.entries(SECTION_TITLE_MAP)) {
    if (normalizedTitle === key || normalizedTitle.includes(key)) {
      return value;
    }
  }
  
  return SectionType.OTHER;
}

/**
 * Simple conversion of plain text to structured HTML
 * Detects section headers and bullet points in plain text
 */
function convertPlainTextToHtml(text: string): string {
  // Split text into lines
  const lines = text.split(/\r?\n/).map(line => line.trim());
  let html = '<div class="pdf-content">';
  let inSection = false;
  let inList = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) {
      // Empty line - close any open lists
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      html += '<br/>';
      continue;
    }
    
    // Check for section headers (ALL CAPS or short bold-like text)
    if (line === line.toUpperCase() && line.length > 2 && line.length < 30) {
      // Close any open sections or lists
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      if (inSection) {
        html += '</div>';
      }
      
      // Start a new section
      html += `<div class="section"><h2>${line}</h2>`;
      inSection = true;
      continue;
    }
    
    // Check for bullet points
    if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*') || /^\d+\.\s/.test(line)) {
      if (!inList) {
        html += '<ul>';
        inList = true;
      }
      
      // Extract the bullet text (remove the bullet character)
      const bulletText = line.replace(/^[•\-*]|\d+\.\s/, '').trim();
      html += `<li>${bulletText}</li>`;
      continue;
    }
    
    // Regular text
    if (inList) {
      html += '</ul>';
      inList = false;
    }
    
    html += `<p>${line}</p>`;
  }
  
  // Close any open tags
  if (inList) html += '</ul>';
  if (inSection) html += '</div>';
  
  html += '</div>';
  return html;
} 