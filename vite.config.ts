import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    server: {
      host: "::",
      port: 3000,
      proxy: {
        '/v1/ai': {
          target: 'https://api.tiptap.dev',
          changeOrigin: true,
          secure: true,
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              const token = env.VITE_TIPTAP_AI_JWT_TOKEN || '';
              const appId = env.VITE_TIPTAP_AI_APP_ID || '';
              proxyReq.setHeader('Authorization', `Bearer ${token}`);
              proxyReq.setHeader('X-App-ID', appId);
            });
          }
        }
      }
    },
    plugins: [react(), componentTagger()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
