"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import type {
  AccessibilitySettings,
  GameCommand,
  GameEvent,
  GameHandle,
  SaveGameV1,
} from "./game/contracts";
import {
  clearSave,
  createFreshSave,
  exportSave,
  importSave,
  loadSave,
  persistSave,
} from "./game/save";

type Screen = "title" | "playing" | "complete";

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

export default function GlimmerGrotto() {
  const mountRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<GameHandle | null>(null);
  const saveRef = useRef<SaveGameV1 | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sessionStartedRef = useRef(0);
  const [save, setSave] = useState<SaveGameV1 | null>(null);
  const [screen, setScreen] = useState<Screen>("title");
  const [session, setSession] = useState(0);
  const [room, setRoom] = useState<RoomInfo | null>(null);
  const [totalRooms, setTotalRooms] = useState(20);
  const [announcement, setAnnouncement] = useState(
    "Welcome to Glimmer Grotto.",
  );
  const [hintStage, setHintStage] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [installPrompt, setInstallPrompt] =
    useState<InstallPromptEvent | null>(null);
  const [storageNote, setStorageNote] = useState("");

  useEffect(() => {
    const loaded = loadSave(window.localStorage);
    saveRef.current = loaded;
    setSave(loaded);

    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }

    const captureInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", captureInstallPrompt);
    return () =>
      window.removeEventListener("beforeinstallprompt", captureInstallPrompt);
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
        const persisted = persistSave(window.localStorage, next);
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
    void import("./game/createGame")
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
      else if (!settingsOpen && !helpOpen) gameRef.current?.resume();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [helpOpen, screen, settingsOpen]);

  const dispatch = (command: GameCommand) => gameRef.current?.dispatch(command);

  const begin = (fresh: boolean) => {
    let next = saveRef.current ?? createFreshSave();
    if (fresh) {
      next = clearSave(window.localStorage);
      saveRef.current = next;
      setSave(next);
    }
    sessionStartedRef.current = Date.now();
    setRoom(null);
    setHintStage(0);
    setScreen("playing");
    setSession((value) => value + 1);
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

  const openSettings = () => {
    gameRef.current?.pause();
    setSettingsOpen(true);
  };

  const closeSettings = () => {
    setSettingsOpen(false);
    if (!helpOpen) gameRef.current?.resume();
  };

  const openHelp = () => {
    gameRef.current?.pause();
    setHelpOpen(true);
  };

  const closeHelp = () => {
    setHelpOpen(false);
    if (!settingsOpen) gameRef.current?.resume();
  };

  const install = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
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
      const imported = importSave(await file.text());
      const persisted = persistSave(window.localStorage, imported);
      saveRef.current = persisted;
      setSave(persisted);
      setStorageNote("Save imported. Continue to use it.");
    } catch (error) {
      setStorageNote(error instanceof Error ? error.message : "Save import failed.");
    }
  };

  const settings = save?.settings ?? createFreshSave().settings;
  const completed = save?.completedRooms.length ?? 0;
  const seeds = save?.collectedSeeds.length ?? 0;
  const hasProgress = completed > 0 || (save?.currentRoom ?? 0) > 0;
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
          onClick={() => screen === "title" && setAnnouncement("Glimmer Grotto")}
          aria-label="Glimmer Grotto home"
        >
          <span className="brand-mark" aria-hidden="true">
            <span />
          </span>
          <span>Glimmer Grotto</span>
        </button>
        <div className="topbar-actions">
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
                onClick={() => begin(false)}
              >
                <Icon>✦</Icon>
                {hasProgress ? "Continue journey" : "Enter the grotto"}
              </button>
              {hasProgress && (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => begin(true)}
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
              aria-label="Top-down light puzzle. Use arrow keys or WASD to move. Press Space, Enter, or E to interact."
            />
            {!room && (
              <div className="game-loading" role="status">
                <span />
                Waking the lantern…
              </div>
            )}
            <div className="game-tools" aria-label="Puzzle tools">
              <button type="button" onClick={() => dispatch({ type: "focus" })}>
                <Icon>◉</Icon> Focus
              </button>
              <button
                type="button"
                onClick={() => setHintStage((value) => Math.min(3, value + 1))}
              >
                <Icon>✦</Icon> Hint
              </button>
              <button type="button" onClick={() => dispatch({ type: "reset" })}>
                <Icon>↺</Icon> Reset
              </button>
            </div>
            <div className="touch-controls" aria-label="Touch controls">
              <div className="touch-dpad">
                <button
                  type="button"
                  className="touch-up"
                  onPointerDown={() => dispatch({ type: "move", dx: 0, dy: -1 })}
                >
                  <span aria-hidden="true">↑</span>
                  <span className="sr-only">Move up</span>
                </button>
                <button
                  type="button"
                  className="touch-left"
                  onPointerDown={() => dispatch({ type: "move", dx: -1, dy: 0 })}
                >
                  <span aria-hidden="true">←</span>
                  <span className="sr-only">Move left</span>
                </button>
                <button
                  type="button"
                  className="touch-right"
                  onPointerDown={() => dispatch({ type: "move", dx: 1, dy: 0 })}
                >
                  <span aria-hidden="true">→</span>
                  <span className="sr-only">Move right</span>
                </button>
                <button
                  type="button"
                  className="touch-down"
                  onPointerDown={() => dispatch({ type: "move", dx: 0, dy: 1 })}
                >
                  <span aria-hidden="true">↓</span>
                  <span className="sr-only">Move down</span>
                </button>
              </div>
              <button
                type="button"
                className="touch-action"
                onPointerDown={() => dispatch({ type: "interact" })}
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
            <div className={`hint-card ${hintStage > 0 ? "is-visible" : ""}`}>
              <p>Lantern hint {Math.max(hintStage, 1)} of 3</p>
              <span>
                {room?.hints[Math.max(0, hintStage - 1)] ??
                  "Hints appear here when you ask for one."}
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
            Mica's small light has become a garden of thousands. Luma settles
            beside the lantern, and the cave begins a new song.
          </p>
          <div className="ending-stats">
            <span><b>{completed}</b> rooms restored</span>
            <span><b>{seeds}</b> echo seeds found</span>
          </div>
          <div className="title-actions">
            <button type="button" className="primary-button" onClick={() => begin(true)}>
              Begin a new journey
            </button>
            <button type="button" className="secondary-button" onClick={() => setScreen("title")}>
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
        <div className="modal-backdrop" role="presentation" onMouseDown={closeHelp}>
          <section
            className="modal-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="help-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button type="button" className="modal-close" onClick={closeHelp} aria-label="Close how to play">×</button>
            <p className="eyebrow">Lantern guide</p>
            <h2 id="help-title">How to play</h2>
            <div className="control-list">
              <div><kbd>WASD</kbd><kbd>↑↓←→</kbd><span>Move one step</span></div>
              <div><kbd>Space</kbd><kbd>E</kbd><span>Turn, ring, carry, or continue</span></div>
              <div><kbd>F</kbd><span>Highlight nearby puzzle objects</span></div>
              <div><kbd>H</kbd><span>Hear the next hint</span></div>
              <div><kbd>R</kbd><span>Reset the current room</span></div>
            </div>
            <p className="modal-note">
              There are no timers or fail states. Every choice can be changed,
              and every room can be reset whenever you like.
            </p>
          </section>
        </div>
      )}

      {settingsOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={closeSettings}>
          <section
            className="modal-panel settings-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button type="button" className="modal-close" onClick={closeSettings} aria-label="Close settings">×</button>
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
          </section>
        </div>
      )}

      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>
    </main>
  );
}

