// A module's connection step with the web accounts: the wallet's step of ConnectNote, with the sign ins
// under it while the wallet is missing, or the step of a sign in in progress in its place.

import { useAiConnect } from '../../AiConnectProvider.tsx';
import { WebSignIns, WebSigningIn } from '../../WebAccountStep.tsx';
import { ConnectNote } from './ConnectNote.tsx';

export function ConnectStep({ pending, compact = false }: { pending: boolean; compact?: boolean }) {
  const { state } = useAiConnect();
  if (state.status === 'signingIn') {
    return <WebSigningIn account={state.account} placement="note" />;
  }
  return (
    <>
      <ConnectNote pending={pending} compact={compact} />
      {state.status === 'noWallet' ? <WebSignIns placement="note" /> : null}
    </>
  );
}
