// A chat docked in a side panel at the page's edge. It opens from its own button, placed where the
// site renders the module, or from the site's own button through `open`. The page stays usable
// beside it, and the conversation stays while the panel is closed. The panel docks on the right in
// left to right languages and on the left in right to left ones. On a phone it takes the whole
// screen, and the page behind it holds its scroll while it is open.

import { useAiConnect } from '../AiConnectProvider.tsx';
import { Launcher } from './Launcher.tsx';
import { ChatFrame } from './parts/ChatFrame.tsx';
import { moduleClass } from './parts/moduleClass.ts';
import { useModuleChat } from './parts/useModuleChat.ts';
import { useModuleHandle } from './parts/useModuleHandle.ts';
import type { AiModuleProps, AiOverlayProps } from './types.ts';
import { useOverlay } from './useOverlay.ts';

export interface AiChatPanelProps extends AiModuleProps, AiOverlayProps {}

export function AiChatPanel({ ref, ...props }: AiChatPanelProps) {
  const { moduleMessages } = useAiConnect();
  const chat = useModuleChat(props);
  const {
    open, show, close, toggle, layerRef, fieldRef, launcherRef, titleId, layerId,
  } = useOverlay(props, 'phone');
  useModuleHandle(ref, chat.ask, show);
  const title = props.title ?? moduleMessages.title;
  return (
    <>
      {props.hideLauncher ? null : (
        <Launcher label={props.launcherLabel ?? title} open={open} controls={layerId} onClick={toggle}
          launcherRef={launcherRef} />
      )}
      <section ref={layerRef} id={layerId} className={moduleClass('panel', props.className)}
        dir={moduleMessages.dir} role="dialog" aria-labelledby={titleId} tabIndex={-1} hidden={!open}>
        <ChatFrame module={props} chat={chat} title={title} titleId={titleId} fieldRef={fieldRef}
          onClose={close} />
      </section>
    </>
  );
}
