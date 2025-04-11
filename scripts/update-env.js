import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env');

try {
  // Run the token generation script and capture its output
  const tokenOutput = execSync('node scripts/generate-jwt.js', { encoding: 'utf8' });
  
  // Extract the token from the output
  const tokenMatch = tokenOutput.match(/Generated JWT Token:\s*(.+?)(?:\n|$)/);
  if (!tokenMatch || !tokenMatch[1]) {
    console.error('Failed to extract token from output');
    process.exit(1);
  }
  
  const token = tokenMatch[1].trim();
  console.log(`Token generated: ${token.substring(0, 15)}...`);
  
  // Read the current .env file
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  // Check if VITE_TIPTAP_AI_JWT_TOKEN already exists
  const updatedEnvContent = envContent.includes('VITE_TIPTAP_AI_JWT_TOKEN=')
    ? envContent.replace(/VITE_TIPTAP_AI_JWT_TOKEN=.*$/m, `VITE_TIPTAP_AI_JWT_TOKEN=${token}`)
    : `${envContent.trim()}\nVITE_TIPTAP_AI_JWT_TOKEN=${token}\n`;
  
  // Write the updated content back to .env
  fs.writeFileSync(envPath, updatedEnvContent);
  
  console.log('✅ Successfully updated .env file with new JWT token');

} catch (error) {
  console.error('Error updating .env file:', error);
  process.exit(1);
} 