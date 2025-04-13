import { highlightColors } from './highlight-colors'

export const resumeRules = [
  {
    id: 'action-verbs',
    title: 'Use Strong Action Verbs',
    prompt: 'Replace weak or passive verbs with strong action verbs commonly used in resumes. For example, replace "responsible for" with "managed", "led", or "executed".',
    color: highlightColors[0].color,
    backgroundColor: highlightColors[0].backgroundColor,
  },
  {
    id: 'quantify-achievements',
    title: 'Quantify Achievements',
    prompt: 'Suggest ways to add specific numbers, percentages, or metrics to achievements. For example, "increased sales" could become "increased sales by 25%".',
    color: highlightColors[1].color,
    backgroundColor: highlightColors[1].backgroundColor,
  },
  {
    id: 'keywords-match',
    title: 'Job Keywords Match',
    prompt: 'Identify opportunities to incorporate relevant keywords from the job description, ensuring they are used naturally and in context.',
    color: highlightColors[2].color,
    backgroundColor: highlightColors[2].backgroundColor,
  },
  {
    id: 'concise-bullets',
    title: 'Concise Bullet Points',
    prompt: 'Make bullet points more concise while maintaining impact. Aim for 1-2 lines per bullet point.',
    color: highlightColors[3].color,
    backgroundColor: highlightColors[3].backgroundColor,
  },
  {
    id: 'skills-highlight',
    title: 'Skills Emphasis',
    prompt: 'Suggest ways to better highlight relevant technical and soft skills mentioned in the job description.',
    color: highlightColors[4].color,
    backgroundColor: highlightColors[4].backgroundColor,
  },
  {
    id: 'achievement-focus',
    title: 'Achievement-Focused',
    prompt: 'Transform duty-focused statements into achievement-focused ones by emphasizing results and impact.',
    color: highlightColors[5].color,
    backgroundColor: highlightColors[5].backgroundColor,
  },
  {
    id: 'clarity-improvement',
    title: 'Clarity Improvement',
    prompt: 'Suggest clearer and more professional ways to phrase unclear or informal content.',
    color: highlightColors[6].color,
    backgroundColor: highlightColors[6].backgroundColor,
  },
  {
    id: 'ats-optimization',
    title: 'ATS Optimization',
    prompt: 'Suggest improvements to make the content more ATS-friendly, such as using standard section headings and avoiding complex formatting.',
    color: highlightColors[7].color,
    backgroundColor: highlightColors[7].backgroundColor,
  },
] 