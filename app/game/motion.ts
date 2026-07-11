export interface MothPose {
  x: number;
  y: number;
  rotation: number;
}

export function mothPose(time: number, reducedMotion: boolean): MothPose {
  if (reducedMotion) return { x: 24, y: -22, rotation: 0 };
  const phase = time / 680;
  return {
    x: Math.cos(phase) * 28,
    y: -22 + Math.sin(phase * 1.3) * 10,
    rotation: Math.sin(phase * 2) * 0.12,
  };
}
