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

// The visitor's AI, through the AI Wallet extension.
const client = new AiConnect();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isPlayground(window.location.search) ? <ModulesPlayground client={client} /> : (
      <AiConnectProvider client={client}>
        <App />
      </AiConnectProvider>
    )}
  </StrictMode>,
);
