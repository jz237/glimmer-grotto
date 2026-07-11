export const LARGE_TEXT_SCALE = 1.2;

export function gameTextSize(basePixels: number, largeText: boolean): string {
  const scale = largeText ? LARGE_TEXT_SCALE : 1;
  return `${Math.round(basePixels * scale)}px`;
}
