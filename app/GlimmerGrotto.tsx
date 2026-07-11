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
import {
  clearSave,
  createFreshSave,
  exportSave,
  importSave,
  loadSave,
  persistSave,
  reconcileCompletion,
} from "./game/save";

type Screen = "title" | "playing" | "complete";
const TOTAL_ROOMS = 20;

type GameModule = typeof import("./game/createGame");
let gameModulePromise: Promise<GameModule> | undefined;

function preloadGameModule(): Promise<GameModule> {
  gameModulePromise ??= import("./game/createGame");
  return gameModulePromise;
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
    const handleCancel = (event: Event) => {
      event.preventDefault();
      onClose();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      event.stopPropagation();
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    dialog.addEventListener("cancel", handleCancel);
    dialog.addEventListener("keydown", handleKeyDown);
    if (!dialog.open) dialog.showModal();
    dialog.querySelector<HTMLElement>("button, input, select, textarea, [tabindex]")?.focus();
    return () => {
      dialog.removeEventListener("cancel", handleCancel);
      dialog.removeEventListener("keydown", handleKeyDown);
      if (dialog.open) dialog.close();
      previouslyFocused?.focus();
    };
  }, [onClose]);

  return (
    <dialog
      ref={dialogRef}
      className="modal-dialog"
      aria-labelledby={labelledBy}
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
  const arrivalButtonRef = useRef<HTMLButtonElement>(null);
  const sessionStartedRef = useRef(0);
  const holdDelayRef = useRef<number | null>(null);
  const holdIntervalRef = useRef<number | null>(null);
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [restartOpen, setRestartOpen] = useState(false);
  const [updateReady, setUpdateReady] = useState(false);
  const [installPrompt, setInstallPrompt] =
    useState<InstallPromptEvent | null>(null);
  const [storageNote, setStorageNote] = useState("");

  useEffect(() => {
    const storage = browserStorage();
    const loaded = loadSave(storage);
    const reconciled = reconcileCompletion(loaded, TOTAL_ROOMS);
    const initialSave = reconciled === loaded
      ? loaded
      : persistSave(storage, reconciled);
    saveRef.current = initialSave;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setSave(initialSave);
      if (initialSave.journeyComplete) setScreen("complete");
      if (!storage) {
        setStorageNote(
          "Autosave is unavailable in this browser context. Export a save before leaving.",
        );
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
    const productionHost =
      location.protocol === "https:" &&
      location.hostname !== "localhost" &&
      location.hostname !== "127.0.0.1";
    if (productionHost && "serviceWorker" in navigator) {
      void navigator.serviceWorker
        .register("/sw.js")
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
    saveRef.current = save;
  }, [save]);

  const updateSave = useCallback(
    (updater: (current: SaveGameV1) => SaveGameV1) => {
      setSave((current) => {
        const baseline = current ?? createFreshSave();
        const elapsed =
          screen === "playing" && sessionStartedRef.current > 0
            ? Date.now() - sessionStartedRef.current
            : 0;
        sessionStartedRef.current = screen === "playing" ? Date.now() : 0;
        const next = updater({
          ...baseline,
          playTimeMs: baseline.playTimeMs + elapsed,
        });
        const persisted = persistSave(browserStorage(), next);
        saveRef.current = persisted;
        return persisted;
      });
    },
    [screen],
  );

  const onGameEvent = useCallback(
    (event: GameEvent) => {
      switch (event.type) {
        case "ready":
          setTotalRooms(event.totalRooms);
          mountRef.current?.focus({ preventScroll: true });
          break;
        case "room":
          setRoom({
            index: event.index,
            biomeName: event.biomeName,
            name: event.name,
            subtitle: event.subtitle,
            story: event.story,
            hints: event.hints,
          });
          setHintStage(0);
          break;
        case "announce":
          setAnnouncement(event.message);
          break;
        case "hint":
          setHintStage(event.index);
          setAnnouncement(`Hint ${event.index}: ${event.hint}`);
          break;
        case "inputMethod":
          setInputMethod(event.method);
          break;
        case "tutorial":
          setTutorialStep(event.step);
          break;
        case "biomeArrival":
          setBiomeArrival(event.arrival);
          break;
        case "biomeSeen":
          updateSave((current) => ({
            ...current,
            seenBiomes: current.seenBiomes.includes(event.biome)
              ? current.seenBiomes
              : [...current.seenBiomes, event.biome],
          }));
          break;
        case "mechanicStatus":
          setMechanicStatus(event.items);
          break;
        case "progress":
          updateSave((current) => ({
            ...current,
            currentRoom: event.currentRoom,
            completedRooms: event.completedRooms,
            collectedSeeds: event.collectedSeeds,
          }));
          break;
        case "journeyComplete":
          updateSave((current) => ({
            ...current,
            journeyComplete: true,
            currentRoom: totalRooms - 1,
          }));
          setScreen("complete");
          setAnnouncement("The Heartbloom wakes. Glimmer Grotto shines again.");
          break;
        case "error":
          setAnnouncement(event.message);
          break;
      }
    },
    [totalRooms, updateSave],
  );

  useEffect(() => {
    if (screen !== "playing" || !mountRef.current || !saveRef.current) return;
    let cancelled = false;
    const parent = mountRef.current;
    void preloadGameModule()
      .then(({ mountGame }) => {
        if (cancelled || !saveRef.current) return;
        gameRef.current = mountGame({
          parent,
          save: saveRef.current,
          onEvent: onGameEvent,
        });
      })
      .catch(() => {
        setAnnouncement(
          "The grotto could not open in this browser. Try reloading or using a current browser.",
        );
      });
    return () => {
      cancelled = true;
      gameRef.current?.destroy();
      gameRef.current = null;
      parent.replaceChildren();
    };
  }, [onGameEvent, screen, session]);

  useEffect(() => {
    if (screen !== "playing") return;
    const onVisibility = () => {
      if (document.hidden) gameRef.current?.pause();
      else if (!settingsOpen && !helpOpen && !restartOpen) gameRef.current?.resume();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [helpOpen, restartOpen, screen, settingsOpen]);

  useEffect(() => {
    if (screen !== "playing") return;
    const frame = window.requestAnimationFrame(() => {
      if (biomeArrival) arrivalButtonRef.current?.focus({ preventScroll: true });
      else mountRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [biomeArrival, screen]);

  const dispatch = useCallback(
    (command: GameCommand) => gameRef.current?.dispatch(command),
    [],
  );

  const stopHeldCommand = useCallback(() => {
    if (holdDelayRef.current !== null) window.clearTimeout(holdDelayRef.current);
    if (holdIntervalRef.current !== null) window.clearInterval(holdIntervalRef.current);
    holdDelayRef.current = null;
    holdIntervalRef.current = null;
  }, []);

  const startHeldCommand = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>, command: GameCommand) => {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      stopHeldCommand();
      dispatch(command);
      holdDelayRef.current = window.setTimeout(() => {
        holdIntervalRef.current = window.setInterval(() => dispatch(command), 135);
      }, 285);
    },
    [dispatch, stopHeldCommand],
  );

  useEffect(() => stopHeldCommand, [stopHeldCommand]);

  const begin = (fresh: boolean) => {
    let next = saveRef.current ?? createFreshSave();
    if (fresh) {
      next = clearSave(browserStorage());
      saveRef.current = next;
      setSave(next);
    }
    sessionStartedRef.current = Date.now();
    setRoom(null);
    setHintStage(0);
    setTutorialStep(null);
    setBiomeArrival(null);
    setMechanicStatus([]);
    setScreen("playing");
    setSession((value) => value + 1);
    window.scrollTo({ top: 0, behavior: "auto" });
    void preloadGameModule();
  };

  const enterJourney = () => {
    if (saveRef.current?.journeyComplete) {
      setScreen("complete");
      return;
    }
    begin(false);
  };

  const returnToTitle = () => {
    if (screen === "playing") updateSave((current) => current);
    gameRef.current?.pause();
    setSettingsOpen(false);
    setHelpOpen(false);
    setRestartOpen(false);
    setRoom(null);
    setHintStage(0);
    setTutorialStep(null);
    setBiomeArrival(null);
    setMechanicStatus([]);
    setScreen("title");
    setAnnouncement("Journey saved. Back at the grotto entrance.");
    window.scrollTo({ top: 0, behavior: "auto" });
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
    gameRef.current?.pause();
    setSettingsOpen(true);
  }, []);

  const closeSettings = useCallback(() => {
    setSettingsOpen(false);
    gameRef.current?.resume();
  }, []);

  const openHelp = useCallback(() => {
    gameRef.current?.pause();
    setHelpOpen(true);
  }, []);

  const closeHelp = useCallback(() => {
    setHelpOpen(false);
    gameRef.current?.resume();
  }, []);

  const requestRestart = useCallback(() => {
    gameRef.current?.pause();
    setRestartOpen(true);
  }, []);

  const closeRestart = useCallback(() => {
    setRestartOpen(false);
    gameRef.current?.resume();
  }, []);

  const confirmRestart = () => {
    setRestartOpen(false);
    begin(true);
  };

  const revealHint = () => {
    dispatch({ type: "hint" });
  };

  const install = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  const applyUpdate = async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration?.waiting) {
      location.reload();
      return;
    }
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      () => location.reload(),
      { once: true },
    );
    registration.waiting.postMessage({ type: "SKIP_WAITING" });
  };

  const downloadSave = () => {
    if (!saveRef.current) return;
    const blob = new Blob([exportSave(saveRef.current)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "glimmer-grotto-save.json";
    anchor.click();
    URL.revokeObjectURL(url);
    setStorageNote("Save exported.");
  };

  const uploadSave = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const imported = reconcileCompletion(
        importSave(await file.text()),
        TOTAL_ROOMS,
      );
      const persisted = persistSave(browserStorage(), imported);
      saveRef.current = persisted;
      setSave(persisted);
      setRoom(null);
      setHintStage(0);
      setTutorialStep(null);
      setBiomeArrival(null);
      setMechanicStatus([]);
      setScreen(persisted.journeyComplete ? "complete" : "title");
      setSession((value) => value + 1);
      setStorageNote("Save imported. Close settings to continue.");
    } catch (error) {
      setStorageNote(error instanceof Error ? error.message : "Save import failed.");
    }
  };

  const settings = save?.settings ?? createFreshSave().settings;
  const completed = save?.completedRooms.length ?? 0;
  const seeds = save?.collectedSeeds.length ?? 0;
  const hasProgress = completed > 0 || (save?.currentRoom ?? 0) > 0;
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
            <button type="button" className="quiet-button" onClick={applyUpdate}>
              <Icon>↻</Icon> Update ready
            </button>
          )}
          {installPrompt && (
            <button type="button" className="quiet-button" onClick={install}>
              <Icon>↓</Icon> Install
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
                onClick={enterJourney}
                onPointerEnter={() => void preloadGameModule()}
                onFocus={() => void preloadGameModule()}
              >
                <Icon>✦</Icon>
                {save?.journeyComplete
                  ? "Return to the Heartbloom"
                  : hasProgress
                    ? "Continue journey"
                    : "Enter the grotto"}
              </button>
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
              <p className="eyebrow">{room?.biomeName ?? "Entering the grotto"}</p>
              <h1>{room?.name ?? "Following the first glimmer…"}</h1>
            </div>
            <div className="journey-counters" aria-label="Journey progress">
              <span>
                <b>{completed}</b>/{totalRooms} rooms
              </span>
              <span>
                <b>{seeds}</b>/15 seeds
              </span>
            </div>
          </div>

          <div className="game-frame">
            <div
              ref={mountRef}
              className="game-mount"
              role="application"
              tabIndex={biomeArrival ? -1 : 0}
              aria-hidden={biomeArrival ? true : undefined}
              aria-describedby={[
                tutorial ? "first-room-guide" : "",
                mechanicStatus.length > 0 && !biomeArrival ? "puzzle-status" : "",
              ].filter(Boolean).join(" ") || undefined}
              aria-label="Top-down light puzzle. Use arrow keys or WASD, touch controls, or a gamepad to move. Use action to interact."
            />
            {!room && (
              <div className="game-loading" role="status">
                <span />
                Waking the lantern…
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
            <div className="game-tools" aria-label="Puzzle tools">
              <button
                type="button"
                disabled={!room || Boolean(biomeArrival)}
                onClick={() => dispatch({ type: "focus" })}
              >
                <Icon>◉</Icon> Focus
              </button>
              <button
                type="button"
                disabled={!room || Boolean(biomeArrival)}
                onClick={revealHint}
              >
                <Icon>✦</Icon> Hint
              </button>
              <button
                type="button"
                disabled={!room || Boolean(biomeArrival)}
                onClick={() => dispatch({ type: "reset" })}
              >
                <Icon>↺</Icon> Reset
              </button>
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
            <div className="touch-controls" aria-label="Touch controls">
              <div className="touch-dpad">
                <button
                  type="button"
                  className="touch-up"
                  disabled={Boolean(biomeArrival)}
                  onPointerDown={(event) => {
                    setInputMethod("touch");
                    startHeldCommand(event, { type: "move", dx: 0, dy: -1 });
                  }}
                  onPointerUp={stopHeldCommand}
                  onPointerCancel={stopHeldCommand}
                  onLostPointerCapture={stopHeldCommand}
                >
                  <span aria-hidden="true">↑</span>
                  <span className="sr-only">Move up</span>
                </button>
                <button
                  type="button"
                  className="touch-left"
                  disabled={Boolean(biomeArrival)}
                  onPointerDown={(event) => {
                    setInputMethod("touch");
                    startHeldCommand(event, { type: "move", dx: -1, dy: 0 });
                  }}
                  onPointerUp={stopHeldCommand}
                  onPointerCancel={stopHeldCommand}
                  onLostPointerCapture={stopHeldCommand}
                >
                  <span aria-hidden="true">←</span>
                  <span className="sr-only">Move left</span>
                </button>
                <button
                  type="button"
                  className="touch-right"
                  disabled={Boolean(biomeArrival)}
                  onPointerDown={(event) => {
                    setInputMethod("touch");
                    startHeldCommand(event, { type: "move", dx: 1, dy: 0 });
                  }}
                  onPointerUp={stopHeldCommand}
                  onPointerCancel={stopHeldCommand}
                  onLostPointerCapture={stopHeldCommand}
                >
                  <span aria-hidden="true">→</span>
                  <span className="sr-only">Move right</span>
                </button>
                <button
                  type="button"
                  className="touch-down"
                  disabled={Boolean(biomeArrival)}
                  onPointerDown={(event) => {
                    setInputMethod("touch");
                    startHeldCommand(event, { type: "move", dx: 0, dy: 1 });
                  }}
                  onPointerUp={stopHeldCommand}
                  onPointerCancel={stopHeldCommand}
                  onLostPointerCapture={stopHeldCommand}
                >
                  <span aria-hidden="true">↓</span>
                  <span className="sr-only">Move down</span>
                </button>
              </div>
              <button
                type="button"
                className="touch-action"
                disabled={Boolean(biomeArrival)}
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

          <div className="story-row">
            <div className="story-card">
              <span className="story-glyph" aria-hidden="true">❧</span>
              <div>
                <p>{room?.subtitle}</p>
                <span>{room?.story}</span>
              </div>
            </div>
            <div
              className={`hint-card ${hintStage > 0 ? "is-visible" : ""}`}
              aria-live="polite"
            >
              <p>{hintStage > 0 ? `Lantern hint ${hintStage} of 3` : "Lantern hints"}</p>
              <span>
                {hintStage > 0
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
          <div className="ending-stats">
            <span><b>{completed}</b> rooms restored</span>
            <span><b>{seeds}</b> echo seeds found</span>
          </div>
          <div className="title-actions">
            <button type="button" className="primary-button" onClick={requestRestart}>
              Begin a new journey
            </button>
            <button type="button" className="secondary-button" onClick={returnToTitle}>
              Return to title
            </button>
          </div>
        </section>
      )}

      <footer className="site-footer">
        <span>Made for unhurried moments.</span>
        <span>Your journey stays on this device.</span>
      </footer>

      {helpOpen && (
        <Modal labelledBy="help-title" onClose={closeHelp}>
            <button type="button" className="modal-close" onClick={closeHelp} aria-label="Close how to play" autoFocus>×</button>
            <p className="eyebrow">Lantern guide</p>
            <h2 id="help-title">How to play</h2>
            <div className="control-list">
              <div><kbd>WASD</kbd><kbd>↑↓←→</kbd><span>Move one step</span></div>
              <div><kbd>Space</kbd><kbd>E</kbd><span>Turn, ring, carry, or continue</span></div>
              <div><kbd>F</kbd><span>Highlight nearby puzzle objects</span></div>
              <div><kbd>H</kbd><span>Hear the next hint</span></div>
              <div><kbd>R</kbd><span>Reset the current room</span></div>
              <div><kbd>Stick</kbd><kbd>D-pad</kbd><span>Controller movement</span></div>
              <div><kbd>A</kbd><span>Controller action</span></div>
              <div><kbd>X</kbd><span>Controller focus glow</span></div>
              <div><kbd>Y</kbd><span>Controller hint</span></div>
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
            <div className="save-tools">
              <button type="button" className="secondary-button" onClick={downloadSave}>Export save</button>
              <button type="button" className="secondary-button" onClick={() => fileInputRef.current?.click()}>Import save</button>
              <input ref={fileInputRef} type="file" accept="application/json,.json" onChange={uploadSave} hidden />
            </div>
            {storageNote && <p className="storage-note" role="status">{storageNote}</p>}
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
