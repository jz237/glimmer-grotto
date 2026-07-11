import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [css, game] = await Promise.all([
  readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  readFile(new URL("../app/game/createGame.ts", import.meta.url), "utf8"),
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
