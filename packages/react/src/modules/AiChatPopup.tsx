// A floating button at the page's corner that opens a chat popup above it. The button shows the
// wallet's wave mark and turns into a close mark while the popup is open. The popup sits in the
// bottom right corner in left to right languages and in the bottom left in right to left ones. On a
// phone it takes the whole screen, and the page behind it holds its scroll while it is open.

import { useAiConnect } from '../AiConnectProvider.tsx';
import { ChatFrame } from './parts/ChatFrame.tsx';
import { moduleClass } from './parts/moduleClass.ts';
import { CloseIcon, WaveIcon } from './parts/icons.tsx';
import { useModuleChat } from './parts/useModuleChat.ts';
import { useModuleHandle } from './parts/useModuleHandle.ts';
import type { AiModuleProps, AiOverlayProps } from './types.ts';
import { useOverlay } from './useOverlay.ts';

export interface AiChatPopupProps extends AiModuleProps, AiOverlayProps {}

export function AiChatPopup({ ref, ...props }: AiChatPopupProps) {
  const { moduleMessages } = useAiConnect();
  const chat = useModuleChat(props);
  const {
    open, show, close, toggle, layerRef, fieldRef, launcherRef, titleId, layerId,
  } = useOverlay(props, 'phone');
  useModuleHandle(ref, chat.ask, show);
  const label = props.launcherLabel ?? (open ? moduleMessages.closeChat : moduleMessages.openChat);
  return (
    <>
      <section ref={layerRef} id={layerId} className={moduleClass('popup', props.className)}
        dir={moduleMessages.dir} role="dialog" aria-labelledby={titleId} tabIndex={-1} hidden={!open}>
        <ChatFrame module={props} chat={chat} title={props.title ?? moduleMessages.title} titleId={titleId}
          fieldRef={fieldRef} onClose={close} />
      </section>
      {props.hideLauncher ? null : (
        <button ref={launcherRef} type="button" className="aic-fab" dir={moduleMessages.dir} aria-label={label}
          title={label} aria-expanded={open} aria-controls={layerId} data-open={open || undefined}
          data-live={chat.busy || undefined} onClick={toggle}>
          <WaveIcon size={26} className="aic-fab-wave" />
          <span className="aic-fab-close"><CloseIcon /></span>
        </button>
      )}
    </>
  );
}
