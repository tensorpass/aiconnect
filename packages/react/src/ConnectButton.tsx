// The button a site embeds to connect the visitor's AI: the TensorPass mark and "Connect your AI" in the
// page's language. It opens the connect window, and it leaves the page once the visitor's AI is connected,
// when the site's AI features take its place.

import { useAiConnect } from './AiConnectProvider.tsx';
import { BrandMark } from './BrandMark.tsx';

export interface ConnectButtonProps {
  // A class added after `aic-connect-button`, for the site's own spacing or size.
  className?: string;
}

export function ConnectButton({ className }: ConnectButtonProps) {
  const { state, moduleMessages, messages, openPicker } = useAiConnect();
  if (state.status === 'connected') {
    return null;
  }
  const classes = className ? `aic-connect-button ${className}` : 'aic-connect-button';
  return (
    <button type="button" className={classes} dir={messages.dir} onClick={openPicker}>
      <BrandMark className="aic-connect-mark" />
      {moduleMessages.connect}
    </button>
  );
}
