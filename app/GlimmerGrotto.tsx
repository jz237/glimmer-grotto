"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import {
  BootReadinessWatchdog,
  browserBootWatchdogTimers,
} from "./game/bootWatchdog";
import type {
  AccessibilitySettings,
  BiomeArrival,
  GameCommand,
  GameEvent,
  GameHandle,
  InputMethod,
  MechanicStatusItem,
  SaveGameV1,
  TutorialStep,
} from "./game/contracts";
import { applyCampaignProgress } from "./game/campaign";
import {
  closeDialogSafely,
  openDialogSafely,
} from "./game/dialogLifecycle";
import { requestTextDownload } from "./game/download";
import {
  ECHO_MEMORIES,
  collectedMemoryCount,
  echoMemoryForSeed,
  echoMemoryGroups,
  type EchoMemory,
} from "./game/echoes";
import {
  advanceFocusSafely,
  firstRestorableFocusTarget,
  isFocusWithinSafely,
  isRestorableFocusTarget,
  restoreFocusSafely,
} from "./game/focus";
import {
  browserHeldCommandTimers,
  HeldCommandController,
} from "./game/heldCommand";
import { journeyMapGroups } from "./game/journey";
import {
  activateModalState,
  clearModalState,
  dismissModalState,
} from "./game/modalState";
import { RetryableModuleLoader } from "./game/moduleLoader";
import { runtimePauseReason } from "./game/pausePolicy";
import {
  alternateRendererMode,
  recommendedRendererMode,
  type RendererMode,
} from "./game/rendererContext";
import {
  clearSaveWithStatus,
  createFreshSave,
  exportSave,
  importSaveWithRecovery,
  loadSaveWithRecovery,
  persistSaveWithStatus,
  type SavePersistence,
  type SaveRecovery,
} from "./game/save";
import {
  activateWaitingUpdate,
  browserUpdateDependencies,
  type UpdateActivationResult,
} from "./game/serviceWorkerUpdate";
import {
  useDialogGamepadNavigation,
  usePageGamepadNavigation,
} from "./useGamepadNavigation";

type Screen = "title" | "playing" | "complete";
type ModalId = "menu" | "memories" | "map" | "settings" | "help" | "restart";
const TOTAL_ROOMS = 20;
const GAME_MODULE_TIMEOUT_MS = 15_000;
const GAME_BOOT_TIMEOUT_MS = 12_000;
const DIALOG_FOCUS_SELECTOR = [
  "a[href]",
  "area[href]",
  "button",
  "input",
  "select",
  "textarea",
  "summary",
  "iframe",
  "object",
  "embed",
  "audio[controls]",
  "video[controls]",
  "[tabindex]",
  '[contenteditable]:not([contenteditable="false"])',
].join(", ");

type GameModule = typeof import("./game/createGame");
const gameModuleLoader = new RetryableModuleLoader<GameModule>(
  () => import("./game/createGame"),
);

function preloadGameModule(): Promise<GameModule> {
  return gameModuleLoader.load();
}

function warmGameModule(): void {
  void preloadGameModule().catch(() => undefined);
}

function browserStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

interface RoomInfo {
  index: number;
  biomeName: string;
  name: string;
  subtitle: string;
  story: string;
  hints: [string, string, string];
  isRevisit: boolean;
}

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function Icon({ children }: { children: ReactNode }) {
  return <span aria-hidden="true">{children}</span>;
}

function movementControl(method: InputMethod): string {
  if (method === "gamepad") return "Left stick or D-pad";
  if (method === "touch") return "Direction pad";
  if (method === "pointer") return "Click an adjacent tile";
  return "Arrow keys or WASD";
}

function actionControl(method: InputMethod): string {
  if (method === "gamepad") return "A button";
  if (method === "touch") return "Action button";
  if (method === "pointer") return "Click the nearby object";
  return "Space, Enter, or E";
}

function continueControl(method: InputMethod): string {
  if (method === "gamepad") return "The A button also continues.";
  if (method === "touch") return "The Action control also continues.";
  if (method === "pointer") return "Select the button to continue.";
  return "Space, Enter, or E also continue.";
}

function saveRecoveryMessage(recovery: SaveRecovery): string {
  if (recovery === "repaired") {
    return "A save inconsistency was repaired while keeping your furthest restored room.";
  }
  if (recovery === "backup") {
    return "The newest autosave was damaged, so the last safe backup was restored.";
  }
  if (recovery === "reset") {
    return "Neither local save copy could be read. A fresh journey was created; an exported save can still be imported in Settings.";
  }
  if (recovery === "unavailable") {
    return "Autosave is unavailable in this browser context. Export a save before leaving.";
  }
  return "";
}

function savePersistenceMessage(persistence: SavePersistence): string {
  if (persistence === "primary-only") {
    return "Autosave kept your current progress, but its recovery backup could not be refreshed. Export a copy from Settings before leaving.";
  }
  if (persistence === "backup-only") {
    return "Autosave could not refresh the main save, but the recovery copy is still available. Export a copy from Settings before leaving.";
  }
  if (persistence === "unavailable") {
    return "Autosave could not write to this browser. This session can continue, but export a copy from Settings before leaving.";
  }
  return "";
}

