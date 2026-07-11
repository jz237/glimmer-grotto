type TimerHandle = ReturnType<typeof globalThis.setTimeout>;

export interface WaitingWorkerLike {
  postMessage(message: unknown): void;
}

export interface UpdateRegistrationLike {
  waiting: WaitingWorkerLike | null;
}

export interface ServiceWorkerContainerLike {
  getRegistration(): Promise<UpdateRegistrationLike | undefined>;
  addEventListener(type: "controllerchange", listener: () => void): void;
  removeEventListener(type: "controllerchange", listener: () => void): void;
}

export interface UpdateActivationDependencies {
  serviceWorkers: ServiceWorkerContainerLike;
  reload(): void;
  setTimer(callback: () => void, delayMs: number): TimerHandle;
  clearTimer(handle: TimerHandle): void;
}

export type UpdateActivationResult =
  | "reload-requested"
  | "activated"
  | "timed-out"
  | "failed";

export async function activateWaitingUpdate(
  dependencies: UpdateActivationDependencies,
  timeoutMs = 8_000,
): Promise<UpdateActivationResult> {
  return new Promise((resolve) => {
    let settled = false;
    let listening = false;
    let timeoutHandle: TimerHandle | undefined;
    const finish = (result: UpdateActivationResult) => {
      if (settled) return;
      settled = true;
      if (listening) {
        listening = false;
        try {
          dependencies.serviceWorkers.removeEventListener(
            "controllerchange",
            onControllerChange,
          );
        } catch {
          // A torn-down container cannot retain a useful listener.
        }
      }
      if (timeoutHandle !== undefined) {
        try {
          dependencies.clearTimer(timeoutHandle);
        } catch {
          // The settled guard still makes a late timer harmless.
        }
      }
      resolve(result);
    };
    const onControllerChange = () => {
      finish("activated");
      try {
        dependencies.reload();
      } catch {
        // Activation succeeded even if this testable reload boundary rejected.
      }
    };

    try {
      timeoutHandle = dependencies.setTimer(
        () => finish("timed-out"),
        timeoutMs,
      );
    } catch {
      finish("failed");
      return;
    }

    let registrationRequest: Promise<UpdateRegistrationLike | undefined>;
    try {
      registrationRequest = dependencies.serviceWorkers.getRegistration();
    } catch {
      finish("failed");
      return;
    }

    void registrationRequest.then(
      (registration) => {
        if (settled) return;
        if (!registration?.waiting) {
          try {
            dependencies.reload();
            finish("reload-requested");
          } catch {
            finish("failed");
          }
          return;
        }

        try {
          listening = true;
          dependencies.serviceWorkers.addEventListener(
            "controllerchange",
            onControllerChange,
          );
          registration.waiting.postMessage({ type: "SKIP_WAITING" });
        } catch {
          finish("failed");
        }
      },
      () => finish("failed"),
    );
  });
}

export function browserUpdateDependencies(): UpdateActivationDependencies {
  return {
    serviceWorkers: navigator.serviceWorker,
    reload: () => location.reload(),
    setTimer: (callback, delayMs) => globalThis.setTimeout(callback, delayMs),
    clearTimer: (handle) => globalThis.clearTimeout(handle),
  };
}
