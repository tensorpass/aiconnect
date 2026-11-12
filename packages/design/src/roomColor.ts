// The colour of a key card's stripe for the share of room an account has left, shared by the wallet
// and the website.

// Red at no room, orange half way, green when the plan is untouched, blended in between.
const ROOM_STOPS: [number, [number, number, number]][] = [
  [0, [229, 72, 77]],
  [0.5, [245, 158, 11]],
  [1, [34, 180, 85]],
];

export function roomColor(room: number): string {
  const value = Math.min(1, Math.max(0, room));
  const upper = ROOM_STOPS.findIndex(([at]) => at >= value);
  const [toAt, to] = ROOM_STOPS[Math.max(upper, 1)];
  const [fromAt, from] = ROOM_STOPS[Math.max(upper, 1) - 1];
  const share = (value - fromAt) / (toAt - fromAt);
  const [red, green, blue] = from.map((channel, index) => Math.round(channel + (to[index] - channel) * share));
  return `rgb(${red} ${green} ${blue})`;
}

export type RoomLevel = 'plenty' | 'some' | 'little';

// The words for the room left, at the stripe's green and orange thresholds.
export function roomLevel(room: number): RoomLevel {
  if (room >= 0.6) {
    return 'plenty';
  }
  return room >= 0.25 ? 'some' : 'little';
}
