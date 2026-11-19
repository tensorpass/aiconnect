// The connect window a site shows: one card over the page that connects the visitor's AI through
// the AI Wallet. It says what happens, waits while the wallet asks the visitor, explains how to
// install the wallet when it is missing (and, in Safari, how to allow a wallet already added on every
// website), and lets the visitor try again after a refusal. The wallet's accounts stay in the extension.
// A visitor without the wallet can sign in to a web account on the page instead (WebAccountStep.tsx), whose
// credential the site keeps.

import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AboutView } from './AboutView.tsx';
import { useAiConnect } from './AiConnectProvider.tsx';
import { ConnectRing } from './ConnectRing.tsx';
import { alreadyAddedLine, installLabel, installText, refusalStep } from './messages.ts';
import { ProviderMarks } from './ProviderMarks.tsx';
import { WebAccountConnected, WebSignIns, WebSigningIn } from './WebAccountStep.tsx';

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
    case 'noWallet': {
      const alreadyAdded = alreadyAddedLine(messages, client.browser);
      return (
        <Step live={false} title={messages.installTitle} text={installText(messages, client.browser)}>
          <a className="aic-primary" href={client.installUrl} target="_blank" rel="noreferrer">
            <ProviderMarks />
            {installLabel(messages, client.browser)}
          </a>
          {alreadyAdded ? <p className="aic-hint">{alreadyAdded}</p> : null}
        </Step>
      );
    }
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

// The card's body: the wallet's step, with the sign ins under it when the wallet is missing, the step of a
// sign in in progress, or the web account that answers.
function WindowBody() {
  const { state } = useAiConnect();
  if (state.status === 'signingIn') {
    return <WebSigningIn account={state.account} placement="window" />;
  }
  if (state.status === 'connected' && state.account) {
    return <WebAccountConnected account={state.account} />;
  }
  return (
    <>
      <WalletStep />
      {state.status === 'noWallet' ? <WebSignIns placement="window" /> : null}
    </>
  );
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
        {about ? <AboutView /> : <WindowBody />}
        <button type="button" className="aic-link" onClick={() => setAbout(!about)}>
          {about ? messages.back : messages.help}
        </button>
      </div>
    </div>
  );
}
