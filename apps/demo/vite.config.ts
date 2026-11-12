import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { demoServer } from './server/demoServer.ts';

// SDK mode loads each AI SDK on its first run. Vite would discover them only then and reload the
// page to bundle them, so they are bundled when the dev server starts.
const LAZY_SDKS = [
  'openai',
  '@anthropic-ai/sdk',
  '@google/genai',
  'ai',
  '@ai-sdk/openai',
  '@langchain/openai',
  '@langchain/core/messages',
  '@llamaindex/openai',
];

export default defineConfig({ plugins: [react(), demoServer()], optimizeDeps: { include: LAZY_SDKS } });
