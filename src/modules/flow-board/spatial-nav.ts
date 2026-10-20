export type Direction = "up" | "down" | "left" | "right";

export interface Box {
  bottom: number;
  left: number;
  right: number;
  top: number;
}

/**
 * The card an arrow key should reach: the nearest one in that direction on
 * screen, favouring cards in line with the current one. Works the same in
 * the horizontal grid of planned visits and in the columns.
 */
export function nearestInDirection<T extends { box: Box }>(from: Box, candidates: readonly T[], direction: Direction): T | null {
  const center = { x: (from.left + from.right) / 2, y: (from.top + from.bottom) / 2 };
  let best: T | null = null;
  let bestScore = Infinity;
  for (const candidate of candidates) {
    const box = candidate.box;
    const cx = (box.left + box.right) / 2;
    const cy = (box.top + box.bottom) / 2;
    // Edge distance along the arrow, so touching neighbours count as next.
    const along =
      direction === "right" ? box.left - from.right
      : direction === "left" ? from.left - box.right
      : direction === "down" ? box.top - from.bottom
      : from.top - box.bottom;
    if (along < -4) continue;
    const across = direction === "left" || direction === "right" ? Math.abs(cy - center.y) : Math.abs(cx - center.x);
    // Overlapping rows or columns are "in line" and win over closer diagonals.
    const overlaps =
      direction === "left" || direction === "right"
        ? box.top < from.bottom && box.bottom > from.top
        : box.left < from.right && box.right > from.left;
    const score = Math.max(0, along) + across * 2 + (overlaps ? 0 : 10_000);
    if (score < bestScore) {
      bestScore = score;
      best = candidate;
    }
  }
  return best;
}

export const ARROW_DIRECTIONS: Record<string, Direction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
};
