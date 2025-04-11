import jwt from 'jsonwebtoken';

// Your JWT secret from Tiptap Cloud
const JWT_SECRET = 'gd54SE3yjArnRd250Pk7OWav1XMNjdUXI1XV6GhPZm0syNqFLpWFQj5HZ2bGdMss';
const APP_ID = 'e97ll11m';

// Create the payload
const payload = {
  // Required claims
  iss: 'https://api.tiptap.dev',  // issuer
  aud: 'https://api.tiptap.dev',  // audience
  sub: APP_ID,                    // subject (your App ID)
  
  // Optional but recommended claims
  iat: Math.floor(Date.now() / 1000),         // issued at (now)
  exp: Math.floor(Date.now() / 1000) + 3600,  // expires in 1 hour
};

// Generate the token
const token = jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256' });

console.log('Generated JWT Token:');
console.log(token); 