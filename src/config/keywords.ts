interface KeywordSynonyms {
  [key: string]: string[];
}

// Common variations and synonyms for technical terms and skills
export const keywordSynonyms: KeywordSynonyms = {
  // Programming Languages
  'javascript': ['js', 'ecmascript', 'node.js', 'nodejs'],
  'typescript': ['ts'],
  'python': ['py', 'python3'],
  'java': ['jvm', 'j2ee'],
  
  // Web Technologies
  'react': ['reactjs', 'react.js'],
  'angular': ['angularjs', 'angular.js', 'ng'],
  'vue': ['vuejs', 'vue.js'],
  'node': ['nodejs', 'node.js'],
  
  // Cloud & DevOps
  'aws': ['amazon web services', 'amazon aws'],
  'azure': ['microsoft azure', 'ms azure'],
  'docker': ['containerization', 'containers'],
  'kubernetes': ['k8s', 'container orchestration'],
  'ci/cd': ['continuous integration', 'continuous deployment', 'continuous delivery', 'devops pipeline'],
  
  // Databases
  'sql': ['mysql', 'postgresql', 'rdbms'],
  'nosql': ['mongodb', 'dynamodb', 'document database'],
  'graphql': ['graph ql', 'graph database'],
  
  // Methodologies
  'agile': ['scrum', 'kanban', 'sprint planning'],
  'waterfall': ['traditional methodology'],
  'tdd': ['test driven development', 'test-driven'],
  
  // Architecture
  'microservices': ['service oriented', 'distributed systems'],
  'serverless': ['faas', 'function as a service'],
  'backend': ['back-end', 'back end', 'server-side'],
  'frontend': ['front-end', 'front end', 'client-side'],
  'fullstack': ['full-stack', 'full stack'],
  
  // Common Skills
  'problem solving': ['analytical thinking', 'critical thinking'],
  'communication': ['interpersonal', 'collaboration'],
  'leadership': ['team lead', 'project lead', 'management'],
  
  // Testing
  'unit testing': ['junit', 'jest', 'pytest'],
  'e2e testing': ['end to end testing', 'integration testing'],
  'qa': ['quality assurance', 'testing'],
  
  // Version Control
  'git': ['version control', 'github', 'gitlab'],
  
  // Project Management
  'jira': ['atlassian', 'project tracking'],
  'confluence': ['documentation', 'wiki'],
  
  // Security
  'oauth': ['authentication', 'auth'],
  'jwt': ['json web token', 'authentication token'],
  'cybersecurity': ['security', 'infosec'],
  
  // Data Science
  'machine learning': ['ml', 'ai', 'artificial intelligence'],
  'data analysis': ['analytics', 'data science'],
  'statistics': ['statistical analysis', 'data modeling'],
  
  // Mobile
  'ios': ['swift', 'objective-c', 'apple development'],
  'android': ['kotlin', 'java mobile', 'mobile development'],
  'react native': ['mobile development', 'cross platform'],
  
  // Design
  'ui': ['user interface', 'frontend design'],
  'ux': ['user experience', 'usability'],
  'responsive design': ['mobile-first', 'adaptive design'],
}; 