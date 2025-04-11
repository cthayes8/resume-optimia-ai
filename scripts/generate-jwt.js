import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Get your JWT secret from env
const JWT_SECRET = process.env.VITE_TIPTAP_AI_JWT_SECRET;
const APP_ID = process.env.VITE_TIPTAP_AI_APP_ID;

if (!JWT_SECRET || !APP_ID) {
  console.error('Error: Missing VITE_TIPTAP_AI_JWT_SECRET or VITE_TIPTAP_AI_APP_ID in .env file');
  process.exit(1);
}

// Create the payload
const payload = {
  // Required claims
  iss: 'https://api.tiptap.dev',  // issuer
  aud: 'https://api.tiptap.dev',  // audience
  sub: APP_ID,                    // subject (your App ID)
  
  // Optional but recommended claims
  iat: Math.floor(Date.now() / 1000),         // issued at (now)
  exp: Math.floor(Date.now() / 1000) + 86400 * 30,  // expires in 30 days
};

// Generate the token
const token = jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256' });

console.log('Generated JWT Token:');
console.log(token);
console.log('\nAdd this token to your .env file as VITE_TIPTAP_AI_JWT_TOKEN'); 