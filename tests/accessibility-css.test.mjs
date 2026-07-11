import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [css, game, interfaceSource, controllerSource] = await Promise.all([
  readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  readFile(new URL("../app/game/createGame.ts", import.meta.url), "utf8"),
  readFile(new URL("../app/GlimmerGrotto.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/useGamepadNavigation.ts", import.meta.url), "utf8"),
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
    /Offline<\/strong> · your journey still saves on this device\./,
  );
  assert.match(css, /\.connection-banner\s*\{[^}]*border-color:[^}]*background:/s);
});

test("controller players can reach recovery menus and operate their dialogs", () => {
  assert.match(game, /KeyJ[\s\S]*openMemories/);
  assert.match(game, /KeyM[\s\S]*openMap/);
  assert.match(game, /Escape[\s\S]*openMenu/);
  assert.match(game, /gamepadMenuRequest\(/);
  assert.match(game, /create\(\)[\s\S]*synchronizeGamepadAfterPause\(\)/);
  assert.match(controllerSource, /navigator\s*\.getGamepads/);
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
