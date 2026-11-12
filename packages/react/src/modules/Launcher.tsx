// The button a module that opens over the page puts where the site places it, such as in its
// header: the wallet's wave mark and the module's name. The side panel and the full page use it.

import type { RefObject } from 'react';
import { useAiConnect } from '../AiConnectProvider.tsx';
import { WaveIcon } from './parts/icons.tsx';

export interface LauncherProps {
  label: string;
  open: boolean;
  controls: string;
  onClick: () => void;
  launcherRef: RefObject<HTMLButtonElement | null>;
}

export function Launcher({ label, open, controls, onClick, launcherRef }: LauncherProps) {
  const { moduleMessages, state } = useAiConnect();
  return (
    <button ref={launcherRef} type="button" className="aic-launcher" dir={moduleMessages.dir} aria-expanded={open}
      aria-controls={controls} data-connected={state.status === 'connected' || undefined} onClick={onClick}>
      <WaveIcon size={18} className="aic-launcher-mark" />
      {label}
    </button>
  );
}
