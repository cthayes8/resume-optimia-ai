import jwt from 'jsonwebtoken';

// Your Tiptap Pro app ID
const appId = 'e97ll11m';

// Your Tiptap Pro key from .env
const secret = 'y048f008c706fd15da297a503bf820298ce3417df0e4da2e9cbfcee58cad7db6f';

// Create token payload
const payload = {
  iss: 'https://api.tiptap.dev',
  aud: 'https://api.tiptap.dev',
  sub: appId,
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7) // 7 days
};

// Generate token
const token = jwt.sign(payload, secret, { algorithm: 'HS256' });

console.log('New Tiptap JWT Token:');
console.log(token); 