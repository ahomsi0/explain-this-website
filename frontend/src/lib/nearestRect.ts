// Which of a set of boxes is closest to a point, if any is within reach.
// Used by the landing page backdrop to decide which outline line the cursor
// is pointing at.

export interface Box {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/**
 * Index of the box nearest to (x, y), or -1 when none is within `reach`
 * pixels. Distance is measured to the box's edge horizontally and to its
 * middle vertically, so a long thin line is as easy to hit at either end.
 * Boxes with no width (hidden elements) are ignored.
 */
export function nearestBox(boxes: (Box | null)[], x: number, y: number, reach: number): number {
  let best = -1;
  let bestDistance = reach;
  boxes.forEach((box, i) => {
    if (!box || box.right - box.left <= 0) return;
    const dx = Math.max(box.left - x, 0, x - box.right);
    const dy = Math.abs((box.top + box.bottom) / 2 - y);
    const distance = Math.hypot(dx, dy);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = i;
    }
  });
  return best;
}
