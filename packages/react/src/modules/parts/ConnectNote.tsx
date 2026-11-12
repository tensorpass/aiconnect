// The connection step a module shows until the visitor's AI is connected, in the connect window's
// words: connect the wallet, add it to the browser, approve the site, or try again after a refusal.
// Its button runs the step itself, as the connect window's button does: the install link opens the
// wallet's page, and connect asks the wallet, whose window opens at once.

import type { ConnectionState } from '@tensorpass/aiconnect';
import { useAiConnect } from '../../AiConnectProvider.tsx';
import { ConnectRing } from '../../ConnectRing.tsx';
import { refusalStep } from '../../messages.ts';
import { useActionAttribute } from './moduleAnalytics.ts';
import type { ModuleMessages, PickerMessages } from '../../messages.ts';

type StepAction = { kind: 'install' | 'connect'; label: string };

interface Step {
  title: string;
  text: string;
  action?: StepAction;
  live?: boolean;
}

interface StepCopy {
  messages: PickerMessages;
  moduleMessages: ModuleMessages;
  // Whether the visitor already asked a question that waits for the connection.
  pending: boolean;
}

function connectionStep(state: ConnectionState, copy: StepCopy): Step | null {
  const { messages, moduleMessages, pending } = copy;
  switch (state.status) {
    case 'connected':
      return null;
    // A site the visitor approved connects in a moment, so the check shows only for a waiting question.
    case 'checking':
      return pending ? { title: messages.checking, text: '' } : null;
    case 'noWallet':
      return {
        title: messages.installTitle,
        text: moduleMessages.installText,
        action: { kind: 'install', label: messages.installButton },
      };
    case 'connecting':
      return { title: messages.waitingTitle, text: messages.waitingText, live: true };
    case 'error': {
      const refusal = refusalStep(state, messages);
      return { title: refusal.title, text: refusal.text, action: { kind: 'connect', label: refusal.action } };
    }
    default:
      return {
        title: messages.connectTitle,
        text: pending ? moduleMessages.pendingText : messages.connectText,
        action: { kind: 'connect', label: moduleMessages.connect },
      };
  }
}

function StepButton({ action }: { action: StepAction }) {
  const { client } = useAiConnect();
  const tracking = useActionAttribute(action.kind);
  if (action.kind === 'install') {
    return (
      <a className="aic-button" href={client.installUrl} target="_blank" rel="noreferrer" {...tracking}>
        {action.label}
      </a>
    );
  }
  return (
    <button type="button" className="aic-button" onClick={() => client.connect()} {...tracking}>{action.label}</button>
  );
}

export function ConnectNote({ pending, compact = false }: { pending: boolean; compact?: boolean }) {
  const { state, messages, moduleMessages } = useAiConnect();
  const step = connectionStep(state, { messages, moduleMessages, pending });
  if (!step) {
    return null;
  }
  return (
    <div className="aic-note" data-compact={compact || undefined} role="status">
      <ConnectRing live={Boolean(step.live)} />
      <div className="aic-note-copy">
        <p className="aic-note-title">{step.title}</p>
        {step.text ? <p className="aic-note-text">{step.text}</p> : null}
      </div>
      {step.action ? <StepButton action={step.action} /> : null}
    </div>
  );
}
