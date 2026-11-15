// The web accounts in the connect window and in the modules' connection step: the sign ins offered to a
// visitor without the wallet, under the install step and a separator line, with why the last one did not go
// through; the step while the sign in window is open, with Cancel; and, once signed in, the account that
// answers, where its sign in lives, and Sign out.

import { WEB_ACCOUNT_NAMES } from '@tensorpass/aiconnect';
import type { WebAccountId } from '@tensorpass/aiconnect';
import { OPENROUTER_ICON } from '@tensorpass/aiconnect-design/provider-marks';
import { useAiConnect } from './AiConnectProvider.tsx';
import { BrandMark } from './BrandMark.tsx';
import { ConnectRing } from './ConnectRing.tsx';
import { withAccount } from './webAccountMessages.ts';

// Where the step stands: in the connect window's card, or in a module's connection note.
type Placement = 'window' | 'note';

// The account's mark, in the colour of the text around it. OpenRouter's mark is drawn as a mask, so it
// follows a dark theme as the TensorPass mark does.
function AccountMark({ account }: { account: WebAccountId }) {
  if (account === 'tensorpass') {
    return <BrandMark className="aic-web-mark" />;
  }
  const mask = `url("${OPENROUTER_ICON}") center / contain no-repeat`;
  return <span className="aic-web-mark" aria-hidden="true" style={{ mask, WebkitMask: mask }} />;
}

export function WebSignIns({ placement }: { placement: Placement }) {
  const { client, state, webMessages } = useAiConnect();
  const failure = state.status === 'noWallet' ? state.signInFailure : undefined;
  return (
    <div className="aic-web" data-placement={placement}>
      <p className="aic-web-separator">{webMessages.offerTitle}</p>
      {client.webAccounts.map((account) => (
        <button key={account} type="button" className="aic-web-button" onClick={() => void client.signIn(account)}>
          <AccountMark account={account} />
          {withAccount(webMessages.signInWith, WEB_ACCOUNT_NAMES[account])}
        </button>
      ))}
      {failure ? (
        <p className="aic-web-failure" role="alert">
          {withAccount(webMessages.failures[failure.reason], WEB_ACCOUNT_NAMES[failure.account])}
        </p>
      ) : null}
    </div>
  );
}

export function WebSigningIn({ account, placement }: { account: WebAccountId; placement: Placement }) {
  const { client, webMessages } = useAiConnect();
  return (
    <div className="aic-web-step" data-placement={placement} role="status">
      <ConnectRing live />
      <p className="aic-web-title">{withAccount(webMessages.signingInTitle, WEB_ACCOUNT_NAMES[account])}</p>
      <p className="aic-web-text">{webMessages.signingInText}</p>
      <button type="button" className="aic-web-button" onClick={() => client.cancelSignIn()}>
        {webMessages.cancel}
      </button>
    </div>
  );
}

export function WebAccountConnected({ account }: { account: WebAccountId }) {
  const { client, webMessages } = useAiConnect();
  return (
    <div className="aic-web-step" data-placement="window">
      <ConnectRing live={false} />
      <p className="aic-web-title" role="status">{webMessages.answers[account]}</p>
      <p className="aic-web-text">{webMessages.storedText}</p>
      <button type="button" className="aic-web-button" onClick={() => void client.signOut()}>
        <AccountMark account={account} />
        {webMessages.signOut}
      </button>
    </div>
  );
}
