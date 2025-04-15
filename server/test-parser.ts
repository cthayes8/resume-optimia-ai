import { parseResume } from './resume-parser.js';
import fs from 'fs';
import path from 'path';

// Test parsing HTML
async function testHtmlParser() {
  console.log('Testing HTML parser...');
  
  // Simple HTML resume for testing
  const html = `
    <div>
      <h1>John Doe</h1>
      <p>john.doe@example.com | (123) 456-7890 | linkedin.com/in/johndoe</p>
      
      <h2>SUMMARY</h2>
      <p>Experienced software engineer with a passion for creating elegant solutions.</p>
      
      <h2>EXPERIENCE</h2>
      <div>
        <h3>Senior Software Engineer</h3>
        <p>TechCorp Inc. | 2018 - Present</p>
        <ul>
          <li>Developed and maintained cloud-based applications</li>
          <li>Led a team of 5 developers on a major project</li>
          <li>Reduced system latency by 40% through optimizations</li>
        </ul>
        
        <h3>Software Developer</h3>
        <p>Startup Labs | 2015 - 2018</p>
        <ul>
          <li>Built RESTful APIs for mobile applications</li>
          <li>Implemented CI/CD pipelines</li>
        </ul>
      </div>
      
      <h2>EDUCATION</h2>
      <p>Bachelor of Science in Computer Science</p>
      <p>University of Technology | 2011 - 2015</p>
      
      <h2>SKILLS</h2>
      <p>JavaScript, TypeScript, React, Node.js, Python, AWS, Docker, Kubernetes</p>
    </div>
  `;
  
  try {
    const parsedResume = await parseResume(html);
    console.log('Parsed resume:');
    console.log(JSON.stringify(parsedResume, null, 2));
  } catch (error) {
    console.error('Error parsing HTML:', error);
  }
}

// Create a test file for DOCX instead of running PDF test
async function createTestFiles() {
  // Create a test directory if it doesn't exist
  const testDir = path.join(process.cwd(), '..', 'test-files');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
  
  // Create a test file
  const sampleTextPath = path.join(testDir, 'sample-resume.txt');
  const sampleText = `
John Doe
john.doe@example.com | (123) 456-7890 | linkedin.com/in/johndoe

SUMMARY
Experienced software engineer with a passion for creating elegant solutions.

EXPERIENCE
Senior Software Engineer
TechCorp Inc. | 2018 - Present
• Developed and maintained cloud-based applications
• Led a team of 5 developers on a major project
• Reduced system latency by 40% through optimizations

Software Developer
Startup Labs | 2015 - 2018
• Built RESTful APIs for mobile applications
• Implemented CI/CD pipelines

EDUCATION
Bachelor of Science in Computer Science
University of Technology | 2011 - 2015

SKILLS
JavaScript, TypeScript, React, Node.js, Python, AWS, Docker, Kubernetes
  `;
  
  fs.writeFileSync(sampleTextPath, sampleText);
  console.log(`Created sample resume text file at ${sampleTextPath}`);
  
  // We'll skip DOCX and PDF for now
  console.log('To test DOCX parsing in the future, add a sample-resume.docx file to the test-files directory');
}

// Run all tests
async function runTests() {
  try {
    // Create test files first
    await createTestFiles();
    
    // Run HTML parsing test
    await testHtmlParser();
    
    console.log('\nAll tests completed.');
    console.log('\nNote: PDF and DOCX parsing tests were skipped.');
    console.log('For production, integrate a robust PDF parser like pdf-parse or pdfjs-dist with the correct Node.js configuration.');
  } catch (error) {
    console.error('Error running tests:', error);
  }
}

runTests(); 