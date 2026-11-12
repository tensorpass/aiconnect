// Names the account that answers, as the wallet reports it: a key card with its ink stripe, the
// contactless arcs that light up while the answer streams, the account and its model.

import { useAiConnect } from '../../AiConnectProvider.tsx';
import { WaveIcon } from './icons.tsx';

export function AccountBadge({ live }: { live: boolean }) {
  const { state, moduleMessages } = useAiConnect();
  if (state.status !== 'connected') {
    return null;
  }
  return (
    <div className="aic-account" data-live={live || undefined}>
      <span className="aic-keycard" aria-hidden="true" />
      <WaveIcon size={14} className="aic-account-arcs" />
      <span className="aic-account-name">
        {moduleMessages.answersWith} <b>{state.providerName}</b>
      </span>
      {state.model ? <span className="aic-account-model">{state.model}</span> : null}
    </div>
  );
}
