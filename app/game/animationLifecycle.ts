export type MotionKind = "move" | "bump";

export interface MotionToken {
  readonly generation: number;
  readonly kind: MotionKind;
}

export interface InvalidatedMotion {
  moving: boolean;
  bumping: boolean;
}

export class AnimationLifecycle {
  private generation = 0;
  private moving = false;
  private bumping = false;

  get busy(): boolean {
    return this.moving || this.bumping;
  }

  snapshot(): number {
    return this.generation;
  }

  isCurrent(generation: number): boolean {
    return this.generation === generation;
  }

  beginMove(): MotionToken | null {
    if (this.busy) return null;
    this.moving = true;
    return { generation: this.generation, kind: "move" };
  }

  beginBump(): MotionToken | null {
    if (this.busy) return null;
    this.bumping = true;
    return { generation: this.generation, kind: "bump" };
  }

  complete(token: MotionToken, callback: () => void): boolean {
    if (!this.isCurrent(token.generation)) return false;
    if (token.kind === "move") {
      if (!this.moving) return false;
      this.moving = false;
    } else {
      if (!this.bumping) return false;
      this.bumping = false;
    }
    callback();
    return true;
  }

  invalidate(): InvalidatedMotion {
    const invalidated = { moving: this.moving, bumping: this.bumping };
    this.generation += 1;
    this.moving = false;
    this.bumping = false;
    return invalidated;
  }
}
