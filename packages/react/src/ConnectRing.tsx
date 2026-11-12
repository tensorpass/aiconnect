// The TensorPass mark in the AI Wallet's ring: contactless arcs around a white disc, pulsing while the
// wallet asks the visitor.

import { BrandMark } from './BrandMark.tsx';

export function ConnectRing({ live }: { live: boolean }) {
  return (
    <div className="aic-ring" data-live={live || undefined} aria-hidden="true">
      <svg className="aic-arcs" viewBox="0 0 300 150">
        <path className="aic-a1" d="M86 50a40 40 0 0 0 0 50" />
        <path className="aic-a2" d="M66 34a64 64 0 0 0 0 82" />
        <path className="aic-a3" d="M46 18a88 88 0 0 0 0 114" />
        <path className="aic-a1" d="M214 50a40 40 0 0 1 0 50" />
        <path className="aic-a2" d="M234 34a64 64 0 0 1 0 82" />
        <path className="aic-a3" d="M254 18a88 88 0 0 1 0 114" />
      </svg>
      <span className="aic-disc"><BrandMark /></span>
    </div>
  );
}
