export const GAP_MARKER = "[[]]";

export function countGapMarkers(title: string | null | undefined): number {
  return Math.max(0, (title ?? "").split(GAP_MARKER).length - 1);
}
