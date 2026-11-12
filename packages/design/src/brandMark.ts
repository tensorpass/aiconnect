// The TensorPass mark (roadmap B2): a three by three matrix of cells, the tensor, crossed by a cyan path
// that runs from the bottom left cell through the centre and leaves the top right corner as an arrow,
// the pass. The cells next to the path are cut along it. It is drawn on a 56 unit grid where cells are
// 16 units and gaps 4, so at 16 pixels a cell is four and a half pixels and every gap stays open.
// The extension's icons, the connect window, the site's icons and the files of the brand folder are all
// drawn from these shapes.

export const BRAND_INK = '#0b0d12';
export const BRAND_CYAN = '#0ab9f7';
export const BRAND_WHITE = '#ffffff';

export const MARK_GRID = 56;
const CELL = 16;
const STEP = 20;
const CELL_RADIUS = 4;
const CUT_RADIUS = 1.5;
const PATH_WIDTH = 8;
// Clearance between the path's edge and a cut cell, close to the gap between two cells.
const CLEARANCE = 3;

// The path runs along the line x + y = 56: from the bottom left cell's centre to the arrow's corner.
const PATH_LINE = MARK_GRID;
const CUT_OFFSET = Math.SQRT2 * (PATH_WIDTH / 2 + CLEARANCE);
const ARROW_INSET = PATH_WIDTH / 2;

type Point = [number, number];

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

// A closed outline through `points`, listed clockwise, each corner rounded to its radius.
function roundedOutline(points: Point[], radii: number[]): string {
  const corners = points.map((point, index) => {
    const previous = points[(index + points.length - 1) % points.length];
    const next = points[(index + 1) % points.length];
    const toPrevious = unit(point, previous);
    const toNext = unit(point, next);
    const angle = Math.acos(toPrevious[0] * toNext[0] + toPrevious[1] * toNext[1]);
    const reach = radii[index] / Math.tan(angle / 2);
    return {
      start: [point[0] + toPrevious[0] * reach, point[1] + toPrevious[1] * reach] as Point,
      end: [point[0] + toNext[0] * reach, point[1] + toNext[1] * reach] as Point,
      radius: radii[index],
    };
  });
  const [first] = corners;
  const segments = corners.map((corner, index) => {
    const arc = `A${corner.radius} ${corner.radius} 0 0 1 ${round(corner.end[0])} ${round(corner.end[1])}`;
    const following = corners[(index + 1) % corners.length];
    return `${arc}L${round(following.start[0])} ${round(following.start[1])}`;
  });
  return `M${round(first.start[0])} ${round(first.start[1])}${segments.join('')}Z`;
}

function unit(from: Point, to: Point): Point {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const length = Math.hypot(dx, dy);
  return [dx / length, dy / length];
}

type Cut = 'none' | 'bottomRight' | 'topLeft';

// A cell at column and row, its corner facing the path cut along a line parallel to it.
function cellOutline(column: number, row: number, cut: Cut): string {
  const x = column * STEP;
  const y = row * STEP;
  const right = x + CELL;
  const bottom = y + CELL;
  if (cut === 'bottomRight') {
    const line = PATH_LINE - CUT_OFFSET;
    return roundedOutline(
      [[x, y], [right, y], [right, line - right], [line - bottom, bottom], [x, bottom]],
      [CELL_RADIUS, CELL_RADIUS, CUT_RADIUS, CUT_RADIUS, CELL_RADIUS],
    );
  }
  if (cut === 'topLeft') {
    const line = PATH_LINE + CUT_OFFSET;
    return roundedOutline(
      [[line - y, y], [right, y], [right, bottom], [x, bottom], [x, line - x]],
      [CUT_RADIUS, CELL_RADIUS, CELL_RADIUS, CELL_RADIUS, CUT_RADIUS],
    );
  }
  return roundedOutline(
    [[x, y], [right, y], [right, bottom], [x, bottom]],
    [CELL_RADIUS, CELL_RADIUS, CELL_RADIUS, CELL_RADIUS],
  );
}

