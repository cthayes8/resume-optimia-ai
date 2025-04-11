
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Failed to find the root element");

// Removed StrictMode to prevent double rendering and API call issues
createRoot(rootElement).render(<App />);
