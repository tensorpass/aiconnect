import { useState } from 'react';
import { ConnectButton, useAiChat, useAiConnect } from '@tensorpass/aiconnect-react';
import { ChatView } from './ChatView.tsx';
import { demoTools } from './demoTools.ts';
import { SegmentedControl } from './SegmentedControl.tsx';
import { SdkMode } from './sdkMode/SdkMode.tsx';

const SYSTEM = 'You recommend books from this site\'s catalog. Always search the catalog before recommending.';

// The two ways a site talks to the visitor's AI: our chat hook, or the AI SDK it already uses.
const MODES = [
  { id: 'hook', label: 'Chat hook' },
  { id: 'sdk', label: 'SDK mode' },
];

function Connection() {
  const { state, client } = useAiConnect();
  if (state.status === 'connected') {
    return (
      <p className="status">
        Connected with {state.providerName}{state.model ? ` (${state.model})` : ''}{' '}
        <button type="button" onClick={() => client.disconnect()}>{state.account ? 'Sign out' : 'Disconnect'}</button>
      </p>
    );
  }
  return <ConnectButton />;
}

function HookChat() {
  const chat = useAiChat({ system: SYSTEM, tools: demoTools });
  return <ChatView {...chat} />;
}

function Chats() {
  const { state } = useAiConnect();
  const [mode, setMode] = useState(MODES[0].id);
  if (state.status !== 'connected') {
    return <p>Connect your AI to ask for a book that fits your mood.</p>;
  }
  return (
    <>
      <SegmentedControl label="Mode" options={MODES} value={mode} onChange={setMode} />
      {mode === 'hook' ? <HookChat /> : <SdkMode system={SYSTEM} />}
    </>
  );
}

export function App() {
  return (
    <main>
      <h1>Bookshop demo</h1>
      <Connection />
      <Chats />
    </main>
  );
}
