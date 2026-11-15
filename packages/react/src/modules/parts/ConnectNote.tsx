// The connection step a module shows until the visitor's AI is connected, in the connect window's
// words: connect the wallet, get it on this device (with, in Safari, how to allow a wallet already added on
// every website), approve the site, or try again after a refusal.
// Its buttons run the step themselves, as the connect window's do: the store link opens the wallet's listing
// under the marks of the plans it answers with, a phone's links hand the page over, and connect asks the
// wallet, whose window opens at once.

import type { AiConnect, ConnectionState } from '@tensorpass/aiconnect';
import { useAiConnect } from '../../AiConnectProvider.tsx';
import { ConnectRing } from '../../ConnectRing.tsx';
import { ProviderMarks } from '../../ProviderMarks.tsx';
import { refusalStep } from '../../messages.ts';
import { linkTarget, walletStep } from '../../walletStep.ts';
import type { WalletLink } from '../../walletStep.ts';
import { useActionAttribute } from './moduleAnalytics.ts';
import type { ModuleMessages, PickerMessages } from '../../messages.ts';

interface Step {
  title: string;
  text: string;
  // A second line under the text, for the visitor the main text does not cover.
  aside?: string;
  // The links that get the wallet, or the label of the button that connects it.
  links?: WalletLink[];
  connect?: string;
  live?: boolean;
}

interface StepCopy {
  client: AiConnect;
  messages: PickerMessages;
  moduleMessages: ModuleMessages;
  // Whether the visitor already asked a question that waits for the connection.
  pending: boolean;
}

function connectionStep(state: ConnectionState, copy: StepCopy): Step | null {
  const { client, messages, moduleMessages, pending } = copy;
  switch (state.status) {
    case 'connected':
      return null;
    // A site the visitor approved connects in a moment, so the check shows only for a waiting question.
    case 'checking':
      return pending ? { title: messages.checking, text: '' } : null;
    case 'noWallet':
      return walletStep(client.walletRoute, messages);
    case 'connecting':
      return { title: messages.waitingTitle, text: messages.waitingText, live: true };
    case 'error': {
      const refusal = refusalStep(state, messages);
      return { title: refusal.title, text: refusal.text, connect: refusal.action };
    }
    default:
      return {
        title: messages.connectTitle,
        text: pending ? moduleMessages.pendingText : messages.connectText,
        connect: moduleMessages.connect,
      };
  }
}

function WalletLinks({ links }: { links: WalletLink[] }) {
  const tracking = useActionAttribute('install');
  return (
    <div className="aic-note-actions">
      {links.map((walletLink) => (
        <a key={walletLink.href} className="aic-button" href={walletLink.href}
          data-secondary={walletLink.secondary || undefined} {...linkTarget(walletLink)} {...tracking}>
          {walletLink.marks ? <ProviderMarks /> : null}
          {walletLink.label}
        </a>
      ))}
    </div>
  );
}

function ConnectAction({ label }: { label: string }) {
  const { client } = useAiConnect();
  const tracking = useActionAttribute('connect');
  return <button type="button" className="aic-button" onClick={() => client.connect()} {...tracking}>{label}</button>;
}

export function ConnectNote({ pending, compact = false }: { pending: boolean; compact?: boolean }) {
  const { client, state, messages, moduleMessages } = useAiConnect();
  const step = connectionStep(state, { client, messages, moduleMessages, pending });
  if (!step) {
    return null;
  }
  return (
    <div className="aic-note" data-compact={compact || undefined} role="status">
      <ConnectRing live={Boolean(step.live)} />
      <div className="aic-note-copy">
        <p className="aic-note-title">{step.title}</p>
        {step.text ? <p className="aic-note-text">{step.text}</p> : null}
        {step.aside ? <p className="aic-note-text">{step.aside}</p> : null}
      </div>
      {step.links ? <WalletLinks links={step.links} /> : null}
      {step.connect ? <ConnectAction label={step.connect} /> : null}
    </div>
  );
}
