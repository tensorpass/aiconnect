// Names the account that answers, as the wallet reports it: a key card with its ink stripe, the
// contactless arcs that light up while the answer streams, the account and its model. A web account the
// visitor signed in to on the page also gets its Sign out, and its level or model keeps its whole name.

import { useAiConnect } from '../../AiConnectProvider.tsx';
import { modelLabel } from './accountModel.ts';
import { WaveIcon } from './icons.tsx';

export function AccountBadge({ live }: { live: boolean }) {
  const { client, state, moduleMessages, webMessages } = useAiConnect();
  if (state.status !== 'connected') {
    return null;
  }
  return (
    <div className="aic-account" data-live={live || undefined} data-web={state.account}>
      <span className="aic-keycard" aria-hidden="true" />
      <WaveIcon size={14} className="aic-account-arcs" />
      <span className="aic-account-name">
        <span className="aic-account-lead">{moduleMessages.answersWith}</span> <b>{state.providerName}</b>
      </span>
      {state.model ? <span className="aic-account-model">{modelLabel(state.model, state.account)}</span> : null}
      {state.account ? (
        <button type="button" className="aic-text-button aic-account-sign-out" onClick={() => void client.signOut()}>
          {webMessages.signOut}
        </button>
      ) : null}
    </div>
  );
}
