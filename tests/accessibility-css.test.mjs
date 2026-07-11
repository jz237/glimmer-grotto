import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [
  css,
  game,
  interfaceSource,
  controllerSource,
  downloadSource,
  serviceWorkerUpdateSource,
  heldCommandSource,
  inputSource,
  navigationSource,
  animationLifecycleSource,
  moduleLoaderSource,
  runtimeHandleSource,
  focusSource,
  dialogLifecycleSource,
  modalStateSource,
  pausePolicySource,
  audioSource,
  rendererContextSource,
  bootWatchdogSource,
] = await Promise.all([
  readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  readFile(new URL("../app/game/createGame.ts", import.meta.url), "utf8"),
  readFile(new URL("../app/GlimmerGrotto.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/useGamepadNavigation.ts", import.meta.url), "utf8"),
  readFile(new URL("../app/game/download.ts", import.meta.url), "utf8"),
  readFile(new URL("../app/game/serviceWorkerUpdate.ts", import.meta.url), "utf8"),
  readFile(new URL("../app/game/heldCommand.ts", import.meta.url), "utf8"),
  readFile(new URL("../app/game/input.ts", import.meta.url), "utf8"),
  readFile(new URL("../app/game/navigation.ts", import.meta.url), "utf8"),
  readFile(new URL("../app/game/animationLifecycle.ts", import.meta.url), "utf8"),
  readFile(new URL("../app/game/moduleLoader.ts", import.meta.url), "utf8"),
  readFile(new URL("../app/game/runtimeHandle.ts", import.meta.url), "utf8"),
  readFile(new URL("../app/game/focus.ts", import.meta.url), "utf8"),
  readFile(new URL("../app/game/dialogLifecycle.ts", import.meta.url), "utf8"),
  readFile(new URL("../app/game/modalState.ts", import.meta.url), "utf8"),
  readFile(new URL("../app/game/pausePolicy.ts", import.meta.url), "utf8"),
  readFile(new URL("../app/game/audio.ts", import.meta.url), "utf8"),
  readFile(new URL("../app/game/rendererContext.ts", import.meta.url), "utf8"),
  readFile(new URL("../app/game/bootWatchdog.ts", import.meta.url), "utf8"),
]);

