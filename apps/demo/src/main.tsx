// The demo's page: the bookshop chat on the chat hook or an AI SDK, or, with `?module=` in the
// address, the playground of the interface modules.

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AiConnect } from '@tensorpass/aiconnect';
import { AiConnectProvider } from '@tensorpass/aiconnect-react';
import '@tensorpass/aiconnect-react/styles.css';
import './demo.css';
import { App } from './App.tsx';
import { ModulesPlayground } from './modules/ModulesPlayground.tsx';
import { isPlayground } from './modules/playgroundSettings.ts';

// The site's TensorPass site key: `siteKey` in the address, for trying another key, or VITE_TENSORPASS_SITE_KEY.
const siteKey = new URLSearchParams(window.location.search).get('siteKey')
  ?? (import.meta.env.VITE_TENSORPASS_SITE_KEY as string | undefined);

// The visitor's AI, through the AI Wallet extension, or an account signed in to on the page without it.
const client = new AiConnect({ siteKey: siteKey || undefined });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isPlayground(window.location.search) ? <ModulesPlayground client={client} /> : (
      <AiConnectProvider client={client}>
        <App />
      </AiConnectProvider>
    )}
  </StrictMode>,
);
