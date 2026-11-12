// The modules' drawn icons, in the AI Wallet's one stroke family (24 grid, round caps and joins).
// The wave is the wallet's mark: the contactless arcs that light up while the visitor's AI answers.

import type { ReactNode } from 'react';
import { WAVE_ARCS, WAVE_STROKE_WIDTH } from '../../launcher.ts';

interface StrokeProps {
  children: ReactNode;
  size?: number;
  width?: number;
  className?: string;
}

function Stroke({ children, size = 18, width = 2, className }: StrokeProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

// The three arcs, each its own path so a live answer can light them one after the other.
export const WaveIcon = ({ size = 18, className }: { size?: number; className?: string }) => (
  <Stroke size={size} width={WAVE_STROKE_WIDTH} className={className}>
    {WAVE_ARCS.map((arc, index) => <path key={arc} className={`aic-w${index + 1}`} d={arc} />)}
  </Stroke>
);

export const SendIcon = () => <Stroke size={18} width={2.4}><path d="M12 19V5M6 11l6-6 6 6" /></Stroke>;

export const CloseIcon = () => <Stroke size={18}><path d="M6 6l12 12M18 6 6 18" /></Stroke>;

export const NewChatIcon = () => (
  <Stroke size={18}>
    <path d="M12 4H7a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-5" />
    <path d="M17.5 3.5a2.1 2.1 0 0 1 3 3L13 14l-4 1 1-4z" />
  </Stroke>
);

export const SearchIcon = () => (
  <Stroke size={18}><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></Stroke>
);

export const CheckIcon = () => <Stroke size={12} width={3}><path d="m5 12 5 5 9-10" /></Stroke>;

// Points along the reading direction; the stylesheet mirrors it in right to left.
export const ArrowIcon = () => <Stroke size={16} className="aic-arrow"><path d="M5 12h14M13 6l6 6-6 6" /></Stroke>;
