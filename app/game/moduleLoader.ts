export class RetryableModuleLoader<Module> {
  private pending: Promise<Module> | undefined;
  private cached: { value: Module } | undefined;
  private attemptNumber = 0;
  private pendingAttempt = 0;

  constructor(private readonly importModule: () => Promise<Module>) {}

  load(): Promise<Module> {
    if (this.cached) return Promise.resolve(this.cached.value);
    if (!this.pending) {
      const attemptNumber = ++this.attemptNumber;
      this.pendingAttempt = attemptNumber;
      const attempt = Promise.resolve().then(this.importModule);
      this.pending = attempt.then(
        (module) => {
          if (this.pendingAttempt === attemptNumber) {
            this.cached = { value: module };
            this.pending = undefined;
            this.pendingAttempt = 0;
          }
          return module;
        },
        (error: unknown) => {
          if (this.pendingAttempt === attemptNumber) {
            this.pending = undefined;
            this.pendingAttempt = 0;
          }
          throw error;
        },
      );
    }
    return this.pending;
  }

  invalidatePending(expected: Promise<Module>): boolean {
    if (!this.pending || this.pending !== expected) return false;
    this.pending = undefined;
    this.pendingAttempt = 0;
    return true;
  }
}
