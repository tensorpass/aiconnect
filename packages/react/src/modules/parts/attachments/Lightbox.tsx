// The images of a question at full size, over the module: Escape or the close button closes it and hands the
// focus back to the chip that opened it, the arrow keys and buttons move between the question's images in
// the reading direction, and the focus stays inside while it is open.

import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useAiConnect } from '../../../AiConnectProvider.tsx';
import { useFocusTrap } from '../../useOverlay.ts';
import { BackIcon, CloseIcon, ForwardIcon } from '../icons.tsx';

export interface LightboxImage {
  url: string;
  name: string;
}

export interface LightboxProps {
  images: LightboxImage[];
  start: number;
  onClose: () => void;
}

// The arrow key that moves forward along the reading direction.
function forwardKey(dir: string): string {
  return dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
}

export function Lightbox({ images, start, onClose }: LightboxProps) {
  const { moduleMessages } = useAiConnect();
  const [index, setIndex] = useState(start);
  const layer = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  useFocusTrap(layer, true);
  useEffect(() => {
    const root = layer.current?.getRootNode() as Document | ShadowRoot | undefined;
    const opener = root?.activeElement instanceof HTMLElement ? root.activeElement : null;
    closeButton.current?.focus();
    return () => opener?.focus();
  }, []);
  const move = (step: number) => setIndex((current) => (current + step + images.length) % images.length);
  const onKeyDown = (event: KeyboardEvent) => {
    const forward = forwardKey(moduleMessages.dir);
    if (event.key === 'Escape') {
      // The lightbox closes alone, and the module stays open under it.
      event.stopPropagation();
      event.nativeEvent.stopImmediatePropagation();
      onClose();
    } else if (images.length > 1 && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
      move(event.key === forward ? 1 : -1);
    }
  };
  const image = images[index];
  const position = moduleMessages.imageOf.replaceAll('{index}', String(index + 1))
    .replaceAll('{count}', String(images.length));
  return (
    <div ref={layer} className="aic-lightbox" role="dialog" aria-modal="true" aria-label={image.name}
      onKeyDown={onKeyDown}>
      <button type="button" className="aic-lightbox-backdrop" tabIndex={-1} aria-hidden="true" onClick={onClose} />
      <figure className="aic-lightbox-figure">
        <img src={image.url} alt={image.name} />
        <figcaption dir="auto">{image.name}{images.length > 1 ? ` · ${position}` : ''}</figcaption>
      </figure>
      <button ref={closeButton} type="button" className="aic-round aic-lightbox-close" aria-label={moduleMessages.close}
        onClick={onClose}>
        <CloseIcon />
      </button>
      {images.length > 1 ? (
        <div className="aic-lightbox-steps">
          <button type="button" className="aic-round" aria-label={moduleMessages.previousImage}
            onClick={() => move(-1)}>
            <BackIcon />
          </button>
          <button type="button" className="aic-round" aria-label={moduleMessages.nextImage} onClick={() => move(1)}>
            <ForwardIcon />
          </button>
        </div>
      ) : null}
    </div>
  );
}
