// A full page AI mode: the chat takes the whole window over the site, in one centred column, with
// the page's scroll held and the focus kept inside until the visitor closes it. It opens from its
// own button, placed where the site renders the module, or from the site's own through `open`.

import { useAiConnect } from '../AiConnectProvider.tsx';
import { Launcher } from './Launcher.tsx';
import { ChatFrame } from './parts/ChatFrame.tsx';
import { moduleClass } from './parts/moduleClass.ts';
import { useModuleChat } from './parts/useModuleChat.ts';
import { useModuleHandle } from './parts/useModuleHandle.ts';
import type { AiModuleProps, AiOverlayProps } from './types.ts';
import { useFocusTrap, useOverlay } from './useOverlay.ts';

export interface AiChatPageProps extends AiModuleProps, AiOverlayProps {}

export function AiChatPage({ ref, ...props }: AiChatPageProps) {
  const { moduleMessages, isPickerOpen } = useAiConnect();
  const chat = useModuleChat(props);
  const {
    open, show, close, toggle, layerRef, fieldRef, launcherRef, titleId, layerId,
  } = useOverlay(props, 'always');
  useModuleHandle(ref, chat.ask, show);
  // The connect window opens over the page mode and keeps the focus while it is open.
  useFocusTrap(layerRef, open && !isPickerOpen);
  const title = props.title ?? moduleMessages.pageTitle;
  return (
    <>
      {props.hideLauncher ? null : (
        <Launcher label={props.launcherLabel ?? title} open={open} controls={layerId} onClick={toggle}
          launcherRef={launcherRef} />
      )}
      <section ref={layerRef} id={layerId} className={moduleClass('page', props.className)}
        dir={moduleMessages.dir} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}
        hidden={!open}>
        <div className="aic-page-column">
          <ChatFrame module={props} chat={chat} title={title} titleId={titleId} fieldRef={fieldRef}
            onClose={close} />
        </div>
      </section>
    </>
  );
}
