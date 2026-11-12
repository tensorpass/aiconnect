// The TensorPass mark: a matrix of cells crossed by a cyan path. Its cells take the colour of the text
// around it, so it follows the button or the chip it sits on, and its path stays cyan.

import {
  BRAND_CYAN,
  MARK_CELLS,
  MARK_GRID,
  MARK_PATH_CELLS,
  MARK_PATH_STROKE,
  MARK_PATH_WIDTH,
} from '@tensorpass/aiconnect-design/brand-mark';

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox={`0 0 ${MARK_GRID} ${MARK_GRID}`} aria-hidden="true" focusable="false">
      <g fill="currentColor">{MARK_CELLS.map((d) => <path key={d} d={d} />)}</g>
      <g fill={BRAND_CYAN}>{MARK_PATH_CELLS.map((d) => <path key={d} d={d} />)}</g>
      <path d={MARK_PATH_STROKE} fill="none" stroke={BRAND_CYAN} strokeWidth={MARK_PATH_WIDTH} strokeLinecap="round"
        strokeLinejoin="round" />
    </svg>
  );
}