function Modal({
  labelledBy,
  className = "",
  onClose,
  children,
}: {
  labelledBy: string;
  className?: string;
  onClose(): void;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousBodyOverflow = document.body.style.overflow;
    const addedInert: Element[] = [];
    for (const sibling of Array.from(dialog.parentElement?.children ?? [])) {
      if (sibling === dialog || sibling.hasAttribute("inert")) continue;
      try {
        sibling.setAttribute("inert", "");
        addedInert.push(sibling);
      } catch {
        // Native showModal still supplies modality when sibling inert is refused.
      }
    }
    document.body.style.overflow = "hidden";
    let cancelled = false;
    let redirectingFocus = false;
    const handleCancel = (event: Event) => {
      event.preventDefault();
      onClose();
    };
    const redirectFocus = (backwards = false) => {
      if (redirectingFocus) return;
      redirectingFocus = true;
      try {
        advanceFocusSafely(
          dialog.querySelectorAll<HTMLElement>(DIALOG_FOCUS_SELECTOR),
          document.activeElement as HTMLElement | null,
          backwards,
        );
      } catch {
        // A detached dialog has no remaining keyboard boundary to restore.
      } finally {
        redirectingFocus = false;
      }
    };
    const handleFocusIn = (event: FocusEvent) => {
      if (
        isFocusWithinSafely(dialog, event.target as Node | null) ||
        redirectingFocus
      ) {
        return;
      }
      redirectFocus();
    };
    const recoverMissingFocus = () => {
      const active = document.activeElement as HTMLElement | null;
      if (
        isFocusWithinSafely(dialog, active) &&
        isRestorableFocusTarget(active)
      ) {
        return;
      }
      redirectFocus();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      event.stopPropagation();
      if (event.key === "Tab") {
        event.preventDefault();
        redirectFocus(event.shiftKey);
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    dialog.addEventListener("cancel", handleCancel);
    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("keydown", handleKeyDown);
    let focusObserver: MutationObserver | null = null;
    try {
      focusObserver = new MutationObserver(() => {
        queueMicrotask(() => {
          if (!cancelled) recoverMissingFocus();
        });
      });
      focusObserver.observe(dialog, {
        attributeFilter: [
          "aria-hidden",
          "class",
          "contenteditable",
          "disabled",
          "hidden",
          "inert",
          "style",
          "tabindex",
        ],
        attributes: true,
        childList: true,
        subtree: true,
      });
    } catch {
      focusObserver = null;
    }
    const openMode = openDialogSafely(dialog);
    if (openMode === "attribute") {
      try {
        dialog.classList.add("is-fallback-open");
      } catch {
        // The open attribute remains a usable fallback without decoration.
      }
    } else if (openMode === "failed") {
      queueMicrotask(() => {
        if (!cancelled) onClose();
      });
    }
    restoreFocusSafely(
      firstRestorableFocusTarget(
        dialog.querySelectorAll<HTMLElement>(DIALOG_FOCUS_SELECTOR),
      ),
      null,
    );
    return () => {
      cancelled = true;
      dialog.removeEventListener("cancel", handleCancel);
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("keydown", handleKeyDown);
      try {
        focusObserver?.disconnect();
      } catch {
        // A discarded observer has no remaining dialog state to release.
      }
      closeDialogSafely(dialog);
      try {
        dialog.classList.remove("is-fallback-open");
      } catch {
        // A detached fallback dialog has no visible class state to restore.
      }
      for (const sibling of addedInert) {
        try {
          sibling.removeAttribute("inert");
        } catch {
          // A removed sibling has no remaining focus or pointer surface.
        }
      }
      document.body.style.overflow = previousBodyOverflow;
      const fallback = firstRestorableFocusTarget(
        document.querySelectorAll<HTMLElement>(
          '[data-focus-return], [data-controller-default], main button:not([disabled]), .brand-lockup',
        ),
      );
      restoreFocusSafely(previouslyFocused, fallback);
    };
  }, [onClose]);

  useDialogGamepadNavigation(dialogRef, onClose);

  return (
    <dialog
      ref={dialogRef}
      className="modal-dialog"
      aria-labelledby={labelledBy}
      aria-modal="true"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className={`modal-panel ${className}`.trim()}>{children}</section>
    </dialog>
  );
}

export default function GlimmerGrotto() {
  const mountRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<GameHandle | null>(null);
  const saveRef = useRef<SaveGameV1 | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const manualExportRef = useRef<HTMLTextAreaElement>(null);
  const arrivalButtonRef = useRef<HTMLButtonElement>(null);
  const rendererRetryRef = useRef<HTMLButtonElement>(null);
  const gameRecoveryRef = useRef<HTMLButtonElement>(null);
  const sessionStartedRef = useRef(0);
  const persistenceRef = useRef<SavePersistence>("saved");
  const heldCommandRef = useRef<HeldCommandController<GameCommand> | null>(null);
  const activeModalRef = useRef<ModalId | null>(null);
  const screenRef = useRef<Screen>("title");
  const gameLoadErrorRef = useRef("");
  const pageHiddenRef = useRef(false);
  const rendererUnavailableRef = useRef(false);
  const rendererLossCountRef = useRef(0);
  const [save, setSave] = useState<SaveGameV1 | null>(null);
  const [screen, setScreen] = useState<Screen>("title");
  const [session, setSession] = useState(0);
  const [room, setRoom] = useState<RoomInfo | null>(null);
  const [totalRooms, setTotalRooms] = useState(TOTAL_ROOMS);
  const [announcement, setAnnouncement] = useState(
    "Welcome to Glimmer Grotto.",
  );
  const [hintStage, setHintStage] = useState(0);
  const [inputMethod, setInputMethod] = useState<InputMethod>("keyboard");
  const [tutorialStep, setTutorialStep] = useState<TutorialStep | null>(null);
  const [biomeArrival, setBiomeArrival] = useState<BiomeArrival | null>(null);
  const [mechanicStatus, setMechanicStatus] = useState<MechanicStatusItem[]>([]);
  const [recentMemory, setRecentMemory] = useState<EchoMemory | null>(null);
  const [roomDescription, setRoomDescription] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<ModalId | null>(null);
  const [updateReady, setUpdateReady] = useState(false);
  const [updateApplying, setUpdateApplying] = useState(false);
  const [updateNotice, setUpdateNotice] = useState("");
  const [gameLoadError, setGameLoadError] = useState("");
  const [rendererIssue, setRendererIssue] = useState<"lost" | "failed" | null>(
    null,
  );
  const [rendererMode, setRendererMode] = useState<RendererMode>("auto");
  const [rendererLossCount, setRendererLossCount] = useState(0);
  const [failedRendererMode, setFailedRendererMode] =
    useState<RendererMode | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [installPrompt, setInstallPrompt] =
    useState<InstallPromptEvent | null>(null);
  const [storageNote, setStorageNote] = useState("");
  const [manualExport, setManualExport] = useState<string | null>(null);
  const [saveRecoveryNotice, setSaveRecoveryNotice] = useState("");
  const [persistenceStatus, setPersistenceStatus] =
    useState<SavePersistence>("saved");

  const synchronizeGamePause = useCallback(() => {
    const runtime = gameRef.current;
    if (!runtime) return;
    const reason = runtimePauseReason({
      playing: screenRef.current === "playing",
      modalOpen: activeModalRef.current !== null,
      pageHidden: pageHiddenRef.current,
      rendererUnavailable: rendererUnavailableRef.current,
      loadFailed: Boolean(gameLoadErrorRef.current),
    });
    if (reason) runtime.pause();
    else runtime.resume();
  }, []);

  const showModal = useCallback((next: ModalId) => {
    const transition = activateModalState(activeModalRef.current, next);
    activeModalRef.current = transition.active;
    if (transition.changed) setActiveModal(transition.active);
    synchronizeGamePause();
  }, [synchronizeGamePause]);

  const dismissModal = useCallback((expected: ModalId): boolean => {
    const transition = dismissModalState(activeModalRef.current, expected);
    activeModalRef.current = transition.active;
    if (transition.changed) setActiveModal(transition.active);
    return transition.changed;
  }, []);

  const clearModal = useCallback(() => {
    const transition = clearModalState(activeModalRef.current);
    activeModalRef.current = transition.active;
    if (transition.changed) setActiveModal(transition.active);
  }, []);

  const menuOpen = activeModal === "menu";
  const memoryOpen = activeModal === "memories";
  const mapOpen = activeModal === "map";
  const settingsOpen = activeModal === "settings";
  const helpOpen = activeModal === "help";
  const restartOpen = activeModal === "restart";

  useEffect(() => {
    screenRef.current = screen;
    gameLoadErrorRef.current = gameLoadError;
    synchronizeGamePause();
  }, [activeModal, gameLoadError, rendererIssue, screen, synchronizeGamePause]);

  useEffect(() => {
    const storage = browserStorage();
    const loaded = loadSaveWithRecovery(storage);
    const initialSave = loaded.save;
    const recoveryMessage = saveRecoveryMessage(loaded.recovery);
    const persistenceMessage = loaded.recovery === "unavailable"
      ? ""
      : savePersistenceMessage(loaded.persistence);
    const recoveryNote = [recoveryMessage, persistenceMessage]
      .filter(Boolean)
      .join(" ");
    if (loaded.persistence !== "saved") {
      persistenceRef.current = loaded.persistence;
    }
    saveRef.current = initialSave;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setSave(initialSave);
      if (loaded.persistence !== "saved") {
        setPersistenceStatus(loaded.persistence);
      }
      if (initialSave.journeyComplete) setScreen("complete");
      if (recoveryNote) {
        setStorageNote(recoveryNote);
        setSaveRecoveryNotice(recoveryNote);
        setAnnouncement(recoveryNote);
      }
    });

    let registration: ServiceWorkerRegistration | undefined;
    const updateFound = () => {
      const worker = registration?.installing;
      if (!worker) return;
      worker.addEventListener("statechange", () => {
        if (worker.state === "installed" && navigator.serviceWorker.controller) {
          setUpdateReady(true);
        }
      });
    };
    const localhost =
      location.hostname === "localhost" || location.hostname === "127.0.0.1";
    const productionHost = location.protocol === "https:" && !localhost;
    const localProductionBuild =
      process.env.NODE_ENV === "production" && localhost;
    if (
      (productionHost || localProductionBuild) &&
      "serviceWorker" in navigator
    ) {
      const serviceWorkerUrl = new URL("sw.js", document.baseURI);
      void navigator.serviceWorker
        .register(serviceWorkerUrl, { scope: new URL("./", serviceWorkerUrl).pathname })
        .then((value) => {
          registration = value;
          if (registration.waiting) setUpdateReady(true);
          registration.addEventListener("updatefound", updateFound);
          void registration.update();
        })
        .catch(() => undefined);
    }

    const captureInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", captureInstallPrompt);
    return () => {
      cancelled = true;
      registration?.removeEventListener("updatefound", updateFound);
      window.removeEventListener("beforeinstallprompt", captureInstallPrompt);
    };
  }, []);

  useEffect(() => {
    const offline = () => {
      setIsOffline(true);
      setAnnouncement("Offline. Your journey still saves on this device.");
    };
    const online = () => {
      setIsOffline(false);
      setAnnouncement("Back online. Checking for a fresh grotto.");
      if ("serviceWorker" in navigator) {
        void navigator.serviceWorker
          .getRegistration(new URL("./", document.baseURI).href)
          .then((registration) => registration?.update())
          .catch(() => undefined);
      }
    };
    if (!navigator.onLine) offline();
    window.addEventListener("offline", offline);
    window.addEventListener("online", online);
    return () => {
      window.removeEventListener("offline", offline);
      window.removeEventListener("online", online);
    };
  }, []);

  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  const reportSavePersistence = useCallback(
    (persistence: SavePersistence) => {
      const previous = persistenceRef.current;
      if (persistence === previous) return;
      persistenceRef.current = persistence;
      const message = persistence === "saved"
        ? "Autosave is working again on this device."
        : savePersistenceMessage(persistence);
      setPersistenceStatus(persistence);
      setStorageNote(message);
      setSaveRecoveryNotice(message);
      setAnnouncement(message);
    },
    [],
  );

  const updateSave = useCallback(
    (updater: (current: SaveGameV1) => SaveGameV1) => {
      const baseline = saveRef.current ?? createFreshSave();
      const elapsed =
        screen === "playing" && sessionStartedRef.current > 0
          ? Date.now() - sessionStartedRef.current
          : 0;
      sessionStartedRef.current = screen === "playing" ? Date.now() : 0;
      const next = updater({
        ...baseline,
        playTimeMs: baseline.playTimeMs + elapsed,
      });
      const result = persistSaveWithStatus(browserStorage(), next);
      reportSavePersistence(result.persistence);
      saveRef.current = result.save;
      setSave(result.save);
    },
    [reportSavePersistence, screen],
  );

  const onGameEvent = useCallback(
    (event: GameEvent) => {
      switch (event.type) {
        case "ready":
          setTotalRooms(event.totalRooms);
          mountRef.current?.focus({ preventScroll: true });
          queueMicrotask(synchronizeGamePause);
          break;
        case "room":
          setRoom({
            index: event.index,
            biomeName: event.biomeName,
            name: event.name,
            subtitle: event.subtitle,
            story: event.story,
            hints: event.hints,
            isRevisit: event.isRevisit,
          });
          setHintStage(0);
          setRecentMemory(null);
          setRoomDescription(null);
          break;
        case "announce":
          setAnnouncement(event.message);
          break;
        case "description":
          setRoomDescription(event.message);
          if (event.message) {
            setAnnouncement(`Lantern compass. ${event.message}`);
          } else {
            setAnnouncement(
              "Position changed. Use Compass or C for an updated room description.",
            );
          }
          break;
        case "hint":
          setRoomDescription(null);
          setHintStage(event.index);
          setAnnouncement(`Hint ${event.index}: ${event.hint}`);
          break;
        case "inputMethod":
          setInputMethod(event.method);
          break;
        case "openMenu":
          showModal("menu");
          break;
        case "openMemories":
          showModal("memories");
          break;
        case "openMap":
          showModal("map");
          break;
        case "tutorial":
          setTutorialStep(event.step);
          break;
        case "biomeArrival":
          setBiomeArrival(event.arrival);
          break;
        case "biomeSeen":
          updateSave((current) => applyCampaignProgress(current, event));
          break;
        case "mechanicStatus":
          setMechanicStatus(event.items);
          break;
        case "seedFound": {
          setRoomDescription(null);
          const memory = echoMemoryForSeed(event.seedId);
          if (memory) setRecentMemory(memory);
          break;
        }
        case "progress":
          updateSave((current) => applyCampaignProgress(current, event));
          break;
        case "journeyComplete":
          updateSave((current) => applyCampaignProgress(current, event));
          setScreen("complete");
          setAnnouncement("The Heartbloom wakes. Glimmer Grotto shines again.");
          break;
        case "rendererState":
          if (event.state === "lost") {
            rendererLossCountRef.current += 1;
            setRendererLossCount(rendererLossCountRef.current);
          }
          rendererUnavailableRef.current = event.state !== "restored";
          setRendererIssue(event.state === "restored" ? null : event.state);
          if (event.state === "lost") {
            setAnnouncement(
              "The cave view paused while the browser restores its drawing context.",
            );
          } else if (event.state === "failed") {
            setAnnouncement(
              "The cave view could not be restored. Restart the view to keep playing from the same save.",
            );
          } else {
            setAnnouncement("The cave view is restored. The current room is ready.");
            window.requestAnimationFrame(() => {
              if (
                screenRef.current === "playing" &&
                activeModalRef.current === null &&
                !rendererUnavailableRef.current
              ) {
                mountRef.current?.focus({ preventScroll: true });
              }
            });
          }
          break;
        case "error":
          setAnnouncement(event.message);
          break;
      }
    },
    [showModal, synchronizeGamePause, updateSave],
  );

  useEffect(() => {
    if (screen !== "playing" || !mountRef.current || !saveRef.current) return;
    let cancelled = false;
    let attemptEnded = false;
    let mountedGame: GameHandle | null = null;
    let mountStarted = false;
    const parent = mountRef.current;
    const moduleWatchdog = new BootReadinessWatchdog(
      browserBootWatchdogTimers(),
    );
    const watchdog = new BootReadinessWatchdog(browserBootWatchdogTimers());
    const publishFailure = (
      failedMode: RendererMode | null,
      message: string,
    ) => {
      if (cancelled || attemptEnded) return;
      attemptEnded = true;
      moduleWatchdog.cancel();
      watchdog.cancel();
      const failedGame = mountedGame;
      mountedGame = null;
      if (gameRef.current === failedGame) gameRef.current = null;
      try {
        failedGame?.destroy();
      } catch {
        // The visible recovery path does not depend on renderer teardown success.
      }
      try {
        parent.replaceChildren();
      } catch {
        // A detached mount has no remaining stalled surface to clear.
      }
      setFailedRendererMode(failedMode);
      setGameLoadError(message);
      setAnnouncement(message);
    };
    setGameLoadError("");
    setFailedRendererMode(null);
    const moduleAttempt = preloadGameModule();
    if (
      !moduleWatchdog.arm(GAME_MODULE_TIMEOUT_MS, () => {
        gameModuleLoader.invalidatePending(moduleAttempt);
        publishFailure(
          null,
          "The grotto engine took too long to arrive. Check this connection, then try a fresh load; your journey is still safe.",
        );
      })
    ) {
      gameModuleLoader.invalidatePending(moduleAttempt);
      publishFailure(
        null,
        "The grotto engine loading timer could not start. Try a fresh load; your journey is still safe.",
      );
    }
    void moduleAttempt
      .then(({ mountGame }) => {
        if (cancelled || attemptEnded || !saveRef.current) return;
        moduleWatchdog.ready();
        mountStarted = true;
        if (
          !watchdog.arm(GAME_BOOT_TIMEOUT_MS, () => {
            const label = rendererMode === "canvas" ? "stable Canvas" : "automatic";
            publishFailure(
              rendererMode,
              `The ${label} cave view did not become ready in time. Try the other renderer or retry this view; your journey is still safe.`,
            );
          })
        ) {
          throw new Error("The game readiness timer could not start.");
        }
        const game = mountGame({
          parent,
          save: saveRef.current,
          rendererMode,
          onEvent: (event) => {
            if (cancelled || attemptEnded) return;
            if (event.type === "ready") watchdog.ready();
            onGameEvent(event);
          },
        });
        if (cancelled || attemptEnded) {
          try {
            game.destroy();
          } catch {
            // A cancelled partial mount has no remaining player-facing state.
          }
          return;
        }
        mountedGame = game;
        gameRef.current = game;
        synchronizeGamePause();
      })
      .catch(() => {
        const failedMode = mountStarted ? rendererMode : null;
        const message = failedMode === "canvas"
          ? "The stable Canvas view could not start. Try the automatic renderer or retry Canvas; your journey is still safe."
          : failedMode === "auto"
            ? "The automatic cave view could not start. Try stable Canvas or retry automatic rendering; your journey is still safe."
            : "The grotto engine could not load. Check this connection, then try again; your journey is still safe.";
        publishFailure(failedMode, message);
      });
    return () => {
      cancelled = true;
      moduleWatchdog.cancel();
      watchdog.cancel();
      if (gameRef.current === mountedGame) gameRef.current = null;
      try {
        mountedGame?.destroy();
      } catch {
        // Parent cleanup below still removes a failed renderer surface.
      }
      parent.replaceChildren();
    };
  }, [onGameEvent, rendererMode, screen, session, synchronizeGamePause]);

  useEffect(() => {
    const onVisibility = () => {
      pageHiddenRef.current = document.hidden;
      synchronizeGamePause();
    };
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [synchronizeGamePause]);

  useEffect(() => {
    if (screen !== "playing") return;
    const frame = window.requestAnimationFrame(() => {
      if (biomeArrival) arrivalButtonRef.current?.focus({ preventScroll: true });
      else mountRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [biomeArrival, screen]);

  useEffect(() => {
    if (!rendererIssue || activeModal !== null) return;
    const frame = window.requestAnimationFrame(() => {
      rendererRetryRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeModal, rendererIssue]);

  useEffect(() => {
    if (!gameLoadError || activeModal !== null) return;
    const frame = window.requestAnimationFrame(() => {
      gameRecoveryRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeModal, gameLoadError]);

  const dispatch = useCallback(
    (command: GameCommand) => gameRef.current?.dispatch(command),
    [],
  );

  const heldCommand = useCallback(() => {
    heldCommandRef.current ??= new HeldCommandController(
      browserHeldCommandTimers(),
      dispatch,
    );
    return heldCommandRef.current;
  }, [dispatch]);

  const stopHeldCommand = useCallback((pointerId?: number) => {
    heldCommandRef.current?.stop(pointerId);
  }, []);

  const startHeldCommand = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>, command: GameCommand) => {
      event.preventDefault();
      const target = event.currentTarget;
      const pointerId = event.pointerId;
      try {
        target.setPointerCapture(pointerId);
      } catch {
        // Global pointer cleanup still bounds the hold when capture is refused.
      }
      heldCommand().start(pointerId, command, () => {
        if (target.hasPointerCapture(pointerId)) {
          target.releasePointerCapture(pointerId);
        }
      });
    },
    [heldCommand],
  );

  const finishHeldCommand = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      stopHeldCommand(event.pointerId);
    },
    [stopHeldCommand],
  );

  useEffect(() => {
    const finishPointer = (event: PointerEvent) => {
      stopHeldCommand(event.pointerId);
    };
    const interrupt = () => stopHeldCommand();
    const visibilityChanged = () => {
      if (document.hidden) interrupt();
    };
    window.addEventListener("pointerup", finishPointer);
    window.addEventListener("pointercancel", finishPointer);
    window.addEventListener("blur", interrupt);
    window.addEventListener("pagehide", interrupt);
    document.addEventListener("visibilitychange", visibilityChanged);
    return () => {
      window.removeEventListener("pointerup", finishPointer);
      window.removeEventListener("pointercancel", finishPointer);
      window.removeEventListener("blur", interrupt);
      window.removeEventListener("pagehide", interrupt);
      document.removeEventListener("visibilitychange", visibilityChanged);
      interrupt();
    };
  }, [stopHeldCommand]);

  useEffect(() => {
    stopHeldCommand();
  }, [
    activeModal,
    biomeArrival,
    rendererIssue,
    room?.index,
    screen,
    session,
    stopHeldCommand,
  ]);

  const begin = (fresh: boolean) => {
    let next = saveRef.current ?? createFreshSave();
    if (fresh) {
      const cleared = clearSaveWithStatus(browserStorage());
      next = cleared.save;
      reportSavePersistence(cleared.persistence);
      saveRef.current = next;
      setSave(next);
      if (cleared.persistence === "saved") setSaveRecoveryNotice("");
    }
    sessionStartedRef.current = Date.now();
    setRoom(null);
    setHintStage(0);
    setTutorialStep(null);
    setBiomeArrival(null);
    setMechanicStatus([]);
    setRecentMemory(null);
    setRoomDescription(null);
    setGameLoadError("");
    rendererUnavailableRef.current = false;
    setRendererIssue(null);
    clearModal();
    setScreen("playing");
    setSession((value) => value + 1);
    window.scrollTo({ top: 0, behavior: "auto" });
    warmGameModule();
  };

  const enterJourney = () => {
    begin(false);
  };

  const returnToTitle = () => {
    if (screen === "playing") updateSave((current) => current);
    gameRef.current?.pause();
    clearModal();
    setRoom(null);
    setHintStage(0);
    setTutorialStep(null);
    setBiomeArrival(null);
    setMechanicStatus([]);
    setRecentMemory(null);
    setRoomDescription(null);
    rendererUnavailableRef.current = false;
    setRendererIssue(null);
    setScreen("title");
    setAnnouncement("Journey saved. Back at the grotto entrance.");
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  const retryGameLoad = () => {
    setGameLoadError("");
    setFailedRendererMode(null);
    rendererUnavailableRef.current = false;
    setRendererIssue(null);
    setRoom(null);
    setAnnouncement("Trying to open the grotto again.");
    setSession((value) => value + 1);
  };

  const prepareRendererMode = (
    nextMode: RendererMode,
    resetLossHistory = false,
  ) => {
    if (nextMode === "auto" && resetLossHistory) {
      rendererLossCountRef.current = 0;
      setRendererLossCount(0);
    }
    rendererUnavailableRef.current = false;
    setRendererIssue(null);
    setFailedRendererMode(null);
    setRendererMode(nextMode);
    setGameLoadError("");
  };

  const retryWithRendererMode = (
    nextMode: RendererMode,
    message: string,
    resetLossHistory = false,
  ) => {
    prepareRendererMode(nextMode, resetLossHistory);
    setRoom(null);
    setAnnouncement(message);
    setSession((value) => value + 1);
  };

  const retryRenderer = () => {
    const nextMode = recommendedRendererMode(
      rendererLossCountRef.current,
      rendererIssue === "failed",
    );
    retryWithRendererMode(
      nextMode,
      nextMode === "canvas"
        ? "Rebuilding the cave view in stable Canvas mode from your saved journey."
        : "Rebuilding the cave view from your saved journey.",
    );
  };

  const retryAlternateRenderer = () => {
    if (!failedRendererMode) return;
    const nextMode = alternateRendererMode(failedRendererMode);
    retryWithRendererMode(
      nextMode,
      nextMode === "canvas"
        ? "Trying the stable Canvas view with your saved journey."
        : "Trying automatic rendering again with your saved journey.",
      nextMode === "auto",
    );
  };

  const changeRendererMode = (nextMode: RendererMode) => {
    if (nextMode === rendererMode) return;
    prepareRendererMode(nextMode, nextMode === "auto");
    const message = nextMode === "canvas"
      ? "Stable Canvas rendering selected for this app session."
      : "Automatic rendering selected for this app session.";
    setAnnouncement(message);
    if (screenRef.current === "playing") {
      setRoom(null);
      setSession((value) => value + 1);
    }
  };

  const updateSettings = (changes: Partial<AccessibilitySettings>) => {
    updateSave((current) => ({
      ...current,
      settings: { ...current.settings, ...changes },
    }));
    const nextSettings = {
      ...(saveRef.current?.settings ?? createFreshSave().settings),
      ...changes,
    };
    dispatch({ type: "settings", settings: nextSettings });
  };

  const openSettings = useCallback(() => {
    showModal("settings");
  }, [showModal]);

  const closeSettings = useCallback(() => {
    if (dismissModal("settings")) synchronizeGamePause();
  }, [dismissModal, synchronizeGamePause]);

  const openHelp = useCallback(() => {
    showModal("help");
  }, [showModal]);

  const closeHelp = useCallback(() => {
    if (dismissModal("help")) synchronizeGamePause();
  }, [dismissModal, synchronizeGamePause]);

  const requestRestart = useCallback(() => {
    showModal("restart");
  }, [showModal]);

  const closeRestart = useCallback(() => {
    if (dismissModal("restart")) synchronizeGamePause();
  }, [dismissModal, synchronizeGamePause]);

  const confirmRestart = () => {
    if (!dismissModal("restart")) return;
    begin(true);
  };

  const revealHint = () => {
    setRecentMemory(null);
    setRoomDescription(null);
    dispatch({ type: "hint" });
  };

  const closeMenu = useCallback(() => {
    if (dismissModal("menu")) synchronizeGamePause();
  }, [dismissModal, synchronizeGamePause]);

  const openMemories = useCallback(() => {
    showModal("memories");
  }, [showModal]);

  const closeMemories = useCallback(() => {
    if (dismissModal("memories")) synchronizeGamePause();
  }, [dismissModal, synchronizeGamePause]);

  const openMap = useCallback(() => {
    showModal("map");
  }, [showModal]);

  const closeMap = useCallback(() => {
    if (dismissModal("map")) synchronizeGamePause();
  }, [dismissModal, synchronizeGamePause]);

  const visitMapRoom = useCallback(
    (roomIndex: number) => {
      if (!dismissModal("map")) return;
      dispatch({ type: "visit", roomIndex });
      synchronizeGamePause();
    },
    [dismissModal, dispatch, synchronizeGamePause],
  );

  usePageGamepadNavigation({
    enabled:
      (screen !== "playing" || Boolean(gameLoadError) || Boolean(rendererIssue)) &&
      activeModal === null,
    onInputMethod: setInputMethod,
    onMemories: openMemories,
    onSettings: openSettings,
  });

  const install = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  const applyUpdate = async () => {
    if (updateApplying) return;
    setUpdateApplying(true);
    setUpdateNotice("");
    let result: UpdateActivationResult = "failed";
    try {
      result = await activateWaitingUpdate(browserUpdateDependencies());
    } catch {
      result = "failed";
    }
    if (result === "activated" || result === "reload-requested") return;
    setUpdateApplying(false);
    setUpdateReady(true);
    const message = result === "timed-out"
      ? "The update took too long to activate. This version remains safe; select Update ready to try again."
      : "The update could not start. This version remains active; select Update ready to try again.";
    setUpdateNotice(message);
    setAnnouncement(message);
  };

  const downloadSave = () => {
    if (!saveRef.current) return;
    const serialized = exportSave(saveRef.current);
    if (requestTextDownload(serialized, "glimmer-grotto-save.json")) {
      setManualExport(null);
      setStorageNote("Save download requested. Check your browser downloads.");
      return;
    }
    setManualExport(serialized);
    setStorageNote(
      "The save download could not start. Copy the complete save text below before leaving.",
    );
  };

  const copyManualExport = async () => {
    if (!manualExport) return;
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard unavailable");
      }
      await navigator.clipboard.writeText(manualExport);
      setStorageNote("Save text copied to the clipboard.");
    } catch {
      manualExportRef.current?.focus({ preventScroll: true });
      manualExportRef.current?.select();
      setStorageNote(
        "Save text selected. Use your browser or device copy command, then keep it somewhere safe.",
      );
    }
  };

  const uploadSave = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const imported = importSaveWithRecovery(await file.text());
      const previousPersistence = persistenceRef.current;
      const result = persistSaveWithStatus(browserStorage(), imported.save);
      const persisted = result.save;
      persistenceRef.current = result.persistence;
      setPersistenceStatus(result.persistence);
      setManualExport(null);
      saveRef.current = persisted;
      setSave(persisted);
      setRoom(null);
      setHintStage(0);
      setTutorialStep(null);
      setBiomeArrival(null);
      setMechanicStatus([]);
      setRecentMemory(null);
      setRoomDescription(null);
      setScreen(persisted.journeyComplete ? "complete" : "title");
      setSession((value) => value + 1);
      const importNote = imported.repaired
        ? "Save imported and safely repaired. Close settings to continue."
        : "Save imported. Close settings to continue.";
      const persistenceNote = result.persistence === "saved"
        ? previousPersistence === "saved"
          ? ""
          : " Autosave is working again on this device."
        : ` ${savePersistenceMessage(result.persistence)}`;
      const note = `${importNote}${persistenceNote}`;
      setStorageNote(note);
      setSaveRecoveryNotice(
        imported.repaired ||
          result.persistence !== "saved" ||
          previousPersistence !== "saved"
          ? note
          : "",
      );
      setAnnouncement(note);
    } catch (error) {
      setStorageNote(error instanceof Error ? error.message : "Save import failed.");
    }
  };

  const settings = save?.settings ?? createFreshSave().settings;
  const completed = save?.completedRooms.length ?? 0;
  const collectedSeedIds = save?.collectedSeeds ?? [];
  const seeds = collectedMemoryCount(collectedSeedIds);
  const memoryGroups = echoMemoryGroups(collectedSeedIds);
  const memoriesComplete = seeds === ECHO_MEMORIES.length;
  const remainingMemories = ECHO_MEMORIES.length - seeds;
  const isAfterglow = Boolean(save?.journeyComplete && screen === "playing");
  const mapGroups = journeyMapGroups(
    save?.completedRooms ?? [],
    collectedSeedIds,
    save?.currentRoom ?? 0,
  );
  const hasProgress = completed > 0 || (save?.currentRoom ?? 0) > 0;
  const gameControlsDisabled =
    !room || Boolean(biomeArrival) || Boolean(rendererIssue);
  const stableRendererRecommended = recommendedRendererMode(
    rendererLossCount,
    rendererIssue === "failed",
  ) === "canvas";
  const tutorial = tutorialStep
    ? {
        move: {
          progress: "First light · 1 of 3",
          title: "Move through the moss",
          detail: `${movementControl(inputMethod)} to walk one tile at a time.`,
        },
        interact: {
          progress: "First light · 2 of 3",
          title: "Turn the crystal",
          detail: `${actionControl(inputMethod)} while standing beside it.`,
        },
        follow: {
          progress: "First light · 3 of 3",
          title: "Follow the new beam",
          detail: `Move to its next stop and use ${actionControl(inputMethod).toLowerCase()} again.`,
        },
      }[tutorialStep]
    : null;
  const rootClass = [
    "grotto-shell",
    settings.highContrast ? "is-high-contrast" : "",
    settings.largeText ? "is-large-text" : "",
    settings.reducedMotion ? "is-reduced-motion" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <main className={rootClass}>
      <div className="ambient ambient-one" aria-hidden="true" />
      <div className="ambient ambient-two" aria-hidden="true" />
      <div className="ambient ambient-three" aria-hidden="true" />

      <header className="topbar">
        <button
          type="button"
          className="brand-lockup"
          onClick={returnToTitle}
          aria-label={screen === "title" ? "Glimmer Grotto home" : "Return to title"}
        >
          <span className="brand-mark" aria-hidden="true">
            <span />
          </span>
          <span>Glimmer Grotto</span>
        </button>
        <div className="topbar-actions">
          {updateReady && (
            <button
              type="button"
              className="quiet-button"
              onClick={() => void applyUpdate()}
              disabled={updateApplying}
              aria-busy={updateApplying || undefined}
            >
              <Icon>↻</Icon> {updateApplying ? "Updating…" : "Update ready"}
            </button>
          )}
          {installPrompt && (
            <button type="button" className="quiet-button" onClick={install}>
              <Icon>↓</Icon> Install
            </button>
          )}
          {seeds > 0 && (
            <button
              type="button"
              className={`icon-button topbar-memory-button ${screen === "playing" ? "is-playing" : ""}`}
              onClick={openMemories}
              aria-label={`Echo memories, ${seeds} of ${ECHO_MEMORIES.length} found`}
              aria-keyshortcuts="J"
            >
              <Icon>✧</Icon>
              <span className="sr-only">Echo memories</span>
            </button>
          )}
          <button type="button" className="icon-button" onClick={openHelp}>
            <Icon>?</Icon>
            <span className="sr-only">How to play</span>
          </button>
          <button type="button" className="icon-button" onClick={openSettings}>
            <Icon>⚙</Icon>
            <span className="sr-only">Settings</span>
          </button>
        </div>
      </header>

      {isOffline && (
        <aside className="save-recovery-banner connection-banner" role="status">
          <Icon>⌁</Icon>
          <span>
            <strong>Offline</strong> · {persistenceStatus === "unavailable"
              ? "this session can continue; export a save before leaving."
              : "your journey still saves on this device."}
          </span>
        </aside>
      )}

      {saveRecoveryNotice && (
        <aside className="save-recovery-banner" role="status">
          <Icon>↺</Icon>
          <span>{saveRecoveryNotice}</span>
          <button
            type="button"
            onClick={() => setSaveRecoveryNotice("")}
            aria-label="Dismiss save notice"
          >
            ×
          </button>
        </aside>
      )}

      {updateNotice && (
        <aside className="save-recovery-banner" role="status">
          <Icon>↻</Icon>
          <span>{updateNotice}</span>
          <button
            type="button"
            onClick={() => setUpdateNotice("")}
            aria-label="Dismiss update notice"
          >
            ×
          </button>
        </aside>
      )}

      {screen === "title" && (
        <section className="title-screen" aria-labelledby="game-title">
          <div className="title-copy">
            <p className="eyebrow">A quiet puzzle adventure</p>
            <h1 id="game-title">
              Carry a little light
              <span>into the deep.</span>
            </h1>
            <p className="title-deck">
              Guide Mica and Luma through five sleeping cave gardens. Turn
              crystals, wake root-songs, and help the Heartbloom remember how to
              shine.
            </p>
            <div className="title-actions">
              <button
                type="button"
                className="primary-button"
                data-controller-default
                onClick={enterJourney}
                onPointerEnter={warmGameModule}
                onFocus={warmGameModule}
              >
                <Icon>✦</Icon>
                {save?.journeyComplete
                  ? "Explore the afterglow"
                  : hasProgress
                    ? "Continue journey"
                    : "Enter the grotto"}
              </button>
              {save?.journeyComplete && (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setScreen("complete")}
                >
                  View ending
                </button>
              )}
              {hasProgress && (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={requestRestart}
                >
                  Begin again
                </button>
              )}
            </div>
            <div className="title-facts" aria-label="Game features">
              <span>No fail states</span>
              <span>Local autosave</span>
              <span>20 handcrafted rooms</span>
              <span>15 hidden memories</span>
            </div>
          </div>

          <div className="title-art" aria-hidden="true">
            <div className="grotto-window">
              <div className="grotto-ring ring-one" />
              <div className="grotto-ring ring-two" />
              <div className="grotto-ring ring-three" />
              <div className="heartbloom">
                {Array.from({ length: 6 }, (_, index) => (
                  <span key={index} style={{ "--petal": index } as React.CSSProperties} />
                ))}
                <i />
              </div>
              <div className="mica-silhouette">
                <i />
                <b />
              </div>
              <div className="luma-silhouette" />
            </div>
            <p>“The dark is only waiting.”</p>
          </div>
        </section>
      )}

      {screen === "playing" && (
        <section className="play-screen" aria-label="Glimmer Grotto game">
          <div className="play-heading">
            <div>
              <p className="eyebrow">
                {isAfterglow
                  ? `Afterglow · ${room?.biomeName ?? "Heartbloom Sanctum"}`
                  : room?.isRevisit
                  ? `Revisiting · ${room.biomeName}`
                  : room?.biomeName ?? "Entering the grotto"}
              </p>
              <h1>{room?.name ?? "Following the first glimmer…"}</h1>
            </div>
            <div className="journey-counters" aria-label="Journey progress">
              <span>
                <b>{completed}</b>/{totalRooms} rooms
              </span>
              <button
                type="button"
                className="journey-memory-count"
                onClick={openMemories}
                aria-label={`Open echo memories, ${seeds} of ${ECHO_MEMORIES.length} found`}
                aria-keyshortcuts="J"
              >
                <b>{seeds}</b>/15 seeds
              </button>
            </div>
          </div>

          <div className="game-stage">
            <div className="game-frame">
              <div
              ref={mountRef}
              className="game-mount"
              role="application"
              data-focus-return
              tabIndex={biomeArrival || rendererIssue ? -1 : 0}
              aria-hidden={biomeArrival || rendererIssue ? true : undefined}
              aria-describedby={[
                tutorial ? "first-room-guide" : "",
                mechanicStatus.length > 0 && !biomeArrival ? "puzzle-status" : "",
              ].filter(Boolean).join(" ") || undefined}
              aria-keyshortcuts="Escape J M"
              aria-label="Top-down light puzzle. Use arrow keys or WASD, touch controls, or a gamepad to move. Use action to interact. Use Compass or C to describe the room. J opens memories; M opens the map."
            />
            {!room && !gameLoadError && (
              <div className="game-loading" role="status">
                <span />
                Waking the lantern…
              </div>
            )}
            {!room && gameLoadError && (
              <div className="game-load-error" role="alert">
                <Icon>◇</Icon>
                <strong>
                  {failedRendererMode
                    ? "The cave view did not start."
                    : "The lantern did not wake."}
                </strong>
                <p>{gameLoadError}</p>
                <div>
                  {failedRendererMode && (
                    <button
                      ref={gameRecoveryRef}
                      type="button"
                      className="primary-button"
                      data-controller-default
                      onClick={retryAlternateRenderer}
                    >
                      {failedRendererMode === "canvas"
                        ? "Try automatic view"
                        : "Try stable Canvas view"}
                    </button>
                  )}
                  <button
                    ref={failedRendererMode ? undefined : gameRecoveryRef}
                    type="button"
                    className={failedRendererMode ? "secondary-button" : "primary-button"}
                    data-controller-default={failedRendererMode ? undefined : true}
                    onClick={retryGameLoad}
                  >
                    {failedRendererMode === "canvas"
                      ? "Retry Canvas"
                      : failedRendererMode === "auto"
                        ? "Retry automatic"
                        : "Try again"}
                  </button>
                  <button type="button" className="secondary-button" onClick={returnToTitle}>
                    Return to title
                  </button>
                </div>
              </div>
            )}
            {rendererIssue && (
              <div className="game-load-error renderer-recovery" role="alert">
                <Icon>â—‡</Icon>
                <strong>
                  {rendererIssue === "lost"
                    ? "The cave view is resting."
                    : "The cave view needs rebuilding."}
                </strong>
                <p>
                  {stableRendererRecommended
                    ? "The accelerated cave view has become unstable. Switch to the stable Canvas view and continue from the same saved journey."
                    : rendererIssue === "lost"
                    ? "The browser is restoring the drawing surface. You can wait for it to return automatically, or restart only the view now. Your journey is safe."
                    : "The browser restored its drawing surface, but the room could not be redrawn. Restart only the view to continue from the same saved journey."}
                </p>
                <div>
                  <button
                    ref={rendererRetryRef}
                    type="button"
                    className="primary-button"
                    data-controller-default
                    onClick={retryRenderer}
                  >
                    {stableRendererRecommended ? "Use stable view" : "Restart view"}
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={returnToTitle}
                  >
                    Return to title
                  </button>
                </div>
              </div>
            )}
            {biomeArrival && (
              <section
                className={`biome-arrival biome-arrival--${biomeArrival.biome}`}
                role="dialog"
                aria-labelledby="biome-arrival-title"
                aria-describedby="biome-arrival-story"
                onKeyDown={(event) => {
                  if (["Space", "Enter", "KeyE"].includes(event.code)) {
                    event.preventDefault();
                    event.stopPropagation();
                    dispatch({ type: "continue" });
                  }
                }}
              >
                <div className="arrival-motif" aria-hidden="true">
                  <span>{biomeArrival.glyph}</span>
                </div>
                <p className="arrival-eyebrow">{biomeArrival.eyebrow}</p>
                <h2 id="biome-arrival-title">{biomeArrival.name}</h2>
                <p className="arrival-title">{biomeArrival.title}</p>
                <p id="biome-arrival-story" className="arrival-story">
                  {biomeArrival.story}
                </p>
                <button
                  ref={arrivalButtonRef}
                  type="button"
                  className="primary-button arrival-button"
                  onClick={() => dispatch({ type: "continue" })}
                >
                  <Icon>✦</Icon> {biomeArrival.buttonLabel}
                </button>
                <small>{continueControl(inputMethod)}</small>
              </section>
            )}
            <div className="game-tools" role="toolbar" aria-label="Puzzle tools">
              <button
                type="button"
                disabled={gameControlsDisabled}
                onClick={() => dispatch({ type: "focus" })}
                aria-keyshortcuts="F"
              >
                <Icon>◉</Icon> Focus
              </button>
              <button
                type="button"
                disabled={gameControlsDisabled}
                onClick={() => dispatch({ type: "describe" })}
                aria-label="Describe room with Lantern compass"
                aria-keyshortcuts="C"
              >
                <Icon>◎</Icon> Compass
              </button>
              <button
                type="button"
                disabled={gameControlsDisabled}
                onClick={revealHint}
                aria-keyshortcuts="H"
              >
                <Icon>✦</Icon> Hint
              </button>
              <button
                type="button"
                disabled={gameControlsDisabled}
                onClick={() => dispatch({ type: "reset" })}
                aria-keyshortcuts="R"
              >
                <Icon>↺</Icon> Reset
              </button>
              <button
                type="button"
                disabled={gameControlsDisabled}
                onClick={openMap}
                aria-keyshortcuts="M"
              >
                <Icon>⌖</Icon> Map
              </button>
            </div>
            <div className="touch-controls" role="group" aria-label="Touch controls">
              <div className="touch-dpad">
                <button
                  type="button"
                  className="touch-up"
                  disabled={gameControlsDisabled}
                  onPointerDown={(event) => {
                    setInputMethod("touch");
                    startHeldCommand(event, { type: "move", dx: 0, dy: -1 });
                  }}
                  onPointerUp={finishHeldCommand}
                  onPointerCancel={finishHeldCommand}
                  onLostPointerCapture={finishHeldCommand}
                >
                  <span aria-hidden="true">↑</span>
                  <span className="sr-only">Move up</span>
                </button>
                <button
                  type="button"
                  className="touch-left"
                  disabled={gameControlsDisabled}
                  onPointerDown={(event) => {
                    setInputMethod("touch");
                    startHeldCommand(event, { type: "move", dx: -1, dy: 0 });
                  }}
                  onPointerUp={finishHeldCommand}
                  onPointerCancel={finishHeldCommand}
                  onLostPointerCapture={finishHeldCommand}
                >
                  <span aria-hidden="true">←</span>
                  <span className="sr-only">Move left</span>
                </button>
                <button
                  type="button"
                  className="touch-right"
                  disabled={gameControlsDisabled}
                  onPointerDown={(event) => {
                    setInputMethod("touch");
                    startHeldCommand(event, { type: "move", dx: 1, dy: 0 });
                  }}
                  onPointerUp={finishHeldCommand}
                  onPointerCancel={finishHeldCommand}
                  onLostPointerCapture={finishHeldCommand}
                >
                  <span aria-hidden="true">→</span>
                  <span className="sr-only">Move right</span>
                </button>
                <button
                  type="button"
                  className="touch-down"
                  disabled={gameControlsDisabled}
                  onPointerDown={(event) => {
                    setInputMethod("touch");
                    startHeldCommand(event, { type: "move", dx: 0, dy: 1 });
                  }}
                  onPointerUp={finishHeldCommand}
                  onPointerCancel={finishHeldCommand}
                  onLostPointerCapture={finishHeldCommand}
                >
                  <span aria-hidden="true">↓</span>
                  <span className="sr-only">Move down</span>
                </button>
              </div>
              <button
                type="button"
                className="touch-action"
                disabled={gameControlsDisabled}
                onPointerDown={() => {
                  setInputMethod("touch");
                  dispatch({ type: "interact" });
                }}
              >
                <Icon>✦</Icon>
                <span>Action</span>
              </button>
            </div>
            </div>
            {mechanicStatus.length > 0 && !biomeArrival && (
              <aside id="puzzle-status" className="mechanic-status" aria-label="Puzzle status">
                {mechanicStatus.map((item) => (
                  <section
                    key={item.kind}
                    className={`mechanic-status__item mechanic-status__item--${item.kind}`}
                  >
                    <span className="mechanic-status__label">{item.label}</span>
                    <strong>{item.value}</strong>
                    {item.sequence && (
                      <span className="mechanic-sequence" aria-hidden="true">
                        {item.sequence.map((step, index) => (
                          <span
                            key={`${step.name}-${index}`}
                            className={`mechanic-sequence__step is-${step.state}`}
                          >
                            {step.glyph}
                          </span>
                        ))}
                      </span>
                    )}
                    <span className="sr-only">{item.detail}</span>
                  </section>
                ))}
              </aside>
            )}
            {tutorial && (
              <aside id="first-room-guide" className="tutorial-card" role="status">
                <span>{tutorial.progress}</span>
                <strong>{tutorial.title}</strong>
                <p>{tutorial.detail}</p>
              </aside>
            )}
          </div>

          <div className={`story-row ${roomDescription ? "is-compass" : ""}`}>
            <div className="story-card">
              <span className="story-glyph" aria-hidden="true">❧</span>
              <div>
                <p>{room?.subtitle}</p>
                <span>{room?.story}</span>
                {room?.isRevisit && (
                  <small className="revisit-note">
                    {isAfterglow
                      ? "Afterglow · every restored room remains open from the map."
                      : "Revisiting a restored room · your deeper path remains saved."}
                  </small>
                )}
              </div>
            </div>
            <div
              className={`hint-card ${hintStage > 0 || recentMemory || roomDescription ? "is-visible" : ""} ${recentMemory ? "is-memory" : ""} ${roomDescription ? "is-compass" : ""}`}
              aria-live={roomDescription ? "off" : "polite"}
            >
              <p>
                {recentMemory
                  ? `Echo memory · ${recentMemory.title}`
                  : roomDescription
                    ? "Lantern compass"
                    : hintStage > 0
                      ? `Lantern hint ${hintStage} of 3`
                      : "Lantern hints"}
              </p>
              <span>
                {recentMemory
                  ? recentMemory.text
                  : roomDescription
                    ? roomDescription
                    : hintStage > 0
                      ? room?.hints[hintStage - 1]
                      : "Ask only when you want a gentle nudge."}
              </span>
            </div>
          </div>
        </section>
      )}

      {screen === "complete" && (
        <section className="ending-screen" aria-labelledby="ending-title">
          <div className="ending-bloom" aria-hidden="true">
            {Array.from({ length: 10 }, (_, index) => (
              <span key={index} style={{ "--petal": index } as React.CSSProperties} />
            ))}
            <i />
          </div>
          <p className="eyebrow">The Heartbloom wakes</p>
          <h1 id="ending-title">The grotto glimmers again.</h1>
          <p>
            Mica&apos;s small light has become a garden of thousands. Luma settles
            beside the lantern, and the cave begins a new song.
          </p>
          <div className={`afterglow-invitation ${memoriesComplete ? "is-complete" : ""}`}>
            <span aria-hidden="true">✧</span>
            <div>
              <strong>
                {memoriesComplete
                  ? "Every keeper story shines in the lantern."
                  : `${remainingMemories} ${remainingMemories === 1 ? "memory still waits" : "memories still wait"}.`}
              </strong>
              <p>
                {memoriesComplete
                  ? "The restored grotto remains yours to wander whenever you wish."
                  : "The afterglow keeps every restored path open, so no echo seed is lost."}
              </p>
            </div>
          </div>
          <div className="ending-stats">
            <span><b>{completed}</b> rooms restored</span>
            <span><b>{seeds}</b> / {ECHO_MEMORIES.length} memories found</span>
          </div>
          <div className="title-actions">
            <button
              type="button"
              className="primary-button"
              data-controller-default
              onClick={enterJourney}
            >
              <Icon>⌖</Icon> Explore restored grotto
            </button>
            <button type="button" className="secondary-button" onClick={returnToTitle}>
              Return to title
            </button>
            <button type="button" className="secondary-button" onClick={requestRestart}>
              Begin a new journey
            </button>
          </div>
        </section>
      )}

      <footer className="site-footer">
        <span>Made for unhurried moments.</span>
        <span className="footer-details">
          Your journey stays on this device.
          <a href="third-party-notices.txt" target="_blank" rel="noreferrer">
            Credits &amp; licenses<span className="sr-only"> (opens in a new tab)</span>
          </a>
        </span>
      </footer>

      {menuOpen && (
        <Modal
          labelledBy="lantern-menu-title"
          className="lantern-menu-panel"
          onClose={closeMenu}
        >
          <button
            type="button"
            className="modal-close"
            onClick={closeMenu}
            aria-label="Close lantern menu"
            autoFocus
          >
            ×
          </button>
          <p className="eyebrow">The path can wait</p>
          <h2 id="lantern-menu-title">Lantern menu</h2>
          <p className="lantern-menu-intro">
            Review the journey or make the grotto more comfortable. Your
            current room stays saved.
          </p>
          <div className="lantern-menu-actions">
            <button
            type="button"
            className="lantern-menu-action"
            disabled={gameControlsDisabled}
              aria-keyshortcuts="M"
              onClick={() => {
                showModal("map");
              }}
            >
              <Icon>⌖</Icon>
              <span>
                <strong>Grotto map</strong>
                <small>Replay restored rooms and recover memories</small>
              </span>
            </button>
            <button
              type="button"
              className="lantern-menu-action"
              aria-keyshortcuts="J"
              onClick={() => {
                showModal("memories");
              }}
            >
              <Icon>✧</Icon>
              <span>
                <strong>Echo memories</strong>
                <small>Read every keeper story found so far</small>
              </span>
            </button>
            <button
              type="button"
              className="lantern-menu-action"
              onClick={() => {
                showModal("settings");
              }}
            >
              <Icon>⚙</Icon>
              <span>
                <strong>Settings</strong>
                <small>Motion, contrast, text, music, and effects</small>
              </span>
            </button>
            <button
              type="button"
              className="lantern-menu-action"
              onClick={() => {
                showModal("help");
              }}
            >
              <Icon>?</Icon>
              <span>
                <strong>How to play</strong>
                <small>Review every keyboard and controller control</small>
              </span>
            </button>
          </div>
          {biomeArrival && (
            <p className="lantern-menu-arrival-note">
              Continue the biome arrival before changing rooms from the map.
            </p>
          )}
          {inputMethod === "gamepad" && (
            <p className="controller-dialog-guide lantern-menu-controller-guide">
              Use the left stick or D-pad to move. A chooses; B returns to the
              grotto.
            </p>
          )}
          <button
            type="button"
            className="secondary-button lantern-menu-return"
            onClick={returnToTitle}
          >
            Return to title
          </button>
        </Modal>
      )}

      {helpOpen && (
        <Modal labelledBy="help-title" onClose={closeHelp}>
            <button type="button" className="modal-close" onClick={closeHelp} aria-label="Close how to play" autoFocus>×</button>
            <p className="eyebrow">Lantern guide</p>
            <h2 id="help-title">How to play</h2>
            {inputMethod === "gamepad" && (
              <p className="controller-dialog-guide">
                Use up or down to scroll this guide. Press B to close it.
              </p>
            )}
            <div className="control-list">
              <div><kbd>WASD</kbd><kbd>↑↓←→</kbd><span>Move one step</span></div>
              <div><kbd>Space</kbd><kbd>E</kbd><span>Turn, ring, carry, or continue</span></div>
              <div><kbd>F</kbd><span>Highlight nearby puzzle objects</span></div>
              <div><kbd>C</kbd><span>Describe position, paths, landmarks, and beam</span></div>
              <div><kbd>H</kbd><span>Hear the next hint</span></div>
              <div><kbd>R</kbd><span>Reset the current room</span></div>
              <div><kbd>Esc</kbd><span>Open the Lantern menu</span></div>
              <div><kbd>J</kbd><span>Open echo memories</span></div>
              <div><kbd>M</kbd><span>Open the grotto map</span></div>
              <div><kbd>Stick</kbd><kbd>D-pad</kbd><span>Controller movement</span></div>
              <div><kbd>A</kbd><span>Controller action</span></div>
              <div><kbd>B</kbd><span>Controller Lantern compass</span></div>
              <div><kbd>X</kbd><span>Controller focus glow</span></div>
              <div><kbd>Y</kbd><span>Controller hint</span></div>
              <div><kbd>View</kbd><span>Controller echo memories</span></div>
              <div><kbd>Menu</kbd><span>Open the controller Lantern menu</span></div>
              <div><kbd>D-pad</kbd><kbd>A</kbd><kbd>B</kbd><span>Move, choose, and close in dialogs</span></div>
            </div>
            <p className="modal-note">
              There are no timers or fail states. Every choice can be changed,
              and every room can be reset whenever you like.
            </p>
        </Modal>
      )}

      {settingsOpen && (
        <Modal labelledBy="settings-title" className="settings-panel" onClose={closeSettings}>
            <button type="button" className="modal-close" onClick={closeSettings} aria-label="Close settings" autoFocus>×</button>
            <p className="eyebrow">Make it yours</p>
            <h2 id="settings-title">Settings</h2>
            {inputMethod === "gamepad" && (
              <p className="controller-dialog-guide">
                Use up or down between settings, left or right on sliders, A to toggle, and B to close.
              </p>
            )}
            <label className="toggle-row">
              <span><b>Reduced motion</b><small>Stops movement animation and ambient drift.</small></span>
              <input
                type="checkbox"
                checked={settings.reducedMotion}
                onChange={(event) => updateSettings({ reducedMotion: event.target.checked })}
              />
            </label>
            <label className="toggle-row">
              <span><b>High contrast</b><small>Strengthens interface and puzzle outlines.</small></span>
              <input
                type="checkbox"
                checked={settings.highContrast}
                onChange={(event) => updateSettings({ highContrast: event.target.checked })}
              />
            </label>
            <label className="toggle-row">
              <span><b>Larger text</b><small>Increases interface and story text.</small></span>
              <input
                type="checkbox"
                checked={settings.largeText}
                onChange={(event) => updateSettings({ largeText: event.target.checked })}
              />
            </label>
            <label className="range-row">
              <span>Music</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.musicVolume}
                onChange={(event) => updateSettings({ musicVolume: Number(event.target.value) })}
              />
            </label>
            <label className="range-row">
              <span>Effects</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.effectsVolume}
                onChange={(event) => updateSettings({ effectsVolume: Number(event.target.value) })}
              />
            </label>
            <section
              className="renderer-setting"
              role="group"
              aria-labelledby="renderer-setting-title"
            >
              <span>
                <b id="renderer-setting-title">Rendering</b>
                <small>
                  {rendererMode === "canvas"
                    ? "Stable Canvas is active for this app session."
                    : "Automatic rendering chooses the best available accelerated view."}
                </small>
              </span>
              <button
                type="button"
                className="secondary-button"
                onClick={() => changeRendererMode(alternateRendererMode(rendererMode))}
              >
                {rendererMode === "canvas"
                  ? "Try automatic view"
                  : "Use stable Canvas"}
              </button>
            </section>
            <div className="save-tools">
              <button type="button" className="secondary-button" onClick={downloadSave}>Export save</button>
              <button type="button" className="secondary-button" onClick={() => fileInputRef.current?.click()}>Import save</button>
              <input ref={fileInputRef} type="file" accept="application/json,.json" onChange={uploadSave} hidden />
            </div>
            {manualExport && (
              <section className="manual-export" aria-labelledby="manual-export-title">
                <h3 id="manual-export-title">Manual save copy</h3>
                <p id="manual-export-help">
                  Keep every character. This text can be imported later as a
                  <code>.json</code> save file.
                </p>
                <textarea
                  ref={manualExportRef}
                  value={manualExport}
                  readOnly
                  rows={7}
                  wrap="off"
                  spellCheck={false}
                  aria-describedby="manual-export-help"
                  aria-label="Complete Glimmer Grotto save text"
                  onFocus={(event) => event.currentTarget.select()}
                />
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => void copyManualExport()}
                >
                  Copy save text
                </button>
              </section>
            )}
            {storageNote && <p className="storage-note" role="status">{storageNote}</p>}
            <p className="license-note">
              Glimmer Grotto is built with open-source software.{" "}
              <a href="third-party-notices.txt" target="_blank" rel="noreferrer">
                Read credits &amp; licenses<span className="sr-only"> (opens in a new tab)</span>
              </a>
              .
            </p>
        </Modal>
      )}

      {memoryOpen && (
        <Modal labelledBy="memories-title" className="memory-panel" onClose={closeMemories}>
          <button
            type="button"
            className="modal-close"
            onClick={closeMemories}
            aria-label="Close echo memories"
            autoFocus
          >
            ×
          </button>
          <p className="eyebrow">The lantern remembers</p>
          <h2 id="memories-title">Echo memories</h2>
          <div className={`memory-summary ${memoriesComplete ? "is-complete" : ""}`}>
            <span className="memory-summary__glyph" aria-hidden="true">✧</span>
            <div>
              <strong>{seeds} of {ECHO_MEMORIES.length} memories returned</strong>
              <p>
                {memoriesComplete
                  ? "Every lost story has found its way back to the lantern."
                  : "Echo seeds hold stories left by the grotto's old keepers."}
              </p>
            </div>
          </div>
          {inputMethod === "gamepad" && (
            <p className="controller-dialog-guide">
              Use the D-pad to scroll and B to close. Menu opens the Lantern menu after you return.
            </p>
          )}
          <div className="memory-groups">
            {memoryGroups.map((group) => (
              <section
                key={group.biome}
                className={`memory-group memory-group--${group.biome}`}
                aria-labelledby={`memory-biome-${group.biome}`}
              >
                <div className="memory-group__heading">
                  <h3 id={`memory-biome-${group.biome}`}>{group.biomeName}</h3>
                  <span>{group.found} / {group.entries.length}</span>
                </div>
                <ol className="memory-list" role="list">
                  {group.entries.map((entry) => (
                    <li
                      key={entry.seedId}
                      role="listitem"
                      className={`memory-entry ${entry.discovered ? "is-found" : "is-sleeping"}`}
                    >
                      <span className="memory-entry__number" aria-hidden="true">
                        {String(entry.number).padStart(2, "0")}
                      </span>
                      <div>
                        <h4>{entry.discovered ? entry.title : "Memory sleeping"}</h4>
                        <p>
                          {entry.discovered
                            ? entry.text
                            : `An echo seed somewhere in ${entry.biomeName} has not been found.`}
                        </p>
                        {entry.discovered && <small>Found in {entry.roomName}</small>}
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            ))}
          </div>
        </Modal>
      )}

      {mapOpen && (
        <Modal labelledBy="map-title" className="map-panel" onClose={closeMap}>
          <button
            type="button"
            className="modal-close"
            onClick={closeMap}
            aria-label="Close grotto map"
            autoFocus
          >
            ×
          </button>
          <p className="eyebrow">Every path stays lit</p>
          <h2 id="map-title">Grotto map</h2>
          <div className="map-summary">
            <span aria-hidden="true">⌖</span>
            <div>
              <strong>{completed} of {totalRooms} rooms restored</strong>
              <p>
                {isAfterglow
                  ? "Every restored room remains open. Revisit any path for a missed memory; only the puzzle you leave will reset."
                  : "Revisit restored rooms for missed memories. Changing rooms resets only the puzzle you leave; your deeper path stays saved."}
              </p>
            </div>
          </div>
          {inputMethod === "gamepad" && (
            <p className="controller-dialog-guide">
              Use the left stick or D-pad to move between available rooms. A travels; B closes.
            </p>
          )}
          <div className="map-groups">
            {mapGroups.map((group) => (
              <section
                key={group.biome}
                className={`map-group map-group--${group.biome}`}
                aria-labelledby={`map-biome-${group.biome}`}
              >
                <div className="map-group__heading">
                  <h3 id={`map-biome-${group.biome}`}>{group.biomeName}</h3>
                  <span>{group.restored} / {group.entries.length} restored</span>
                </div>
                <ol className="map-room-list" role="list">
                  {group.entries.map((entry) => {
                    const isHere = room?.index === entry.index;
                    const statusText = isHere
                      ? "You are here"
                      : entry.status === "current"
                        ? room?.isRevisit
                          ? "Return to path"
                          : "Continue deeper"
                        : entry.status === "restored"
                          ? "Revisit room"
                          : "Still sleeping";
                    const memoryText = entry.memoryStatus === "found"
                      ? "Memory found"
                      : entry.memoryStatus === "waiting"
                        ? "Memory waiting"
                        : "";
                    const disabled = entry.status === "locked" || isHere;
                    return (
                      <li key={entry.id} role="listitem">
                        <button
                          type="button"
                          className={`map-room map-room--${entry.status} ${entry.memoryStatus === "waiting" ? "has-memory-waiting" : ""}`}
                          disabled={disabled}
                          onClick={() => visitMapRoom(entry.index)}
                          aria-label={`${entry.name}. ${statusText}${memoryText ? `. ${memoryText}` : ""}`}
                        >
                          <span className="map-room__number" aria-hidden="true">
                            {String(entry.index + 1).padStart(2, "0")}
                          </span>
                          <span className="map-room__copy">
                            <strong>{entry.name}</strong>
                            <small>{statusText}</small>
                          </span>
                          {memoryText && (
                            <span className={`map-room__memory is-${entry.memoryStatus}`}>
                              <span aria-hidden="true">✧</span> {memoryText}
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </section>
            ))}
          </div>
        </Modal>
      )}

      {restartOpen && (
        <Modal labelledBy="restart-title" className="confirm-panel" onClose={closeRestart}>
          <button type="button" className="modal-close" onClick={closeRestart} aria-label="Keep current journey" autoFocus>×</button>
          <p className="eyebrow">A fresh lantern</p>
          <h2 id="restart-title">Begin a new journey?</h2>
          <p className="modal-note">
            This replaces the current local journey. Export your save first if
            you may want to return to it.
          </p>
          <div className="confirm-actions">
            <button type="button" className="secondary-button" onClick={closeRestart}>
              Keep this journey
            </button>
            <button type="button" className="primary-button" onClick={confirmRestart}>
              Begin again
            </button>
          </div>
        </Modal>
      )}

      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>
    </main>
  );
}