test("the large-text setting reaches every fixed interface label", () => {
  assert.match(css, /--text-lift:\s*0px/);
  assert.match(css, /--heading-lift:\s*0px/);
  assert.match(css, /\.is-large-text\s*\{[^}]*--text-lift:\s*2px/s);
  assert.match(css, /\.is-large-text\s*\{[^}]*--heading-lift:\s*6px/s);
  assert.doesNotMatch(css, /font-size:\s*\d+px/);
  assert.doesNotMatch(css, /font-size:\s*clamp\(/);
});

test("canvas labels use the same accessibility setting", () => {
  assert.doesNotMatch(game, /fontSize:\s*"\d+px"/);
  assert.equal((game.match(/gameTextSize\(/g) ?? []).length, 6);
  assert.match(game, /gameTextSize\(27, this\.settings\.largeText\)/);
});

test("fine-pointer zoom reflows guidance without enabling touch overlays", () => {
  assert.match(css, /\.game-stage\s*\{[^}]*position:\s*relative/s);
  assert.match(
    css,
    /@media \(pointer: coarse\), \(any-pointer: coarse\)\s*\{[\s\S]*?\.touch-controls\s*\{\s*display:\s*flex;/,
  );
  assert.match(
    css,
    /@media \(pointer: fine\) and \(max-width: 480px\)\s*\{[\s\S]*?\.game-stage > \.mechanic-status,[\s\S]*?\.game-stage > \.tutorial-card\s*\{[^}]*position:\s*static;[^}]*width:\s*100%;[^}]*transform:\s*none;/,
  );
  assert.match(
    css,
    /@media \(pointer: fine\) and \(max-width: 480px\)\s*\{[\s\S]*?\.game-frame\s*\{[^}]*width:\s*100%;[^}]*height:\s*auto;[\s\S]*?\.game-tools\s*\{[^}]*width:\s*calc\(100% - 32px\);/,
  );
  const narrowWidthRules = css.match(
    /@media \(max-width: 820px\)\s*\{[\s\S]*?\n\}/,
  )?.[0] ?? "";
  assert.doesNotMatch(narrowWidthRules, /touch-controls/);
  assert.match(interfaceSource, /className="game-stage"/);
  assert.match(interfaceSource, /role="toolbar" aria-label="Puzzle tools"/);
  assert.match(interfaceSource, /role="group" aria-label="Touch controls"/);
});

test("offline state is visible and announced without hiding local save safety", () => {
  assert.match(interfaceSource, /window\.addEventListener\("offline", offline\)/);
  assert.match(interfaceSource, /window\.addEventListener\("online", online\)/);
  assert.match(
    interfaceSource,
    /className="save-recovery-banner connection-banner" role="status"/,
  );
  assert.match(
    interfaceSource,
    /persistenceStatus === "unavailable"/,
  );
  assert.match(interfaceSource, /this session can continue; export a save before leaving\./);
  assert.match(interfaceSource, /your journey still saves on this device\./);
  assert.match(css, /\.connection-banner\s*\{[^}]*border-color:[^}]*background:/s);
});

test("runtime save failures stay visible without blocking play", () => {
  assert.match(interfaceSource, /persistSaveWithStatus\(browserStorage\(\), next\)/);
  assert.match(interfaceSource, /reportSavePersistence\(result\.persistence\)/);
  assert.doesNotMatch(interfaceSource, /setSave\(\(current\)/);
  assert.match(interfaceSource, /Autosave could not write to this browser\./);
  assert.match(interfaceSource, /saveRecoveryNotice && \(/);
  assert.doesNotMatch(
    interfaceSource,
    /saveRecoveryNotice && screen !== "playing"/,
  );
  assert.match(interfaceSource, /aria-label="Dismiss save notice"/);
});

test("save export has delayed cleanup and an accessible manual fallback", () => {
  assert.match(downloadSource, /appendLink\(link\)/);
  assert.match(downloadSource, /scheduleCleanup\(cleanup, 1_000\)/);
  assert.match(downloadSource, /catch \{[\s\S]*cleanup\(\);[\s\S]*return false;/);
  assert.match(interfaceSource, /requestTextDownload\(serialized, "glimmer-grotto-save\.json"\)/);
  assert.doesNotMatch(interfaceSource, /Save exported\./);
  assert.match(interfaceSource, /Save download requested\. Check your browser downloads\./);
  assert.match(interfaceSource, /aria-label="Complete Glimmer Grotto save text"/);
  assert.match(interfaceSource, /onFocus=\{\(event\) => event\.currentTarget\.select\(\)\}/);
  assert.match(interfaceSource, /navigator\.clipboard\?\.writeText/);
  assert.match(interfaceSource, /Copy save text/);
  assert.match(css, /\.manual-export textarea\s*\{[^}]*width:\s*100%;[^}]*max-width:\s*100%;/s);
});

test("service worker updates time out cleanly and remain retryable", () => {
  const updateHandler = interfaceSource.slice(
    interfaceSource.indexOf("const applyUpdate"),
    interfaceSource.indexOf("const downloadSave"),
  );
  assert.match(serviceWorkerUpdateSource, /timeoutMs = 8_000/);
  assert.match(serviceWorkerUpdateSource, /postMessage\(\{ type: "SKIP_WAITING" \}\)/);
  assert.match(
    serviceWorkerUpdateSource,
    /removeEventListener\(\s*"controllerchange",\s*onControllerChange,?\s*\)/,
  );
  assert.match(serviceWorkerUpdateSource, /finish\("timed-out"\)/);
  assert.match(interfaceSource, /const \[updateApplying, setUpdateApplying\] = useState\(false\)/);
  assert.match(interfaceSource, /disabled=\{updateApplying\}/);
  assert.match(interfaceSource, /aria-busy=\{updateApplying \|\| undefined\}/);
  assert.match(interfaceSource, /The update took too long to activate\./);
  assert.match(interfaceSource, /select Update ready to try again\./);
  assert.match(interfaceSource, /<span>\{updateNotice\}<\/span>/);
  assert.match(interfaceSource, /aria-label="Dismiss update notice"/);
  assert.match(updateHandler, /setUpdateNotice\(message\)/);
  assert.doesNotMatch(updateHandler, /setStorageNote\(message\)/);
  assert.doesNotMatch(updateHandler, /setSaveRecoveryNotice\(message\)/);
});

test("touch holds stop across pointer, page, and room interruptions", () => {
  assert.match(heldCommandSource, /initialDelayMs \?\? 285/);
  assert.match(heldCommandSource, /repeatDelayMs \?\? 135/);
  assert.match(heldCommandSource, /this\.generation \+= 1/);
  assert.match(heldCommandSource, /this\.timers\.clearDelay\(delayHandle\)/);
  assert.match(heldCommandSource, /this\.timers\.clearRepeat\(repeatHandle\)/);
  assert.match(heldCommandSource, /releaseCapture\?\.\(\)/);
  assert.match(interfaceSource, /new HeldCommandController\(/);
  assert.match(interfaceSource, /window\.addEventListener\("pointerup", finishPointer\)/);
  assert.match(interfaceSource, /window\.addEventListener\("pointercancel", finishPointer\)/);
  assert.match(interfaceSource, /window\.addEventListener\("blur", interrupt\)/);
  assert.match(interfaceSource, /window\.addEventListener\("pagehide", interrupt\)/);
  assert.match(interfaceSource, /document\.hidden/);
  assert.match(interfaceSource, /room\?\.index/);
  assert.equal((interfaceSource.match(/onPointerUp=\{finishHeldCommand\}/g) ?? []).length, 4);
  assert.equal((interfaceSource.match(/onPointerCancel=\{finishHeldCommand\}/g) ?? []).length, 4);
  assert.equal((interfaceSource.match(/onLostPointerCapture=\{finishHeldCommand\}/g) ?? []).length, 4);
  assert.match(css, /\.touch-dpad button\s*\{[^}]*touch-action:\s*none;[^}]*user-select:\s*none;/s);
});

test("keyboard commands exclude shortcuts, composition, and stale repeat", () => {
  assert.match(inputSource, /input\.defaultPrevented/);
  assert.match(inputSource, /input\.isComposing/);
  assert.match(inputSource, /input\.keyCode === 229/);
  assert.match(inputSource, /input\.altKey/);
  assert.match(inputSource, /input\.ctrlKey/);
  assert.match(inputSource, /input\.metaKey/);
  assert.match(inputSource, /repeatable && this\.pressedCodes\.has\(code\)/);
  assert.match(game, /keyboardInputDecision\(event\)/);
  assert.match(game, /this\.keyboardSession\.admit\(/);
  assert.match(game, /intent\.type === "move"/);
  assert.match(game, /this\.input\.keyboard\?\.on\("keyup", this\.onKeyUp, this\)/);
  assert.match(game, /this\.input\?\.keyboard\?\.off\("keyup", this\.onKeyUp, this\)/);
  assert.match(game, /this\.keyboardSession\.interrupt\(\)/);
  assert.match(game, /\[contenteditable="true"\]/);
  assert.match(game, /\[role="textbox"\]/);
});

test("canvas pointers require primary finite coordinates and exact targets", () => {
  assert.match(inputSource, /!sample\.primaryDown \|\| sample\.button !== 0/);
  assert.match(inputSource, /!Number\.isFinite\(sample\.worldX\)/);
  assert.match(inputSource, /!Number\.isFinite\(sample\.worldY\)/);
  assert.match(inputSource, /geometry\.cellSize <= 0/);
  assert.match(inputSource, /x < geometry\.minX/);
  assert.match(inputSource, /x > geometry\.maxX/);
  assert.match(navigationSource, /export function interactionTargetOnCell\(/);
  assert.match(game, /const target = pointerGridCell\(pointer, \{/);
  assert.match(game, /minX: 1,[\s\S]*maxX: 13,[\s\S]*minY: 1,[\s\S]*maxY: 7/);
  assert.match(game, /interactionTargetOnCell\(this\.room, target\)/);
  assert.doesNotMatch(game, /Math\.floor\(\(pointer\.worldX - GRID_LEFT\)/);
});

test("scene redraws invalidate motion and settle interrupted landing", () => {
  assert.match(animationLifecycleSource, /this\.generation \+= 1/);
  assert.match(animationLifecycleSource, /this\.moving = false/);
  assert.match(animationLifecycleSource, /this\.bumping = false/);
  assert.match(animationLifecycleSource, /if \(!this\.isCurrent\(token\.generation\)\) return false/);
  assert.match(game, /private readonly animationLifecycle = new AnimationLifecycle\(\)/);
  assert.match(game, /const interruptedMove = this\.animationLifecycle\.invalidate\(\)\.moving/);
  assert.match(game, /this\.tweens\.killAll\(\);[\s\S]*if \(interruptedMove\) this\.handleLanding\(\)/);
  assert.match(game, /this\.animationLifecycle\.beginBump\(\)/);
  assert.match(game, /this\.animationLifecycle\.beginMove\(\)/);
  assert.match(game, /this\.animationLifecycle\.complete\(token/);
  assert.match(game, /this\.player === player && player\.active/);
  assert.match(
    game,
    /shutdown\(\): void \{\s*if \(this\.shutdownComplete\) return;\s*this\.shutdownComplete = true;\s*this\.animationLifecycle\.invalidate\(\);[\s\S]*this\.tweens\?\.killAll\(\)/,
  );
  assert.doesNotMatch(game, /private moving =/);
});

test("lazy game loading retries without stale mount or teardown effects", () => {
  const touchControlsSource = interfaceSource.slice(
    interfaceSource.indexOf('<div className="touch-controls"'),
    interfaceSource.indexOf("{mechanicStatus.length", interfaceSource.indexOf('<div className="touch-controls"')),
  );
  assert.match(moduleLoaderSource, /Promise\.resolve\(\)\.then\(this\.importModule\)/);
  assert.match(moduleLoaderSource, /this\.pendingAttempt === attemptNumber/);
  assert.match(moduleLoaderSource, /this\.pending = undefined/);
  assert.match(interfaceSource, /function warmGameModule\(\): void \{/);
  assert.match(interfaceSource, /preloadGameModule\(\)\.catch\(\(\) => undefined\)/);
  assert.match(interfaceSource, /let mountedGame: GameHandle \| null = null/);
  assert.match(interfaceSource, /if \(cancelled \|\| attemptEnded \|\| !saveRef\.current\) return/);
  assert.match(interfaceSource, /if \(cancelled \|\| attemptEnded\) \{[\s\S]*game\.destroy\(\)/);
  assert.match(interfaceSource, /publishFailure\(failedMode, message\)/);
  assert.match(interfaceSource, /if \(gameRef\.current === mountedGame\) gameRef\.current = null/);
  assert.match(interfaceSource, /mountedGame\?\.destroy\(\)/);
  assert.match(interfaceSource, /className="game-load-error" role="alert"/);
  assert.match(interfaceSource, /data-controller-default[\s\S]*onClick=\{retryGameLoad\}/);
  assert.match(interfaceSource, /screen !== "playing" \|\| Boolean\(gameLoadError\)/);
  assert.equal((touchControlsSource.match(/disabled=\{gameControlsDisabled\}/g) ?? []).length, 5);
  assert.match(css, /\.game-load-error\s*\{[^}]*position:\s*absolute;[^}]*place-content:\s*center;/s);
});

test("game runtime construction and destruction are terminal and contained", () => {
  assert.match(runtimeHandleSource, /if \(this\.destroyed\) return false/);
  assert.match(runtimeHandleSource, /this\.destroyed = true/);
  assert.match(runtimeHandleSource, /this\.dependencies\.shutdownScene\(\)/);
  assert.match(runtimeHandleSource, /this\.dependencies\.destroyRenderer\(\)/);
  assert.match(runtimeHandleSource, /private runWhileAlive\(/);
  assert.match(game, /private shutdownComplete = false/);
  assert.match(game, /if \(this\.shutdownComplete\) return/);
  assert.match(game, /this\.tweens\?\.killAll\(\)/);
  assert.match(game, /this\.input\?\.keyboard\?\.off\("keydown"/);
  assert.match(game, /let game: Phaser\.Game;\s*try \{\s*game = new Phaser\.Game\(/);
  assert.match(game, /catch \(error\) \{[\s\S]*scene\.shutdown\(\)[\s\S]*options\.parent\.replaceChildren\(\)[\s\S]*throw error/);
  assert.match(game, /new RuntimeHandleController<GameCommand>\(\{/);
  assert.match(game, /shutdownScene: \(\) => scene\.shutdown\(\)/);
  assert.match(game, /destroyRenderer: \(\) => \{[\s\S]*game\.destroy\(true\)[\s\S]*options\.parent\.replaceChildren\(\)/);
  assert.match(game, /runtime\.dispatch\(command\)/);
  assert.match(game, /runtime\.destroy\(\)/);
});

test("modal focus restoration rejects stale targets and finds a safe fallback", () => {
  assert.match(focusSource, /!target\.isConnected/);
  assert.match(focusSource, /target\.hidden/);
  assert.match(focusSource, /target\.disabled/);
  assert.match(focusSource, /target\.inert/);
  assert.match(focusSource, /target\.tabIndex < 0/);
  assert.match(focusSource, /target\.getAttribute\("aria-hidden"\) === "true"/);
  assert.match(focusSource, /target\.closest\('\[inert\], \[aria-hidden="true"\]'\)/);
  assert.match(focusSource, /target\.getClientRects\(\)\.length > 0/);
  assert.match(focusSource, /target\.focus\(\{ preventScroll: true \}\)/);
  assert.match(focusSource, /firstRestorableFocusTarget\(/);
  assert.match(interfaceSource, /restoreFocusSafely\([\s\S]*firstRestorableFocusTarget\([\s\S]*dialog\.querySelectorAll<HTMLElement>/);
  assert.match(interfaceSource, /firstRestorableFocusTarget\([\s\S]*document\.querySelectorAll<HTMLElement>/);
  assert.match(interfaceSource, /\[data-focus-return\]/);
  assert.match(interfaceSource, /data-focus-return/);
  assert.match(interfaceSource, /restoreFocusSafely\(previouslyFocused, fallback\)/);
  assert.doesNotMatch(interfaceSource, /previouslyFocused\?\.focus\(\)/);
});

test("modal keyboard focus cycles inside native and fallback dialogs", () => {
  assert.match(focusSource, /export function advanceFocusSafely\(/);
  assert.match(focusSource, /isRestorableFocusTarget\(candidate\)[^\n]*targets\.push\(candidate\)/);
  assert.match(focusSource, /const step = backwards \? -1 : 1/);
  assert.match(focusSource, /startIndex \+ step \* offset/);
  assert.match(focusSource, /if \(focusSafely\(targets\[index\]\)\) return "focused"/);
  assert.match(interfaceSource, /const DIALOG_FOCUS_SELECTOR = \[/);
  assert.match(interfaceSource, /'\[contenteditable\]:not\(\[contenteditable="false"\]\)'/);
  assert.match(interfaceSource, /if \(event\.key === "Tab"\)/);
  assert.match(
    interfaceSource,
    /advanceFocusSafely\([\s\S]*dialog\.querySelectorAll<HTMLElement>\(DIALOG_FOCUS_SELECTOR\)[\s\S]*document\.activeElement as HTMLElement \| null,[\s\S]*event\.shiftKey/,
  );
  assert.match(interfaceSource, /if \(event\.key === "Tab"\) \{[\s\S]*event\.preventDefault\(\)/);
});

test("modal focus recovers after live content and outside focus changes", () => {
  assert.match(focusSource, /export function isFocusWithinSafely\(/);
  assert.match(focusSource, /return container\.contains\(target\)/);
  assert.match(focusSource, /catch \{[\s\S]*return false/);
  assert.match(interfaceSource, /let redirectingFocus = false/);
  assert.match(interfaceSource, /const redirectFocus = \(backwards = false\) => \{/);
  assert.match(interfaceSource, /try \{[\s\S]*advanceFocusSafely\([\s\S]*finally \{[\s\S]*redirectingFocus = false/);
  assert.match(interfaceSource, /const handleFocusIn = \(event: FocusEvent\) => \{/);
  assert.match(interfaceSource, /isFocusWithinSafely\(dialog, event\.target as Node \| null\)/);
  assert.match(interfaceSource, /document\.addEventListener\("focusin", handleFocusIn\)/);
  assert.match(interfaceSource, /document\.addEventListener\("keydown", handleKeyDown\)/);
  assert.match(interfaceSource, /document\.removeEventListener\("focusin", handleFocusIn\)/);
  assert.match(interfaceSource, /document\.removeEventListener\("keydown", handleKeyDown\)/);
  assert.doesNotMatch(interfaceSource, /dialog\.addEventListener\("keydown"/);
});

test("modal content mutations repair removed or newly blocked focus", () => {
  assert.match(interfaceSource, /const recoverMissingFocus = \(\) => \{/);
  assert.match(
    interfaceSource,
    /isFocusWithinSafely\(dialog, active\) &&[\s\S]*isRestorableFocusTarget\(active\)/,
  );
  assert.match(interfaceSource, /focusObserver = new MutationObserver\(\(\) => \{/);
  assert.match(interfaceSource, /queueMicrotask\(\(\) => \{[\s\S]*if \(!cancelled\) recoverMissingFocus\(\)/);
  assert.match(interfaceSource, /focusObserver\.observe\(dialog, \{[\s\S]*attributeFilter:[\s\S]*"disabled"[\s\S]*"hidden"[\s\S]*"inert"[\s\S]*"tabindex"/);
  assert.match(interfaceSource, /attributes: true,[\s\S]*childList: true,[\s\S]*subtree: true/);
  assert.match(interfaceSource, /focusObserver\?\.disconnect\(\)/);
});

test("modal state is exclusive and stale closes cannot resume beneath a handoff", () => {
  assert.match(modalStateSource, /export function activateModalState/);
  assert.match(modalStateSource, /active: next,[\s\S]*changed: current !== next/);
  assert.match(modalStateSource, /if \(current !== expected\) return \{ active: current, changed: false \}/);
  assert.match(modalStateSource, /return \{ active: null, changed: true \}/);
  assert.match(interfaceSource, /const activeModalRef = useRef<ModalId \| null>\(null\)/);
  assert.match(interfaceSource, /const \[activeModal, setActiveModal\] = useState<ModalId \| null>\(null\)/);
  assert.match(interfaceSource, /activateModalState\(activeModalRef\.current, next\)/);
  assert.match(interfaceSource, /dismissModalState\(activeModalRef\.current, expected\)/);
  assert.match(interfaceSource, /if \(dismissModal\("settings"\)\) synchronizeGamePause\(\)/);
  assert.match(interfaceSource, /if \(dismissModal\("menu"\)\) synchronizeGamePause\(\)/);
  assert.match(interfaceSource, /activeModal === null/);
  assert.doesNotMatch(interfaceSource, /set(?:Menu|Memory|Map|Settings|Help|Restart)Open/);
});

test("one pause policy owns modal, visibility, load, mount, and screen transitions", () => {
  assert.match(pausePolicySource, /if \(!context\.playing\) return "not-playing"/);
  assert.match(pausePolicySource, /if \(context\.modalOpen\) return "modal"/);
  assert.match(pausePolicySource, /if \(context\.pageHidden\) return "page-hidden"/);
  assert.match(pausePolicySource, /if \(context\.loadFailed\) return "load-error"/);
  assert.match(interfaceSource, /const screenRef = useRef<Screen>\("title"\)/);
  assert.match(interfaceSource, /const gameLoadErrorRef = useRef\(""\)/);
  assert.match(interfaceSource, /const pageHiddenRef = useRef\(false\)/);
  assert.match(interfaceSource, /const synchronizeGamePause = useCallback\(\(\) => \{/);
  assert.match(interfaceSource, /playing: screenRef\.current === "playing"/);
  assert.match(interfaceSource, /modalOpen: activeModalRef\.current !== null/);
  assert.match(interfaceSource, /pageHidden: pageHiddenRef\.current/);
  assert.match(interfaceSource, /loadFailed: Boolean\(gameLoadErrorRef\.current\)/);
  assert.match(interfaceSource, /if \(reason\) runtime\.pause\(\);[\s\S]*else runtime\.resume\(\)/);
  assert.match(interfaceSource, /gameRef\.current = game;[\s\S]*synchronizeGamePause\(\)/);
  assert.match(interfaceSource, /pageHiddenRef\.current = document\.hidden;[\s\S]*synchronizeGamePause\(\)/);
  assert.equal((interfaceSource.match(/runtime\.resume\(\)/g) ?? []).length, 1);
});

test("runtime pause transitions are idempotent, retryable, and input-neutral", () => {
  assert.match(runtimeHandleSource, /private paused = false/);
  assert.match(runtimeHandleSource, /if \(this\.paused\) return true/);
  assert.match(runtimeHandleSource, /if \(applied\) this\.paused = true/);
  assert.match(runtimeHandleSource, /if \(!this\.paused\) return true/);
  assert.match(runtimeHandleSource, /if \(applied\) this\.paused = false/);
  assert.match(runtimeHandleSource, /return operation\(\) !== false/);
  assert.match(game, /pause: \(\) => \{[\s\S]*if \(!scene\.sys\?\.isActive\(\)\) return false/);
  assert.match(interfaceSource, /case "ready":[\s\S]*queueMicrotask\(synchronizeGamePause\)/);
  assert.match(
    game,
    /case "pause":[\s\S]*this\.keyboardSession\.interrupt\(\)[\s\S]*this\.input\.keyboard\.enabled = false[\s\S]*this\.scene\.pause\(\)/,
  );
  assert.match(
    game,
    /case "resume":[\s\S]*this\.keyboardSession\.interrupt\(\)[\s\S]*this\.synchronizeGamepadAfterPause\(\)[\s\S]*this\.input\.keyboard\.enabled = true[\s\S]*this\.scene\.resume\(\)/,
  );
});

test("suspended audio resumes without replaying stale action effects", () => {
  assert.match(audioSource, /private resumingContext\?: AudioContext/);
  assert.match(audioSource, /if \(this\.context\.state === "closed"\)/);
  assert.match(audioSource, /if \(this\.context\.state !== "running"\) \{[\s\S]*this\.requestResume\(this\.context\);[\s\S]*return false/);
  assert.match(audioSource, /this\.resumingContext === context/);
  assert.match(audioSource, /\.resume\(\)[\s\S]*\.catch\(\(\) => undefined\)[\s\S]*\.finally\(\(\) => \{/);
  assert.match(audioSource, /if \(this\.resumingContext === context\) \{[\s\S]*this\.resumingContext = undefined/);
  assert.match(audioSource, /if \(!this\.wake\(\) \|\| !this\.context \|\| !this\.master\) return false/);
  assert.match(audioSource, /this\.context = undefined;[\s\S]*this\.resumingContext = undefined/);
});

test("renderer context loss pauses invisible play and exposes safe recovery", () => {
  assert.match(rendererContextSource, /"available" \| "lost" \| "destroyed"/);
  assert.match(rendererContextSource, /if \(this\.state !== "available"\) return false/);
  assert.match(rendererContextSource, /if \(this\.state !== "lost"\) return false/);
  assert.match(rendererContextSource, /if \(this\.state === "destroyed"\) return false/);
  assert.match(pausePolicySource, /if \(context\.rendererUnavailable\) return "renderer-unavailable"/);
  assert.match(game, /canvas\.addEventListener\("webglcontextlost", contextLost\)/);
  assert.match(game, /canvas\.addEventListener\("webglcontextrestored", contextRestored\)/);
  assert.match(game, /if \(!rendererContext\.lose\(event\)\) return;[\s\S]*runtime\.pause\(\)/);
  assert.match(game, /if \(!scene\.restoreRenderer\(\)\)[\s\S]*state: "failed"/);
  assert.match(game, /canvas\.removeEventListener\("webglcontextlost", contextLost\)/);
  assert.match(game, /rendererContext\.destroy\(\);[\s\S]*detachRendererListeners\(\)/);
  assert.match(interfaceSource, /rendererUnavailable: rendererUnavailableRef\.current/);
  assert.match(interfaceSource, /case "rendererState"/);
  assert.match(interfaceSource, /className="game-load-error renderer-recovery" role="alert"/);
  assert.match(interfaceSource, /data-controller-default[\s\S]*onClick=\{retryRenderer\}[\s\S]*Restart view/);
  assert.match(interfaceSource, /const gameControlsDisabled =[\s\S]*Boolean\(rendererIssue\)/);
  assert.match(interfaceSource, /activeModal,[\s\S]*biomeArrival,[\s\S]*rendererIssue,[\s\S]*room\?\.index/);
});

test("browser renderer loss explicitly permits restoration", () => {
  assert.match(rendererContextSource, /export interface RendererContextLossEvent/);
  assert.match(rendererContextSource, /lose\(event\?: RendererContextLossEvent\): boolean/);
  assert.match(rendererContextSource, /this\.state = "lost";[\s\S]*event\.preventDefault\(\)/);
  assert.match(rendererContextSource, /catch \{[\s\S]*Manual renderer recovery remains available/);
  assert.match(game, /const contextLost = \(event: Event\) => \{/);
  assert.match(game, /rendererContext\.lose\(event\)/);
});

test("repeated renderer loss switches to a bounded Canvas fallback", () => {
  assert.match(rendererContextSource, /WEBGL_LOSS_FALLBACK_THRESHOLD = 2/);
  assert.match(rendererContextSource, /if \(redrawFailed\) return "canvas"/);
  assert.match(rendererContextSource, /if \(!Number\.isFinite\(webglLosses\)\) return "auto"/);
  assert.match(rendererContextSource, /webglLosses >= WEBGL_LOSS_FALLBACK_THRESHOLD \? "canvas" : "auto"/);
  assert.match(game, /rendererMode: RendererMode/);
  assert.match(game, /type: options\.rendererMode === "canvas" \? Phaser\.CANVAS : Phaser\.AUTO/);
  assert.match(interfaceSource, /const rendererLossCountRef = useRef\(0\)/);
  assert.match(interfaceSource, /rendererLossCountRef\.current \+= 1/);
  assert.match(interfaceSource, /const nextMode = recommendedRendererMode\(/);
  assert.match(interfaceSource, /setRendererMode\(nextMode\)/);
  assert.match(interfaceSource, /rendererMode,[\s\S]*onEvent: \(event\) => \{/);
  assert.match(interfaceSource, /Use stable view/);
  assert.match(interfaceSource, /stable Canvas mode/);
});

test("renderer mount failure always offers an alternate and a session reset", () => {
  assert.match(rendererContextSource, /export function alternateRendererMode/);
  assert.match(rendererContextSource, /current === "canvas" \? "auto" : "canvas"/);
  assert.match(interfaceSource, /const \[failedRendererMode, setFailedRendererMode\] =/);
  assert.match(interfaceSource, /let mountStarted = false/);
  assert.match(interfaceSource, /mountStarted = true;[\s\S]*const game = mountGame/);
  assert.match(interfaceSource, /const failedMode = mountStarted \? rendererMode : null/);
  assert.match(interfaceSource, /The stable Canvas view could not start/);
  assert.match(interfaceSource, /The grotto engine could not load/);
  assert.match(interfaceSource, /const retryAlternateRenderer = \(\) => \{/);
  assert.match(interfaceSource, /alternateRendererMode\(failedRendererMode\)/);
  assert.match(interfaceSource, /nextMode === "auto",[\s\S]*\);/);
  assert.match(interfaceSource, /data-controller-default[\s\S]*onClick=\{retryAlternateRenderer\}/);
  assert.match(interfaceSource, /Try automatic view/);
  assert.match(interfaceSource, /Try stable Canvas view/);
  assert.match(interfaceSource, /id="renderer-setting-title">Rendering/);
  assert.match(interfaceSource, /Stable Canvas is active for this app session/);
  assert.match(interfaceSource, /onClick=\{\(\) => changeRendererMode\(alternateRendererMode\(rendererMode\)\)\}/);
  assert.match(css, /\.renderer-setting\s*\{[^}]*display:\s*flex;[^}]*flex-wrap:\s*wrap;/s);
});

test("mounted games must become ready before a bounded attempt deadline", () => {
  assert.match(bootWatchdogSource, /"idle" \| "pending" \| "ready" \| "timed-out" \| "cancelled"/);
  assert.match(bootWatchdogSource, /!Number\.isFinite\(timeoutMs\) \|\| timeoutMs <= 0/);
  assert.match(bootWatchdogSource, /if \(this\.status !== "pending"\) return/);
  assert.match(bootWatchdogSource, /this\.status = "timed-out"/);
  assert.match(bootWatchdogSource, /try \{[\s\S]*onTimeout\(\)[\s\S]*catch/);
  assert.match(bootWatchdogSource, /this\.timers\.clearTimer\(timer\)/);
  assert.match(interfaceSource, /const GAME_BOOT_TIMEOUT_MS = 12_000/);
  assert.match(interfaceSource, /const watchdog = new BootReadinessWatchdog\(browserBootWatchdogTimers\(\)\)/);
  assert.match(interfaceSource, /watchdog\.arm\(GAME_BOOT_TIMEOUT_MS/);
  assert.match(interfaceSource, /did not become ready in time/);
  assert.match(interfaceSource, /if \(event\.type === "ready"\) watchdog\.ready\(\)/);
  assert.match(interfaceSource, /const failedGame = mountedGame;[\s\S]*failedGame\?\.destroy\(\)/);
  assert.match(interfaceSource, /cancelled = true;[\s\S]*watchdog\.cancel\(\)/);
  assert.match(interfaceSource, /gameRecoveryRef\.current\?\.focus\(\{ preventScroll: true \}\)/);
});

test("lazy engine delivery has its own invalidatable deadline", () => {
  assert.match(moduleLoaderSource, /invalidatePending\(expected: Promise<Module>\): boolean/);
  assert.match(moduleLoaderSource, /if \(!this\.pending \|\| this\.pending !== expected\) return false/);
  assert.match(moduleLoaderSource, /this\.pending = undefined;[\s\S]*this\.pendingAttempt = 0/);
  assert.match(interfaceSource, /const GAME_MODULE_TIMEOUT_MS = 15_000/);
  assert.match(interfaceSource, /const moduleWatchdog = new BootReadinessWatchdog/);
  assert.match(interfaceSource, /const moduleAttempt = preloadGameModule\(\)/);
  assert.match(interfaceSource, /moduleWatchdog\.arm\(GAME_MODULE_TIMEOUT_MS/);
  assert.match(interfaceSource, /gameModuleLoader\.invalidatePending\(moduleAttempt\)/);
  assert.match(interfaceSource, /The grotto engine took too long to arrive/);
  assert.match(interfaceSource, /if \(cancelled \|\| attemptEnded \|\| !saveRef\.current\) return/);
  assert.match(interfaceSource, /moduleWatchdog\.ready\(\);[\s\S]*mountStarted = true/);
  assert.match(interfaceSource, /cancelled = true;[\s\S]*moduleWatchdog\.cancel\(\)/);
});

test("lazy engine invalidation belongs to the exact delivery generation", () => {
  assert.match(moduleLoaderSource, /private cached: \{ value: Module \} \| undefined/);
  assert.match(moduleLoaderSource, /if \(this\.cached\) return Promise\.resolve\(this\.cached\.value\)/);
  assert.match(moduleLoaderSource, /this\.pending !== expected/);
  assert.match(moduleLoaderSource, /this\.cached = \{ value: module \}/);
  assert.match(interfaceSource, /const moduleAttempt = preloadGameModule\(\)/);
  assert.match(interfaceSource, /invalidatePending\(moduleAttempt\)/);
});

test("native dialog failure falls back without escaping modal cleanup", () => {
  assert.match(dialogLifecycleSource, /typeof dialog\.showModal === "function"/);
  assert.match(dialogLifecycleSource, /dialog\.showModal\(\)/);
  assert.match(dialogLifecycleSource, /dialog\.setAttribute\("open", ""\)/);
  assert.match(dialogLifecycleSource, /typeof dialog\.close === "function"/);
  assert.match(dialogLifecycleSource, /dialog\.removeAttribute\("open"\)/);
  assert.match(interfaceSource, /const addedInert: Element\[\] = \[\]/);
  assert.match(interfaceSource, /sibling\.setAttribute\("inert", ""\)/);
  assert.match(interfaceSource, /const openMode = openDialogSafely\(dialog\)/);
  assert.match(interfaceSource, /openMode === "attribute"/);
  assert.match(interfaceSource, /openMode === "failed"[\s\S]*queueMicrotask/);
  assert.match(interfaceSource, /closeDialogSafely\(dialog\)/);
  assert.match(interfaceSource, /sibling\.removeAttribute\("inert"\)/);
  assert.match(interfaceSource, /aria-modal="true"/);
  assert.match(css, /\.modal-dialog\.is-fallback-open\s*\{[^}]*position:\s*fixed;[^}]*z-index:\s*100;[^}]*backdrop-filter:/s);
});

test("controller players can reach recovery menus and operate their dialogs", () => {
  assert.match(inputSource, /KeyJ[^\n]*openMemories/);
  assert.match(inputSource, /KeyM[^\n]*openMap/);
  assert.match(inputSource, /Escape[^\n]*openMenu/);
  assert.match(game, /gamepadMenuRequest\(/);
  assert.match(game, /create\(\)[\s\S]*synchronizeGamepadAfterPause\(\)/);
  assert.match(controllerSource, /navigator\s*\.getGamepads/);
  assert.match(controllerSource, /firstConnectedGamepad/);
  assert.match(controllerSource, /GamepadSessionGuard/);
  assert.match(controllerSource, /visibilitychange/);
  assert.match(controllerSource, /gamepadconnected/);
  assert.match(controllerSource, /gamepaddisconnected/);
  assert.match(controllerSource, /stopObserving\(\)/);
  assert.match(game, /firstConnectedGamepad/);
  assert.match(game, /shouldSuppressFrame\(gamepad\.index\)/);
  assert.match(game, /addEventListener\("visibilitychange", this\.onInputInterrupted\)/);
  assert.match(game, /removeEventListener\("visibilitychange", this\.onInputInterrupted\)/);
  assert.match(game, /addEventListener\("gamepaddisconnected", this\.onInputInterrupted\)/);
  assert.match(game, /removeEventListener\("gamepaddisconnected", this\.onInputInterrupted\)/);
  assert.match(interfaceSource, /usePageGamepadNavigation\(\{/);
  assert.match(interfaceSource, /data-controller-default/);
  assert.match(controllerSource, /nextDialogFocusIndex\(/);
  assert.match(controllerSource, /active\.click\(\)/);
  assert.match(controllerSource, /active\.type === "range"/);
  assert.match(controllerSource, /\.scrollBy\(\{/);
  assert.match(controllerSource, /frame\.describe && !cancelHeld/);
  assert.match(interfaceSource, /aria-keyshortcuts="J"/);
  assert.match(interfaceSource, /aria-keyshortcuts="M"/);
  assert.match(interfaceSource, /Controller echo memories/);
  assert.match(interfaceSource, /controller Lantern menu/);
  assert.match(interfaceSource, /id="lantern-menu-title"/);
  assert.match(css, /\.controller-dialog-guide\s*\{[^}]*font-size:/s);
});
