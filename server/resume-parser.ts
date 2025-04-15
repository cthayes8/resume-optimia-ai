import { JSDOM } from 'jsdom';

export interface ResumeSection {
  type: string;
  title: string;
  content: string;
}

export interface ParsedResume {
  sections: ResumeSection[];
  metadata: {
    hasContactInfo: boolean;
    hasSummary: boolean;
    hasExperience: boolean;
    hasEducation: boolean;
    hasSkills: boolean;
  };
}

export function parseResume(html: string): ParsedResume {
  const dom = new JSDOM(html);
  const document = dom.window.document;
  
  const sections: ResumeSection[] = [];
  const metadata = {
    hasContactInfo: false,
    hasSummary: false,
    hasExperience: false,
    hasEducation: false,
    hasSkills: false
  };
  
  // Parse sections
  const sectionElements = document.querySelectorAll('section');
  sectionElements.forEach(section => {
    const title = section.querySelector('h1,h2,h3,h4,h5,h6')?.textContent?.trim() || '';
    const content = section.textContent?.trim() || '';
    const type = getSectionType(title, content);
    
    sections.push({ type, title, content });
    
    // Update metadata
    switch (type) {
      case 'CONTACT':
        metadata.hasContactInfo = true;
        break;
      case 'SUMMARY':
        metadata.hasSummary = true;
        break;
      case 'EXPERIENCE':
        metadata.hasExperience = true;
        break;
      case 'EDUCATION':
        metadata.hasEducation = true;
        break;
      case 'SKILLS':
        metadata.hasSkills = true;
        break;
    }
  });
  
  return { sections, metadata };
}

function getSectionType(title: string, content: string): string {
  const normalizedTitle = title.toLowerCase();
  const normalizedContent = content.toLowerCase();
  
  if (normalizedTitle.includes('contact') || /^[A-Z][a-z]+ [A-Z][a-z]+\s*[\|\-•]\s*.+@.+\..+/.test(content)) {
    return 'CONTACT';
  }
  
  if (normalizedTitle.includes('summary') || normalizedTitle.includes('objective')) {
    return 'SUMMARY';
  }
  
  if (normalizedTitle.includes('experience') || normalizedTitle.includes('work')) {
    return 'EXPERIENCE';
  }
  
  if (normalizedTitle.includes('education') || normalizedContent.includes('university') || normalizedContent.includes('degree')) {
    return 'EDUCATION';
  }
  
  if (normalizedTitle.includes('skills') || normalizedTitle.includes('technologies')) {
    return 'SKILLS';
  }
  
  if (normalizedTitle.includes('projects')) {
    return 'PROJECTS';
  }
  
  return 'OTHER';
} 