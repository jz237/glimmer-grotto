import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the finished Glimmer Grotto shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>Glimmer Grotto/);
  assert.match(html, /Carry a little light/);
  assert.match(html, /Enter the grotto|Continue journey/);
  assert.match(html, /No fail states/);
  assert.match(html, /15 hidden memories/);
  assert.match(html, /manifest\.webmanifest/);
  assert.match(html, /icon-192\.png/);
  assert.match(html, /third-party-notices\.txt/);
  assert.match(html, /Credits &amp; licenses/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Starter Project/);
});

test("ships the PWA files and removes the disposable starter", async () => {
  const [manifest, worker, packageJson, clientManifestSource] = await Promise.all([
    readFile(new URL("../public/manifest.webmanifest", import.meta.url), "utf8"),
    readFile(new URL("../public/sw.js", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../dist/client/.vite/manifest.json", import.meta.url), "utf8"),
  ]);
  assert.equal(JSON.parse(manifest).name, "Glimmer Grotto");
  const parsedManifest = JSON.parse(manifest);
  assert.deepEqual(
    parsedManifest.icons.map((icon) => icon.sizes),
    ["192x192", "512x512"],
  );
  assert.match(worker, /glimmer-grotto-v45/);
  assert.match(worker, /third-party-notices\.txt/);
  assert.match(worker, /clean-profile-certificate\.json/);
  assert.match(worker, /SKIP_WAITING/);
  assert.match(worker, /url\.searchParams\.has\("_rsc"\)/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  const clientManifest = JSON.parse(clientManifestSource);
  const interfaceBundle = await readFile(
    new URL(`../dist/client/${clientManifest["app/GlimmerGrotto.tsx"].file}`, import.meta.url),
    "utf8",
  );
  const inputEntry = Object.values(clientManifest).find(
    (entry) => entry.name === "input",
  );
  assert.ok(inputEntry);
  const inputBundle = await readFile(
    new URL(`../dist/client/${inputEntry.file}`, import.meta.url),
    "utf8",
  );
  const gameBundle = await readFile(
    new URL(`../dist/client/${clientManifest["app/game/createGame.ts"].file}`, import.meta.url),
    "utf8",
  );
  assert.match(interfaceBundle, /Lantern menu/);
  assert.match(interfaceBundle, /getGamepads/);
  assert.match(interfaceBundle, /visibilitychange/);
  assert.match(interfaceBundle, /gamepadconnected/);
  assert.match(interfaceBundle, /gamepaddisconnected/);
  assert.match(interfaceBundle, /pointercancel/);
  assert.match(interfaceBundle, /releasePointerCapture/);
  assert.match(interfaceBundle, /data-controller-default/);
  assert.match(interfaceBundle, /scrollBy/);
  assert.match(interfaceBundle, /Save download requested/);
  assert.match(interfaceBundle, /Manual save copy/);
  assert.match(interfaceBundle, /Updating…/);
  assert.match(interfaceBundle, /The update took too long to activate/);
  assert.match(interfaceBundle, /The lantern did not wake/);
  assert.match(interfaceBundle, /The grotto engine could not load/);
  assert.match(interfaceBundle, /The automatic cave view could not start/);
  assert.match(interfaceBundle, /The stable Canvas view could not start/);
  assert.match(interfaceBundle, /Trying to open the grotto again/);
  assert.match(interfaceBundle, /data-focus-return/);
  assert.match(interfaceBundle, /aria-hidden="true"/);
  assert.match(interfaceBundle, /brand-lockup/);
  assert.match(interfaceBundle, /is-fallback-open/);
  assert.match(interfaceBundle, /showModal/);
  assert.match(interfaceBundle, /aria-modal/);
  assert.match(interfaceBundle, /contenteditable/);
  assert.match(interfaceBundle, /focusin/);
  assert.match(interfaceBundle, /MutationObserver/);
  assert.match(interfaceBundle, /Restart view/);
  assert.match(interfaceBundle, /The cave view is resting/);
  assert.match(interfaceBundle, /Use stable view/);
  assert.match(interfaceBundle, /Try automatic view/);
  assert.match(interfaceBundle, /Try stable Canvas view/);
  assert.match(interfaceBundle, /Stable Canvas is active for this app session/);
  assert.match(interfaceBundle, /did not become ready in time/);
  assert.match(interfaceBundle, /The grotto engine took too long to arrive/);
  assert.match(interfaceBundle, /loading timer could not start/);
  assert.match(inputBundle, /isComposing/);
  assert.match(inputBundle, /keyCode/);
  assert.match(inputBundle, /openMemories/);
  assert.match(inputBundle, /primaryDown/);
  assert.match(inputBundle, /isFinite/);
  assert.match(gameBundle, /webglcontextlost/);
  assert.match(gameBundle, /webglcontextrestored/);
  assert.match(gameBundle, /rendererState/);
  assert.match(gameBundle, /rendererMode/);
  await assert.rejects(access(new URL("../app/_sites-preview/SkeletonPreview.tsx", root)));
});
