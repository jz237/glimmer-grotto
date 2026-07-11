export interface RuntimeHandleDependencies<Command> {
  canDispatch(command: Command): boolean;
  dispatch(command: Command): void;
  pause(): boolean | void;
  resume(): boolean | void;
  shutdownScene(): void;
  destroyRenderer(): void;
}

export class RuntimeHandleController<Command> {
  private destroyed = false;
  private paused = false;

  constructor(private readonly dependencies: RuntimeHandleDependencies<Command>) {}

  dispatch(command: Command): boolean {
    if (this.destroyed) return false;
    try {
      if (!this.dependencies.canDispatch(command)) return false;
      this.dependencies.dispatch(command);
      return true;
    } catch {
      return false;
    }
  }

  pause(): boolean {
    if (this.destroyed) return false;
    if (this.paused) return true;
    const applied = this.runWhileAlive(this.dependencies.pause);
    if (applied) this.paused = true;
    return applied;
  }

  resume(): boolean {
    if (this.destroyed) return false;
    if (!this.paused) return true;
    const applied = this.runWhileAlive(this.dependencies.resume);
    if (applied) this.paused = false;
    return applied;
  }

  destroy(): boolean {
    if (this.destroyed) return false;
    this.destroyed = true;
    try {
      this.dependencies.shutdownScene();
    } catch {
      // Renderer teardown must still run after a partial scene shutdown.
    }
    try {
      this.dependencies.destroyRenderer();
    } catch {
      // Destruction is terminal even when a browser or renderer rejects cleanup.
    }
    return true;
  }

  private runWhileAlive(operation: () => boolean | void): boolean {
    if (this.destroyed) return false;
    try {
      return operation() !== false;
    } catch {
      return false;
    }
  }
}
