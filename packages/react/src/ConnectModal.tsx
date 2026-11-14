// The connect window a site shows: one card over the page that connects the visitor's AI through
// the AI Wallet. It says what happens, waits while the wallet asks the visitor, explains how to
// install the wallet when it is missing, and lets the visitor try again after a refusal. The
// accounts themselves live in the wallet; the site never handles them.

import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AboutView } from './AboutView.tsx';
import { useAiConnect } from './AiConnectProvider.tsx';
import { ConnectRing } from './ConnectRing.tsx';
import { installLabel, refusalStep } from './messages.ts';

function useEscapeToClose(onClose: () => void) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
}

function Step({ live, title, text, children }: { live: boolean; title: string; text: string; children?: ReactNode }) {
  return (
    <div className="aic-step">
      <ConnectRing live={live} />
      <p className="aic-step-title" role="status">{title}</p>
      <p className="aic-hint">{text}</p>
      {children}
    </div>
  );
}

function WalletStep() {
  const { client, state, messages } = useAiConnect();
  const connect = () => client.connect();
  switch (state.status) {
    case 'checking':
      return <Step live={false} title={messages.checking} text="" />;
    case 'connecting':
      return <Step live title={messages.waitingTitle} text={messages.waitingText} />;
    case 'noWallet':
      return (
        <Step live={false} title={messages.installTitle} text={messages.installText}>
          <a className="aic-primary" href={client.installUrl} target="_blank" rel="noreferrer">
            {installLabel(messages, client.browser)}
          </a>
        </Step>
      );
    case 'error': {
      const refusal = refusalStep(state, messages);
      return (
        <Step live={false} title={refusal.title} text={refusal.text}>
          <button type="button" className="aic-primary" onClick={connect}>{refusal.action}</button>
        </Step>
      );
    }
    default:
      return (
        <Step live={false} title={messages.connectTitle} text={messages.connectText}>
          <button type="button" className="aic-primary" onClick={connect}>{messages.connectButton}</button>
        </Step>
      );
  }
}

export function ConnectModal() {
  const { messages, closePicker } = useAiConnect();
  const [about, setAbout] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  useEscapeToClose(closePicker);
  useEffect(() => cardRef.current?.focus(), [about]);
  return (
    <div className="aic-backdrop" dir={messages.dir} onClick={closePicker}>
      <div ref={cardRef} className="aic-card" role="dialog" aria-modal="true" aria-labelledby="aic-title" tabIndex={-1}
        onClick={(event) => event.stopPropagation()}>
        <header className="aic-header">
          <h2 id="aic-title" className="aic-title">{about ? messages.help : messages.title}</h2>
          <button type="button" className="aic-icon-button" aria-label={messages.close} onClick={closePicker}>×</button>
        </header>
        {about ? <AboutView /> : <WalletStep />}
        <button type="button" className="aic-link" onClick={() => setAbout(!about)}>
          {about ? messages.back : messages.help}
        </button>
      </div>
    </div>
  );
}