// The six ink cells, in reading order.
export const MARK_CELLS: readonly string[] = [
  cellOutline(0, 0, 'none'),
  cellOutline(1, 0, 'bottomRight'),
  cellOutline(0, 1, 'bottomRight'),
  cellOutline(2, 1, 'topLeft'),
  cellOutline(1, 2, 'topLeft'),
  cellOutline(2, 2, 'none'),
];

// The cyan path's two cells, then the stroke that joins them and ends in the arrow's corner.
export const MARK_PATH_CELLS: readonly string[] = [cellOutline(0, 2, 'none'), cellOutline(1, 1, 'none')];

const ARROW_CORNER: Point = [MARK_GRID - ARROW_INSET, ARROW_INSET];
const ARROW_START = 2 * STEP + ARROW_INSET;
const ARROW_END = CELL - ARROW_INSET;

export const MARK_PATH_STROKE = `M${CELL / 2} ${MARK_GRID - CELL / 2}L${ARROW_CORNER[0]} ${ARROW_CORNER[1]}`
  + `M${ARROW_START} ${ARROW_CORNER[1]}H${ARROW_CORNER[0]}V${ARROW_END}`;
export const MARK_PATH_WIDTH = PATH_WIDTH;

// light: ink cells for light grounds. dark: white cells for dark grounds. The path stays cyan on both.
export type MarkTheme = 'light' | 'dark';

export function markCellColor(theme: MarkTheme): string {
  return theme === 'light' ? BRAND_INK : BRAND_WHITE;
}

// The mark's shapes as SVG markup, with the cells in `cellColor`. The cells' group carries the class
// `cells`, which the adaptive icon recolours.
export function markShapes(cellColor: string): string {
  const cells = MARK_CELLS.map((d) => `<path d="${d}"/>`).join('');
  const pathCells = MARK_PATH_CELLS.map((d) => `<path d="${d}"/>`).join('');
  return `<g class="cells" fill="${cellColor}">${cells}</g>`
    + `<g fill="${BRAND_CYAN}">${pathCells}</g>`
    + `<path d="${MARK_PATH_STROKE}" fill="none" stroke="${BRAND_CYAN}" stroke-width="${PATH_WIDTH}" `
    + 'stroke-linecap="round" stroke-linejoin="round"/>';
}

function svgDocument({ size, viewBox, body }: { size: number; viewBox: number; body: string }): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" `
    + `viewBox="0 0 ${viewBox} ${viewBox}">${body}</svg>`;
}

export interface MarkSvgOptions {
  theme?: MarkTheme;
  size?: number;
}

export function markSvg({ theme = 'light', size = MARK_GRID }: MarkSvgOptions = {}): string {
  return svgDocument({ size, viewBox: MARK_GRID, body: markShapes(markCellColor(theme)) });
}

// The mark whose cells turn white when the system is dark, for the browser tab: Chrome and Firefox apply
// the media query inside an SVG favicon.
export function adaptiveMarkSvg(size = MARK_GRID): string {
  const style = `<style>@media (prefers-color-scheme: dark){.cells{fill:${BRAND_WHITE}}}</style>`;
  return svgDocument({ size, viewBox: MARK_GRID, body: style + markShapes(BRAND_INK) });
}

// The app icon: the light mark on a white tile, so it reads on light and dark toolbars alike. The tile is
// rounded for the extension and the favicon, and square for the touch icon, which iOS rounds itself.
const APP_ICON_GRID = 68;
const APP_ICON_RADIUS = 15;

export interface AppIconOptions {
  size?: number;
  rounded?: boolean;
}

export function appIconSvg({ size = APP_ICON_GRID, rounded = true }: AppIconOptions = {}): string {
  const inset = (APP_ICON_GRID - MARK_GRID) / 2;
  const radius = rounded ? APP_ICON_RADIUS : 0;
  const tile = `<rect width="${APP_ICON_GRID}" height="${APP_ICON_GRID}" rx="${radius}" fill="${BRAND_WHITE}"/>`;
  const mark = `<g transform="translate(${inset} ${inset})">${markShapes(BRAND_INK)}</g>`;
  return svgDocument({ size, viewBox: APP_ICON_GRID, body: tile + mark });
}
