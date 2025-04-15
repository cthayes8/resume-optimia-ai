import type { ParsedResume, ResumeSection } from './resume-parser.js';

export interface ATSValidationIssue {
  problematicText: string;
  suggestedFix: string;
  reason: string;
}

export interface ATSValidation {
  score: number;
  issues: ATSValidationIssue[];
}

export function validateATS(resume: ParsedResume): ATSValidation {
  const issues: ATSValidationIssue[] = [];
  
  // Check for required sections
  if (!resume.metadata.hasContactInfo) {
    issues.push({
      problematicText: '',
      suggestedFix: 'Add a contact section with your email and phone number',
      reason: 'Missing contact information section'
    });
  }
  
  if (!resume.metadata.hasSummary) {
    issues.push({
      problematicText: '',
      suggestedFix: 'Add a professional summary section highlighting your key qualifications',
      reason: 'Missing professional summary section'
    });
  }
  
  // Analyze each section
  resume.sections.forEach((section: ResumeSection) => {
    const content = section.content.toLowerCase();
    
    switch (section.type) {
      case 'EXPERIENCE':
        // Check for bullet points
        if (!content.includes('•') && !content.includes('-')) {
          issues.push({
            problematicText: section.content,
            suggestedFix: 'Format experience using bullet points',
            reason: 'Experience section should use bullet points for better ATS parsing'
          });
        }
        
        // Check for dates
        if (!content.match(/\b(19|20)\d{2}\b/)) {
          issues.push({
            problematicText: section.content,
            suggestedFix: 'Add clear dates for each position',
            reason: 'Experience entries should include dates'
          });
        }
        break;
        
      case 'EDUCATION':
        // Check for degree information
        if (!content.includes('degree') && !content.includes('bachelor') && !content.includes('master')) {
          issues.push({
            problematicText: section.content,
            suggestedFix: 'Clearly state your degree type',
            reason: 'Education section should specify degree type'
          });
        }
        break;
        
      case 'SKILLS':
        // Check for skill categorization
        if (content.length > 50 && !content.includes(':') && !content.includes('•') && !content.includes('-')) {
          issues.push({
            problematicText: section.content,
            suggestedFix: 'Organize skills into categories with clear formatting',
            reason: 'Skills should be clearly categorized and formatted for ATS systems'
          });
        }
        break;
    }
  });
  
  // Calculate score (100 - number of issues * 10, minimum 0)
  const score = Math.max(0, 100 - issues.length * 10);
  
  return { score, issues };
} 